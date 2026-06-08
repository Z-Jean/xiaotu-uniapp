import { http } from '@/utils/http'

/**
 * 获取微信支付参数
 * @param data orderId 订单id
 */
export const getPayWxPayMiniPayAPI = (data: { orderId: string }) => {
  return http<WechatMiniprogram.RequestPaymentOption>({
    method: 'GET',
    url: '/pay/wxPay/miniPay',
    data,
  })
}

/**
 * 获取支付宝支付跳转 URL
 * @param data orderId 订单id
 */
export const getPayAlipayAPI = (data: { orderId: string }) => {
  return http<{ payUrl?: string; mock?: boolean }>({
    method: 'GET',
    url: '/pay/alipay',
    data,
  })
}

/**
 * 模拟支付-内测版
 * @param data orderId 订单id
 */
export const getPayMockAPI = (data: { orderId: string }) => {
  return http({
    method: 'GET',
    url: '/pay/mock',
    data,
  })
}

/**
 * 查询订单支付状态
 * @param data orderId 订单id
 */
export const getPayStatusAPI = (data: { orderId: string }) => {
  return http<{ paid: boolean; orderState: number }>({
    method: 'GET',
    url: '/pay/status',
    data,
  })
}

/**
 * 主动查询支付宝交易状态（不依赖异步回调）
 * @param data orderId 订单id
 */
export const getPayAlipayQueryAPI = (data: { orderId: string }) => {
  return http<{ paid: boolean; tradeStatus?: string }>({
    method: 'GET',
    url: '/pay/alipay/query',
    data,
  })
}
