# AI 深度思考 + 穿搭推荐功能设计

## 概述

为小兔鲜儿电商平台新增两个 AI 功能模块：

1. **深度思考** — LLM 回答时展示思考推理过程，前端折叠展示
2. **穿搭推荐** — 根据用户描述调用通义万相生成穿搭图片

## 功能一：深度思考

### 后端

**修改 `server/routes/ai.ts`：**

- 在 `SYSTEM_PROMPT` 中增加指令：当问题需要推理时，用 `<think>...</think>` 标签包裹思考过程，`</think>` 之后输出最终回答
- 修改 `/ai/chat/stream` SSE 流的解析逻辑：识别 `<think>` 标签内容
- 新增 SSE 事件类型 `thinking`，流式推送思考内容片段
- `chunk` 事件仅推送 `</think>` 之后的最终回答内容
- 流结束时发送 `done` 事件（同现有逻辑）

**SSE 事件格式：**

```
event: thinking
data: {"text": "让我分析一下..."}

event: thinking
data: {"text": "首先考虑用户的体型..."}

event: chunk
data: {"text": "根据您的需求，推荐..."}

event: done
data: {}
```

### 前端

**修改 `src/services/ai.ts`：**

- `StreamCallbacks` 接口新增 `onThinking?(text: string)` 回调
- 解析 SSE 流时，识别 `event: thinking` 事件，调用 `onThinking`

**修改 `src/components/ChatPanel.vue`：**

- 快捷入口区新增"深度思考"按钮（图标用 🧠 或灯泡）
- 消息数据结构新增 `thinking?: string` 字段，存储思考过程文本
- 流式接收时：`thinking` 事件追加到 `thinking` 字段，`chunk` 事件追加到 `content` 字段
- 消息气泡中，思考过程用折叠组件展示：
  - 默认折叠，显示"💡 查看思考过程（N 步）"
  - 点击展开，显示浅灰背景 + 缩进的思考文本
  - 支持再次点击折叠

## 功能二：穿搭推荐

### 后端

**安装依赖：** 无需额外 SDK，直接用 `fetch` 调用 Dashscope HTTP API

**新增 `POST /ai/outfit-recommend` 端点：**

- 请求体：`{ description: string }`（用户描述，如"适合约会的春季穿搭"）
- 处理流程：
  1. 构造通义万相 prompt：将用户描述翻译为英文 prompt + 中文关键词
  2. 调用 Dashscope `wanx-v1` 文生图 API（异步任务模式）
  3. 轮询获取图片 URL（通义万相是异步的，提交任务后需要轮询结果）
  4. 返回 `{ images: string[], reply: string }` — 图片 URL 列表 + 文案推荐

**Dashscope API 调用方式：**

```
POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis
Headers:
  Authorization: Bearer {DASHSCOPE_API_KEY}
  X-DashScope-Async: enable
Body:
  model: wanx-v1
  input: { prompt: "..." }
  parameters: { n: 4, size: "1024*1024" }
```

轮询任务状态：

```
GET https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}
```

**新增 `POST /ai/outfit-recommend/stream` SSE 端点：**

- 先推送 `chunk` 事件（穿搭文案推荐）
- 再推送 `image` 事件（图片 URL）
- 最后推送 `done` 事件

**SSE 事件格式：**

```
event: chunk
data: {"text": "为您推荐以下春季约会穿搭方案..."}

event: image
data: {"urls": ["https://...", "https://..."]}

event: done
data: {}
```

**环境变量：** 新增 `DASHSCOPE_API_KEY` 到 `server/.env`

### 前端

**修改 `src/services/ai.ts`：**

- 新增 `postOutfitRecommendStreamAPI(data, callbacks)` — SSE 流式穿搭推荐
- `StreamCallbacks` 接口新增 `onImages?(urls: string[])` 回调
- 解析 SSE 流时，识别 `image` 事件，调用 `onImages`

**修改 `src/components/ChatPanel.vue`：**

- 快捷入口区新增"穿搭推荐"按钮（图标用 👗）
- 点击后弹出输入框让用户描述需求（如"春季约会穿搭"）
- 消息数据结构新增 `images?: string[]` 字段
- 消息气泡中，图片用网格布局展示（2x2，最多 4 张）
- 图片加载时显示骨架屏
- 点击图片可全屏预览（`uni.previewImage`）

## 涉及文件

| 文件 | 操作 |
|------|------|
| `server/routes/ai.ts` | 修改 prompt + 新增 2 个端点 |
| `server/.env` | 新增 `DASHSCOPE_API_KEY` |
| `src/services/ai.ts` | 新增回调类型 + 新增 API 函数 |
| `src/components/ChatPanel.vue` | 新增快捷入口 + 消息类型扩展 + UI 组件 |

## 不做的事

- 不接入真正的推理模型（如 QwQ），用 `<think>` 标签方案
- 不做图片编辑/修改功能，只做文生图
- 不做穿搭历史记录
- 不做多轮对话式穿搭调整（一次生成）
