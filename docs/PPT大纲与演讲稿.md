# 小兔鲜儿 — PPT 大纲与演讲稿

> 用于制作 PPT 和答辩演讲，每个 Slide 包含：标题、要点、关键代码、演讲稿

---

## Slide 1：封面

**标题**：小兔鲜儿 — 鲜食电商平台

**副标题**：基于 uni-app 的三端统一开发电商应用

**技术栈**：Vue3 + TypeScript + Express + MySQL + Docker

**演讲稿**：
> "大家好，我的项目是小兔鲜儿，一个鲜食电商平台。项目基于 uni-app 框架，使用 Vue3 + TypeScript 开发，通过条件编译技术实现了 H5、微信小程序、App 三端统一开发。后端使用 Express + MySQL，部署采用 Docker 容器化方案。"

---

## Slide 2：项目概述

**要点**：
- 鲜食电商：水果、蔬菜、肉蛋等生鲜食品
- 三端运行：H5 / 微信小程序 / App
- 完整功能：商品浏览 → 购物车 → 下单 → 支付 → 物流
- AI 助手：智能购物推荐、图片分析

**演讲稿**：
> "这是一个完整的鲜食电商平台，用户可以浏览水果、蔬菜、生鲜等商品，通过购物车下单购买。项目最大的特点是基于 uni-app 实现了一套代码三端运行，同时集成了 AI 智能购物助手，支持自然语言对话和图片分析。"

---

## Slide 3：技术架构图

**要点**：

```
前端（uni-app）  →  后端（Express）  →  数据库（MySQL）
    ↓                    ↓
条件编译              外部服务
三端适配           OSS / 地图 / AI / 短信
```

**演讲稿**：
> "整体架构分为三层：前端使用 uni-app 跨平台框架，后端使用 Express.js 提供 RESTful API，数据存储使用 MySQL。后端还集成了阿里云 OSS、高德地图、MiMo AI 等外部服务。"

---

## Slide 4：核心技术亮点总览

**要点**：

| 亮点 | 技术 | 价值 |
|------|------|------|
| 多端开发 | 条件编译 | 一套代码，三端运行 |
| 商品管理 | SKU 模型 | 规格联动选择 |
| AI 助手 | LangChain + MiMo | 智能购物推荐 |
| 云存储 | 阿里云 OSS | 图片安全存储 |
| 短信登录 | 阿里云 SMS | 验证码登录 |
| 地图服务 | 高德地图 | 物流轨迹可视化 |
| 容器化 | Docker | 一键部署 |
| 状态管理 | Pinia 持久化 | 跨平台登录保持 |

**演讲稿**：
> "项目有 8 个核心技术亮点，我重点讲解其中 5 个：多端条件编译、SKU 商品管理、AI 智能助手、Docker 容器化部署、以及阿里云 OSS 集成。"

---

## Slide 5：亮点 1 — 多端条件编译

**标题**：一套代码，三端运行

**要点**：
- 条件编译：编译时代码隔离技术
- 项目中 14 个文件、37 处使用
- 覆盖 H5、微信小程序、App 三端

**关键代码**：

```typescript
// API 地址多端配置
// #ifdef H5
export const API_BASE = import.meta.env.DEV 
  ? 'http://localhost:3000' 
  : ''
// #endif

// #ifndef H5
export const API_BASE = 'http://10.107.246.104:3000'
// #endif
```

**演讲稿**：
> "条件编译是 uni-app 跨平台的核心能力。通过 `#ifdef` 和 `#ifndef` 指令，我们可以在同一份代码中为不同平台编写不同的实现。比如 API 地址，H5 开发环境用 localhost，生产环境用空字符串走 Nginx 代理，小程序端则用局域网 IP。编译时只会保留对应平台的代码。"

---

## Slide 6：条件编译 — 更多应用场景

**要点**：

