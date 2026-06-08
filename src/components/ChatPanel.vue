<script setup lang="ts">
import { ref, nextTick } from 'vue'
import {
  postAiChatAPI,
  postAiChatStreamAPI,
  postAiAnalyzeImageAPI,
  postAiAnalyzeImageStreamAPI,
  postOutfitRecommendStreamAPI,
} from '@/services/ai'

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 消息类型
interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  image?: string
  goods?: Array<{ id: string; name: string; price: number; picture: string }>
  streaming?: boolean
  /** 深度思考过程 */
  thinking?: string
  /** UI状态：思考过程是否展开 */
  _thinkingExpanded?: boolean
  /** 穿搭推荐图片 */
  images?: string[]
}

// 消息列表
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const isLoading = ref(false)
const scrollToId = ref('')
const pendingImage = ref('')
let msgId = 0

// 聊天模式：normal / thinking / outfit
const chatMode = ref<'normal' | 'thinking' | 'outfit'>('normal')

// 快捷入口
const quickActions = [
  { icon: '🛍️', text: '今日好物推荐', message: '推荐一些今日好物' },
  { icon: '🏠', text: '家居好物', message: '推荐一些好用的家居产品' },
  { icon: '📸', text: '图片分析', message: '' },
]

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    scrollToId.value = ''
    nextTick(() => {
      scrollToId.value = 'msg-' + msgId
    })
  })
}

// 选择图片
const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const filePath = res.tempFilePaths[0]
      // 转为 base64
      // #ifdef H5
      fetch(filePath)
        .then((r) => r.blob())
        .then((blob) => {
          const reader = new FileReader()
          reader.onload = () => {
            pendingImage.value = reader.result as string
          }
          reader.readAsDataURL(blob)
        })
      // #endif
      // #ifdef APP-PLUS
      // App 端：用 plus.io 读取文件
      plus.io.resolveLocalFileSystemURL(filePath, (entry: any) => {
        entry.file((file: any) => {
          const reader = new plus.io.FileReader()
          reader.onloadend = (e: any) => {
            pendingImage.value = e.target.result
          }
          reader.readAsDataURL(file)
        })
      })
      // #endif
      // #ifdef MP-WEIXIN
      // 小程序端：用 getFileSystemManager
      const fs = uni.getFileSystemManager()
      fs.readFile({
        filePath,
        encoding: 'base64',
        success: (data) => {
          const ext = filePath.split('.').pop() || 'jpeg'
          const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
          pendingImage.value = `data:${mime};base64,${data.data}`
        },
      })
      // #endif
    },
  })
}

// 移除待发送图片
const removePendingImage = () => {
  pendingImage.value = ''
}

// 发送消息（H5 走 SSE 流式，其他端走普通接口）
const sendMessage = async (text?: string) => {
  const content = text || inputText.value.trim()

  // 如果有待发送图片，走图片分析
  if (pendingImage.value) {
    await sendImageMessage(content || '请分析这张图片')
    return
  }

  if (!content || isLoading.value) return

  // 穿搭推荐模式
  if (chatMode.value === 'outfit') {
    sendOutfitMessage(content)
    inputText.value = ''
    return
  }

  // 添加用户消息
  messages.value.push({ id: ++msgId, role: 'user', content })
  inputText.value = ''
  scrollToBottom()

  // 构造历史记录
  const history = messages.value.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }))

  isLoading.value = true
  console.log('[sendMessage] chatMode:', chatMode.value, '| thinking:', chatMode.value === 'thinking')

  // #ifdef H5
  await streamChat(content, history, chatMode.value === 'thinking')
  // #endif

  // #ifndef H5
  await normalChat(content, history)
  // #endif
}

