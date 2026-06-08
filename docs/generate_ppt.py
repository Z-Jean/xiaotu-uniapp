# -*- coding: utf-8 -*-
"""
小兔鲜儿 PPT 生成脚本
运行: python docs/generate_ppt.py
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import os

# 配置
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '小兔鲜儿-技术答辩.pptx')
PRIMARY_COLOR = RGBColor(0xFF, 0x6B, 0x35)  # 橙色主色
SECONDARY_COLOR = RGBColor(0x00, 0x4E, 0x89)  # 深蓝辅色
BG_COLOR = RGBColor(0xFF, 0xFF, 0xFF)  # 白色背景
TEXT_COLOR = RGBColor(0x33, 0x33, 0x33)  # 深灰文字
LIGHT_GRAY = RGBColor(0xF5, 0xF5, 0xF5)  # 浅灰背景
CODE_BG = RGBColor(0x2D, 0x2D, 0x2D)  # 代码背景

prs = Presentation()
prs.slide_width = Inches(13.333)  # 16:9
prs.slide_height = Inches(7.5)


def add_bg(slide, color=BG_COLOR):
    """设置幻灯片背景色"""
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_shape(slide, left, top, width, height, color, alpha=None):
    """添加矩形色块"""
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape


def add_text_box(slide, left, top, width, height, text, font_size=18, color=TEXT_COLOR, bold=False, alignment=PP_ALIGN.LEFT, font_name='微软雅黑'):
    """添加文本框"""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    return txBox


def add_multi_text(slide, left, top, width, height, lines, font_size=16, color=TEXT_COLOR, line_spacing=1.5):
    """添加多行文本"""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, line in enumerate(lines):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = line
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = '微软雅黑'
        p.space_after = Pt(font_size * 0.5)
    return txBox


def add_code_block(slide, left, top, width, height, code, font_size=12):
    """添加代码块"""
    # 代码背景
    shape = add_shape(slide, left, top, width, height, CODE_BG)
    # 代码文本
    txBox = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.2), width - Inches(0.4), height - Inches(0.4))
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, line in enumerate(code.split('\n')):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = line
        p.font.size = Pt(font_size)
        p.font.color.rgb = RGBColor(0xA6, 0xE2, 0x2E)  # 绿色代码
        p.font.name = 'Consolas'
    return txBox


def add_bullet_points(slide, left, top, width, height, points, font_size=16, color=TEXT_COLOR, bullet_color=PRIMARY_COLOR):
    """添加要点列表"""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, point in enumerate(points):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = f"● {point}"
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = '微软雅黑'
        p.space_after = Pt(12)
    return txBox


def make_title_slide(title, subtitle, bg_color=SECONDARY_COLOR):
    """创建标题页"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # 空白布局
    add_bg(slide, bg_color)
    # 标题
    add_text_box(slide, Inches(1), Inches(2.5), Inches(11), Inches(1.5),
                 title, font_size=44, color=RGBColor(0xFF, 0xFF, 0xFF), bold=True, alignment=PP_ALIGN.CENTER)
    # 副标题
    add_text_box(slide, Inches(1), Inches(4), Inches(11), Inches(1),
                 subtitle, font_size=24, color=RGBColor(0xCC, 0xCC, 0xCC), alignment=PP_ALIGN.CENTER)
    return slide