| 场景 | H5 | 微信小程序 | App |
|------|-----|-----------|-----|
| 图片读取 | FileReader | FileSystemManager | plus.io.FileReader |
| 选择图片 | uni.chooseImage | uni.chooseMedia | uni.chooseImage |
| 地址选择 | uni-data-picker | 原生 picker | uni-data-picker |
| 客服按钮 | 无 | open-type="contact" | 无 |

**关键代码**：

```typescript
// 图片转 Base64 — 三端各自实现

// H5 端
// #ifdef H5
const reader = new FileReader()
reader.readAsDataURL(blob)
// #endif

// 微信小程序端
// #ifdef MP-WEIXIN
const fs = uni.getFileSystemManager()
fs.readFile({ filePath, encoding: 'base64' })
// #endif

// App 端
// #ifdef APP-PLUS
const reader = new plus.io.FileReader()
reader.readAsDataURL(file)
// #endif
```

**演讲稿**：
> "同一个'图片转 Base64'功能，在三个平台使用完全不同的原生 API。H5 用浏览器的 FileReader，微信小程序用 FileSystemManager，App 端用 5+ API 的 plus.io.FileReader。条件编译让三套代码共存于同一个文件，编译时自动隔离。"

---

## Slide 7：亮点 2 — SKU 商品规格管理

**标题**：电商核心：SKU 规格联动选择

**要点**：
- SPU（标准产品单元）→ SKU（库存量单位）
- 一个商品有多个规格维度（颜色、容量等）
- 每个规格组合对应独立的价格和库存

**数据模型**：

```
goods (SPU)          goods_skus (SKU)
┌──────────────┐     ┌──────────────────┐
│ id           │◄────│ goods_id         │
│ name         │     │ price            │
│ price        │     │ inventory        │
│ main_pictures│     │ specs (JSON)     │
└──────────────┘     └──────────────────┘
```

**演讲稿**：
> "SKU 是电商系统的核心数据模型。一个手机有 6 种颜色和 3 种容量，就会产生 18 个 SKU，每个都有独立的价格和库存。我们设计了 SPU-SKU-Specs 三层数据结构，通过路径检查算法实现规格联动选择。"

---

## Slide 8：SKU 选择算法

**标题**：路径检查算法 — 规格联动的核心

**要点**：

```
用户点击规格值
    ↓
checkInpath() 遍历所有组合
    ↓
检查当前已选 + 该值 是否存在于 shopItemInfo
    ↓
存在 = 可选（高亮）
不存在 = 不可选（灰显）
    ↓
所有维度选完 → 取出对应 SKU → 显示价格/库存
```

**关键代码**：

```typescript
// 路径检查算法核心逻辑
checkInpath(index) {
  // 遍历所有 SKU
  for (let key in this.shopItemInfo) {
    let item = this.shopItemInfo[key]
    // 检查当前组合是否存在
    if (item.stock > 0) {
      // 标记为可选
      item.ishow = true
    } else {
      // 标记为不可选（灰显）
      item.ishow = false
    }
  }
}
```

**演讲稿**：
> "这个算法的核心是维护一个 shopItemInfo 字典，key 是规格值的组合（如'红色,256G'），value 是对应的 SKU 对象。用户每次选择时，我们遍历所有组合，检查当前已选的规格加上用户点击的值是否存在于字典中。存在则可选，不存在则灰显。当所有维度都选完时，取出对应的 SKU 显示价格和库存。"

---

## Slide 9：亮点 3 — AI 智能购物助手

**标题**：LangChain + MiMo LLM 架构

**架构图**：

```
用户消息
    ↓
关键词意图识别（17 个关键词）
    ↓
LangChain Tool 调度
├── search_goods（关键词搜索）
├── category_goods（分类查询）
└── recommend_goods（随机推荐）
    ↓
MiMo LLM 生成回复
    ↓
SSE 流式输出（H5 端）
```

**演讲稿**：
> "我们集成了 LangChain 框架构建 AI 购物助手。架构分三层：首先是确定性意图识别，用 17 个关键词映射到商品分类，避免依赖 LLM 做意图识别（成本高、延迟大）；然后是 LangChain Tool 调度，定义了搜索、分类、推荐三个工具；最后是 MiMo LLM 生成回复。H5 端还实现了 SSE 流式输出，用户可以看到 AI 逐字回复。"

