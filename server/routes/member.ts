import { Router } from 'express'
import db from '../config/db'
import auth from '../middleware/auth'

const router = Router()

// GET /member/profile
router.get('/', auth, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, account, nickname, avatar, mobile, gender, DATE_FORMAT(birthday, "%Y-%m-%d") AS birthday, full_location AS fullLocation, profession FROM users WHERE id = ?',
      [req.userId]
    ) as any[]
    if (!users.length) {
      res.json({ code: '0', msg: '用户不存在', result: null })
      return
    }
    res.json({ code: '1', msg: '操作成功', result: users[0] })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取个人信息失败', result: null })
  }
})

// PUT /member/profile
router.put('/', auth, async (req, res) => {
  try {
    const { nickname, gender, birthday, profession, provinceCode, cityCode, countyCode, fullLocation } = req.body
    await db.query(
      'UPDATE users SET nickname=?, gender=?, birthday=?, profession=?, province_code=?, city_code=?, county_code=?, full_location=? WHERE id=?',
      [nickname, gender, birthday, profession, provinceCode, cityCode, countyCode, fullLocation, req.userId]
    )

    const [users] = await db.query(
      'SELECT id, account, nickname, avatar, mobile, gender, DATE_FORMAT(birthday, "%Y-%m-%d") AS birthday, full_location AS fullLocation, profession FROM users WHERE id = ?',
      [req.userId]
    ) as any[]
    res.json({ code: '1', msg: '操作成功', result: users[0] })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '修改个人信息失败', result: null })
  }
})

// POST /member/profile/avatar
router.post('/avatar', auth, async (req, res) => {
  try {
    const { avatar } = req.body
    await db.query('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.userId])
    res.json({ code: '1', msg: '操作成功', result: { avatar } })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '上传头像失败', result: null })
  }
})

export default router