def make_content_slide(title, left_content=None, right_content=None, full_content=None):
    """创建内容页"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    # 顶部色条
    add_shape(slide, Inches(0), Inches(0), Inches(13.333), Inches(0.08), PRIMARY_COLOR)
    # 标题
    add_text_box(slide, Inches(0.8), Inches(0.3), Inches(11), Inches(0.8),
                 title, font_size=32, color=SECONDARY_COLOR, bold=True)
    # 分割线
    add_shape(slide, Inches(0.8), Inches(1.1), Inches(2), Inches(0.04), PRIMARY_COLOR)

    if full_content:
        full_content(slide)
    return slide


# ==================== 创建幻灯片 ====================

# Slide 1: 封面
slide = make_title_slide(
    '小兔鲜儿',
    '鲜食电商平台技术答辩\n基于 uni-app 的三端统一开发'
)

# Slide 2: 项目概述
def content_overview(slide):
    add_bullet_points(slide, Inches(0.8), Inches(1.5), Inches(5.5), Inches(5), [
        '鲜食电商：水果、蔬菜、肉蛋等生鲜食品',
        '三端运行：H5 / 微信小程序 / App',
        '完整功能：商品浏览 → 购物车 → 下单 → 支付',
        'AI 助手：智能购物推荐、图片分析',
        '容器化：Docker + GitHub Actions 自动部署',
    ], font_size=18)
    # 右侧技术栈
    add_text_box(slide, Inches(7), Inches(1.5), Inches(5), Inches(0.6),
                 '技术栈', font_size=24, color=SECONDARY_COLOR, bold=True)
    tech_stack = [
        '前端：uni-app + Vue3 + TypeScript',
        '后端：Express.js + MySQL',
        'AI：LangChain + MiMo LLM',
        '存储：阿里云 OSS',
        '部署：Docker + GitHub Actions',
    ]
    add_bullet_points(slide, Inches(7), Inches(2.2), Inches(5), Inches(4), tech_stack, font_size=16)

make_content_slide('项目概述', full_content=content_overview)

# Slide 3: 技术架构
def content_arch(slide):
    # 架构图用文字描述
    arch_text = [
        '┌─────────────────────────────────────────────┐',
        '│              前端（uni-app）                   │',
        '│   H5 / 微信小程序 / App  ← 条件编译           │',
        '└──────────────────┬──────────────────────────┘',
        '                   │ API 请求',
        '┌──────────────────▼──────────────────────────┐',
        '│              后端（Express.js）               │',
        '│   JWT认证 / OSS / 地图 / AI / 短信            │',
        '└──────────────────┬──────────────────────────┘',
        '                   │',
        '┌──────────────────▼──────────────────────────┐',
        '│              MySQL 数据库                     │',
        '│   用户 | 商品 | 订单 | 购物车 | 地址           │',
        '└─────────────────────────────────────────────┘',
    ]
    add_code_block(slide, Inches(1.5), Inches(1.5), Inches(10), Inches(5), '\n'.join(arch_text), font_size=14)

make_content_slide('技术架构图', full_content=content_arch)

# Slide 4: 核心亮点总览
def content_highlights(slide):
    highlights = [
        ('多端条件编译', '一套代码，三端运行'),
        ('SKU 商品管理', '规格联动选择算法'),
        ('AI 智能助手', 'LangChain + MiMo LLM'),
        ('阿里云 OSS', '图片安全存储'),
        ('Docker 容器化', '一键部署，环境一致'),
        ('短信验证码', '阿里云 SMS 集成'),
        ('高德地图', '物流轨迹可视化'),
        ('Pinia 持久化', '跨平台登录保持'),
    ]
    for i, (title, desc) in enumerate(highlights):
        row = i // 2
        col = i % 2
        x = Inches(0.8 + col * 6)
        y = Inches(1.5 + row * 1.4)
        # 卡片背景
        add_shape(slide, x, y, Inches(5.5), Inches(1.2), LIGHT_GRAY)
        # 标题
        add_text_box(slide, x + Inches(0.3), y + Inches(0.15), Inches(5), Inches(0.5),
                     title, font_size=20, color=PRIMARY_COLOR, bold=True)
        # 描述
        add_text_box(slide, x + Inches(0.3), y + Inches(0.65), Inches(5), Inches(0.5),
                     desc, font_size=14, color=TEXT_COLOR)

make_content_slide('核心技术亮点', full_content=content_highlights)

# Slide 5: 条件编译
def content_conditional(slide):
    add_bullet_points(slide, Inches(0.8), Inches(1.5), Inches(5), Inches(4), [
        '编译时代码隔离技术',
        '14 个文件，37 处使用',
        '覆盖 H5、微信小程序、App 三端',
        '一套代码产出三个版本',
        '维护成本降低 60%+',
    ], font_size=18)
    code = """// API 地址多端配置
// #ifdef H5
export const API_BASE = import.meta.env.DEV
  ? 'http://localhost:3000'
  : ''
// #endif

// #ifndef H5
export const API_BASE = 'http://10.107.246.104:3000'
// #endif"""
    add_code_block(slide, Inches(6.5), Inches(1.5), Inches(6), Inches(4.5), code, font_size=13)

make_content_slide('亮点 1：多端条件编译', full_content=content_conditional)

