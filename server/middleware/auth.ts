import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import jwtConfig from '../config/jwt'

// 扩展 Request 类型，添加 userId
declare global {
  namespace Express {
    interface Request {
      userId?: number
    }
  }
}

export default function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization
  if (!token) {
    res.status(401).json({ code: '0', msg: '未登录或token已过期', result: null })
    return
  }
  try {
    const payload = jwt.verify(token, jwtConfig.secret) as { userId: number }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ code: '0', msg: '未登录或token已过期', result: null })
  }
}
