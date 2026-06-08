import { Router, Request, Response } from 'express'
import { Op } from 'sequelize'
import sequelize from '../config/db'
import { Goods, GoodsCategory } from '../models'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'

const router = Router()

// ─── Dashscope 通义万相配置 ──────────────────────────────────
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || ''
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1'

// ─── 自定义 MiMo ChatModel ─────────────────────────────────
class MiMoChatModel extends BaseChatModel {
  apiKey: string
  apiUrl: string
  model: string
  maxTokens: number
  temperature: number

  constructor() {
    super({})
    this.apiKey = process.env.MIMO_API_KEY || ''
    this.apiUrl = 'https://api.xiaomimimo.com/v1/chat/completions'
    this.model = 'mimo-v2.5'
    this.maxTokens = 800
    this.temperature = 0.7
  }

  _llmType(): string {
    return 'mimo'
  }

  async _generate(messages: BaseMessage[]): Promise<any> {
    const formatted = messages.map((m) => {
      if (m instanceof SystemMessage) return { role: 'system', content: m.content }
      if (m instanceof HumanMessage) return { role: 'user', content: m.content }
      if (m instanceof AIMessage) return { role: 'assistant', content: m.content }
      return { role: 'user', content: m.content }
    })

    const resp = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: formatted,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`MiMo API error: ${resp.status} ${errText}`)
    }

    const data = (await resp.json()) as any
    const content = data.choices?.[0]?.message?.content || ''

    return {
      generations: [{ text: content, message: new AIMessage(content) }],
    }
  }
}

const SYSTEM_PROMPT = [
  '你是小兔鲜儿的AI购物助手"小兔"\u{1F430}，性格活泼可爱，喜欢用emoji表情。',
  '你的职责：',
  '1. 根据用户需求推荐平台上的商品',
  '2. 提供穿搭建议、家居好物推荐',
  '3. 回答购物相关问题',
  '规则：',
  '- 只推荐平台上的商品，不编造不存在的商品',
  '- 回复简洁友好，适合手机阅读，控制在100字以内',
  '- 如果没有匹配的商品，告诉用户暂时没有相关推荐',
  '',
].join('\n')

// 深度思考模式的 system prompt（QwQ 推理模型专用）
const THINKING_SYSTEM_PROMPT = [
  '你是小兔鲜儿的AI购物助手"小兔"🐰。',
  '',
  '【重要】你必须严格按照以下格式回复：',
  '<think>',
  '在这里写你的思考过程，包括分析、推理、比较等步骤',
  '你可以分多步思考，每步一行',
  '</think>',
  '在这里写最终给用户的回答（简洁友好，100字以内）',
  '',
  '不要跳过<think>标签，每次回复都必须先思考再回答。',
].join('\n')

// ─── LangChain Tools ───────────────────────────────────────

const searchGoodsTool = new DynamicStructuredTool({
  name: 'search_goods',
  description: '搜索商品，根据关键词查找商品',
  schema: z.object({
    keyword: z.string().describe('搜索关键词，如"跑步鞋"、"T恤"'),
  }),
  func: async (input) => {
    const keyword = input.keyword
    const rows = await Goods.findAll({
      where: { name: { [Op.like]: `%${keyword}%` } },
      limit: 5,
      attributes: ['id', 'name', 'price', 'main_pictures'],
    })
    if (!rows.length) return '未找到相关商品'
    return JSON.stringify(
      rows.map((r: any) => ({
        id: String(r.id),
        name: r.name,
        price: r.price,
        picture: Array.isArray(r.main_pictures) ? r.main_pictures[0] : '',
      })),
    )
  },
})