# Slide 6: 条件编译应用场景
def content_conditional2(slide):
    # 表格用文本框模拟
    headers = ['场景', 'H5', '微信小程序', 'App']
    rows = [
        ['图片读取', 'FileReader', 'FileSystemManager', 'plus.io.FileReader'],
        ['选择图片', 'chooseImage', 'chooseMedia', 'chooseImage'],
        ['地址选择', 'uni-data-picker', '原生 picker', 'uni-data-picker'],
        ['客服按钮', '无', 'open-type="contact"', '无'],
    ]
    # 表头
    for j, h in enumerate(headers):
        x = Inches(0.8 + j * 3)
        add_shape(slide, x, Inches(1.5), Inches(2.8), Inches(0.5), SECONDARY_COLOR)
        add_text_box(slide, x + Inches(0.1), Inches(1.55), Inches(2.6), Inches(0.4),
                     h, font_size=14, color=RGBColor(0xFF, 0xFF, 0xFF), bold=True, alignment=PP_ALIGN.CENTER)
    # 数据行
    for i, row in enumerate(rows):
        for j, cell in enumerate(row):
            x = Inches(0.8 + j * 3)
            y = Inches(2.1 + i * 0.6)
            bg = LIGHT_GRAY if i % 2 == 0 else BG_COLOR
            add_shape(slide, x, y, Inches(2.8), Inches(0.5), bg)
            add_text_box(slide, x + Inches(0.1), y + Inches(0.05), Inches(2.6), Inches(0.4),
                         cell, font_size=13, color=TEXT_COLOR, alignment=PP_ALIGN.CENTER)

make_content_slide('条件编译 — 三端适配对比', full_content=content_conditional2)

# Slide 7: SKU 管理
def content_sku(slide):
    add_bullet_points(slide, Inches(0.8), Inches(1.5), Inches(5), Inches(4), [
        'SPU（标准产品单元）→ SKU（库存量单位）',
        '一个商品多个规格维度（颜色、容量等）',
        '每个规格组合独立价格和库存',
        '路径检查算法实现联动选择',
        '自动灰显不可选规格组合',
    ], font_size=18)
    code = """// SKU 数据模型
goods (SPU)          goods_skus (SKU)
┌──────────────┐     ┌──────────────────┐
│ id           │◄────│ goods_id         │
│ name         │     │ price            │
│ price        │     │ inventory        │
│ main_pictures│     │ specs (JSON)     │
└──────────────┘     └──────────────────┘

// specs 字段示例
[{"name":"颜色","valueName":"红色"},
 {"name":"容量","valueName":"256G"}]"""
    add_code_block(slide, Inches(6.5), Inches(1.5), Inches(6), Inches(5), code, font_size=12)

make_content_slide('亮点 2：SKU 商品规格管理', full_content=content_sku)

# Slide 8: SKU 算法
def content_sku_algo(slide):
    add_text_box(slide, Inches(0.8), Inches(1.5), Inches(11), Inches(0.6),
                 '路径检查算法 — 规格联动的核心', font_size=22, color=SECONDARY_COLOR, bold=True)
    algo_steps = [
        '1. 用户点击规格值（如"红色"）',
        '2. checkInpath() 遍历所有 SKU 组合',
        '3. 检查当前已选 + 该值 是否存在于 shopItemInfo',
        '4. 存在 → 可选（高亮）；不存在 → 不可选（灰显）',
        '5. 所有维度选完 → 取出对应 SKU → 显示价格/库存',
    ]
    add_bullet_points(slide, Inches(0.8), Inches(2.2), Inches(5.5), Inches(4), algo_steps, font_size=16)
    code = """// 核心算法伪代码
for (let key in shopItemInfo) {
  let item = shopItemInfo[key]
  if (item.stock > 0) {
    item.ishow = true   // 可选
  } else {
    item.ishow = false  // 灰显
  }
}

// 所有维度选完
if (allSelected) {
  selectShop = shopItemInfo[key]
  displayPrice(selectShop.price)
  displayStock(selectShop.inventory)
}"""
    add_code_block(slide, Inches(7), Inches(2), Inches(5.5), Inches(5), code, font_size=12)

make_content_slide('SKU 选择算法详解', full_content=content_sku_algo)

