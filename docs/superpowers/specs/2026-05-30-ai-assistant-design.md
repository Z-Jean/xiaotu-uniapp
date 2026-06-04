# AI 购物助手设计文档

## 概述

为小兔鲜儿 App 添加全局 AI 购物助手功能：悬浮 3D 人物 + 底部弹窗聊天 + 智能商品推荐。

## 架构

```
前端 (uni-app)                    后端 (Express)
┌──────────────┐                  ┌─────────────────┐
│ AiAssistant   │                 │ POST /ai/chat    │
│ (全局悬浮)    │                 │ 1. 意图识别       │
│ Lottie 动画   │                 │ 2. 查商品库       │
└──────┬───────┘                  │ 3. 调 MiMo API   │
       │                          │ 4. 返回回复+商品  │
┌──────▼───────┐                  └────────┬────────┘
│ ChatPanel     │                           │
│ (底部弹窗)    │                  ┌────────▼────────┐
│ 消息+商品卡片 │                  │ MiMo API        │
└──────────────┘                  │ xiaomimimo.com   │
                                  └─────────────────┘
```

## 前端组件

### AiAssistant.vue（全局悬浮人物）

- 位置：App.vue 中引入，全局可见
- 右下角悬浮，可拖拽
- Lottie 待机动画（循环播放）
- 点击后播放打招呼动画，弹出聊天面板
- 未读提示小红点

### ChatPanel.vue（聊天面板）

- 底部弹窗，高度 60% 屏幕，半透明遮罩
- 顶部：标题 + 关闭按钮
- 中间：消息列表（文字气泡 + 商品卡片混排）
- 底部：输入框 + 发送按钮
- 快捷入口：4 个快捷按钮（今日好物/穿搭推荐/家居好物/帮我找商品）

### 消息类型

| 类型 | 样式 |
|------|------|
| 用户文字 | 右侧气泡 |
| AI 文字 | 左侧气泡 |
| 商品卡片 | 左侧横向滚动（图片+名称+价格） |

## 后端设计

### POST /ai/chat

请求：
```json
{
  "message": "推荐一些好用的家居产品",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

响应：
```json
{
  "code": "1",
  "msg": "操作成功",
  "result": {
    "reply": "好的，为你推荐几款热门家居好物～",
    "goods": [
      { "id": "1", "name": "xxx", "price": 99, "picture": "..." }
    ]
  }
}
```

### 处理流程

1. 收到用户消息
2. 关键词匹配意图（推荐/穿搭/家居/好物 → 查对应分类商品）
3. 商品信息 + 用户消息发给 MiMo API
4. 返回 AI 回复 + 推荐商品列表

### MiMo API

- 地址：`https://api.xiaomimimo.com/v1`
- 模型：`mimo-v2.5-pro`
- 协议：OpenAI 兼容

系统提示词：
```
你是小兔鲜儿的AI购物助手"小兔"，性格活泼可爱。
你的职责：
1. 根据用户需求推荐平台上的商品
2. 提供穿搭建议、家居好物推荐
3. 回答购物相关问题
规则：
- 只推荐平台上的商品，不编造不存在的商品
- 回复简洁友好，适合手机阅读
- 当用户询问推荐时，从提供的商品列表中选择最合适的推荐
```

## 多端适配

| 平台 | 悬浮人物 | 聊天面板 |
|------|---------|---------|
| H5 | position: fixed | uni-popup 底部弹窗 |
| 微信小程序 | cover-view | uni-popup 底部弹窗 |
| App | position: fixed | uni-popup 底部弹窗 |

Lottie 动画：
- H5/App：lottie-web
- 小程序：lottie-miniprogram
- 条件编译区分

## 文件结构

```
src/
├── components/
│   ├── AiAssistant.vue      # 全局悬浮人物
│   ├── ChatPanel.vue        # 聊天面板
│   └── ChatGoodsCard.vue    # 商品卡片组件
├── services/
│   └── ai.ts                # AI 接口
├── static/
│   └── lottie/
│       └── assistant.json   # Lottie 动画文件

server/
├── routes/
│   └── ai.ts                # AI 聊天接口
├── services/
│   └── mimo.ts              # MiMo API 封装
```
