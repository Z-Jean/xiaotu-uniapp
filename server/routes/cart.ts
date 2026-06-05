import { Router } from 'express'
import { fn, col, literal } from 'sequelize'
import { CartItem, GoodsSku, Goods } from '../models'
import auth from '../middleware/auth'

const router = Router()

// GET /member/cart
router.get('/', auth, async (req, res) => {
  try {
    const rows = await CartItem.findAll({
      where: { user_id: req.userId },
      include: [
        {
          model: GoodsSku,
          as: 'sku',
          attributes: ['id', 'goods_id', 'price', 'inventory'],
          include: [
            {
              model: Goods,
              as: 'goods',
              attributes: ['id', 'name', 'main_pictures', 'price'],
            },
          ],
        },
      ],
    })

    const result = rows.map((item: any) => {
      const sku = item.sku
      const goods = sku?.goods
      const pictures = goods?.main_pictures
      return {
        id: String(item.id),
        skuId: String(item.sku_id),
        name: goods?.name || '',
        picture: Array.isArray(pictures) ? pictures[0] : '',
        count: item.count,
        price: goods?.price || sku?.price,
        nowPrice: goods?.price || sku?.price,
        stock: sku?.inventory || 999,
        selected: !!item.selected,
        attrsText: '',
        isEffective: true,
      }
    })

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
    const existing = await CartItem.findOne({
      where: { user_id: req.userId, sku_id: skuId },
    })
    if (existing) {
      await existing.update({ count: existing.count + count })
    } else {
      await CartItem.create({
        user_id: req.userId,
        sku_id: skuId,
        count,
        selected: 1,
      })
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
    const updates: any = {}
    if (selected !== undefined) updates.selected = selected ? 1 : 0
    if (count !== undefined) updates.count = count

    if (Object.keys(updates).length) {
      await CartItem.update(updates, {
        where: { user_id: req.userId, sku_id: req.params.skuId },
      })
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
    await CartItem.update({ selected: selected ? 1 : 0 }, { where: { user_id: req.userId } })
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
      await CartItem.destroy({
        where: { user_id: req.userId, sku_id: ids },
      })
    }
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '删除失败', result: null })
  }
})

export default router
