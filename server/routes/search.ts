import { Router } from 'express'
import { Op } from 'sequelize'
import { Goods } from '../models'

const router = Router()

// POST /search
router.post('/', async (req, res) => {
  try {
    const { keywords, page = 1, pageSize = 10 } = req.body
    const offset = (page - 1) * pageSize

    const where: any = {}
    if (keywords) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keywords}%` } },
        { desc: { [Op.like]: `%${keywords}%` } },
      ]
    }

    const { count: total, rows } = await Goods.findAndCountAll({
      where,
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
    res.json({ code: '0', msg: '搜索失败', result: null })
  }
})

// GET /search/hint?keywords=xxx
router.get('/hint', async (req, res) => {
  try {
    const keywords = (req.query.keywords as string) || ''
    if (!keywords) {
      res.json({ code: '1', msg: '操作成功', result: [] })
      return
    }
    const rows = await Goods.findAll({
      where: { name: { [Op.like]: `%${keywords}%` } },
      limit: 10,
      attributes: ['name'],
    })
    res.json({ code: '1', msg: '操作成功', result: rows.map((r: any) => r.name) })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取搜索提示失败', result: null })
  }
})

export default router