# Slide 9: AI 助手架构
def content_ai(slide):
    add_text_box(slide, Inches(0.8), Inches(1.5), Inches(11), Inches(0.6),
                 'LangChain + MiMo LLM 架构', font_size=22, color=SECONDARY_COLOR, bold=True)
    arch = [
        '┌─────────────────────────────────────────┐',
        '│  用户消息                                 │',
        '└──────────────────┬──────────────────────┘',
        '                   ▼',
        '┌─────────────────────────────────────────┐',
        '│  关键词意图识别（17 个关键词映射）         │',
        '└──────────────────┬──────────────────────┘',
        '                   ▼',
        '┌─────────────────────────────────────────┐',
        '│  LangChain Tool 调度                     │',
        '│  ├── search_goods（关键词搜索）           │',
        '│  ├── category_goods（分类查询）           │',
        '│  └── recommend_goods（随机推荐）          │',
        '└──────────────────┬──────────────────────┘',
        '                   ▼',
        '┌─────────────────────────────────────────┐',
        '│  MiMo LLM 生成回复 → SSE 流式输出        │',
        '└─────────────────────────────────────────┘',
    ]
    add_code_block(slide, Inches(1), Inches(2.2), Inches(6), Inches(5), '\n'.join(arch), font_size=12)
    add_bullet_points(slide, Inches(7.5), Inches(2.2), Inches(5), Inches(4), [
        '自定义 MiMoChatModel 适配器',
        '继承 LangChain BaseChatModel',
        'Tool 使用 Zod Schema 校验',
        '确定性意图识别（非 LLM）',
        'SSE 流式输出（H5 端）',
        '降级策略：API 异常返回推荐',
    ], font_size=15)

make_content_slide('亮点 3：AI 智能购物助手', full_content=content_ai)

# Slide 10: AI 代码
def content_ai_code(slide):
    code = """// 自定义 LLM 适配器
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
  }
}

// 定义 LangChain Tool
const searchTool = new DynamicStructuredTool({
  name: 'search_goods',
  description: '根据关键词搜索商品',
  schema: z.object({
    keyword: z.string()
  }),
  func: async ({ keyword }) => {
    const [rows] = await db.query(
      'SELECT * FROM goods WHERE name LIKE ?',
      [`%${keyword}%`])
    return JSON.stringify(rows.slice(0, 5))
  }
})"""
    add_code_block(slide, Inches(0.8), Inches(1.5), Inches(11.5), Inches(5.5), code, font_size=13)

make_content_slide('AI 核心代码实现', full_content=content_ai_code)

# Slide 11: Docker 部署
def content_docker(slide):
    add_bullet_points(slide, Inches(0.8), Inches(1.5), Inches(5), Inches(4), [
        'Docker Compose 编排三个容器',
        'Nginx：前端静态文件 + API 反向代理',
        'Backend：Express.js 业务逻辑',
        'MySQL：数据存储 + Volume 持久化',
        'GitHub Actions 自动部署',
    ], font_size=18)
    arch = [
        '┌─────────────────────────────────────┐',
        '│  Docker Compose                      │',
        '│                                      │',
        '│  ┌─────────┐    ┌──────────┐        │',
        '│  │  Nginx   │    │ Backend  │        │',
        '│  │  :80     │───→│  :3000   │        │',
        '│  └─────────┘    └────┬─────┘        │',
        '│                      │               │',
        '│                 ┌────▼─────┐        │',
        '│                 │  MySQL   │        │',
        '│                 │  :3306   │        │',
        '│                 └──────────┘        │',
        '└─────────────────────────────────────┘',
    ]
    add_code_block(slide, Inches(6.5), Inches(1.5), Inches(6), Inches(4.5), '\n'.join(arch), font_size=13)

make_content_slide('亮点 4：Docker 容器化部署', full_content=content_docker)

# Slide 12: Dockerfile
def content_dockerfile(slide):
    code = """# === Stage 1: 构建 H5 ===
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && \\
    corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build:h5

# === Stage 2: Nginx 服务 ===
FROM nginx:alpine
COPY --from=builder /app/dist/build/h5 \\
     /usr/share/nginx/html
COPY nginx/default.conf \\
     /etc/nginx/conf.d/default.conf
EXPOSE 80"""
    add_code_block(slide, Inches(0.8), Inches(1.5), Inches(6.5), Inches(5.5), code, font_size=14)
    # 效果对比
    add_text_box(slide, Inches(8), Inches(1.5), Inches(4.5), Inches(0.6),
                 '多阶段构建效果', font_size=20, color=SECONDARY_COLOR, bold=True)
    add_bullet_points(slide, Inches(8), Inches(2.2), Inches(4.5), Inches(3), [
        '构建阶段：~200MB',
        '运行阶段：~50MB',
        '镜像体积减少 75%',
        '不含构建工具和源码',
        '减少攻击面',
    ], font_size=16)