---

## Slide 10：AI 自定义 LLM 适配器

**标题**：自定义 MiMoChatModel

**关键代码**：

```typescript
// 继承 LangChain 的 BaseChatModel
class MiMoChatModel extends BaseChatModel {
  async _generate(messages) {
    const response = await fetch(
      'https://api.xiaomimimo.com/v1/chat/completions',
      {
        method: 'POST',
        body: JSON.stringify({
          model: 'mimo-v2.5',
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          max_tokens: 800,
          temperature: 0.7,
        })
      }
    )
    // 解析返回...
  }
}

// 定义 LangChain Tool
const searchGoodsTool = new DynamicStructuredTool({
  name: 'search_goods',
  description: '根据关键词搜索商品',
  schema: z.object({
    keyword: z.string().describe('搜索关键词')
  }),
  func: async ({ keyword }) => {
    const [rows] = await db.query(
      'SELECT * FROM goods WHERE name LIKE ?',
      [`%${keyword}%`])
    return JSON.stringify(rows.slice(0, 5))
  }
})
```

**演讲稿**：
> "我们没有直接使用 LangChain 内置的 ChatOpenAI，而是自定义了 MiMoChatModel 类，继承 BaseChatModel，对接小米的 MiMo API。这样既利用了 LangChain 的 Tool 编排框架，又避免了对 OpenAI 的依赖。Tool 的定义使用 DynamicStructuredTool + Zod Schema，保证了类型安全。"

---

## Slide 11：亮点 4 — Docker 容器化部署

**标题**：一键部署，环境一致

**架构图**：

```
┌─────────────────────────────────────────┐
│  Docker Compose                          │
│                                          │
│  ┌─────────┐    ┌──────────┐            │
│  │  Nginx   │    │ Backend  │            │
│  │  :80     │───→│  :3000   │            │
│  └─────────┘    └────┬─────┘            │
│                      │                   │
│                 ┌────▼─────┐            │
│                 │  MySQL   │            │
│                 │  :3306   │            │
│                 └──────────┘            │
└─────────────────────────────────────────┘
```

**演讲稿**：
> "我们采用 Docker Compose 编排三个容器：Nginx 服务前端静态文件并反向代理 API 请求，Express 运行业务逻辑，MySQL 存储数据。传统部署需要手动安装 Node.js、MySQL、Nginx，环境不一致会导致'在我电脑上能跑'的问题。Docker 容器化保证了环境一致性，一条命令即可部署。"

---

## Slide 12：Docker 多阶段构建

**标题**：多阶段构建 — 镜像体积减少 75%

**关键代码**：

```dockerfile
# Stage 1: 构建 H5 产物
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build:h5

# Stage 2: Nginx 服务（仅含静态文件）
FROM nginx:alpine
COPY --from=builder /app/dist/build/h5 /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**效果对比**：

| 阶段 | 镜像大小 | 内容 |
|------|---------|------|
| 构建阶段 | ~200MB | Node.js + 依赖 + 源码 |
| 运行阶段 | ~50MB | Nginx + 静态文件 |
| **减少** | **75%** | 不含构建工具和源码 |

**演讲稿**：
> "前端 Dockerfile 采用多阶段构建。第一阶段用 node:20-alpine 安装依赖、编译代码，产出 H5 静态文件。第二阶段用 nginx:alpine 只复制静态文件和 Nginx 配置。最终镜像仅 50MB，比单阶段构建减少了 75%，同时不含构建工具和源码，减少了攻击面。"

---

## Slide 13：亮点 5 — 阿里云 OSS

**标题**：云存储 — 安全、高效、可扩展

**关键代码**：

```typescript
// Multer 内存存储 + OSS 直传
const upload = multer({
  storage: multer.memoryStorage(),  // 文件不落盘
  limits: { fileSize: 5 * 1024 * 1024 }  // 5MB 限制
})

