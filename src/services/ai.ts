import { http } from '@/utils/http'
import { API_BASE } from '@/config'

const baseURL = API_BASE

/** AI 聊天（非流式） */
export const postAiChatAPI = (data: {
  message: string
  history: Array<{ role: string; content: string }>
}) => {
  return http<{
    reply: string
    goods: Array<{ id: string; name: string; price: number; picture: string }>
  }>({ url: '/ai/chat', method: 'POST', data })
}

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

/** AI 聊天（SSE 流式）- 仅 H5 支持 */
export const postAiChatStreamAPI = (
  data: {
    message: string
    history: Array<{ role: string; content: string }>
    sessionId?: string
    thinking?: boolean
  },
  callbacks: StreamCallbacks,
) => {
  const token = uni.getStorageSync('member_profile')
    ? JSON.parse(uni.getStorageSync('member_profile'))?.token
    : ''

  const controller = new AbortController()

  fetch(`${baseURL}/ai/chat/stream`, {
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
              if (evt.type === 'thinking') {
                callbacks.onThinking?.(evt.text || '')
              } else if (evt.type === 'chunk') {
                fullReply += evt.text
                callbacks.onChunk(fullReply)
              } else if (evt.type === 'goods') {
                callbacks.onGoods(evt.goods || [])
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
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err)
      }
    })

  return controller
}

/** 图片分析（非流式） */
export const postAiAnalyzeImageAPI = (data: {
  image: string
  message?: string
  sessionId?: string
}) => {
  return http<{ reply: string }>({
    url: '/ai/analyze-image',
    method: 'POST',
    data,
  })
}

/** 图片分析（SSE 流式）- 仅 H5 支持 */
export const postAiAnalyzeImageStreamAPI = (
  data: {
    image: string
    message?: string
    sessionId?: string
  },
  callbacks: Omit<StreamCallbacks, 'onGoods'>,
) => {
  const token = uni.getStorageSync('member_profile')
    ? JSON.parse(uni.getStorageSync('member_profile'))?.token
    : ''

  const controller = new AbortController()

  fetch(`${baseURL}/ai/analyze-image/stream`, {
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
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err)
      }
    })

  return controller
}

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
                console.log('[SSE] image event received:', evt.urls?.length, 'urls')
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
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err)
      }
    })

  return controller
}
