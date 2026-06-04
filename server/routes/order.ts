import { Router } from 'express'
import db from '../config/db'
import auth from '../middleware/auth'

const router = Router()

// GET /member/order/pre
router.get('/pre', auth, async (req, res) => {
  try {
    const [cartItems] = await db.query(`
      SELECT c.sku_id AS skuId, c.count, g.name, g.main_pictures AS pictures, g.price
      FROM cart_items c
      LEFT JOIN goods_skus gs ON c.sku_id = gs.id
      LEFT JOIN goods g ON gs.goods_id = g.id
      WHERE c.user_id = ? AND c.selected = 1
    `, [req.userId]) as any[]

    const goods = cartItems.map((item: any, i: number) => ({
      id: String(i + 1),
      skuId: String(item.skuId),
      name: item.name || '',
      picture: Array.isArray(item.pictures) ? item.pictures[0] : '',
      count: item.count,
      price: String(item.price),
      payPrice: String(item.price),
      totalPrice: String(item.price * item.count),
      totalPayPrice: String(item.price * item.count),
      attrsText: '',
    }))

    const totalPrice = goods.reduce((sum: number, g: any) => sum + parseFloat(g.totalPrice), 0)

    const [addresses] = await db.query(
      'SELECT id, receiver, contact, province_code AS provinceCode, city_code AS cityCode, county_code AS countyCode, full_location AS fullLocation, address, is_default AS isDefault FROM addresses WHERE user_id = ?',
      [req.userId]
    )

    res.json({
      code: '1', msg: '操作成功',
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
    const [skus] = await db.query(`
      SELECT gs.id AS skuId, g.name, g.main_pictures AS pictures, gs.price
      FROM goods_skus gs LEFT JOIN goods g ON gs.goods_id = g.id WHERE gs.id = ?
    `, [skuId]) as any[]

    if (!skus.length) {
      res.json({ code: '0', msg: '商品不存在', result: null })
      return
    }

    const item = skus[0]
    const goods = [{
      id: '1', skuId: String(item.skuId), name: item.name || '',
      picture: Array.isArray(item.pictures) ? item.pictures[0] : '',
      count: parseInt(count as string), price: String(item.price), payPrice: String(item.price),
      totalPrice: String(item.price * parseInt(count as string)),
      totalPayPrice: String(item.price * parseInt(count as string)), attrsText: '',
    }]

    const totalPrice = parseFloat(goods[0].totalPrice)
    const [addresses] = await db.query(
      'SELECT id, receiver, contact, province_code AS provinceCode, city_code AS cityCode, county_code AS countyCode, full_location AS fullLocation, address, is_default AS isDefault FROM addresses WHERE user_id = ?',
      [req.userId]
    )

    res.json({
      code: '1', msg: '操作成功',
      result: { goods, summary: { totalPrice, postFee: 0, totalPayPrice: totalPrice }, userAddresses: addresses },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取立即购买订单失败', result: null })
  }
})

// GET /member/order/repurchase/:id
router.get('/repurchase/:id', auth, async (req, res) => {
  try {
    const [orderSkus] = await db.query(
      'SELECT sku_id AS skuId, name, image AS picture, quantity AS count, cur_price AS price FROM order_skus WHERE order_id = ?',
      [req.params.id]
    ) as any[]

    const goods = orderSkus.map((item: any, i: number) => ({
      id: String(i + 1), skuId: String(item.skuId), name: item.name || '', picture: item.picture || '',
      count: item.count, price: String(item.price), payPrice: String(item.price),
      totalPrice: String(item.price * item.count), totalPayPrice: String(item.price * item.count), attrsText: '',
    }))

    const totalPrice = goods.reduce((sum: number, g: any) => sum + parseFloat(g.totalPrice), 0)
    const [addresses] = await db.query(
      'SELECT id, receiver, contact, province_code AS provinceCode, city_code AS cityCode, county_code AS countyCode, full_location AS fullLocation, address, is_default AS isDefault FROM addresses WHERE user_id = ?',
      [req.userId]
    )

    res.json({
      code: '1', msg: '操作成功',
      result: { goods, summary: { totalPrice, postFee: 0, totalPayPrice: totalPrice }, userAddresses: addresses },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取再次购买订单失败', result: null })
  }
})

// POST /member/order
router.post('/', auth, async (req, res) => {
  try {
    const { addressId, deliveryTimeType = 1, buyerMessage = '', goods = [], payChannel = 2, payType = 1 } = req.body

    const [addresses] = await db.query('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [addressId, req.userId]) as any[]
    const address = addresses[0] || {}

    let totalMoney = 0
    for (const g of goods) {
      const [skus] = await db.query('SELECT price FROM goods_skus WHERE id = ?', [g.skuId]) as any[]
      if (skus.length) totalMoney += skus[0].price * g.count
    }

    const orderNo = 'XTX' + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase()

    const [result] = await db.query(
      `INSERT INTO orders (order_no, user_id, order_state, address_snapshot, total_money, post_fee, pay_money, buyer_message, delivery_time_type, pay_type, pay_channel, countdown)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderNo, req.userId, 1, JSON.stringify(address), totalMoney, 0, totalMoney, buyerMessage, deliveryTimeType, payType, payChannel, 1800]
    ) as any[]

    const orderId = result.insertId

    for (const g of goods) {
      const [skus] = await db.query(`
        SELECT gs.id, gs.price, g.name, g.main_pictures AS pictures, gs.specs
        FROM goods_skus gs LEFT JOIN goods g ON gs.goods_id = g.id WHERE gs.id = ?
      `, [g.skuId]) as any[]
      if (skus.length) {
        const s = skus[0]
        const specs = typeof s.specs === 'string' ? JSON.parse(s.specs) : s.specs || []
        const attrsText = specs.map((sp: any) => sp.valueName).join(' ')
        const picture = Array.isArray(s.pictures) ? s.pictures[0] : ''
        await db.query(
          'INSERT INTO order_skus (order_id, sku_id, name, image, attrs_text, quantity, cur_price) VALUES (?,?,?,?,?,?,?)',
          [orderId, g.skuId, s.name, picture, attrsText, g.count, s.price]
        )
      }
    }

    if (goods.length) {
      const skuIds = goods.map((g: any) => g.skuId)
      await db.query('DELETE FROM cart_items WHERE user_id = ? AND sku_id IN (?)', [req.userId, skuIds])
    }

    res.json({ code: '1', msg: '操作成功', result: { id: String(orderId) } })
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

    let where = 'WHERE o.user_id = ?'
    const params: any[] = [req.userId]
    if (orderState > 0) { where += ' AND o.order_state = ?'; params.push(orderState) }

    const [countResult] = await db.query(`SELECT COUNT(*) AS total FROM orders o ${where}`, params) as any[]
    const total = countResult[0].total

    const [orders] = await db.query(`
      SELECT o.id, o.order_no AS orderNo, o.order_state AS orderState, o.countdown,
             o.total_money AS totalMoney, o.post_fee AS postFee, o.pay_money AS payMoney,
             o.created_at AS createTime
      FROM orders o ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]) as any[]

    const items: any[] = []
    for (const order of orders) {
      const [skus] = await db.query(
        'SELECT id, sku_id AS spuId, name, attrs_text AS attrsText, quantity, cur_price AS curPrice, image FROM order_skus WHERE order_id = ?',
        [order.id]
      ) as any[]

      const [orderRow] = await db.query('SELECT address_snapshot FROM orders WHERE id = ?', [order.id]) as any[]
      let addressSnapshot: any = {}
      if (orderRow.length && orderRow[0].address_snapshot) {
        addressSnapshot = typeof orderRow[0].address_snapshot === 'string'
          ? JSON.parse(orderRow[0].address_snapshot) : orderRow[0].address_snapshot
      }

      const fullLoc = addressSnapshot.fullLocation || addressSnapshot.full_location || ''
      const addrText = addressSnapshot.address || ''
      items.push({
        id: String(order.id), orderState: order.orderState, countdown: order.countdown, skus,
        receiverContact: addressSnapshot.receiver || '', receiverMobile: addressSnapshot.contact || '',
        receiverAddress: fullLoc ? fullLoc + ' ' + addrText : addrText,
        createTime: order.createTime, totalMoney: order.totalMoney, postFee: order.postFee,
        payMoney: order.payMoney, totalNum: skus.reduce((sum: number, s: any) => sum + s.quantity, 0),
      })
    }

    res.json({
      code: '1', msg: '操作成功',
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
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.userId]) as any[]
    if (!orders.length) {
      res.json({ code: '0', msg: '订单不存在', result: null })
      return
    }

    const order = orders[0]
    const [skus] = await db.query(
      'SELECT id, sku_id AS spuId, name, attrs_text AS attrsText, quantity, cur_price AS curPrice, image FROM order_skus WHERE order_id = ?',
      [order.id]
    ) as any[]

    const address = typeof order.address_snapshot === 'string' ? JSON.parse(order.address_snapshot) : order.address_snapshot || {}
    const fullLocation = address.fullLocation || address.full_location || ''
    const addr = address.address || ''
    const receiverAddress = fullLocation ? fullLocation + ' ' + addr : addr

    res.json({
      code: '1', msg: '操作成功',
      result: {
        id: String(order.id), orderState: order.order_state, countdown: order.countdown, skus,
        receiverContact: address.receiver || '', receiverMobile: address.contact || '',
        receiverAddress,
        createTime: order.created_at, totalMoney: order.total_money, postFee: order.post_fee, payMoney: order.pay_money,
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
    await db.query('UPDATE orders SET order_state = 6 WHERE id = ? AND user_id = ? AND order_state = 1', [req.params.id, req.userId])
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '取消订单失败', result: null })
  }
})

// PUT /member/order/:id/receipt
router.put('/:id/receipt', auth, async (req, res) => {
  try {
    await db.query('UPDATE orders SET order_state = 4 WHERE id = ? AND user_id = ? AND order_state = 3', [req.params.id, req.userId])
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
      code: '1', msg: '操作成功',
      result: {
        company: { name: '顺丰速运', number: 'SF1234567890', tel: '95338' },
        count: 1,
        list: [
          { id: '1', text: '已签收，签收人：本人签收', time: new Date().toISOString() },
          { id: '2', text: '派件中', time: new Date(Date.now() - 86400000).toISOString() },
          { id: '3', text: '已到达目的地城市', time: new Date(Date.now() - 172800000).toISOString() },
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
    await db.query('UPDATE orders SET order_state = 3 WHERE id = ? AND user_id = ? AND order_state = 2', [req.params.id, req.userId])
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
      await db.query('DELETE FROM order_skus WHERE order_id IN (?)', [ids])
      await db.query('DELETE FROM orders WHERE id IN (?) AND user_id = ?', [ids, req.userId])
    }
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '删除订单失败', result: null })
  }
})

export default router
