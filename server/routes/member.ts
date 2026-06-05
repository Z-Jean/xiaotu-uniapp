import { Router } from 'express'
import { fn, col } from 'sequelize'
import { User } from '../models'
import auth from '../middleware/auth'

const router = Router()

// GET /member/profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: [
        'id',
        'account',
        'nickname',
        'avatar',
        'mobile',
        'gender',
        'profession',
        'full_location',
        [fn('DATE_FORMAT', col('birthday'), '%Y-%m-%d'), 'birthday'],
      ],
    })
    if (!user) {
      res.json({ code: '0', msg: '用户不存在', result: null })
      return
    }
    res.json({ code: '1', msg: '操作成功', result: user })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取个人信息失败', result: null })
  }
})

// PUT /member/profile
router.put('/', auth, async (req, res) => {
  try {
    const {
      nickname,
      gender,
      birthday,
      profession,
      provinceCode,
      cityCode,
      countyCode,
      fullLocation,
    } = req.body
    await User.update(
      {
        nickname,
        gender,
        birthday,
        profession,
        province_code: provinceCode,
        city_code: cityCode,
        county_code: countyCode,
        full_location: fullLocation,
      },
      { where: { id: req.userId } },
    )

    const user = await User.findByPk(req.userId, {
      attributes: [
        'id',
        'account',
        'nickname',
        'avatar',
        'mobile',
        'gender',
        'profession',
        'full_location',
        [fn('DATE_FORMAT', col('birthday'), '%Y-%m-%d'), 'birthday'],
      ],
    })
    res.json({ code: '1', msg: '操作成功', result: user })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '修改个人信息失败', result: null })
  }
})

// POST /member/profile/avatar
router.post('/avatar', auth, async (req, res) => {
  try {
    const { avatar } = req.body
    await User.update({ avatar }, { where: { id: req.userId } })
    res.json({ code: '1', msg: '操作成功', result: { avatar } })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '上传头像失败', result: null })
  }
})

export default router
