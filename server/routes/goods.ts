import { Router } from 'express'
import db from '../config/db'

const router = Router()

// GET /goods?id=xxx
router.get('/', async (req, res) => {
  try {
    const { id } = req.query
    if (!id) {
      res.json({ code: '0', msg: '缺少商品id', result: null })
      return
    }

    const [goods] = await db.query('SELECT * FROM goods WHERE id = ?', [id]) as any[]
    if (!goods.length) {
      res.json({ code: '0', msg: '商品不存在', result: null })
      return
    }

    const g = goods[0]

    const [skus] = await db.query('SELECT * FROM goods_skus WHERE goods_id = ?', [id]) as any[]
    const formattedSkus = skus.map((s: any) => ({
      id: String(s.id),
      skuCode: s.sku_code,
      price: s.price,
      oldPrice: s.old_price,
      inventory: s.inventory,
      picture: s.picture,
      specs: typeof s.specs === 'string' ? JSON.parse(s.specs) : s.specs,
    }))

    const [specs] = await db.query('SELECT id, goods_id, name, `values` FROM goods_specs WHERE goods_id = ?', [id]) as any[]
    const formattedSpecs = specs.map((s: any) => ({
      name: s.name,
      values: typeof s.values === 'string' ? JSON.parse(s.values) : s.values,
    }))

    const mainPictures = typeof g.main_pictures === 'string' ? JSON.parse(g.main_pictures) : g.main_pictures || []
    const detailsPictures = typeof g.details_pictures === 'string' ? JSON.parse(g.details_pictures) : g.details_pictures || []
    const detailsProperties = typeof g.details_properties === 'string' ? JSON.parse(g.details_properties) : g.details_properties || []

    const [similar] = await db.query(
      'SELECT id, name, `desc`, price, old_price AS discount, 0 AS orderNum, main_pictures AS pictures FROM goods WHERE category_id = ? AND id != ? LIMIT 10',
      [g.category_id, id]
    ) as any[]
    const similarProducts = similar.map((s: any) => ({
      id: String(s.id),
      name: s.name,
      desc: s.desc,
      price: s.price,
      discount: s.discount,
      orderNum: s.orderNum,
      picture: Array.isArray(s.pictures) ? s.pictures[0] : '',
    }))

    res.json({
      code: '1', msg: '操作成功',
      result: {
        id: String(g.id),
        name: g.name,
        desc: g.desc,
        price: g.price,
        oldPrice: g.old_price,
        mainPictures,
        details: { properties: detailsProperties, pictures: detailsPictures },
        skus: formattedSkus,
        specs: formattedSpecs,
        similarProducts,
        userAddresses: [],
      },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取商品详情失败', result: null })
  }
})

export default router
