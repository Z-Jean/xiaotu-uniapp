import { Router } from 'express'
import db from '../config/db'

const router = Router()

// GET /home/banner?distributionSite=1
router.get('/banner', async (req, res) => {
  try {
    const site = req.query.distributionSite || 1
    const [rows] = await db.query('SELECT id, img_url AS imgUrl, href_url AS hrefUrl, type FROM banners WHERE distribution_site = ?', [site])
    res.json({ code: '1', msg: '操作成功', result: rows })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取轮播图失败', result: null })
  }
})

// GET /home/category/mutli
router.get('/category/mutli', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, icon FROM categories')
    res.json({ code: '1', msg: '操作成功', result: rows })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取分类失败', result: null })
  }
})

// GET /home/hot/mutli
router.get('/hot/mutli', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT id, title, alt, pictures, target, type FROM hot_items')
    res.json({ code: '1', msg: '操作成功', result: rows })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取热门推荐失败', result: null })
  }
})

// GET /home/goods/guessLike?page=1&pageSize=10
router.get('/goods/guessLike', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const offset = (page - 1) * pageSize

    const [countResult] = await db.query('SELECT COUNT(*) AS total FROM goods') as any[]
    const total = countResult[0].total

    const [rows] = await db.query(
      'SELECT id, name, `desc`, price, old_price AS discount, 0 AS orderNum, main_pictures AS pictures FROM goods LIMIT ? OFFSET ?',
      [pageSize, offset]
    ) as any[]

    const items = rows.map((r: any) => ({
      id: String(r.id),
      name: r.name,
      desc: r.desc,
      price: r.price,
      discount: r.discount,
      orderNum: r.orderNum,
      picture: Array.isArray(r.pictures) ? r.pictures[0] : '',
    }))

    res.json({
      code: '1', msg: '操作成功',
      result: { items, counts: total, page, pages: Math.ceil(total / pageSize), pageSize },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取猜你喜欢失败', result: null })
  }
})

export default router
