/**
 * 图片 URL 处理：将 OSS 图片通过后端代理加载，避免外网不可用
 * 如果图片加载失败，自动切换到代理地址
 */

import { API_BASE } from '@/config'

const OSS_DOMAIN = 'yjy-xiaotuxian-dev.oss-cn-beijing.aliyuncs.com'
const PROXY_BASE = API_BASE

/** 判断是否为 OSS 图片 */
export function isOssImage(url: string): boolean {
  return url?.includes(OSS_DOMAIN)
}

/** 获取代理后的图片地址 */
export function proxyImage(url: string): string {
  if (!url || !isOssImage(url)) return url
  return `${PROXY_BASE}/proxy/image?url=${encodeURIComponent(url)}`
}

/** 图片加载失败时的 fallback：将 OSS URL 替换为代理 URL */
export function onImageError(e: any): string {
  const src = e?.target?.src || e?.detail?.src || ''
  if (isOssImage(src)) {
    return proxyImage(src)
  }
  return src
}
