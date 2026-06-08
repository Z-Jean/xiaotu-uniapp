# AI 深度思考 + 穿搭推荐 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 新增两个 AI 功能——深度思考（展示推理过程）和穿搭推荐（通义万相生图）

**架构：** 后端在现有 SSE 流式聊天基础上增加 `<think>` 标签解析和 `thinking` 事件；新增穿搭推荐端点调用 Dashscope wanx-v1 异步生图。前端扩展 StreamCallbacks 接口，ChatPanel 新增折叠思考 UI 和图片网格展示。

**技术栈：** MiMo v2.5（文本）、Dashscope wanx-v1（文生图）、SSE、Vue 3

---

### 任务 1：后端 — 深度思考 prompt + SSE thinking 事件

**文件：**
- 修改：`server/routes/ai.ts:69-77`（SYSTEM_PROMPT）
- 修改：`server/routes/ai.ts:372-402`（stream 流解析逻辑）

- [ ] **步骤 1：修改 SYSTEM_PROMPT，增加 `<think>` 标签指令**

在 `server/routes/ai.ts` 第 69-77 行的 `SYSTEM_PROMPT` 中追加深度思考指令：

```typescript
const SYSTEM_PROMPT = `你是小兔鲜儿的AI购物助手"小兔"🐰，性格活泼可爱，喜欢用emoji表情。
你的职责：
1. 根据用户需求推荐平台上的商品
2. 提供穿搭建议、家居好物推荐
3. 回答购物相关问题
规则：
- 只推荐平台上的商品，不编造不存在的商品
- 回复简洁友好，适合手机阅读，控制在100字以内
- 如果没有匹配的商品，告诉用户暂时没有相关推荐

当你需要分析、推理、比较或做复杂判断时，使用<think>标签展示你的思考过程。
格式：<think>你的逐步推理过程...</think>最终给用户的回答
不需要深度思考的简单问题可以跳过<think>标签，直接回答。`
```

- [ ] **步骤 2：修改 stream 端点的流解析逻辑，识别 `<think>` 标签**

在 `server/routes/ai.ts` 的 `/chat/stream` 端点中，替换第 372-402 行的流解析逻辑。将原来直接转发 chunk 的逻辑改为：识别 `<think>` 标签内容，分别发送 `thinking` 和 `chunk` 事件。

找到这段代码（约第 372-402 行）：
```typescript
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
```

替换为：
```typescript
    const decoder = new TextDecoder()
    let buffer = ''
    let fullReply = ''
    let inThinking = false
    let thinkingContent = ''

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

            // 解析 <think> 标签
            if (delta.includes('<think>')) {
              inThinking = true
              const afterTag = delta.split('<think>')[1] || ''
              if (afterTag) {
                thinkingContent += afterTag
                sendEvent({ type: 'thinking', text: afterTag })
              }
              continue
            }

            if (inThinking) {
              if (delta.includes('</think>')) {
                inThinking = false
                const beforeClose = delta.split('</think>')[0] || ''
                if (beforeClose) {
                  thinkingContent += beforeClose
                  sendEvent({ type: 'thinking', text: beforeClose })
                }
                // </think> 之后的内容是正式回答
                const afterClose = delta.split('</think>')[1] || ''
                if (afterClose) {
                  sendEvent({ type: 'chunk', text: afterClose })
                }
                continue
              }
              // 还在 <think> 标签内
              thinkingContent += delta
              sendEvent({ type: 'thinking', text: delta })
              continue
            }

            // 不在 <think> 标签内，正常推送
            sendEvent({ type: 'chunk', text: delta })
          }
        } catch {
          // skip malformed JSON
        }
      }
    }
```

- [ ] **步骤 3：重启后端，用 curl 测试深度思考 SSE 流**

```bash
cd server && pnpm dev
```

在另一个终端测试：
```bash
curl -N -X POST http://localhost:3000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"帮我分析一下春季穿什么比较好，要考虑天气和场合","history":[],"sessionId":"test"}'
```

预期：先看到 `event: thinking` 类型的 data，然后是 `event: chunk` 类型的 data，最后是 `event: done`。

- [ ] **步骤 4：Commit**

```bash
git add server/routes/ai.ts
git commit -m "feat(ai): add deep thinking with <think> tag parsing and SSE thinking events"
```

---

### 任务 2：后端 — 穿搭推荐端点（Dashscope 文生图）

