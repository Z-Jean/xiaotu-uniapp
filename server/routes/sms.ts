import { Router, Request, Response } from 'express'
import * as OpenApiClient from '@alicloud/openapi-client'
import { Op } from 'sequelize'
import { SmsCode, User } from '../models'
import jwt from 'jsonwebtoken'
import jwtConfig from '../config/jwt'

const router = Router()

// ─── 阿里云号码认证服务客户端 ─────────────────────────────
function createSmsClient() {
  const config = new OpenApiClient.Config({
    accessKeyId: process.env.SMS_ACCESS_KEY_ID,
    accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET,
    endpoint: 'dypnsapi.aliyuncs.com',
  })
  return new OpenApiClient.default(config)
}

// ─── 手动调用阿里云 API ────────────────────────────────────
async function callAliyunApi(action: string, params: Record<string, string>) {
  const client = createSmsClient()
  const request = new OpenApiClient.OpenApiRequest({ body: params })
  const apiParams = new OpenApiClient.Params({
    action,
    version: '2017-05-25',
    protocol: 'HTTPS',
    method: 'POST',
    authType: 'AK',
    style: 'ROA',
    pathname: '/',
    reqBodyType: 'json',
    bodyType: 'json',
  })
  return await client.callApi(apiParams, request, { toMap: () => ({}) } as any)
}

// ─── 生成 6 位验证码 ──────────────────────────────────────
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// ─── 校验手机号格式 ──────────────────────────────────────
function isValidMobile(mobile: string): boolean {
  return /^1[3-9]\d{9}$/.test(mobile)
}

// POST /sms/send  发送验证码
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { mobile } = req.body
    if (!mobile || !isValidMobile(mobile)) {
      res.json({ code: '0', msg: '请输入正确的手机号', result: null })
      return
    }

    // 检查 10 秒内是否重复发送
    const recent = await SmsCode.findOne({
      where: {
        mobile,
        created_at: { [Op.gt]: new Date(Date.now() - 10000) },
      },
      order: [['id', 'DESC']],
    })
    if (recent) {
      res.json({ code: '0', msg: '60 秒内不能重复发送', result: null })
      return
    }

    // 生成验证码
    const code = generateCode()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 分钟有效

    // 存入数据库
    await SmsCode.create({
      mobile,
      code,
      purpose: 'login',
      expires_at: expiresAt,
    })

    // 调用阿里云号码认证服务 SendSmsVerifyCode
    const result = await callAliyunApi('SendSmsVerifyCode', {
      Code: code,
      PhoneNumber: mobile,
      SignName: process.env.SMS_SIGN_NAME || '速通互联验证码',
      TemplateCode: process.env.SMS_TEMPLATE_CODE || '100001',
      TemplateParam: JSON.stringify({ code, min: '5' }),
    })

    // 检查返回结果
    const body = result.body
    if (body.Code === 'OK') {
      res.json({ code: '1', msg: '验证码已发送', result: null })
    } else {
      console.error('SMS send error:', body)
      res.json({ code: '0', msg: body.Message || '验证码发送失败', result: null })
    }
  } catch (err: any) {
    console.error('SMS send error:', err?.message || err)
    res.json({ code: '0', msg: '验证码发送失败', result: null })
  }
})

// POST /sms/verify  校验验证码并登录
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { mobile, code } = req.body
    if (!mobile || !code) {
      res.json({ code: '0', msg: '请输入手机号和验证码', result: null })
      return
    }

    // 查找未使用且未过期的验证码
    const smsRecord = await SmsCode.findOne({
      where: {
        mobile,
        code,
        used: 0,
        expires_at: { [Op.gt]: new Date() },
      },
      order: [['id', 'DESC']],
    })

    if (!smsRecord) {
      res.json({ code: '0', msg: '验证码错误或已过期', result: null })
      return
    }

    // 标记验证码已使用
    await SmsCode.update({ used: 1 }, { where: { id: smsRecord.id } })

    // 查找用户，不存在则自动注册
    let user = await User.findOne({ where: { account: mobile } })
    let nickname: string

    if (user) {
      // 已有用户，直接登录
      nickname = user.nickname || mobile
    } else {
      // 自动注册
      user = await User.create({
        account: mobile,
        password: '',
        nickname: `用户${mobile.slice(-4)}`,
        avatar: '',
      })
      nickname = `用户${mobile.slice(-4)}`
    }

    // 生成 JWT token
    const token = jwt.sign({ id: user.id }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    })

    res.json({
      code: '1',
      msg: '登录成功',
      result: {
        id: user.id,
        account: mobile,
        nickname,
        token,
        avatar: user.avatar || '',
      },
    })
  } catch (err: any) {
    console.error('SMS verify error:', err?.message || err)
    res.json({ code: '0', msg: '登录失败', result: null })
  }
})

export default router
