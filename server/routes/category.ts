import { Router } from 'express'
import { fn, col } from 'sequelize'
import { GoodsCategory, Goods } from '../models'

const router = Router()

// GET /category/top
router.get('/top', async (_req, res) => {
  try {
    const topCategories = await GoodsCategory.findAll({
      where: { parent_id: 0 },
      attributes: ['id', 'name', 'picture', 'image_banners'],
    })

    const result = await Promise.all(
      topCategories.map(async (top) => {
        const children = await GoodsCategory.findAll({
          where: { parent_id: top.id },
          attributes: ['id', 'name', 'picture'],
        })

        const childrenWithGoods = await Promise.all(
          children.map(async (child) => {
            const goods = await Goods.findAll({
              where: { category_id: child.id },
              limit: 10,
              attributes: ['id', 'name', 'desc', 'price', 'old_price', 'main_pictures'],
            })

            const formattedGoods = goods.map((g: any) => ({
              id: String(g.id),
              name: g.name,
              desc: g.desc,
              price: g.price,
              discount: g.old_price,
              orderNum: 0,
              picture: Array.isArray(g.main_pictures) ? g.main_pictures[0] : '',
            }))

            return { ...child.toJSON(), goods: formattedGoods }
          }),
        )

        // 过滤掉没有商品的二级分类
        const filtered = childrenWithGoods.filter((c: any) => c.goods.length > 0)
        const imageBanners = top.image_banners || []

        return { ...top.toJSON(), imageBanners, children: filtered }
      }),
    )

    res.json({ code: '1', msg: '操作成功', result })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取分类失败', result: null })
  }
})

export default router