**文件：**
- 修改：`server/routes/ai.ts`（新增端点）
- 修改：`server/.env`（新增 DASHSCOPE_API_KEY）

- [ ] **步骤 1：在 `server/.env` 中添加 Dashscope API Key**

在 `server/.env` 末尾添加（值留空，用户自行填写）：
```
DASHSCOPE_API_KEY=
```

同时在 `server/.env.example` 中添加：
```
# 通义万相 文生图 API（穿搭推荐功能）
DASHSCOPE_API_KEY=
```

- [ ] **步骤 2：在 `server/routes/ai.ts` 顶部添加 Dashscope 常量**

在文件顶部 `const router = Router()` 之后添加：

```typescript
// ─── Dashscope 通义万相配置 ──────────────────────────────────
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || ''
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1'
```

- [ ] **步骤 3：在 `server/routes/ai.ts` 底部（`export default router` 之前）添加穿搭推荐端点**

```typescript
// ─── 穿搭推荐（通义万相文生图）──────────────────────────────

/** 提交文生图异步任务 */
async function submitTextToImage(prompt: string, n = 4): Promise<string | null> {
  if (!DASHSCOPE_API_KEY) return null

  try {
    const resp = await fetch(
      `${DASHSCOPE_BASE_URL}/services/aigc/text2image/image-synthesis`,
      {
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
      },
    )
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
    const reply = typeof styleResponse.content === 'string'
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
          { role: 'system', content: '你是穿搭顾问，根据用户需求给出简短的穿搭建议，50字以内，用中文。' },
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
```

- [ ] **步骤 4：重启后端，用 curl 测试穿搭推荐**

```bash
curl -X POST http://localhost:3000/ai/outfit-recommend \
  -H "Content-Type: application/json" \
  -d '{"description":"适合约会的春季穿搭"}'
```

预期：返回 `{ code: "1", result: { images: [...], reply: "..." } }`（如果配了 DASHSCOPE_API_KEY）

- [ ] **步骤 5：Commit**

```bash
git add server/routes/ai.ts server/.env server/.env.example
git commit -m "feat(ai): add outfit recommendation endpoint with Dashscope wanx-v1"
```

---

### 任务 3：前端 — 扩展 StreamCallbacks + 新增穿搭推荐 API

**文件：**
- 修改：`src/services/ai.ts`

- [ ] **步骤 1：扩展 StreamCallbacks 接口，新增 onThinking 和 onImages**

在 `src/services/ai.ts` 第 18-25 行的 `StreamCallbacks` 接口中添加两个可选回调：

```typescript
/** SSE 流式聊天回调 */
export interface StreamCallbacks {
  onChunk: (text: string) => void
  onGoods: (
    goods: Array<{ id: string; name: string; price: number; picture: string }>,
  ) => void
  onDone: () => void
  onError: (err: Error) => void
  /** 深度思考内容（可选） */
  onThinking?: (text: string) => void
  /** 穿搭推荐图片 URLs（可选） */
  onImages?: (urls: string[]) => void
}
```

- [ ] **步骤 2：在 `postAiChatStreamAPI` 中处理 `thinking` 事件**

在 `src/services/ai.ts` 的 `postAiChatStreamAPI` 函数中，SSE 事件解析部分（约第 76-84 行）添加 `thinking` 事件处理：

找到：
```typescript
              if (evt.type === 'chunk') {
                fullReply += evt.text
                callbacks.onChunk(fullReply)
              } else if (evt.type === 'goods') {
```

替换为：
```typescript
              if (evt.type === 'thinking') {
                callbacks.onThinking?.(evt.text || '')
              } else if (evt.type === 'chunk') {
                fullReply += evt.text
                callbacks.onChunk(fullReply)
              } else if (evt.type === 'goods') {
```

- [ ] **步骤 3：新增 `postOutfitRecommendStreamAPI` 函数**

在 `src/services/ai.ts` 文件末尾（`postAiAnalyzeImageStreamAPI` 函数之后）添加：

