import { Router } from 'express'
import { HotItem, Goods } from '../models'

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
    const hotItem = await HotItem.findOne({ attributes: ['pictures'] })
    const bannerPicture =
      hotItem?.pictures && Array.isArray(hotItem.pictures) ? hotItem.pictures[0] : ''

    // 获取总数
    const { count: total } = await Goods.findAndCountAll()

    // 为每个子类型构造商品列表
    const subTypes = await Promise.all(
      config.subTypes.map(async (title, index) => {
        const subOffset = (offset + index * pageSize) % Math.max(total, 1)
        const goods = await Goods.findAll({
          limit: pageSize,
          offset: subOffset,
          attributes: ['id', 'name', 'desc', 'price', 'old_price', 'main_pictures'],
        })

        return {
          id: String(index + 1),
          title,
          goodsItems: {
            items: goods.map((g: any) => ({
              id: String(g.id),
              name: g.name,
              desc: g.desc,
              price: g.price,
              discount: g.old_price,
              orderNum: 0,
              picture: Array.isArray(g.main_pictures) ? g.main_pictures[0] : '',
            })),
            counts: total,
            page,
            pages: Math.ceil(total / pageSize),
            pageSize,
          },
        }
      }),
    )

    res.json({
      code: '1',
      msg: '操作成功',
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
