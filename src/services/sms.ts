import { http } from '@/utils/http'

/** 发送短信验证码 */
export const postSendSmsAPI = (data: { mobile: string }) => {
  return http<null>({ url: '/sms/send', method: 'POST', data })
}

/** 短信验证码登录 */
export const postSmsLoginAPI = (data: { mobile: string; code: string }) => {
  return http<{
    id: number
    account: string
    nickname: string
    token: string
    avatar: string
  }>({ url: '/sms/verify', method: 'POST', data })
}
