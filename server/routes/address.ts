import { Router } from 'express'
import db from '../config/db'
import auth from '../middleware/auth'

const router = Router()

// GET /member/address
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, receiver, contact, province_code AS provinceCode, city_code AS cityCode, county_code AS countyCode, full_location AS fullLocation, address, is_default AS isDefault FROM addresses WHERE user_id = ?',
      [req.userId]
    )
    res.json({ code: '1', msg: '操作成功', result: rows })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取地址列表失败', result: null })
  }
})

// GET /member/address/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, receiver, contact, province_code AS provinceCode, city_code AS cityCode, county_code AS countyCode, full_location AS fullLocation, address, is_default AS isDefault FROM addresses WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[]
    if (!rows.length) {
      res.json({ code: '0', msg: '地址不存在', result: null })
      return
    }
    res.json({ code: '1', msg: '操作成功', result: rows[0] })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取地址详情失败', result: null })
  }
})

// POST /member/address
router.post('/', auth, async (req, res) => {
  try {
    const { receiver, contact, provinceCode, cityCode, countyCode, fullLocation, address, isDefault } = req.body
    if (isDefault) {
      await db.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.userId])
    }
    const [result] = await db.query(
      'INSERT INTO addresses (user_id, receiver, contact, province_code, city_code, county_code, full_location, address, is_default) VALUES (?,?,?,?,?,?,?,?,?)',
      [req.userId, receiver, contact, provinceCode, cityCode, countyCode, fullLocation, address, isDefault ? 1 : 0]
    ) as any[]
    res.json({ code: '1', msg: '操作成功', result: { id: result.insertId } })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '添加地址失败', result: null })
  }
})

// PUT /member/address/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { receiver, contact, provinceCode, cityCode, countyCode, fullLocation, address, isDefault } = req.body
    if (isDefault) {
      await db.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.userId])
    }
    await db.query(
      'UPDATE addresses SET receiver=?, contact=?, province_code=?, city_code=?, county_code=?, full_location=?, address=?, is_default=? WHERE id=? AND user_id=?',
      [receiver, contact, provinceCode, cityCode, countyCode, fullLocation, address, isDefault ? 1 : 0, req.params.id, req.userId]
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
    await db.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '删除地址失败', result: null })
  }
})

export default router
