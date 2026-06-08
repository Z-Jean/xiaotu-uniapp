import { Router } from 'express'
import { fn, col } from 'sequelize'
import { Banner, Category, HotItem, Goods } from '../models'

const router = Router()

// GET /home/banner?distributionSite=1
router.get('/banner', async (req, res) => {
  try {
    const site = Number(req.query.distributionSite) || 1
    const rows = await Banner.findAll({
      where: { distribution_site: site },
      attributes: [
        'id',
        'type',
        [fn('IFNULL', col('img_url'), ''), 'imgUrl'],
        [fn('IFNULL', col('href_url'), ''), 'hrefUrl'],
      ],
    })
    res.json({ code: '1', msg: '操作成功', result: rows })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取轮播图失败', result: null })
  }
})

// GET /home/category/mutli
router.get('/category/mutli', async (_req, res) => {
  try {
    const rows = await Category.findAll({ attributes: ['id', 'name', 'icon'] })
    res.json({ code: '1', msg: '操作成功', result: rows })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取分类失败', result: null })
  }
})

// GET /home/hot/mutli
router.get('/hot/mutli', async (_req, res) => {
  try {
    const rows = await HotItem.findAll({
      attributes: ['id', 'title', 'alt', 'pictures', 'target', 'type'],
    })
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

    const { count: total, rows } = await Goods.findAndCountAll({
      limit: pageSize,
      offset,
      attributes: ['id', 'name', 'desc', 'price', 'old_price', 'main_pictures'],
    })

    const items = rows.map((r: any) => ({
      id: String(r.id),
      name: r.name,
      desc: r.desc,
      price: r.price,
      discount: r.old_price,
      orderNum: 0,
      picture: Array.isArray(r.main_pictures) ? r.main_pictures[0] : '',
    }))

    res.json({
      code: '1',
      msg: '操作成功',
      result: { items, counts: total, page, pages: Math.ceil(total / pageSize), pageSize },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取猜你喜欢失败', result: null })
  }
})

export default router