make_content_slide('Docker 多阶段构建', full_content=content_dockerfile)

# Slide 13: OSS
def content_oss(slide):
    add_bullet_points(slide, Inches(0.8), Inches(1.5), Inches(5), Inches(4), [
        '阿里云 OSS 对象存储',
        'Multer 内存存储 + 直传 OSS',
        '文件不落盘，减少服务器 IO',
        'AccessKey 环境变量管理',
        '图片代理 + SSRF 白名单防护',
    ], font_size=18)
    code = """// Multer 内存存储 + OSS 直传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
})

router.post('/avatar', auth,
  upload.single('file'),
  async (req, res) => {
    // 直传 OSS（文件不落盘）
    const result = await ossClient.put(
      fileName, req.file.buffer
    )
    // 更新用户头像
    await db.query(
      'UPDATE users SET avatar = ? WHERE id = ?',
      [result.url, userId]
    )
})"""
    add_code_block(slide, Inches(6.5), Inches(1.5), Inches(6), Inches(5), code, font_size=13)

make_content_slide('亮点 5：阿里云 OSS 集成', full_content=content_oss)

# Slide 14: 短信验证码
def content_sms(slide):
    add_bullet_points(slide, Inches(0.8), Inches(1.5), Inches(5), Inches(4), [
        '阿里云短信服务集成',
        '6 位随机验证码',
        '5 分钟有效期',
        '60 秒倒计时防重复',
        '三重安全防护',
    ], font_size=18)
    code = """// 发送验证码
router.post('/send-code', async (req, res) => {
  const { mobile } = req.body
  const code = String(
    Math.floor(100000 + Math.random() * 900000)
  )
  // 存入数据库（5分钟有效）
  await db.query(
    'INSERT INTO sms_codes (mobile, code, \\
     expires_at) VALUES (?, ?, ?)',
    [mobile, code, Date.now() + 5*60*1000]
  )
  // 调用阿里云 SMS API
  await sendSMS(mobile, code)
})"""
    add_code_block(slide, Inches(6.5), Inches(1.5), Inches(6), Inches(5), code, font_size=12)

make_content_slide('亮点 6：短信验证码登录', full_content=content_sms)

# Slide 15: 安全机制
def content_security(slide):
    security_items = [
        ('JWT 认证', '7 天有效期，中间件统一校验'),
        ('密码加密', 'bcryptjs 哈希（10 轮 salt）'),
        ('SSRF 防护', '图片代理白名单（仅 3 个域名）'),
        ('配置外置', '所有密钥在 .env，不入代码'),
        ('Docker 安全', '非 root 用户运行'),
        ('请求限制', 'JSON body 10MB 上限'),
    ]
    for i, (title, desc) in enumerate(security_items):
        row = i // 2
        col = i % 2
        x = Inches(0.8 + col * 6)
        y = Inches(1.5 + row * 1.8)
        add_shape(slide, x, y, Inches(5.5), Inches(1.5), LIGHT_GRAY)
        add_text_box(slide, x + Inches(0.3), y + Inches(0.2), Inches(5), Inches(0.5),
                     title, font_size=20, color=PRIMARY_COLOR, bold=True)
        add_text_box(slide, x + Inches(0.3), y + Inches(0.8), Inches(5), Inches(0.5),
                     desc, font_size=14, color=TEXT_COLOR)

make_content_slide('安全机制', full_content=content_security)

# Slide 16: 性能优化
def content_performance(slide):
    perf_items = [
        ('骨架屏', 'PageSkeleton 组件\n减少用户感知的等待时间'),
        ('并行请求', 'Promise.all\n首屏加载提速 60%'),
        ('分包预下载', 'preloadRule\n跳转秒开'),
        ('SSE 流式', 'Server-Sent Events\nAI 逐字回复'),
        ('按需渲染', 'v-if + isRender\n减少 DOM 节点'),
    ]
    for i, (title, desc) in enumerate(perf_items):
        x = Inches(0.5 + i * 2.5)
        y = Inches(1.5)
        add_shape(slide, x, y, Inches(2.3), Inches(4.5), LIGHT_GRAY)
        add_text_box(slide, x + Inches(0.2), y + Inches(0.3), Inches(1.9), Inches(0.8),
                     title, font_size=18, color=PRIMARY_COLOR, bold=True, alignment=PP_ALIGN.CENTER)
        add_text_box(slide, x + Inches(0.2), y + Inches(1.5), Inches(1.9), Inches(2.5),
                     desc, font_size=13, color=TEXT_COLOR, alignment=PP_ALIGN.CENTER)