// 发送图片分析消息
const sendImageMessage = async (question: string) => {
  const image = pendingImage.value
  pendingImage.value = ''
  inputText.value = ''

  // 添加用户消息（带图片）
  messages.value.push({
    id: ++msgId,
    role: 'user',
    content: question,
    image,
  })
  scrollToBottom()

  isLoading.value = true

  // #ifdef H5
  await streamImageChat(image, question)
  // #endif

  // #ifndef H5
  await normalImageChat(image, question)
  // #endif
}

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
          console.log('[onImages] setting images:', urls.length)
          msg.images.splice(0, msg.images.length, ...urls)
          console.log('[onImages] msg.images after:', msg.images.length)
          scrollToBottom()
        }
      },
      onDone() {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) msg.streaming = false
        isLoading.value = false
      },
      onError() {
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

// 预览图片
const previewImage = (url: string) => {
  uni.previewImage({
    urls: [url],
    current: url,
  })
}

// 预览穿搭图片
const previewOutfitImage = (urls: string[], current: number) => {
  uni.previewImage({
    urls,
    current,
  })
}

// SSE 流式聊天（H5）
const streamChat = async (content: string, history: Array<{ role: string; content: string }>, thinking = false) => {
  const aiMsgId = ++msgId
  messages.value.push({
    id: aiMsgId,
    role: 'assistant',
    content: '',
    streaming: true,
  })
  scrollToBottom()

  postAiChatStreamAPI(
    { message: content, history, sessionId: 'default', thinking },
    {
      onThinking(text) {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) {
          msg.thinking = (msg.thinking || '') + text
        }
      },
      onChunk(fullText) {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) {
          msg.content = fullText
          scrollToBottom()
        }
      },
      onGoods(goods) {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) {
          msg.goods = goods
        }
      },
      onDone() {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) {
          msg.streaming = false
        }
        isLoading.value = false
        scrollToBottom()
      },
      onError() {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) {
          if (!msg.content) {
            msg.content = '抱歉，我暂时无法回答，请稍后再试～'
          }
          msg.streaming = false
        }
        isLoading.value = false
      },
    },
  )
}

// 普通聊天（小程序/App）
const normalChat = async (content: string, history: Array<{ role: string; content: string }>) => {
  try {
    const res = await postAiChatAPI({ message: content, history })
    messages.value.push({
      id: ++msgId,
      role: 'assistant',
      content: res.result.reply,
      goods: res.result.goods,
    })
    scrollToBottom()
  } catch {
    messages.value.push({
      id: ++msgId,
      role: 'assistant',
      content: '抱歉，我暂时无法回答，请稍后再试～',
    })
  } finally {
    isLoading.value = false
  }
}

// 图片分析（SSE 流式，H5）
const streamImageChat = async (image: string, message: string) => {
  const aiMsgId = ++msgId
  messages.value.push({
    id: aiMsgId,
    role: 'assistant',
    content: '',
    streaming: true,
  })
  scrollToBottom()

  postAiAnalyzeImageStreamAPI(
    { image, message, sessionId: 'default' },
    {
      onChunk(fullText) {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) {
          msg.content = fullText
          scrollToBottom()
        }
      },
      onDone() {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) {
          msg.streaming = false
        }
        isLoading.value = false
        scrollToBottom()
      },
      onError() {
        const msg = messages.value.find((m) => m.id === aiMsgId)
        if (msg) {
          if (!msg.content) {
            msg.content = '图片分析暂时不可用，请稍后再试～'
          }
          msg.streaming = false
        }
        isLoading.value = false
      },
    },
  )
}

// 图片分析（普通，小程序/App）
const normalImageChat = async (image: string, message: string) => {
  try {
    const res = await postAiAnalyzeImageAPI({ image, message })
    messages.value.push({
      id: ++msgId,
      role: 'assistant',
      content: res.result.reply,
    })
    scrollToBottom()
  } catch {
    messages.value.push({
      id: ++msgId,
      role: 'assistant',
      content: '图片分析暂时不可用，请稍后再试～',
    })
  } finally {
    isLoading.value = false
  }
}

// 点击快捷入口
const onQuickAction = (action: typeof quickActions[0]) => {
  if (action.message) {
    sendMessage(action.message)
  } else {
    chooseImage()
  }
}

// 点击商品卡片
const onGoodsClick = (goods: { id: string }) => {
  uni.navigateTo({ url: `/pages/goods/goods?id=${goods.id}` })
}
</script>

