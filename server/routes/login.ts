import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../config/db'
import jwtConfig from '../config/jwt'
import auth from '../middleware/auth'

const router = Router()

// POST /login
router.post('/', async (req, res) => {
  try {
    const { account, password } = req.body
    if (!account || !password) {
      res.json({ code: '0', msg: '请输入账号和密码', result: null })
      return
    }

    const [users] = await db.query('SELECT * FROM users WHERE account = ?', [account]) as any[]
    if (!users.length) {
      res.json({ code: '0', msg: '账号不存在', result: null })
      return
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.json({ code: '0', msg: '密码错误', result: null })
      return
    }

    const token = jwt.sign({ userId: user.id }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })

    res.json({
      code: '1', msg: '操作成功',
      result: { id: user.id, account: user.account, nickname: user.nickname, avatar: user.avatar, mobile: user.mobile, token },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '登录失败', result: null })
  }
})

// POST /login/wxMin
router.post('/wxMin', async (req, res) => {
  try {
    const { code } = req.body
    const account = 'wx_' + (code || Date.now().toString())
    const [users] = await db.query('SELECT * FROM users WHERE account = ?', [account]) as any[]

    let user: any
    if (users.length) {
      user = users[0]
    } else {
      const [result] = await db.query(
        'INSERT INTO users (account, password, nickname, avatar) VALUES (?, ?, ?, ?)',
        [account, await bcrypt.hash('123456', 10), '微信用户', '']
      ) as any[]
      user = { id: result.insertId, account, nickname: '微信用户', avatar: '', mobile: '' }
    }

    const token = jwt.sign({ userId: user.id }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })

    res.json({
      code: '1', msg: '操作成功',
      result: { id: user.id, account: user.account, nickname: user.nickname, avatar: user.avatar, mobile: user.mobile || '', token },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '登录失败', result: null })
  }
})

// POST /login/wxMin/simple
router.post('/wxMin/simple', async (req, res) => {
  try {
    const { phoneNumber } = req.body
    const account = phoneNumber || 'user_' + Date.now()
    const [users] = await db.query('SELECT * FROM users WHERE account = ?', [account]) as any[]

    let user: any
    if (users.length) {
      user = users[0]
    } else {
      const [result] = await db.query(
        'INSERT INTO users (account, password, nickname, avatar, mobile) VALUES (?, ?, ?, ?, ?)',
        [account, await bcrypt.hash('123456', 10), '用户', '', phoneNumber || '']
      ) as any[]
      user = { id: result.insertId, account, nickname: '用户', avatar: '', mobile: phoneNumber || '' }
    }

    const token = jwt.sign({ userId: user.id }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })

    res.json({
      code: '1', msg: '操作成功',
      result: { id: user.id, account: user.account, nickname: user.nickname, avatar: user.avatar, mobile: user.mobile, token },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '登录失败', result: null })
  }
})

// PUT /login/refresh
router.put('/refresh', auth, async (req, res) => {
  try {
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.userId]) as any[]
    if (!users.length) {
      res.json({ code: '0', msg: '用户不存在', result: null })
      return
    }

    const user = users[0]
    const token = jwt.sign({ userId: user.id }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })

    res.json({
      code: '1', msg: '操作成功',
      result: { id: user.id, account: user.account, nickname: user.nickname, avatar: user.avatar, mobile: user.mobile || '', token },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '刷新token失败', result: null })
  }
})

export default router
