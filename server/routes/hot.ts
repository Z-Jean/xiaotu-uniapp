import { Router } from 'express'
import db from '../config/db'

const router = Router()

// 热门推荐类型配置
const HOT_CONFIG: Record<string, { title: string; subTypes: string[] }> = {
  preference: { title: '特惠推荐', subTypes: ['抢先尝鲜', '新品预告'] },
  inVogue: { title: '爆款推荐', subTypes: ['人气好物', '口碑好物'] },
  oneStop: { title: '一站买全', subTypes: ['厨房好物', '居家必备'] },
  new: { title: '新鲜好物', subTypes: ['新鲜出炉', '创意新品'] },
}

// GET /hot/:type?page=1&pageSize=10&subType=xxx
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const offset = (page - 1) * pageSize

    const config = HOT_CONFIG[type] || HOT_CONFIG.preference

    // 获取热门推荐封面图
    const [hotItems] = await db.query('SELECT pictures FROM hot_items LIMIT 1') as any[]
    const bannerPicture = hotItems.length && Array.isArray(hotItems[0].pictures)
      ? hotItems[0].pictures[0] : ''

    // 获取总数
    const [countResult] = await db.query('SELECT COUNT(*) AS total FROM goods') as any[]
    const total = countResult[0].total

    // 为每个子类型构造商品列表
    const subTypes = config.subTypes.map((title, index) => {
      // 不同子类型使用不同的偏移量，让商品列表有差异
      const subOffset = (offset + index * pageSize) % Math.max(total, 1)
      return {
        id: String(index + 1),
        title,
        goodsItems: {
          items: [], // 会在下面填充
          counts: total,
          page,
          pages: Math.ceil(total / pageSize),
          pageSize,
        },
      }
    })

    // 查询商品（为每个子类型查询）
    for (let i = 0; i < subTypes.length; i++) {
      const subOffset = (offset + i * pageSize) % Math.max(total, 1)
      const [goods] = await db.query(
        'SELECT id, name, `desc`, price, old_price AS discount, 0 AS orderNum, main_pictures AS pictures FROM goods LIMIT ? OFFSET ?',
        [pageSize, subOffset]
      ) as any[]

      subTypes[i].goodsItems.items = goods.map((g: any) => ({
        id: String(g.id),
        name: g.name,
        desc: g.desc,
        price: g.price,
        discount: g.discount,
        orderNum: g.orderNum,
        picture: Array.isArray(g.pictures) ? g.pictures[0] : '',
      }))
    }

    res.json({
      code: '1', msg: '操作成功',
      result: {
        id: '1',
        bannerPicture,
        title: config.title,
        subTypes,
      },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取热门推荐失败', result: null })
  }
})

export default router
