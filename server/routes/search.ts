import { Router } from 'express'
import db from '../config/db'

const router = Router()

// POST /search
router.post('/', async (req, res) => {
  try {
    const { keywords, page = 1, pageSize = 10 } = req.body
    const offset = (page - 1) * pageSize
    let where = 'WHERE 1=1'
    const params: any[] = []

    if (keywords) {
      where += ' AND (name LIKE ? OR `desc` LIKE ?)'
      params.push(`%${keywords}%`, `%${keywords}%`)
    }

    const [countResult] = await db.query(`SELECT COUNT(*) AS total FROM goods ${where}`, params) as any[]
    const total = countResult[0].total

    const [rows] = await db.query(
      `SELECT id, name, \`desc\`, price, old_price AS discount, 0 AS orderNum, main_pictures AS pictures FROM goods ${where} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
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
    const [rows] = await db.query('SELECT name FROM goods WHERE name LIKE ? LIMIT 10', [`%${keywords}%`]) as any[]
    res.json({ code: '1', msg: '操作成功', result: rows.map((r: any) => r.name) })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取搜索提示失败', result: null })
  }
})

export default router
