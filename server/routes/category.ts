import { Router } from 'express'
import db from '../config/db'

const router = Router()

// GET /category/top
router.get('/top', async (_req, res) => {
  try {
    const [topCategories] = await db.query(
      'SELECT id, name, picture, image_banners AS imageBanners FROM goods_categories WHERE parent_id = 0'
    ) as any[]

    for (const top of topCategories) {
      const [children] = await db.query(
        'SELECT id, name, picture FROM goods_categories WHERE parent_id = ?', [top.id]
      ) as any[]

      for (const child of children) {
        const [goods] = await db.query(
          'SELECT id, name, `desc`, price, old_price AS discount, 0 AS orderNum, main_pictures AS pictures FROM goods WHERE category_id = ? LIMIT 10',
          [child.id]
        ) as any[]
        child.goods = goods.map((g: any) => ({
          id: String(g.id),
          name: g.name,
          desc: g.desc,
          price: g.price,
          discount: g.discount,
          orderNum: g.orderNum,
          picture: Array.isArray(g.pictures) ? g.pictures[0] : '',
        }))
      }

      // 过滤掉没有商品的二级分类
      top.children = children.filter((c: any) => c.goods.length > 0)
      if (typeof top.imageBanners === 'string') {
        try { top.imageBanners = JSON.parse(top.imageBanners) } catch { top.imageBanners = [] }
      }
    }

    res.json({ code: '1', msg: '操作成功', result: topCategories })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取分类失败', result: null })
  }
})

export default router