<template>
  <view class="chat-mask" @tap="emit('close')">
    <view class="chat-panel" @tap.stop>
      <!-- 头部 -->
      <view class="header">
        <text class="title">🐰 小兔AI助手</text>
        <text class="close" @tap="emit('close')">✕</text>
      </view>

      <!-- 消息列表 -->
      <scroll-view
        class="message-list"
        scroll-y
        :scroll-into-view="scrollToId"
        scroll-with-animation
      >
        <!-- 欢迎消息 -->
        <view v-if="messages.length === 0" class="welcome">
          <text class="welcome-text">你好呀！我是小兔🐰</text>
          <text class="welcome-desc">有什么购物问题都可以问我哦～</text>
          <!-- 快捷入口 -->
          <view class="quick-actions">
            <view
              v-for="action in quickActions"
              :key="action.text"
              class="quick-item"
              @tap="onQuickAction(action)"
            >
              <text class="quick-icon">{{ action.icon }}</text>
              <text class="quick-text">{{ action.text }}</text>
            </view>
          </view>
        </view>

        <!-- 消息气泡 -->
        <view
          v-for="msg in messages"
          :key="msg.id"
          :id="'msg-' + msg.id"
          class="message-item"
          :class="msg.role"
        >
          <!-- AI 头像 -->
          <image
            v-if="msg.role === 'assistant'"
            class="msg-avatar"
            src="/static/lottie/assistant.png"
          />
          <!-- 深度思考折叠 -->
          <view v-if="msg.thinking" class="thinking-block">
            <view class="thinking-toggle" @tap="msg._thinkingExpanded = !msg._thinkingExpanded">
              <text class="thinking-icon">💡</text>
              <text class="thinking-label">
                查看思考过程（{{ msg.thinking.split('\n').filter((s: string) => s.trim()).length }}
                步）
              </text>
              <text class="thinking-arrow">{{ msg._thinkingExpanded ? '▲' : '▼' }}</text>
            </view>
            <view v-if="msg._thinkingExpanded" class="thinking-content">
              {{ msg.thinking }}
            </view>
          </view>
          <view class="bubble" :class="[msg.role, { streaming: msg.streaming }]">
            <!-- 图片消息 -->
            <image
              v-if="msg.image"
              class="bubble-image"
              :src="msg.image"
              mode="widthFix"
              @tap="previewImage(msg.image!)"
            />
            <text v-if="msg.content" class="bubble-text">{{ msg.content }}</text>
            <text v-if="msg.streaming" class="cursor">▊</text>
          </view>

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

          <!-- 商品卡片 -->
          <view v-if="msg.goods && msg.goods.length" class="goods-scroll">
            <scroll-view scroll-x class="goods-list">
              <view
                v-for="goods in msg.goods"
                :key="goods.id"
                class="goods-card"
                @tap="onGoodsClick(goods)"
              >
                <image class="goods-img" :src="goods.picture" mode="aspectFill" />
                <text class="goods-name">{{ goods.name }}</text>
                <text class="goods-price">¥{{ goods.price }}</text>
              </view>
            </scroll-view>
          </view>
        </view>

        <!-- 加载中 -->
        <view v-if="isLoading && !messages.some((m) => m.streaming)" class="message-item assistant">
          <image class="msg-avatar" src="/static/lottie/assistant.png" />
          <view class="bubble assistant loading">
            <text class="dot">·</text>
            <text class="dot">·</text>
            <text class="dot">·</text>
          </view>
        </view>
      </scroll-view>

      <!-- 待发送图片预览 -->
      <view v-if="pendingImage" class="pending-image-bar">
        <image class="pending-img" :src="pendingImage" mode="aspectFill" />
        <text class="pending-remove" @tap="removePendingImage">✕</text>
      </view>

      <!-- 模式切换 -->
      <view class="mode-bar">
        <view
          class="mode-tag"
          :class="{ active: chatMode === 'thinking' }"
          @tap="chatMode = chatMode === 'thinking' ? 'normal' : 'thinking'"
        >
          🧠 深度思考
        </view>
        <view
          class="mode-tag"
          :class="{ active: chatMode === 'outfit' }"
          @tap="chatMode = chatMode === 'outfit' ? 'normal' : 'outfit'"
        >
          👗 穿搭推荐
        </view>
      </view>

      <!-- 输入框 -->
      <view class="input-bar">
        <view class="img-btn" @tap="chooseImage">
          <text>📷</text>
        </view>
        <input
          class="input"
          v-model="inputText"
          :placeholder="chatMode === 'outfit' ? '描述你想要的穿搭...' : pendingImage ? '描述一下你想了解什么...' : '问我点什么吧...'"
          :disabled="isLoading"
          @confirm="sendMessage()"
        />
        <view
          class="send-btn"
          :class="{ active: inputText.trim() || pendingImage }"
          @tap="sendMessage()"
        >
          <text>发送</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.chat-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1001;
  pointer-events: auto;
  display: flex;
  align-items: flex-end;
}