make_content_slide('性能优化策略', full_content=content_performance)

# Slide 17: 项目成果
def content_results(slide):
    results = [
        ('代码量', '20,000+ 行'),
        ('页面数', '18 个'),
        ('API 接口', '50+ 个'),
        ('数据库表', '13 张'),
        ('条件编译', '37 处'),
        ('容器化', '3 个容器'),
    ]
    for i, (label, value) in enumerate(results):
        row = i // 3
        col = i % 3
        x = Inches(0.8 + col * 4)
        y = Inches(1.5 + row * 2.5)
        add_shape(slide, x, y, Inches(3.5), Inches(2), SECONDARY_COLOR)
        add_text_box(slide, x, y + Inches(0.3), Inches(3.5), Inches(0.8),
                     value, font_size=36, color=RGBColor(0xFF, 0xFF, 0xFF), bold=True, alignment=PP_ALIGN.CENTER)
        add_text_box(slide, x, y + Inches(1.2), Inches(3.5), Inches(0.6),
                     label, font_size=18, color=RGBColor(0xCC, 0xCC, 0xCC), alignment=PP_ALIGN.CENTER)

make_content_slide('项目成果', full_content=content_results)

# Slide 18: 技术难点
def content_challenges(slide):
    challenges = [
        ('三端 API 差异', '条件编译 + 适配器模式'),
        ('SKU 规格组合爆炸', '路径检查算法'),
        ('AI Tool 编排', 'LangChain Tools'),
        ('小程序不支持 localStorage', 'uni.setStorageSync 适配器'),
        ('Docker 多服务编排', 'Docker Compose'),
        ('小程序不支持 SSE', '降级为普通请求'),
    ]
    for i, (problem, solution) in enumerate(challenges):
        row = i // 2
        col = i % 2
        x = Inches(0.8 + col * 6)
        y = Inches(1.5 + row * 1.8)
        add_shape(slide, x, y, Inches(5.5), Inches(1.5), LIGHT_GRAY)
        add_text_box(slide, x + Inches(0.3), y + Inches(0.2), Inches(5), Inches(0.5),
                     f'难点：{problem}', font_size=16, color=RGBColor(0xCC, 0x00, 0x00), bold=True)
        add_text_box(slide, x + Inches(0.3), y + Inches(0.8), Inches(5), Inches(0.5),
                     f'方案：{solution}', font_size=16, color=RGBColor(0x00, 0x80, 0x00), bold=True)

make_content_slide('技术难点与解决方案', full_content=content_challenges)

# Slide 19: 答辩问题
def content_qa(slide):
    qas = [
        ('Q: 为什么选择 uni-app？', 'A: 一套代码三端运行，90%+ 代码复用，维护成本低'),
        ('Q: SKU 选择的核心算法？', 'A: 路径检查算法，shopItemInfo 字典存储所有组合'),
        ('Q: 为什么用 LangChain？', 'A: Tool 编排框架，支持多工具调度，避免重复造轮子'),
        ('Q: Docker 多阶段构建好处？', 'A: 镜像从 200MB 减到 50MB，减少攻击面'),
        ('Q: 如何保证 API 安全？', 'A: JWT + SSRF 白名单 + 环境变量管理密钥'),
    ]
    for i, (q, a) in enumerate(qas):
        y = Inches(1.5 + i * 1.1)
        add_text_box(slide, Inches(0.8), y, Inches(11), Inches(0.4),
                     q, font_size=16, color=SECONDARY_COLOR, bold=True)
        add_text_box(slide, Inches(0.8), y + Inches(0.45), Inches(11), Inches(0.5),
                     a, font_size=14, color=TEXT_COLOR)

make_content_slide('答辩常见问题', full_content=content_qa)

# Slide 20: 总结
slide = make_title_slide(
    '谢谢！',
    '欢迎提问\n小兔鲜儿 — 鲜食电商平台',
    bg_color=PRIMARY_COLOR
)

# 保存
prs.save(OUTPUT_PATH)
print(f'PPT 已生成: {OUTPUT_PATH}')
