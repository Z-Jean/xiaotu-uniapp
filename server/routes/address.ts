import { Router } from 'express'
import { Address } from '../models'
import auth from '../middleware/auth'
import { Op } from 'sequelize'

const router = Router()

// GET /member/address
router.get('/', auth, async (req, res) => {
  try {
    const rows = await Address.findAll({
      where: { user_id: req.userId },
      attributes: [
        'id',
        'receiver',
        'contact',
        'province_code',
        'city_code',
        'county_code',
        'full_location',
        'address',
        'is_default',
      ],
    })
    res.json({ code: '1', msg: '操作成功', result: rows })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取地址列表失败', result: null })
  }
})

// GET /member/address/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await Address.findOne({
      where: { id: req.params.id, user_id: req.userId },
      attributes: [
        'id',
        'receiver',
        'contact',
        'province_code',
        'city_code',
        'county_code',
        'full_location',
        'address',
        'is_default',
      ],
    })
    if (!row) {
      res.json({ code: '0', msg: '地址不存在', result: null })
      return
    }
    res.json({ code: '1', msg: '操作成功', result: row })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取地址详情失败', result: null })
  }
})

// POST /member/address
router.post('/', auth, async (req, res) => {
  try {
    const {
      receiver,
      contact,
      provinceCode,
      cityCode,
      countyCode,
      fullLocation,
      address,
      isDefault,
    } = req.body
    if (isDefault) {
      await Address.update({ is_default: 0 }, { where: { user_id: req.userId } })
    }
    const row = await Address.create({
      user_id: req.userId,
      receiver,
      contact,
      province_code: provinceCode,
      city_code: cityCode,
      county_code: countyCode,
      full_location: fullLocation,
      address,
      is_default: isDefault ? 1 : 0,
    })
    res.json({ code: '1', msg: '操作成功', result: { id: row.id } })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '添加地址失败', result: null })
  }
})

// PUT /member/address/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      receiver,
      contact,
      provinceCode,
      cityCode,
      countyCode,
      fullLocation,
      address,
      isDefault,
    } = req.body
    if (isDefault) {
      await Address.update({ is_default: 0 }, { where: { user_id: req.userId } })
    }
    await Address.update(
      {
        receiver,
        contact,
        province_code: provinceCode,
        city_code: cityCode,
        county_code: countyCode,
        full_location: fullLocation,
        address,
        is_default: isDefault ? 1 : 0,
      },
      { where: { id: req.params.id, user_id: req.userId } },
    )
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '修改地址失败', result: null })
  }
})

// DELETE /member/address/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Address.destroy({ where: { id: req.params.id, user_id: req.userId } })
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '删除地址失败', result: null })
  }
})

export default router