.chat-panel {
  width: 100%;
  height: 65vh;
  background: #f5f5f5;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;

  .title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }

  .close {
    font-size: 36rpx;
    color: #999;
    padding: 10rpx;
  }
}

.message-list {
  flex: 1;
  padding: 20rpx;
}

.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;

  .welcome-text {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
  }

  .welcome-desc {
    font-size: 26rpx;
    color: #999;
    margin-top: 12rpx;
  }
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 32rpx;
  justify-content: center;

  .quick-item {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 16rpx 24rpx;
    background: #fff;
    border-radius: 32rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);

    .quick-icon {
      font-size: 28rpx;
    }

    .quick-text {
      font-size: 24rpx;
      color: #333;
    }
  }
}

.message-item {
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;

  &.user {
    align-items: flex-end;
  }

  &.assistant {
    align-items: flex-start;
  }

  .msg-avatar {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    margin-bottom: 8rpx;
  }
}

.bubble {
  max-width: 75%;
  padding: 20rpx 28rpx;
  border-radius: 24rpx;
  word-break: break-all;

  &.user {
    background: #27ba9b;
    color: #fff;
    border-bottom-right-radius: 8rpx;
  }

  &.assistant {
    background: #fff;
    color: #333;
    border-bottom-left-radius: 8rpx;
  }

  &.streaming {
    min-width: 40rpx;
  }

  &.loading {
    display: flex;
    gap: 8rpx;

    .dot {
      font-size: 36rpx;
      animation: blink 1.4s infinite;

      &:nth-child(2) {
        animation-delay: 0.2s;
      }
      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }

  .bubble-image {
    width: 300rpx;
    max-height: 400rpx;
    border-radius: 12rpx;
    margin-bottom: 12rpx;
    display: block;
  }

  .bubble-text {
    font-size: 28rpx;
    line-height: 1.6;
  }

  .cursor {
    font-size: 28rpx;
    color: #27ba9b;
    animation: blink-cursor 0.8s infinite;
    margin-left: 2rpx;
  }
}

@keyframes blink {
  0%,
  60%,
  100% {
    opacity: 0.2;
  }
  30% {
    opacity: 1;
  }
}

@keyframes blink-cursor {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.goods-scroll {
  margin-top: 12rpx;
  width: 100%;

  .goods-list {
    white-space: nowrap;
  }

  .goods-card {
    display: inline-flex;
    flex-direction: column;
    width: 200rpx;
    margin-right: 16rpx;
    background: #fff;
    border-radius: 16rpx;
    overflow: hidden;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);

    .goods-img {
      width: 200rpx;
      height: 200rpx;
    }

    .goods-name {
      font-size: 22rpx;
      color: #333;
      padding: 8rpx 12rpx 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 176rpx;
    }

    .goods-price {
      font-size: 24rpx;
      color: #e4393c;
      padding: 4rpx 12rpx 12rpx;
      font-weight: bold;
    }
  }
}

.pending-image-bar {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  background: #fff;
  border-top: 1rpx solid #eee;
  gap: 12rpx;

  .pending-img {
    width: 100rpx;
    height: 100rpx;
    border-radius: 12rpx;
  }

  .pending-remove {
    font-size: 32rpx;
    color: #999;
    padding: 8rpx;
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

.mode-bar {
  display: flex;
  gap: 16rpx;
  padding: 12rpx 24rpx 0;
  border-top: 1rpx solid #f0f0f0;

  .mode-tag {
    padding: 8rpx 20rpx;
    border-radius: 24rpx;
    font-size: 24rpx;
    color: #999;
    background-color: #f5f5f5;
    transition: all 0.2s;

    &.active {
      color: #fff;
      background-color: #27ba9b;
    }
  }
}

.input-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #eee;

  .img-btn {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36rpx;
  }

  .input {
    flex: 1;
    height: 72rpx;
    background: #f5f5f5;
    border-radius: 36rpx;
    padding: 0 28rpx;
    font-size: 28rpx;
  }

  .send-btn {
    padding: 16rpx 32rpx;
    background: #ccc;
    border-radius: 36rpx;
    color: #fff;
    font-size: 28rpx;

    &.active {
      background: #27ba9b;
    }
  }
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
</style>
