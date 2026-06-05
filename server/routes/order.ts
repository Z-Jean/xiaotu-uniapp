import { Router } from 'express'
import { fn, col, Op } from 'sequelize'
import { Order, OrderSku, CartItem, GoodsSku, Goods, Address } from '../models'
import auth from '../middleware/auth'
import sequelize from '../config/db'

const router = Router()

// GET /member/order/pre
router.get('/pre', auth, async (req, res) => {
  try {
    const cartItems = await CartItem.findAll({
      where: { user_id: req.userId, selected: 1 },
      include: [
        {
          model: GoodsSku,
          as: 'sku',
          attributes: ['id', 'price'],
          include: [
            {
              model: Goods,
              as: 'goods',
              attributes: ['id', 'name', 'main_pictures', 'price'],
            },
          ],
        },
      ],
    })

    const goods = cartItems.map((item: any, i: number) => {
      const sku = item.sku
      const goodsInfo = sku?.goods
      const pictures = goodsInfo?.main_pictures
      const price = goodsInfo?.price || sku?.price
      return {
        id: String(i + 1),
        skuId: String(item.sku_id),
        name: goodsInfo?.name || '',
        picture: Array.isArray(pictures) ? pictures[0] : '',
        count: item.count,
        price: String(price),
        payPrice: String(price),
        totalPrice: String(price * item.count),
        totalPayPrice: String(price * item.count),
        attrsText: '',
      }
    })

    const totalPrice = goods.reduce((sum: number, g: any) => sum + parseFloat(g.totalPrice), 0)

    const addresses = await Address.findAll({
      where: { user_id: req.userId },
      attributes: [
        'id',
        'receiver',
        'contact',
        'province_code',
        'city_code',
        'county_code',
        'full_location',
        'address',
        'is_default',
      ],
    })

    res.json({
      code: '1',
      msg: '操作成功',
      result: {
        goods,
        summary: { totalPrice, postFee: 0, totalPayPrice: totalPrice },
        userAddresses: addresses,
      },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取预付订单失败', result: null })
  }
})

// GET /member/order/pre/now
router.get('/pre/now', auth, async (req, res) => {
  try {
    const { skuId, count = 1 } = req.query

    const sku = await GoodsSku.findByPk(skuId as string, {
      include: [
        {
          model: Goods,
          as: 'goods',
          attributes: ['id', 'name', 'main_pictures', 'price'],
        },
      ],
    })

    if (!sku) {
      res.json({ code: '0', msg: '商品不存在', result: null })
      return
    }

    const goodsInfo = (sku as any).goods
    const pictures = goodsInfo?.main_pictures
    const price = goodsInfo?.price || (sku as any).price
    const quantity = parseInt(count as string)

    const goods = [
      {
        id: '1',
        skuId: String(skuId),
        name: goodsInfo?.name || '',
        picture: Array.isArray(pictures) ? pictures[0] : '',
        count: quantity,
        price: String(price),
        payPrice: String(price),
        totalPrice: String(price * quantity),
        totalPayPrice: String(price * quantity),
        attrsText: '',
      },
    ]

    const totalPrice = parseFloat(goods[0].totalPrice)
    const addresses = await Address.findAll({
      where: { user_id: req.userId },
      attributes: [
        'id',
        'receiver',
        'contact',
        'province_code',
        'city_code',
        'county_code',
        'full_location',
        'address',
        'is_default',
      ],
    })

    res.json({
      code: '1',
      msg: '操作成功',
      result: {
        goods,
        summary: { totalPrice, postFee: 0, totalPayPrice: totalPrice },
        userAddresses: addresses,
      },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取立即购买订单失败', result: null })
  }
})

// GET /member/order/repurchase/:id
router.get('/repurchase/:id', auth, async (req, res) => {
  try {
    const orderSkus = await OrderSku.findAll({
      where: { order_id: req.params.id },
      attributes: ['sku_id', 'name', 'image', 'quantity', 'cur_price'],
    })

    const goods = orderSkus.map((item: any, i: number) => ({
      id: String(i + 1),
      skuId: String(item.sku_id),
      name: item.name || '',
      picture: item.image || '',
      count: item.quantity,
      price: String(item.cur_price),
      payPrice: String(item.cur_price),
      totalPrice: String(item.cur_price * item.quantity),
      totalPayPrice: String(item.cur_price * item.quantity),
      attrsText: '',
    }))

    const totalPrice = goods.reduce((sum: number, g: any) => sum + parseFloat(g.totalPrice), 0)
    const addresses = await Address.findAll({
      where: { user_id: req.userId },
      attributes: [
        'id',
        'receiver',
        'contact',
        'province_code',
        'city_code',
        'county_code',
        'full_location',
        'address',
        'is_default',
      ],
    })

    res.json({
      code: '1',
      msg: '操作成功',
      result: {
        goods,
        summary: { totalPrice, postFee: 0, totalPayPrice: totalPrice },
        userAddresses: addresses,
      },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取再次购买订单失败', result: null })
  }
})

// POST /member/order
router.post('/', auth, async (req, res) => {
  try {
    const {
      addressId,
      deliveryTimeType = 1,
      buyerMessage = '',
      goods = [],
      payChannel = 2,
      payType = 1,
    } = req.body

    const address = await Address.findOne({
      where: { id: addressId, user_id: req.userId },
    })

    let totalMoney = 0
    for (const g of goods) {
      const sku = await GoodsSku.findByPk(g.skuId)
      if (sku) totalMoney += sku.price * g.count
    }

    const orderNo = 'XTX' + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase()

    const order = await Order.create({
      order_no: orderNo,
      user_id: req.userId,
      order_state: 1,
      address_snapshot: address?.toJSON(),
      total_money: totalMoney,
      post_fee: 0,
      pay_money: totalMoney,
      buyer_message: buyerMessage,
      delivery_time_type: deliveryTimeType,
      pay_type: payType,
      pay_channel: payChannel,
      countdown: 1800,
    })

    for (const g of goods) {
      const sku = await GoodsSku.findByPk(g.skuId, {
        include: [
          {
            model: Goods,
            as: 'goods',
            attributes: ['id', 'name', 'main_pictures'],
          },
        ],
      })
      if (sku) {
        const goodsInfo = (sku as any).goods
        const specs = typeof sku.specs === 'string' ? JSON.parse(sku.specs) : sku.specs || []
        const attrsText = specs.map((sp: any) => sp.valueName).join(' ')
        const pictures = goodsInfo?.main_pictures
        const picture = Array.isArray(pictures) ? pictures[0] : ''

        await OrderSku.create({
          order_id: order.id,
          sku_id: g.skuId,
          name: goodsInfo?.name || '',
          image: picture,
          attrs_text: attrsText,
          quantity: g.count,
          cur_price: sku.price,
        })
      }
    }

    if (goods.length) {
      const skuIds = goods.map((g: any) => g.skuId)
      await CartItem.destroy({
        where: { user_id: req.userId, sku_id: skuIds },
      })
    }

    res.json({ code: '1', msg: '操作成功', result: { id: String(order.id) } })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '提交订单失败', result: null })
  }
})

// GET /member/order
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const orderState = parseInt(req.query.orderState as string) || 0
    const offset = (page - 1) * pageSize

    const where: any = { user_id: req.userId }
    if (orderState > 0) where.order_state = orderState

    const { count: total, rows: orders } = await Order.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset,
      attributes: [
        'id',
        'order_no',
        'order_state',
        'countdown',
        'total_money',
        'post_fee',
        'pay_money',
        'created_at',
      ],
    })

    const items: any[] = []
    for (const order of orders) {
      const skus = await OrderSku.findAll({
        where: { order_id: order.id },
        attributes: ['id', 'sku_id', 'name', 'attrs_text', 'quantity', 'cur_price', 'image'],
      })

      let addressSnapshot: any = {}
      if (order.address_snapshot) {
        addressSnapshot =
          typeof order.address_snapshot === 'string'
            ? JSON.parse(order.address_snapshot)
            : order.address_snapshot
      }

      const fullLoc = addressSnapshot.fullLocation || addressSnapshot.full_location || ''
      const addrText = addressSnapshot.address || ''

      items.push({
        id: String(order.id),
        orderState: order.order_state,
        countdown: order.countdown,
        skus: skus.map((s: any) => ({
          id: s.id,
          spuId: s.sku_id,
          name: s.name,
          attrsText: s.attrs_text,
          quantity: s.quantity,
          curPrice: s.cur_price,
          image: s.image,
        })),
        receiverContact: addressSnapshot.receiver || '',
        receiverMobile: addressSnapshot.contact || '',
        receiverAddress: fullLoc ? fullLoc + ' ' + addrText : addrText,
        createTime: order.created_at,
        totalMoney: order.total_money,
        postFee: order.post_fee,
        payMoney: order.pay_money,
        totalNum: skus.reduce((sum: number, s: any) => sum + s.quantity, 0),
      })
    }

    res.json({
      code: '1',
      msg: '操作成功',
      result: { items, counts: total, page, pages: Math.ceil(total / pageSize), pageSize },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取订单列表失败', result: null })
  }
})

// GET /member/order/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, user_id: req.userId },
    })
    if (!order) {
      res.json({ code: '0', msg: '订单不存在', result: null })
      return
    }

    const skus = await OrderSku.findAll({
      where: { order_id: order.id },
      attributes: ['id', 'sku_id', 'name', 'attrs_text', 'quantity', 'cur_price', 'image'],
    })

    const address =
      typeof order.address_snapshot === 'string'
        ? JSON.parse(order.address_snapshot)
        : order.address_snapshot || {}
    const fullLocation = address.fullLocation || address.full_location || ''
    const addr = address.address || ''
    const receiverAddress = fullLocation ? fullLocation + ' ' + addr : addr

    res.json({
      code: '1',
      msg: '操作成功',
      result: {
        id: String(order.id),
        orderState: order.order_state,
        countdown: order.countdown,
        skus: skus.map((s: any) => ({
          id: s.id,
          spuId: s.sku_id,
          name: s.name,
          attrsText: s.attrs_text,
          quantity: s.quantity,
          curPrice: s.cur_price,
          image: s.image,
        })),
        receiverContact: address.receiver || '',
        receiverMobile: address.contact || '',
        receiverAddress,
        createTime: order.created_at,
        totalMoney: order.total_money,
        postFee: order.post_fee,
        payMoney: order.pay_money,
      },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取订单详情失败', result: null })
  }
})