const categoryGoodsTool = new DynamicStructuredTool({
  name: 'category_goods',
  description: '按分类查询商品，当用户提到穿搭/美食/家居/数码等类别时使用',
  schema: z.object({
    category: z.string().describe('分类名称，如"T恤/polo/衬衫"、"调味酱菜"'),
  }),
  func: async (input) => {
    const category = input.category
    // 先找到分类
    const cat = await GoodsCategory.findOne({
      where: { name: { [Op.like]: `%${category}%` } },
      attributes: ['id'],
    })
    if (!cat) return '该分类下暂无商品'

    const rows = await Goods.findAll({
      where: { category_id: cat.id },
      limit: 5,
      attributes: ['id', 'name', 'price', 'main_pictures'],
    })
    if (!rows.length) return '该分类下暂无商品'
    return JSON.stringify(
      rows.map((r: any) => ({
        id: String(r.id),
        name: r.name,
        price: r.price,
        picture: Array.isArray(r.main_pictures) ? r.main_pictures[0] : '',
      })),
    )
  },
})

const recommendTool = new DynamicStructuredTool({
  name: 'recommend_goods',
  description: '获取热销推荐商品，当用户没有明确需求或需要推荐时使用',
  schema: z.object({
    limit: z.number().optional().default(5).describe('推荐数量'),
  }),
  func: async (input) => {
    const limit = input.limit || 5
    const rows = await Goods.findAll({
      order: sequelize.random(),
      limit,
      attributes: ['id', 'name', 'price', 'main_pictures'],
    })
    return JSON.stringify(
      rows.map((r: any) => ({
        id: String(r.id),
        name: r.name,
        price: r.price,
        picture: Array.isArray(r.main_pictures) ? r.main_pictures[0] : '',
      })),
    )
  },
})

// ─── 关键词 → 分类映射 ─────────────────────────────────────
const KEYWORD_CATEGORY_MAP: Record<string, string[]> = {
  穿搭: ['T恤/polo/衬衫', '服饰'],
  衣服: ['T恤/polo/衬衫', '服饰'],
  鞋: ['服饰'],
  家居: ['居家生活用品', '锅具配件'],
  厨房: ['锅具配件', '调味酱菜', '方便食品'],
  美食: ['调味酱菜', '方便食品', '南北干货'],
  数码: ['3C数码'],
  手机: ['3C数码'],
  运动: ['健身大器械', '健身小器械'],
  个护: ['浴室用品'],
  护肤: ['浴室用品'],
  母婴: ['连体衣/礼盒'],
  宝宝: ['连体衣/礼盒'],
  零食: ['方便食品'],
  酒: ['进口酒'],
  保健: ['中医保健', '滋补保健'],
  宠物: ['宠物用品'],
}

// ─── 确定性意图识别 + Tool 调度 ─────────────────────────────
async function findRelevantGoods(message: string): Promise<any[]> {
  for (const [keyword, categories] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    if (message.includes(keyword)) {
      for (const cat of categories) {
        const result = await categoryGoodsTool.invoke({ category: cat })
        if (result !== '该分类下暂无商品') {
          return JSON.parse(result)
        }
      }
    }
  }

  const searchResult = await searchGoodsTool.invoke({ keyword: message })
  if (searchResult !== '未找到相关商品') {
    return JSON.parse(searchResult)
  }

  const recResult = await recommendTool.invoke({ limit: 5 })
  return JSON.parse(recResult)
}

// ─── 会话记忆 ──────────────────────────────────────────────
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const sessionMemories = new Map<string, ChatMessage[]>()
const MAX_HISTORY = 10

function getHistory(sessionId: string): ChatMessage[] {
  if (!sessionMemories.has(sessionId)) {
    sessionMemories.set(sessionId, [])
  }
  return sessionMemories.get(sessionId)!
}

function addToHistory(sessionId: string, role: 'user' | 'assistant', content: string) {
  const history = getHistory(sessionId)
  history.push({ role, content })
  if (history.length > MAX_HISTORY * 2) {
    history.splice(0, history.length - MAX_HISTORY * 2)
  }
}

