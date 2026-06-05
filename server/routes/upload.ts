import { Router } from 'express'
import multer from 'multer'
import OSS from 'ali-oss'
import auth from '../middleware/auth'
import { User } from '../models'

const router = Router()

// OSS 客户端
const ossClient = new OSS({
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.OSS_BUCKET,
})

// 内存存储（直接传 OSS，不存本地）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只支持 jpg/png/gif/webp 格式'))
    }
  },
})

// POST /upload/avatar  上传头像到 OSS
router.post('/avatar', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.json({ code: '0', msg: '请选择图片', result: null })
      return
    }

    // 生成 OSS 文件名
    const ext = req.file.originalname.split('.').pop() || 'jpg'
    const fileName = `avatars/avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

    // 上传到 OSS
    const result = await ossClient.put(fileName, req.file.buffer, {
      headers: { 'Content-Type': req.file.mimetype },
    })

    // OSS 访问 URL
    const avatarUrl = result.url

    // 更新用户头像
    await User.update({ avatar: avatarUrl }, { where: { id: req.userId } })

    res.json({
      code: '1',
      msg: '上传成功',
      result: { avatar: avatarUrl },
    })
  } catch (err) {
    console.error('OSS 上传失败:', err)
    res.json({ code: '0', msg: '上传失败', result: null })
  }
})

export default router
