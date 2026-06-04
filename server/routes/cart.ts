import { Router } from 'express'
import db from '../config/db'
import auth from '../middleware/auth'

const router = Router()

// GET /member/cart
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.sku_id AS skuId, g.name, g.main_pictures AS pictures,
             c.count, g.price, g.price AS nowPrice, gs.inventory AS stock,
             c.selected, '' AS attrsText, 1 AS isEffective
      FROM cart_items c
      LEFT JOIN goods_skus gs ON c.sku_id = gs.id
      LEFT JOIN goods g ON gs.goods_id = g.id
      WHERE c.user_id = ?
    `, [req.userId]) as any[]

    const result = rows.map((r: any) => ({
      id: String(r.id),
      skuId: String(r.skuId),
      name: r.name || '',
      picture: Array.isArray(r.pictures) ? r.pictures[0] : '',
      count: r.count,
      price: r.price,
      nowPrice: r.nowPrice,
      stock: r.stock || 999,
      selected: !!r.selected,
      attrsText: r.attrsText || '',
      isEffective: !!r.isEffective,
    }))

    res.json({ code: '1', msg: '操作成功', result })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取购物车失败', result: null })
  }
})

// POST /member/cart
router.post('/', auth, async (req, res) => {
  try {
    const { skuId, count = 1 } = req.body
    const [existing] = await db.query(
      'SELECT id, count FROM cart_items WHERE user_id = ? AND sku_id = ?',
      [req.userId, skuId]
    ) as any[]
    if (existing.length) {
      await db.query('UPDATE cart_items SET count = count + ? WHERE id = ?', [count, existing[0].id])
    } else {
      await db.query('INSERT INTO cart_items (user_id, sku_id, count, selected) VALUES (?,?,?,1)', [req.userId, skuId, count])
    }
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '加入购物车失败', result: null })
  }
})

// PUT /member/cart/:skuId
router.put('/:skuId', auth, async (req, res) => {
  try {
    const { selected, count } = req.body
    const updates: string[] = []
    const params: any[] = []
    if (selected !== undefined) { updates.push('selected = ?'); params.push(selected ? 1 : 0) }
    if (count !== undefined) { updates.push('count = ?'); params.push(count) }
    if (updates.length) {
      params.push(req.userId, req.params.skuId)
      await db.query(`UPDATE cart_items SET ${updates.join(',')} WHERE user_id = ? AND sku_id = ?`, params)
    }
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '修改购物车失败', result: null })
  }
})

// PUT /member/cart/selected
router.put('/selected', auth, async (req, res) => {
  try {
    const { selected } = req.body
    await db.query('UPDATE cart_items SET selected = ? WHERE user_id = ?', [selected ? 1 : 0, req.userId])
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '操作失败', result: null })
  }
})

// DELETE /member/cart
router.delete('/', auth, async (req, res) => {
  try {
    const { ids } = req.body
    if (ids && ids.length) {
      await db.query('DELETE FROM cart_items WHERE user_id = ? AND sku_id IN (?)', [req.userId, ids])
    }
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '删除失败', result: null })
  }
})

export default router