// ─── 路由 ──────────────────────────────────────────────────

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history: clientHistory = [], sessionId = 'default' } = req.body
    if (!message) {
      res.json({ code: '0', msg: '请输入消息', result: null })
      return
    }

    // 1. 意图识别 + Tool 调用
    const goods = await findRelevantGoods(message)

    // 2. 构造商品信息
    const goodsInfo = goods.length
      ? `\n\n以下是平台上的相关商品（请从中推荐）：\n${goods
          .map((g: any, i: number) => `${i + 1}. ${g.name} - ¥${g.price}`)
          .join('\n')}`
      : ''

    // 3. 拼接历史
    const serverHistory = getHistory(sessionId)
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT + goodsInfo },
      ...(serverHistory.length ? serverHistory : clientHistory.slice(-10)),
      { role: 'user', content: message },
    ]

    // 4. 调用 MiMo（自定义适配器，只发基本参数）
    const llm = new MiMoChatModel()
    const lcMessages = messages.map((m) => {
      if (m.role === 'system') return new SystemMessage(m.content)
      if (m.role === 'assistant') return new AIMessage(m.content)
      return new HumanMessage(m.content)
    })

    const response = await llm.invoke(lcMessages)
    const reply = typeof response.content === 'string' ? response.content : '为你推荐以下好物～'

    // 5. 更新记忆
    addToHistory(sessionId, 'user', message)
    addToHistory(sessionId, 'assistant', reply)

    res.json({
      code: '1',
      msg: '操作成功',
      result: { reply, goods },
    })
  } catch (err: any) {
    console.error('AI chat error:', err?.message || err)
    try {
      const { message: msg } = req.body
      const goods = await findRelevantGoods(msg || '')
      res.json({
        code: '1',
        msg: '操作成功',
        result: { reply: '为你推荐以下好物～', goods },
      })
    } catch {
      res.json({ code: '0', msg: 'AI 服务暂时不可用', result: null })
    }
  }
})

// ─── SSE 流式路由 ────────────────────────────────────────────