router.post('/avatar', auth, upload.single('file'), 
  async (req, res) => {
    // 生成 OSS 文件名
    const fileName = `avatars/avatar_${Date.now()}.${ext}`
    
    // 直传 OSS（文件从内存直接传到云端）
    const result = await ossClient.put(fileName, req.file.buffer)
    
    // 更新用户头像 URL
    await db.query('UPDATE users SET avatar = ? WHERE id = ?', 
      [result.url, userId])
})
```

**演讲稿**：
> "用户头像上传使用阿里云 OSS。关键设计是 Multer 内存存储 + ali-oss SDK 直传——文件在服务端不落盘，直接从内存传到 OSS，减少了服务器 IO 压力。文件限制 5MB，仅允许图片格式。AccessKey 通过环境变量管理，不硬编码在代码中。"

---

## Slide 14：安全机制

**标题**：多层安全防护

**要点**：

| 安全措施 | 实现方式 |
|---------|---------|
| JWT 认证 | 7 天有效期，中间件统一校验 |
| 密码加密 | bcryptjs 哈希（10 轮 salt） |
| SSRF 防护 | 图片代理白名单（仅 3 个域名） |
| 配置外置 | 所有密钥在 `.env`，不入代码 |
| Docker 安全 | 非 root 用户运行 |
| 请求限制 | JSON body 10MB 上限 |

**关键代码**：

```typescript
// JWT 认证中间件
const auth = (req, res, next) => {
  const token = req.headers.authorization
  if (!token) return res.status(401).json({ msg: '未登录' })
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.id
    next()
  } catch {
    res.status(401).json({ msg: 'token 已过期' })
  }
}

// SSRF 防护 — 图片代理白名单
const ALLOWED_HOSTS = [
  'yjy-xiaotuxian-dev.oss-cn-beijing.aliyuncs.com',
  'jean-os.oss-cn-beijing.aliyuncs.com',
  'yanxuan-item.nosdn.127.net'
]

app.get('/proxy/image', async (req, res) => {
  const url = new URL(req.query.url)
  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    return res.status(403).send('forbidden host')
  }
  // 代理图片...
})
```

**演讲稿**：
> "项目实施了多层安全防护。JWT 认证保证接口安全，密码使用 bcryptjs 哈希存储。图片代理设置了域名白名单，只允许访问指定的 OSS 域名，防止 SSRF 攻击。所有敏感配置（数据库密码、API Key）都通过环境变量管理，不入代码仓库。Docker 部署还使用非 root 用户运行后端容器。"

---

## Slide 15：性能优化

**标题**：用户体验优化策略

**要点**：

| 优化策略 | 实现方式 | 效果 |
|---------|---------|------|
| 骨架屏 | PageSkeleton 组件 | 减少等待感知 |
| 并行请求 | Promise.all | 首屏加载提速 60% |
| 分包预下载 | preloadRule | 跳转秒开 |
| SSE 流式 | Server-Sent Events | AI 逐字回复 |
| 按需渲染 | v-if + isRender | 减少 DOM 节点 |

**关键代码**：

```typescript
// 并行数据请求
await Promise.all([
  getHomeBannerData(),    // 轮播图
  getHomeCategoryData(),  // 分类
  getHomeHotData()        // 热门推荐
])

// 分包预下载
"preloadRule": {
  "pages/my/my": {
    "network": "all",
    "packages": ["pagesMember"]
  }
}

