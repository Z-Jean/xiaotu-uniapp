import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'

import homeRoutes from './routes/home'
import hotRoutes from './routes/hot'
import searchRoutes from './routes/search'
import categoryRoutes from './routes/category'
import goodsRoutes from './routes/goods'
import loginRoutes from './routes/login'
import memberRoutes from './routes/member'
import addressRoutes from './routes/address'
import cartRoutes from './routes/cart'
import orderRoutes from './routes/order'
import payRoutes from './routes/pay'
import aiRoutes from './routes/ai'
import mapRoutes from './routes/map'
import uploadRoutes from './routes/upload'
import smsRoutes from './routes/sms'

const app = express()

// 中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// 路由
app.use('/home', homeRoutes)
app.use('/hot', hotRoutes)
app.use('/search', searchRoutes)
app.use('/category', categoryRoutes)
app.use('/goods', goodsRoutes)
app.use('/login', loginRoutes)
app.use('/member/profile', memberRoutes)
app.use('/member/address', addressRoutes)
app.use('/member/cart', cartRoutes)
app.use('/member/order', orderRoutes)
app.use('/pay', payRoutes)
app.use('/ai', aiRoutes)
app.use('/map', mapRoutes)
app.use('/upload', uploadRoutes)
app.use('/sms', smsRoutes)

// 图片代理白名单（防 SSRF）
const ALLOWED_IMAGE_HOSTS = [
  'yanxuan-item.nosdn.127.net',
  'yjy-xiaotuxian-dev.oss-cn-beijing.aliyuncs.com',
  'jean-os.oss-cn-beijing.aliyuncs.com',
]

// 图片代理：/proxy/image?url=xxx
app.get('/proxy/image', async (req, res) => {
  try {
    const url = req.query.url as string
    if (!url) { res.status(400).send('missing url'); return }
    let parsed: URL
    try { parsed = new URL(url) } catch { res.status(400).send('invalid url'); return }
    if (!ALLOWED_IMAGE_HOSTS.includes(parsed.hostname)) {
      res.status(403).send('forbidden host'); return
    }
    const response = await fetch(url)
    if (!response.ok) { res.status(response.status).send('fetch failed'); return }
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    const buffer = Buffer.from(await response.arrayBuffer())
    res.send(buffer)
  } catch {
    res.status(500).send('proxy error')
  }
})

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ code: '1', msg: 'ok', result: null })
})

// 404
app.use((req, res) => {
  res.status(404).json({ code: '0', msg: `接口不存在: ${req.method} ${req.path}`, result: null })
})

// 错误处理
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ code: '0', msg: '服务器内部错误', result: null })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`小兔鲜儿后端服务已启动: http://localhost:${PORT}`)
})
