import { Router } from 'express'

const router = Router()

const AMAP_KEY = process.env.AMAP_KEY || ''

// 高德地理编码：文字地址 → 经纬度
async function geocode(address: string): Promise<{ lng: number; lat: number } | null> {
  try {
    const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(
      address,
    )}&key=${AMAP_KEY}`
    const res = await fetch(url)
    const data = (await res.json()) as any
    if (data.geocodes && data.geocodes.length) {
      const [lng, lat] = data.geocodes[0].location.split(',').map(Number)
      return { lng, lat }
    }
    return null
  } catch {
    return null
  }
}

// 高德驾车路线规划
async function drivingRoute(
  origin: { lng: number; lat: number },
  destination: { lng: number; lat: number },
): Promise<{ polyline: string; distance: string; duration: string } | null> {
  try {
    const url = `https://restapi.amap.com/v3/direction/driving?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}&key=${AMAP_KEY}&strategy=0`
    const res = await fetch(url)
    const data = (await res.json()) as any
    if (data.route && data.route.paths && data.route.paths.length) {
      const path = data.route.paths[0]
      // 拼接所有步骤的坐标
      const points: string[] = []
      for (const step of path.steps) {
        points.push(step.polyline)
      }
      return {
        polyline: points.join(';'),
        distance: path.distance,
        duration: path.duration,
      }
    }
    return null
  } catch {
    return null
  }
}

// GET /map/route?origin=广州市&destination=北京市朝阳区xxx
router.get('/route', async (req, res) => {
  try {
    const originText = (req.query.origin as string) || '广州市'
    const destinationText = req.query.destination as string

    if (!destinationText) {
      res.json({ code: '0', msg: '缺少收货地址参数', result: null })
      return
    }

    if (!AMAP_KEY || AMAP_KEY === '你的高德Key填这里') {
      res.json({ code: '0', msg: '未配置高德地图 API Key', result: null })
      return
    }

    // 地理编码
    const [originCoord, destCoord] = await Promise.all([
      geocode(originText),
      geocode(destinationText),
    ])

    if (!originCoord) {
      res.json({ code: '0', msg: '发货地地址解析失败', result: null })
      return
    }
    if (!destCoord) {
      res.json({ code: '0', msg: '收货地地址解析失败', result: null })
      return
    }

    // 路线规划
    const route = await drivingRoute(originCoord, destCoord)

    if (!route) {
      // 降级：只返回坐标，不画路线
      res.json({
        code: '1',
        msg: '操作成功',
        result: {
          origin: { ...originCoord, name: originText },
          destination: { ...destCoord, name: destinationText },
          polyline: '',
          distance: '',
          duration: '',
        },
      })
      return
    }

    // 解析路线坐标为数组（高德 REST API 返回 lat,lng 格式）
    const polylineCoords = route.polyline.split(';').map((point) => {
      const [lat, lng] = point.split(',').map(Number)
      return { longitude: lng, latitude: lat }
    })

    res.json({
      code: '1',
      msg: '操作成功',
      result: {
        origin: { ...originCoord, name: originText },
        destination: { ...destCoord, name: destinationText },
        polyline: polylineCoords,
        distance: route.distance,
        duration: route.duration,
      },
    })
  } catch (err) {
    console.error(err)
    res.json({ code: '0', msg: '路线查询失败', result: null })
  }
})

export default router