router.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const { message, history: clientHistory = [], sessionId = 'default', thinking = false } = req.body
    console.log('[chat/stream] thinking:', thinking, '| model:', thinking && DASHSCOPE_API_KEY ? 'qwq-plus' : 'mimo-v2.5')
    if (!message) {
      res.json({ code: '0', msg: '请输入消息', result: null })
      return
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    // 发送 SSE 事件的辅助函数
    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // 1. 意图识别 + Tool 调用
    const goods = await findRelevantGoods(message)

    // 2. 发送商品推荐事件
    sendEvent({ type: 'goods', goods })

    // 3. 构造商品信息
    const goodsInfo = goods.length
      ? `\n\n以下是平台上的相关商品（请从中推荐）：\n${goods
          .map((g: any, i: number) => `${i + 1}. ${g.name} - ¥${g.price}`)
          .join('\n')}`
      : ''

    // 4. 拼接历史
    const serverHistory = getHistory(sessionId)
    const isThinkingMode = thinking && DASHSCOPE_API_KEY
    const systemPrompt = isThinkingMode ? THINKING_SYSTEM_PROMPT : SYSTEM_PROMPT
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt + (isThinkingMode ? '' : goodsInfo) },
      ...(serverHistory.length ? serverHistory : clientHistory.slice(-10)),
      { role: 'user', content: message },
    ]

    // 5. 流式调用 LLM API
    //    深度思考模式 → QwQ（Dashscope，会输出 <think> 标签）
    //    普通模式 → MiMo
    const apiUrl = isThinkingMode
      ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
      : 'https://api.xiaomimimo.com/v1/chat/completions'
    const apiToken = isThinkingMode
      ? DASHSCOPE_API_KEY
      : process.env.MIMO_API_KEY
    const model = isThinkingMode ? 'qwq-plus' : 'mimo-v2.5'

    const mimoResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: isThinkingMode ? 2000 : 800,
        temperature: isThinkingMode ? 0.6 : 0.7,
        stream: true,
      }),
    })

    if (!mimoResponse.ok) {
      const errText = await mimoResponse.text()
      console.error('MiMo stream error:', mimoResponse.status, errText)
      sendEvent({ type: 'error', message: 'AI 服务暂时不可用' })
      sendEvent({ type: 'done' })
      res.end()
      return
    }

    // 6. 读取 SSE 流并转发给客户端
    const reader = mimoResponse.body?.getReader()
    if (!reader) {
      sendEvent({ type: 'error', message: '无法读取流式响应' })
      sendEvent({ type: 'done' })
      res.end()
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let fullReply = ''
    let inThinking = false

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const jsonStr = trimmed.slice(5).trim()
        if (jsonStr === '[DONE]') continue

        try {
          const chunk = JSON.parse(jsonStr)
          const delta = chunk.choices?.[0]?.delta?.content
          if (delta) {
            // 分段处理 think 标签
            let remaining = delta
            while (remaining.length > 0) {
              if (inThinking) {
                const closeIdx = remaining.indexOf('</think>')
                if (closeIdx === -1) {
                  // 整段都在 think 内
                  sendEvent({ type: 'thinking', text: remaining })
                  remaining = ''
                } else {
                  // 找到关闭标签
                  if (closeIdx > 0) {
                    sendEvent({ type: 'thinking', text: remaining.slice(0, closeIdx) })
                  }
                  inThinking = false
                  remaining = remaining.slice(closeIdx + 8) // 8 = '</think>'.length
                }
              } else {
                const openIdx = remaining.indexOf('<think>')
                if (openIdx === -1) {
                  // 没有 think 标签，全部是正式内容
                  fullReply += remaining
                  sendEvent({ type: 'chunk', text: remaining })
                  remaining = ''
                } else {
                  // 找到开始标签
                  if (openIdx > 0) {
                    const before = remaining.slice(0, openIdx)
                    fullReply += before
                    sendEvent({ type: 'chunk', text: before })
                  }
                  inThinking = true
                  remaining = remaining.slice(openIdx + 7) // 7 = '<think>'.length
                }
              }
            }
          }
        } catch {
          // skip malformed JSON
        }
      }
    }

    // 7. 发送完成事件
    sendEvent({ type: 'done' })
    res.end()

    // 8. 更新会话记忆
    addToHistory(sessionId, 'user', message)
    addToHistory(sessionId, 'assistant', fullReply)
  } catch (err: any) {
    console.error('AI stream error:', err?.message || err)
    try {
      const sendEvent = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`)
      }
      sendEvent({ type: 'error', message: 'AI 服务暂时不可用' })
      sendEvent({ type: 'done' })
      res.end()
    } catch {
      res.end()
    }
  }
})

// ─── 图片分析 ───────────────────────────────────────────────

const IMAGE_ANALYSIS_PROMPT = `你是小兔鲜儿的AI购物助手"小兔"\u{1F430}，擅长图片分析。
请从以下角度分析用户上传的图片：
1. \u{1F3A8} 美学分析：构图、色彩搭配、光影效果
2. \u{1F4DD} 内容描述：图片中的主要元素和场景
3. \u{1F4A1} 实用建议：如果是商品图，给出搭配/使用建议
4. \u{1F6CD}️ 相关推荐：如果能识别出商品类型，推荐平台上的类似商品
规则：
- 回复简洁友好，适合手机阅读，控制在200字以内
- 用 emoji 分段，增强可读性
- 如果是商品图，重点给出购买建议`

// POST /ai/analyze-image（普通）
router.post('/analyze-image', async (req: Request, res: Response) => {
  try {
    const { image, message = '请分析这张图片', sessionId = 'default' } = req.body
    if (!image) {
      res.json({ code: '0', msg: '请上传图片', result: null })
      return
    }

    // 构造多模态消息（OpenAI vision 格式）
    const visionMessages = [
      { role: 'system', content: IMAGE_ANALYSIS_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: message },
          { type: 'image_url', image_url: { url: image } },
        ],
      },
    ]

    const mimoResponse = await fetch('https://api.xiaomimimo.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MIMO_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mimo-v2.5',
        messages: visionMessages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    if (!mimoResponse.ok) {
      const errText = await mimoResponse.text()
      console.error('MiMo vision error:', mimoResponse.status, errText)
      res.json({ code: '0', msg: '图片分析暂时不可用', result: null })
      return
    }

    const data = (await mimoResponse.json()) as any
    const reply = data.choices?.[0]?.message?.content || '无法分析该图片'

    // 更新记忆
    addToHistory(sessionId, 'user', '[图片] ' + message)
    addToHistory(sessionId, 'assistant', reply)

    res.json({
      code: '1',
      msg: '操作成功',
      result: { reply },
    })
  } catch (err: any) {
    console.error('Image analysis error:', err?.message || err)
    res.json({ code: '0', msg: '图片分析失败', result: null })
  }
})

// POST /ai/analyze-image/stream（SSE 流式）
router.post('/analyze-image/stream', async (req: Request, res: Response) => {
  try {
    const { image, message = '请分析这张图片', sessionId = 'default' } = req.body
    if (!image) {
      res.json({ code: '0', msg: '请上传图片', result: null })
      return
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // 构造多模态消息
    const visionMessages = [
      { role: 'system', content: IMAGE_ANALYSIS_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: message },
          { type: 'image_url', image_url: { url: image } },
        ],
      },
    ]

    const mimoResponse = await fetch('https://api.xiaomimimo.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MIMO_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mimo-v2.5',
        messages: visionMessages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: true,
      }),
    })

    if (!mimoResponse.ok) {
      const errText = await mimoResponse.text()
      console.error('MiMo vision stream error:', mimoResponse.status, errText)
      sendEvent({ type: 'error', message: '图片分析暂时不可用' })
      sendEvent({ type: 'done' })
      res.end()
      return
    }

    // 读取 SSE 流并转发
    const reader = mimoResponse.body?.getReader()
    if (!reader) {
      sendEvent({ type: 'error', message: '无法读取流式响应' })
      sendEvent({ type: 'done' })
      res.end()
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let fullReply = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const jsonStr = trimmed.slice(5).trim()
        if (jsonStr === '[DONE]') continue

        try {
          const chunk = JSON.parse(jsonStr)
          const delta = chunk.choices?.[0]?.delta?.content
          if (delta) {
            fullReply += delta
            sendEvent({ type: 'chunk', text: delta })
          }
        } catch {
          // skip malformed JSON
        }
      }
    }

    sendEvent({ type: 'done' })
    res.end()

    // 更新记忆
    addToHistory(sessionId, 'user', '[图片] ' + message)
    addToHistory(sessionId, 'assistant', fullReply)
  } catch (err: any) {
    console.error('Image analysis stream error:', err?.message || err)
    try {
      const sendEvent = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`)
      }
      sendEvent({ type: 'error', message: '图片分析失败' })
      sendEvent({ type: 'done' })
      res.end()
    } catch {
      res.end()
    }
  }
})

