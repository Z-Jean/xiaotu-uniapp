import { Router } from 'express'
import { Order } from '../models'
import sequelize from '../config/db'
import auth from '../middleware/auth'
import fs from 'fs'
import path from 'path'

const router = Router()

// ============================================================
// 微信支付配置（从环境变量读取，未配置时使用 mock 数据）
// ============================================================
const WX_CONFIG = {
  appid: process.env.WECHAT_APPID || '',
  mchId: process.env.WECHAT_MCH_ID || '',
  serialNo: process.env.WECHAT_SERIAL_NO || '',
  privateKeyPath: process.env.WECHAT_PRIVATE_KEY_PATH || '',
  privateKeyPem: process.env.WECHAT_PRIVATE_KEY || '',
  publicKeyPath: process.env.WECHAT_PUBLIC_KEY_PATH || '',
  apiKey: process.env.WECHAT_API_KEY || '',
  notifyUrl: process.env.WECHAT_NOTIFY_URL || '',
}

/** 是否已配置真实微信支付凭证 */
const isWxPayReady = !!(
  WX_CONFIG.mchId &&
  (WX_CONFIG.privateKeyPath || WX_CONFIG.privateKeyPem) &&
  WX_CONFIG.apiKey
)

/** 读取密钥 Buffer */
function readKey(filePath: string, pemContent: string): Buffer {
  if (filePath) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(__dirname, '..', filePath)
    return fs.readFileSync(resolved)
  }
  return Buffer.from(pemContent, 'utf-8')
}

/** 延迟初始化微信支付实例（避免未配置时报错） */
let wxpayInstance: any = null
function getWxPay() {
  if (wxpayInstance) return wxpayInstance
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const WxPay = require('wechatpay-node-v3')
  wxpayInstance = new WxPay({
    appid: WX_CONFIG.appid,
    mchid: WX_CONFIG.mchId,
    serial_no: WX_CONFIG.serialNo,
    publicKey: readKey(WX_CONFIG.publicKeyPath, ''),
    privateKey: readKey(WX_CONFIG.privateKeyPath, WX_CONFIG.privateKeyPem),
    key: WX_CONFIG.apiKey,
  })
  return wxpayInstance
}

// ============================================================
// GET /pay/wxPay/miniPay?orderId=xxx
// 获取微信小程序支付参数（JSAPI 下单）
// ============================================================
router.get('/wxPay/miniPay', auth, async (req, res) => {
  try {
    if (!isWxPayReady) {
      // 未配置真实凭证 — 返回 mock 数据供开发调试
      res.json({
        code: '1',
        msg: '操作成功（mock - 未配置微信支付凭证）',
        result: {
          timeStamp: String(Math.floor(Date.now() / 1000)),
          nonceStr: Math.random().toString(36).slice(2, 15),
          package: 'prepay_id=wx' + Date.now(),
          signType: 'MD5',
          paySign: 'MOCK_SIGN_' + Date.now(),
        },
      })
      return
    }

    // ---- 真实微信支付流程 ----
    const wxpay = getWxPay()

    // 查询订单金额
    const order = await Order.findByPk(req.query.orderId as string)
    if (!order) {
      res.json({ code: '0', msg: '订单不存在', result: null })
      return
    }

    // JSAPI 下单
    const result = await wxpay.transactions_jsapi({
      description: '小兔鲜儿-订单支付',
      out_trade_no: order.id,
      notify_url: WX_CONFIG.notifyUrl,
      amount: {
        total: Math.round(Number(order.pay_money) * 100), // 转为分
      },
      payer: {
        openid: (req.headers['x-wx-openid'] as string) || '',
      },
    })

    if (result.status !== 200) {
      console.error('微信下单失败:', result)
      res.json({ code: '0', msg: '微信下单失败', result: null })
      return
    }

    // 生成小程序端调起支付所需参数
    const prepayId = result.data?.prepay_id
    const timestamp = String(Math.floor(Date.now() / 1000))
    const nonceStr = Math.random().toString(36).slice(2, 15)
    const packageStr = `prepay_id=${prepayId}`

    // 使用私钥对 package 签名
    const signStr = `${WX_CONFIG.appid}\n${timestamp}\n${nonceStr}\n${packageStr}\n`
    const paySign = wxpay.sha256WithRsa(signStr)

    res.json({
      code: '1',
      msg: '操作成功',
      result: {
        timeStamp: timestamp,
        nonceStr,
        package: packageStr,
        signType: 'RSA',
        paySign,
      },
    })
  } catch (err) {
    console.error('获取微信支付参数失败:', err)
    res.json({ code: '0', msg: '获取支付参数失败', result: null })
  }
})

