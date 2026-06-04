import { http } from '@/utils/http'

/** 获取路线数据 */
export const getMapRouteAPI = (params: { origin: string; destination: string }) => {
  return http<{
    origin: { lng: number; lat: number; name: string }
    destination: { lng: number; lat: number; name: string }
    polyline: Array<{ latitude: number; longitude: number }>
    distance: string
    duration: string
  }>({ url: '/map/route', method: 'GET', data: params })
}