```typescript
/** 穿搭推荐（SSE 流式）- 仅 H5 支持 */
export const postOutfitRecommendStreamAPI = (
  data: { description: string },
  callbacks: StreamCallbacks,
) => {
  const token = uni.getStorageSync('member_profile')
    ? JSON.parse(uni.getStorageSync('member_profile'))?.token
    : ''

  const controller = new AbortController()

  fetch(`${baseURL}/ai/outfit-recommend/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  })
    .then(async (resp) => {
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`)
      }
      const reader = resp.body?.getReader()
      if (!reader) throw new Error('ReadableStream not supported')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullReply = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim()
            if (!jsonStr || jsonStr === '[DONE]') continue
            try {
              const evt = JSON.parse(jsonStr)
              if (evt.type === 'chunk') {
                fullReply += evt.text
                callbacks.onChunk(fullReply)
              } else if (evt.type === 'image') {
                callbacks.onImages?.(evt.urls || [])
              } else if (evt.type === 'done') {
                callbacks.onDone()
              } else if (evt.type === 'error') {
                callbacks.onError(new Error(evt.message))
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
      callbacks.onDone()
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err)
      }
    })

  return controller
}
```

- [ ] **步骤 4：Commit**

```bash
git add src/services/ai.ts
git commit -m "feat(ai): extend StreamCallbacks with onThinking/onImages, add outfit recommend API"
```

---

### 任务 4：前端 — ChatPanel 深度思考 UI

**文件：**
- 修改：`src/components/ChatPanel.vue`

- [ ] **步骤 1：扩展 ChatMessage 类型，新增 thinking 和 images 字段**

在 `src/components/ChatPanel.vue` 第 14-22 行的 `ChatMessage` 接口中添加字段：

```typescript
interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  image?: string
  goods?: Array<{ id: string; name: string; price: number; picture: string }>
  streaming?: boolean
  /** 深度思考过程 */
  thinking?: string
  /** 穿搭推荐图片 */
  images?: string[]
}
```

- [ ] **步骤 2：修改快捷入口，新增"深度思考"按钮**

将第 33-38 行的 `quickActions` 改为：

```typescript
const quickActions = [
  { icon: '🛍️', text: '今日好物推荐', message: '推荐一些今日好物' },
  { icon: '🧠', text: '深度思考', message: '帮我分析一下当前平台有什么值得买的商品' },
  { icon: '👗', text: '穿搭推荐', message: '' },
  { icon: '🏠', text: '家居好物', message: '推荐一些好用的家居产品' },
  { icon: '📸', text: '图片分析', message: '' },
]
```

- [ ] **步骤 3：新增穿搭推荐输入弹窗状态**

在 `const pendingImage = ref('')` 之后添加：

```typescript
// 穿搭推荐弹窗
const showOutfitPopup = ref(false)
const outfitDescription = ref('')
```

- [ ] **步骤 4：修改快捷入口点击逻辑，穿搭推荐弹出输入框**

找到 `quickActions` 的点击处理（在 template 中），需要给"穿搭推荐"特殊处理。先看当前的点击逻辑——搜索 `@tap` 或 `@click` 在 quickActions 上的绑定。

在 script 中新增穿搭推荐确认函数：

```typescript
// 确认穿搭推荐
const confirmOutfit = () => {
  if (!outfitDescription.value.trim()) return
  showOutfitPopup.value = false
  sendOutfitMessage(outfitDescription.value.trim())
  outfitDescription.value = ''
}
```

- [ ] **步骤 5：新增 `sendOutfitMessage` 函数**

在 `sendImageMessage` 函数之后添加：

```typescript
// 发送穿搭推荐消息
const sendOutfitMessage = async (description: string) => {
  // 添加用户消息
  messages.value.push({ id: ++msgId, role: 'user', content: `穿搭推荐：${description}` })
  scrollToBottom()

  isLoading.value = true

  // #ifdef H5
  const aiMsgId = ++msgId
  messages.value.push({
    id: aiMsgId,
    role: 'assistant',
    content: '',
    streaming: true,
    images: [],
  })
  scrollToBottom()

  postOutfitRecommendStreamAPI(
    { description },
    {
      onChunk(fullText) {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) {
          msg.content = fullText
          scrollToBottom()
        }
      },
      onImages(urls) {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) {
          msg.images = urls
          scrollToBottom()
        }
      },
      onDone() {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) msg.streaming = false
        isLoading.value = false
      },
      onError(err) {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) {
          msg.content = '抱歉，穿搭推荐暂时不可用～'
          msg.streaming = false
        }
        isLoading.value = false
      },
    },
  )
  // #endif

  // #ifndef H5
  // 非 H5 端走非流式接口
  try {
    const res = await postAiChatAPI({
      message: `请为我推荐穿搭：${description}`,
      history: [],
    })
    messages.value.push({
      id: ++msgId,
      role: 'assistant',
      content: res.result.reply,
    })
  } catch {
    messages.value.push({
      id: ++msgId,
      role: 'assistant',
      content: '抱歉，穿搭推荐暂时不可用～',
    })
  } finally {
    isLoading.value = false
  }
  // #endif
}
```

注意：需要在文件顶部的 import 中添加 `postOutfitRecommendStreamAPI`：

```typescript
import {
  postAiChatAPI,
  postAiChatStreamAPI,
  postAiAnalyzeImageAPI,
  postAiAnalyzeImageStreamAPI,
  postOutfitRecommendStreamAPI,
} from '@/services/ai'
```

- [ ] **步骤 6：修改 `streamChat` 函数，支持 `onThinking` 回调**

在 `src/components/ChatPanel.vue` 的 `streamChat` 函数中（约第 178-199 行），在 `postAiChatStreamAPI` 的回调对象中添加 `onThinking`：

找到 `streamChat` 函数中的 `postAiChatStreamAPI` 调用，在回调对象中添加：

```typescript
  postAiChatStreamAPI(
    { message: content, history, sessionId: 'default' },
    {
      onThinking(text) {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) {
          msg.thinking = (msg.thinking || '') + text
        }
      },
      onChunk(fullText) {
        // ... 现有代码不变
```

- [ ] **步骤 7：Commit**

```bash
git add src/components/ChatPanel.vue
git commit -m "feat(ai): add deep thinking UI with collapsible thinking process"
```

---

### 任务 5：前端 — ChatPanel 穿搭推荐 UI（图片网格 + 输入弹窗）

**文件：**
- 修改：`src/components/ChatPanel.vue`

- [ ] **步骤 1：在 template 中添加穿搭推荐输入弹窗**

在 `<uni-popup>` 或面板底部之前添加穿搭推荐输入弹窗：

```html
<!-- 穿搭推荐输入弹窗 -->
<view class="outfit-popup-mask" v-if="showOutfitPopup" @tap="showOutfitPopup = false">
  <view class="outfit-popup" @tap.stop>
    <view class="outfit-popup-title">描述你想要的穿搭</view>
    <input
      class="outfit-popup-input"
      v-model="outfitDescription"
      placeholder="如：适合约会的春季穿搭"
      confirm-type="send"
      @confirm="confirmOutfit"
    />
    <view class="outfit-popup-actions">
      <view class="outfit-popup-btn" @tap="showOutfitPopup = false">取消</view>
      <view class="outfit-popup-btn primary" @tap="confirmOutfit">生成推荐</view>
    </view>
  </view>
</view>
```

- [ ] **步骤 2：在消息气泡中添加思考过程折叠展示**

在 assistant 消息气泡中（消息内容之前），添加思考过程折叠区域。找到 assistant 消息的模板部分，在 `{{ msg.content }}` 之前添加：

```html
<!-- 深度思考折叠 -->
<view v-if="msg.thinking" class="thinking-block">
  <view class="thinking-toggle" @tap="msg._thinkingExpanded = !msg._thinkingExpanded">
    <text class="thinking-icon">💡</text>
    <text class="thinking-label">
      查看思考过程（{{ msg.thinking.split('\n').filter((s: string) => s.trim()).length }} 步）
    </text>
    <text class="thinking-arrow">{{ msg._thinkingExpanded ? '▲' : '▼' }}</text>
  </view>
  <view v-if="msg._thinkingExpanded" class="thinking-content">
    {{ msg.thinking }}
  </view>
</view>
```

注意：`ChatMessage` 接口需要额外加一个 `_thinkingExpanded?: boolean` 字段（用于 UI 状态，不持久化）：

```typescript
interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  image?: string
  goods?: Array<{ id: string; name: string; price: number; picture: string }>
  streaming?: boolean
  thinking?: string
  images?: string[]
  _thinkingExpanded?: boolean
}
```

- [ ] **步骤 3：在消息气泡中添加穿搭图片网格**

在 assistant 消息气泡中，消息内容之后添加图片网格：

```html
<!-- 穿搭推荐图片 -->
<view v-if="msg.images && msg.images.length" class="outfit-images">
  <image
    v-for="(img, idx) in msg.images"
    :key="idx"
    class="outfit-image"
    :src="img"
    mode="aspectFill"
    @tap="previewOutfitImage(msg.images!, idx)"
  />
</view>
<!-- 图片加载骨架屏 -->
<view v-else-if="msg.streaming && msg.content && !msg.thinking" class="outfit-images skeleton">
  <view class="outfit-image skeleton-item" />
  <view class="outfit-image skeleton-item" />
  <view class="outfit-image skeleton-item" />
  <view class="outfit-image skeleton-item" />
</view>
```

- [ ] **步骤 4：添加 `previewOutfitImage` 函数**

在 script 中添加：

```typescript
// 预览穿搭图片
const previewOutfitImage = (urls: string[], current: number) => {
  uni.previewImage({
    urls,
    current,
  })
}
```

- [ ] **步骤 5：修改快捷入口点击逻辑，穿搭推荐触发弹窗**

找到 template 中 quickActions 的点击事件。当前应该是类似 `@tap="sendMessage(action.message)"` 的写法。

需要改为：如果是穿搭推荐（`action.text === '穿搭推荐'`），则弹出输入框而非直接发送。

在 template 中找到 quickActions 的渲染部分，修改点击事件：

```html
<view
  v-for="action in quickActions"
  :key="action.text"
  class="quick-action"
  @tap="action.text === '穿搭推荐' ? (showOutfitPopup = true) : sendMessage(action.message)"
>
```

- [ ] **步骤 6：添加样式**

在 `<style>` 部分添加以下样式：

```scss
// 穿搭推荐输入弹窗
.outfit-popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.outfit-popup {
  width: 600rpx;
  background-color: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
}

.outfit-popup-title {
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  margin-bottom: 30rpx;
}

.outfit-popup-input {
  width: 100%;
  height: 80rpx;
  border: 1rpx solid #ddd;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.outfit-popup-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 30rpx;
  gap: 20rpx;
}

.outfit-popup-btn {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border-radius: 72rpx;
  border: 1rpx solid #ddd;
  font-size: 28rpx;
  color: #666;

  &.primary {
    color: #fff;
    background-color: #27ba9b;
    border-color: #27ba9b;
  }
}

// 深度思考折叠
.thinking-block {
  margin-bottom: 16rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.thinking-toggle {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  background-color: #f0f7ff;
  border-radius: 12rpx;
  gap: 8rpx;
}

.thinking-icon {
  font-size: 28rpx;
}

.thinking-label {
  flex: 1;
  font-size: 24rpx;
  color: #6b8eb5;
}

.thinking-arrow {
  font-size: 22rpx;
  color: #6b8eb5;
}

.thinking-content {
  padding: 20rpx;
  background-color: #f8f9fa;
  border-radius: 0 0 12rpx 12rpx;
  font-size: 24rpx;
  color: #666;
  line-height: 1.8;
  white-space: pre-wrap;
  max-height: 400rpx;
  overflow-y: auto;
}

// 穿搭图片网格
.outfit-images {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
  margin-top: 16rpx;
}

.outfit-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12rpx;
  background-color: #f5f5f5;
}

// 骨架屏
.skeleton-item {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

- [ ] **步骤 7：Commit**

```bash
git add src/components/ChatPanel.vue
git commit -m "feat(ai): add outfit recommendation UI with image grid and input popup"
```

---

### 任务 6：端到端验证

- [ ] **步骤 1：启动前后端开发服务器**

```bash
# 终端 1：后端
cd server && pnpm dev

# 终端 2：前端
pnpm dev:h5
```

- [ ] **步骤 2：验证深度思考功能**

1. 打开首页，点击 AI 助手浮窗
2. 点击"深度思考"快捷入口
3. 观察：消息气泡中是否出现"💡 查看思考过程"折叠区域
4. 点击折叠区域，验证思考过程内容展示
5. 再次点击，验证折叠

- [ ] **步骤 3：验证穿搭推荐功能**

1. 点击"穿搭推荐"快捷入口
2. 弹出输入框，输入"适合约会的春季穿搭"
3. 点击"生成推荐"
4. 观察：先出现文案推荐，再出现 4 张图片（2x2 网格）
5. 点击图片，验证全屏预览

- [ ] **步骤 4：验证无回归**

1. 发送普通消息"推荐一些好物"，验证正常聊天不受影响
2. 上传图片分析，验证图片分析功能正常

- [ ] **步骤 5：最终 Commit**

```bash
git add -A
git commit -m "feat(ai): complete deep thinking and outfit recommendation features"
```
