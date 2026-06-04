/**
 * 平台配置：统一管理各端 API 地址
 *
 * - H5 端：localhost（开发时浏览器直接访问）
 * - 小程序/真机：必须填局域网 IP 或生产域名（小程序不允许 localhost）
 * - App 端：同上
 *
 * ⚠️ 部署前务必修改 #ifndef H5 中的地址！
 */

// #ifdef H5
export const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : ''
// #endif

// #ifndef H5
// 小程序/App 端：改为你的服务器 IP 或域名
export const API_BASE = 'http://10.107.246.104:3000'
// #endif