// SSE 流式响应
const reader = response.body.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  // 逐块处理 AI 回复
  appendChunk(value)
}
```

**演讲稿**：
> "性能优化方面，我们采用了多种策略。首页数据使用 Promise.all 并行请求，首屏加载提速 60%。用户进入'我的'页面时预加载会员中心分包，后续跳转秒开。AI 聊天使用 SSE 流式响应，用户可以看到 AI 逐字回复，体验类似 ChatGPT。"

---

## Slide 16：项目成果

**标题**：项目成果总结

**要点**：

| 维度 | 成果 |
|------|------|
| 代码量 | 前端 15,000+ 行，后端 5,000+ 行 |
| 页面数 | 主包 10 个 + 分包 8 个 |
| API 接口 | 15 个模块，50+ 个接口 |
| 数据库表 | 13 张表 |
| 条件编译 | 14 个文件，37 处使用 |
| 容器化 | 3 个容器，一键部署 |
| AI 功能 | 智能聊天 + 图片分析 |

**演讲稿**：
> "项目总代码量约 2 万行，包含 18 个页面、50+ 个 API 接口、13 张数据库表。通过条件编译实现了三端统一开发，Docker 容器化实现了一键部署，AI 助手集成了智能聊天和图片分析功能。这是一个功能完整、技术先进的电商平台。"

---

## Slide 17：技术难点与解决方案

**标题**：技术难点攻克

**要点**：

| 难点 | 解决方案 |
|------|---------|
| 三端 API 差异大 | 条件编译 + 适配器模式 |
| SKU 规格组合爆炸 | 路径检查算法 + shopItemInfo 字典 |
| AI Tool 编排 | LangChain Tools + 自定义 LLM 适配器 |
| 小程序不支持 localStorage | uni.setStorageSync 适配器 |
| Docker 多服务编排 | Docker Compose + 多阶段构建 |
| 小程序不支持 SSE | 降级为普通请求 |

**演讲稿**：
> "项目中有 6 个主要技术难点。比如 SKU 规格选择，一个手机有 6 种颜色和 3 种容量，会产生 18 种组合，我们通过路径检查算法解决了规格联动问题。再比如小程序不支持 localStorage，我们通过自定义 storage 适配器，使用 uni.setStorageSync 封装，实现了跨平台状态持久化。"

---

## Slide 18：答辩问题预测

**标题**：常见答辩问题

**Q1：为什么选择 uni-app 而不是原生开发？**
> A：一套代码可编译到三端，维护成本低，90%+ 代码复用。

**Q2：SKU 选择的核心算法是什么？**
> A：路径检查算法，维护 shopItemInfo 字典，遍历检查组合是否存在。

**Q3：为什么用 LangChain 而不是直接调用 AI API？**
> A：LangChain 提供 Tool 编排框架，支持多工具调度，避免重复造轮子。

**Q4：Docker 多阶段构建的好处？**
> A：最终镜像从 200MB 减小到 50MB，减少攻击面。

**Q5：如何保证 API 安全？**
> A：JWT 认证 + SSRF 白名单 + 环境变量管理密钥。

---

## Slide 19：总结

**标题**：项目总结

**要点**：
- 技术先进：Vue3 + TypeScript + LangChain + Docker
- 功能完整：商品 → 购物车 → 下单 → 支付 → 物流
- 三端运行：一套代码，H5/小程序/App
- AI 智能：LangChain Tool 编排 + MiMo LLM
- 安全可靠：JWT + SSRF 防护 + Docker 安全
- 部署便捷：Docker Compose + GitHub Actions

**演讲稿**：
> "总结一下，小兔鲜儿是一个技术先进、功能完整的鲜食电商平台。通过 uni-app 实现了三端统一开发，集成了 LangChain AI 智能助手，采用 Docker 容器化部署。项目在跨平台兼容、SKU 管理、AI 集成、容器化部署等方面都有深入的实践和思考。谢谢大家！"

---

## Slide 20：致谢

**标题**：谢谢！

**副标题**：欢迎提问

---

## PPT 制作建议

### 配色方案
- 主色：#FF6B35（橙色，生鲜电商风格）
- 辅色：#004E89（深蓝，科技感）
- 背景：#FFFFFF（白色）
- 文字：#333333（深灰）

### 字体建议
- 标题：思源黑体 Bold，28-32px
- 正文：思源黑体 Regular，18-20px
- 代码：JetBrains Mono，14-16px

### 每页 Slide 原则
1. 标题不超过 10 个字
2. 要点不超过 5 个
3. 代码不超过 15 行
4. 配合架构图或流程图
