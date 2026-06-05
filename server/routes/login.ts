import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models'
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

    const user = await User.findOne({ where: { account } })
    if (!user) {
      res.json({ code: '0', msg: '账号不存在', result: null })
      return
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.json({ code: '0', msg: '密码错误', result: null })
      return
    }

    const token = jwt.sign({ userId: user.id }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    })

    res.json({
      code: '1',
      msg: '操作成功',
      result: {
        id: user.id,
        account: user.account,
        nickname: user.nickname,
        avatar: user.avatar,
        mobile: user.mobile,
        token,
      },
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

    let user = await User.findOne({ where: { account } })
    if (!user) {
      user = await User.create({
        account,
        password: await bcrypt.hash('123456', 10),
        nickname: '微信用户',
        avatar: '',
      })
    }

    const token = jwt.sign({ userId: user.id }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    })

    res.json({
      code: '1',
      msg: '操作成功',
      result: {
        id: user.id,
        account: user.account,
        nickname: user.nickname,
        avatar: user.avatar,
        mobile: user.mobile || '',
        token,
      },
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

    let user = await User.findOne({ where: { account } })
    if (!user) {
      user = await User.create({
        account,
        password: await bcrypt.hash('123456', 10),
        nickname: '用户',
        avatar: '',
        mobile: phoneNumber || '',
      })
    }

    const token = jwt.sign({ userId: user.id }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    })

    res.json({
      code: '1',
      msg: '操作成功',
      result: {
        id: user.id,
        account: user.account,
        nickname: user.nickname,
        avatar: user.avatar,
        mobile: user.mobile,
        token,
      },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '登录失败', result: null })
  }
})

// PUT /login/refresh
router.put('/refresh', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId)
    if (!user) {
      res.json({ code: '0', msg: '用户不存在', result: null })
      return
    }

    const token = jwt.sign({ userId: user.id }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    })

    res.json({
      code: '1',
      msg: '操作成功',
      result: {
        id: user.id,
        account: user.account,
        nickname: user.nickname,
        avatar: user.avatar,
        mobile: user.mobile || '',
        token,
      },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '刷新token失败', result: null })
  }
})

export default router
