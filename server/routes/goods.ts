import { Router } from 'express'
import { fn, col } from 'sequelize'
import { Goods, GoodsSku, GoodsSpec } from '../models'

const router = Router()

// GET /goods?id=xxx
router.get('/', async (req, res) => {
  try {
    const { id } = req.query
    if (!id) {
      res.json({ code: '0', msg: '缺少商品id', result: null })
      return
    }

    const g = await Goods.findByPk(id as string)
    if (!g) {
      res.json({ code: '0', msg: '商品不存在', result: null })
      return
    }

    // 查询 SKU 列表
    const skus = await GoodsSku.findAll({ where: { goods_id: id } })
    const formattedSkus = skus.map((s: any) => ({
      id: String(s.id),
      skuCode: s.sku_code,
      price: s.price,
      oldPrice: s.old_price,
      inventory: s.inventory,
      picture: s.picture,
      specs: typeof s.specs === 'string' ? JSON.parse(s.specs) : s.specs,
    }))

    // 查询规格列表
    const specs = await GoodsSpec.findAll({
      where: { goods_id: id },
      attributes: ['id', 'goods_id', 'name', 'values'],
    })
    const formattedSpecs = specs.map((s: any) => ({
      name: s.name,
      values: typeof s.values === 'string' ? JSON.parse(s.values) : s.values,
    }))

    const mainPictures =
      typeof g.main_pictures === 'string' ? JSON.parse(g.main_pictures) : g.main_pictures || []
    const detailsPictures =
      typeof g.details_pictures === 'string'
        ? JSON.parse(g.details_pictures)
        : g.details_pictures || []
    const detailsProperties =
      typeof g.details_properties === 'string'
        ? JSON.parse(g.details_properties)
        : g.details_properties || []

    // 查询相似商品
    const similar = await Goods.findAll({
      where: { category_id: g.category_id },
      limit: 10,
      attributes: ['id', 'name', 'desc', 'price', 'old_price', 'main_pictures'],
    })
    const similarProducts = similar
      .filter((s: any) => s.id !== Number(id))
      .map((s: any) => ({
        id: String(s.id),
        name: s.name,
        desc: s.desc,
        price: s.price,
        discount: s.old_price,
        orderNum: 0,
        picture: Array.isArray(s.main_pictures) ? s.main_pictures[0] : '',
      }))

    res.json({
      code: '1',
      msg: '操作成功',
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