// ============================================================
// 支付宝支付配置
// ============================================================
const ALIPAY_CONFIG = {
  appId: process.env.ALIPAY_APP_ID || '',
  privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
  gateway: process.env.ALIPAY_GATEWAY || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
  notifyUrl: process.env.ALIPAY_NOTIFY_URL || '',
  returnUrl: process.env.ALIPAY_RETURN_URL || 'http://localhost:5173',
}

/** 是否已配置真实支付宝凭证 */
const isAlipayReady = !!(ALIPAY_CONFIG.appId && ALIPAY_CONFIG.privateKey)

/** 延迟初始化支付宝实例 */
let alipayInstance: any = null
function getAlipay() {
  if (alipayInstance) return alipayInstance
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AlipaySdk = require('alipay-sdk').AlipaySdk
  alipayInstance = new AlipaySdk({
    appId: ALIPAY_CONFIG.appId,
    privateKey: ALIPAY_CONFIG.privateKey,
    alipayPublicKey: ALIPAY_CONFIG.alipayPublicKey,
    gateway: ALIPAY_CONFIG.gateway,
    signType: 'RSA2',
  })
  return alipayInstance
}

// ============================================================
// GET /pay/alipay?orderId=xxx
// 支付宝网页支付 — 返回跳转 URL
// ============================================================
router.get('/alipay', auth, async (req, res) => {
  try {
    if (!isAlipayReady) {
      // 未配置真实凭证 — 返回 mock 标记
      res.json({
        code: '1',
        msg: '操作成功（mock - 未配置支付宝凭证）',
        result: { mock: true },
      })
      return
    }

    const alipaySdk = getAlipay()

    // 查询订单
    const order = await Order.findByPk(req.query.orderId as string)
    if (!order) {
      res.json({ code: '0', msg: '订单不存在', result: null })
      return
    }

    // 生成支付跳转 URL（GET 方式）
    const payUrl = alipaySdk.pageExecute('alipay.trade.page.pay', 'GET', {
      bizContent: {
        outTradeNo: order.id,
        productCode: 'FAST_INSTANT_TRADE_PAY',
        totalAmount: Number(order.pay_money).toFixed(2),
        subject: '小兔鲜儿-订单支付',
      },
      notifyUrl: ALIPAY_CONFIG.notifyUrl,
      returnUrl: `${ALIPAY_CONFIG.returnUrl}/#/pagesOrder/payment/payment?id=${order.id}&mode=alipay`,
    })

    res.json({
      code: '1',
      msg: '操作成功',
      result: { payUrl },
    })
  } catch (err) {
    console.error('获取支付宝支付参数失败:', err)
    res.json({ code: '0', msg: '获取支付参数失败', result: null })
  }
})

// ============================================================
// POST /pay/alipay/notify
// 支付宝异步回调
// ============================================================
router.post('/alipay/notify', async (req, res) => {
  try {
    if (!isAlipayReady) {
      res.send('success')
      return
    }

    const alipaySdk = getAlipay()
    const formData = req.body

    // 验签
    const signVerified = alipaySdk.checkNotifySign(formData)
    if (!signVerified) {
      console.error('[支付宝回调] 验签失败')
      res.send('failure')
      return
    }

    // 交易成功 — 使用事务确保原子性
    if (formData.trade_status === 'TRADE_SUCCESS' || formData.trade_status === 'TRADE_FINISHED') {
      await sequelize.transaction(async (t) => {
        // 1. 更新订单状态
        await Order.update(
          { order_state: 2 },
          { where: { id: formData.out_trade_no }, transaction: t },
        )
        // 2. 后续可在此添加：扣减库存、记录支付日志等
        // await Stock.decrement('quantity', { by: ..., where: {...}, transaction: t })
        // await PaymentLog.create({ ... }, { transaction: t })
      })
      console.log(`[支付宝回调] 订单 ${formData.out_trade_no} 支付成功`)
    }

    res.send('success')
  } catch (err) {
    console.error('支付宝回调处理失败:', err)
    res.send('failure')
  }
})