// ─── 穿搭推荐（通义万相文生图）──────────────────────────────

/** 提交文生图异步任务 */
async function submitTextToImage(prompt: string, n = 4): Promise<string | null> {
  if (!DASHSCOPE_API_KEY) return null

  try {
    const resp = await fetch(`${DASHSCOPE_BASE_URL}/services/aigc/text2image/image-synthesis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'wanx-v1',
        input: { prompt },
        parameters: { n, size: '1024*1024' },
      }),
    })
    const data = (await resp.json()) as any
    return data?.output?.task_id || null
  } catch (err) {
    console.error('提交文生图任务失败:', err)
    return null
  }
}

/** 轮询文生图任务结果 */
async function pollImageTask(
  taskId: string,
  maxRetries = 30,
  intervalMs = 2000,
): Promise<string[]> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const resp = await fetch(`${DASHSCOPE_BASE_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}` },
      })
      const data = (await resp.json()) as any
      const status = data?.output?.task_status

      if (status === 'SUCCEEDED') {
        return data.output.results?.map((r: any) => r.url) || []
      }
      if (status === 'FAILED') {
        console.error('文生图任务失败:', data?.output)
        return []
      }
      // PENDING / RUNNING，继续轮询
    } catch {
      // 网络抖动，继续重试
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return []
}

/** POST /ai/outfit-recommend */
router.post('/outfit-recommend', async (req: Request, res: Response) => {
  try {
    const { description } = req.body
    if (!description) {
      res.json({ code: '0', msg: '请输入穿搭描述', result: null })
      return
    }

    // 构造英文 prompt（通义万相对英文 prompt 效果更好）
    const prompt = `fashion outfit recommendation, ${description}, model wearing clothes, studio lighting, high quality fashion photography, full body shot`

    // 先用 LLM 生成穿搭文案
    const llm = new MiMoChatModel()
    const styleResponse = await llm.invoke([
      new SystemMessage('你是穿搭顾问，根据用户需求给出简短的穿搭建议，50字以内，用中文。'),
      new HumanMessage(description),
    ])
    const reply =
      typeof styleResponse.content === 'string'
        ? styleResponse.content
        : `为您推荐以下${description}穿搭方案`

    // 提交文生图任务
    const taskId = await submitTextToImage(prompt, 4)
    if (!taskId) {
      res.json({
        code: '1',
        msg: '操作成功',
        result: { images: [], reply },
      })
      return
    }

    // 轮询获取图片
    const images = await pollImageTask(taskId)

    res.json({
      code: '1',
      msg: '操作成功',
      result: { images, reply },
    })
  } catch (err) {
    console.error('穿搭推荐失败:', err)
    res.json({ code: '0', msg: '穿搭推荐失败', result: null })
  }
})

/** POST /ai/outfit-recommend/stream */
router.post('/outfit-recommend/stream', async (req: Request, res: Response) => {
  try {
    const { description } = req.body
    if (!description) {
      res.json({ code: '0', msg: '请输入穿搭描述', result: null })
      return
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // 1. 用 LLM 生成穿搭文案（流式）
    const prompt = `fashion outfit recommendation, ${description}, model wearing clothes, studio lighting, high quality fashion photography, full body shot`

    const mimoResponse = await fetch('https://api.xiaomimimo.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MIMO_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mimo-v2.5',
        messages: [
          {
            role: 'system',
            content: '你是穿搭顾问，根据用户需求给出简短的穿搭建议，50字以内，用中文。',
          },
          { role: 'user', content: description },
        ],
        max_tokens: 200,
        temperature: 0.7,
        stream: true,
      }),
    })

    let fullReply = ''
    if (mimoResponse.ok) {
      const reader = mimoResponse.body?.getReader()
      if (reader) {
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data:')) continue
            const jsonStr = trimmed.slice(5).trim()
            if (jsonStr === '[DONE]') continue
            try {
              const chunk = JSON.parse(jsonStr)
              const delta = chunk.choices?.[0]?.delta?.content
              if (delta) {
                fullReply += delta
                sendEvent({ type: 'chunk', text: delta })
              }
            } catch {
              // skip
            }
          }
        }
      }
    }

    // 2. 提交文生图任务
    const taskId = await submitTextToImage(prompt, 4)
    if (taskId) {
      // 3. 轮询图片结果
      const images = await pollImageTask(taskId)
      if (images.length) {
        console.log('[outfit-stream] sending image event:', images.length, 'urls')
        sendEvent({ type: 'image', urls: images })
      }
    }

    // 4. 完成
    sendEvent({ type: 'done' })
    res.end()
  } catch (err: any) {
    console.error('穿搭推荐流式失败:', err)
    try {
      const sendEvent = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`)
      }
      sendEvent({ type: 'error', message: '穿搭推荐暂时不可用' })
      sendEvent({ type: 'done' })
      res.end()
    } catch {
      res.end()
    }
  }
})

export default router