// PUT /member/order/:id/cancel
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    await Order.update(
      { order_state: 6 },
      { where: { id: req.params.id, user_id: req.userId, order_state: 1 } },
    )
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '取消订单失败', result: null })
  }
})

// PUT /member/order/:id/receipt
router.put('/:id/receipt', auth, async (req, res) => {
  try {
    await Order.update(
      { order_state: 4 },
      { where: { id: req.params.id, user_id: req.userId, order_state: 3 } },
    )
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '确认收货失败', result: null })
  }
})

// GET /member/order/:id/logistics
router.get('/:id/logistics', auth, async (_req, res) => {
  try {
    res.json({
      code: '1',
      msg: '操作成功',
      result: {
        company: { name: '顺丰速运', number: 'SF1234567890', tel: '95338' },
        count: 1,
        list: [
          { id: '1', text: '已签收，签收人：本人签收', time: new Date().toISOString() },
          { id: '2', text: '派件中', time: new Date(Date.now() - 86400000).toISOString() },
          {
            id: '3',
            text: '已到达目的地城市',
            time: new Date(Date.now() - 172800000).toISOString(),
          },
        ],
      },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取物流信息失败', result: null })
  }
})

// GET /member/order/consignment/:id
router.get('/consignment/:id', auth, async (req, res) => {
  try {
    await Order.update(
      { order_state: 3 },
      { where: { id: req.params.id, user_id: req.userId, order_state: 2 } },
    )
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '模拟发货失败', result: null })
  }
})

// DELETE /member/order
router.delete('/', auth, async (req, res) => {
  try {
    const { ids } = req.body
    if (ids && ids.length) {
      await OrderSku.destroy({ where: { order_id: ids } })
      await Order.destroy({ where: { id: ids, user_id: req.userId } })
    }
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '删除订单失败', result: null })
  }
})

export default router