// ============================================================
// GET /pay/alipay/query?orderId=xxx
// 主动查询支付宝交易状态（不依赖异步回调）
// 注意：此接口不需要认证，因为是从支付宝跳转回来时调用的
// ============================================================
router.get('/alipay/query', async (req, res) => {
  try {
    const { orderId } = req.query

    if (!isAlipayReady) {
      res.json({ code: '1', msg: '操作成功', result: { paid: false } })
      return
    }

    const alipaySdk = getAlipay()

    // 调用支付宝交易查询接口（带超时重试）
    let result: any = null
    for (let retry = 0; retry < 3; retry++) {
      try {
        result = await Promise.race([
          alipaySdk.exec('alipay.trade.query', {
            bizContent: { outTradeNo: orderId },
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
        ])
        break
      } catch {
        if (retry === 2) throw new Error('支付宝查询超时')
        await new Promise((r) => setTimeout(r, 1000))
      }
    }

    const tradeStatus = result?.tradeStatus
    const paid = tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED'

    // 如果支付宝说已付款，但本地订单还是待付款，则更新
    if (paid) {
      const order = await Order.findByPk(orderId as string)
      if (order && order.order_state === 1) {
        await sequelize.transaction(async (t) => {
          await Order.update(
            { order_state: 2 },
            { where: { id: orderId as string, order_state: 1 }, transaction: t },
          )
        })
        console.log(`[支付宝查询] 订单 ${orderId} 已付款，本地状态已更新`)
      }
    }

    res.json({
      code: '1',
      msg: '操作成功',
      result: { paid, tradeStatus },
    })
  } catch (err) {
    console.error('查询支付宝交易状态失败:', err)
    // 查询失败时回退：直接查本地数据库状态
    try {
      const order = await Order.findByPk(req.query.orderId as string)
      res.json({
        code: '1',
        msg: '操作成功',
        result: { paid: order ? order.order_state >= 2 : false, fallback: true },
      })
    } catch {
      res.json({ code: '0', msg: '查询失败', result: { paid: false } })
    }
  }
})

// ============================================================
// GET /pay/status?orderId=xxx
// 查询订单真实支付状态（前端轮询用）
// ============================================================
router.get('/status', auth, async (req, res) => {
  try {
    const { orderId } = req.query
    const order = await Order.findByPk(orderId as string)
    if (!order) {
      res.json({ code: '0', msg: '订单不存在', result: null })
      return
    }
    // order_state: 1=待付款, 2=待发货(已付款)
    res.json({
      code: '1',
      msg: '操作成功',
      result: {
        paid: order.order_state >= 2,
        orderState: order.order_state,
      },
    })
  } catch (err) {
    console.error('查询支付状态失败:', err)
    res.json({ code: '0', msg: '查询失败', result: null })
  }
})

// ============================================================
// GET /pay/mock?orderId=xxx
// 模拟支付 — 直接将订单状态改为已付款
// ============================================================
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

// ============================================================
// POST /pay/wxPay/notify
// 微信支付结果回调（生产环境使用）
// ============================================================
router.post('/wxPay/notify', async (req, res) => {
  try {
    const { resource } = req.body
    if (!resource) {
      res.status(400).json({ code: 'FAIL', message: '缺少通知数据' })
      return
    }

    if (!isWxPayReady) {
      // mock 模式：直接返回成功
      res.json({ code: 'SUCCESS', message: '成功' })
      return
    }

    // 真实环境：解密通知数据
    const wxpay = getWxPay()
    const decrypted = wxpay.decipher_gcm(
      resource.ciphertext,
      resource.associated_data,
      resource.nonce,
      WX_CONFIG.apiKey,
    )

    const paymentResult = JSON.parse(decrypted)

    // 交易成功 → 使用事务确保原子性
    if (paymentResult.trade_state === 'SUCCESS') {
      await sequelize.transaction(async (t) => {
        // 1. 更新订单状态
        await Order.update(
          { order_state: 2 },
          { where: { id: paymentResult.out_trade_no }, transaction: t },
        )
        // 2. 后续可在此添加：扣减库存、记录支付日志等
      })
      console.log(`[微信支付回调] 订单 ${paymentResult.out_trade_no} 支付成功`)
    }

    res.json({ code: 'SUCCESS', message: '成功' })
  } catch (err) {
    console.error('微信支付回调处理失败:', err)
    res.status(500).json({ code: 'FAIL', message: '处理失败' })
  }
})

export default router
