import { Router } from 'express'
import { Order } from '../models'
import auth from '../middleware/auth'

const router = Router()

// GET /pay/wxPay/miniPay?orderId=xxx
router.get('/wxPay/miniPay', auth, async (_req, res) => {
  try {
    res.json({
      code: '1',
      msg: '操作成功',
      result: {
        timeStamp: String(Math.floor(Date.now() / 1000)),
        nonceStr: Math.random().toString(36).slice(2, 15),
        package: 'prepay_id=wx' + Date.now(),
        signType: 'MD5',
        paySign: 'MOCK_SIGNSIGN' + Date.now(),
      },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '获取支付参数失败', result: null })
  }
})

// GET /pay/mock?orderId=xxx
router.get('/mock', auth, async (req, res) => {
  try {
    const { orderId } = req.query
    await Order.update({ order_state: 2 }, { where: { id: orderId, user_id: req.userId } })
    res.json({ code: '1', msg: '操作成功', result: null })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '模拟支付失败', result: null })
  }
})

export default router
