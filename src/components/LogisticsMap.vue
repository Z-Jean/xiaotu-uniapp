<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { getMapRouteAPI } from '@/services/map'

const props = defineProps<{
  origin: string
  destination: string
}>()

const loading = ref(true)
const error = ref('')
const routeData = ref<{
  origin: { lng: number; lat: number; name: string }
  destination: { lng: number; lat: number; name: string }
  polyline: Array<{ latitude: number; longitude: number }>
  distance: string
  duration: string
} | null>(null)

const distanceText = ref('')
const durationText = ref('')

// 小程序 map 组件数据
const markers = ref<any[]>([])
const polylinePoints = ref<any[]>([])

// 格式化距离和时长
function formatInfo(distance: string, duration: string) {
  const dist = parseInt(distance)
  distanceText.value = dist > 1000 ? `${(dist / 1000).toFixed(0)}公里` : `${dist}米`

  const dur = parseInt(duration)
  const hours = Math.floor(dur / 3600)
  const minutes = Math.floor((dur % 3600) / 60)
  durationText.value = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`
}

// H5: 初始化高德地图（JS API，仅浏览器端）
function initAmap() {
  // 动态加载高德 JS API
  if ((window as any)._AMapLoaded) {
    renderAmap()
    return
  }
  const script = document.createElement('script')
  script.src = 'https://webapi.amap.com/maps?v=2.0&key=02282b9d135605b2c37d21868773e1db'
  script.onload = () => {
    ;(window as any)._AMapLoaded = true
    renderAmap()
  }
  script.onerror = () => {
    error.value = '地图加载失败'
    loading.value = false
  }
  document.head.appendChild(script)
}

function renderAmap() {
  if (!routeData.value) return
  const AMap = (window as any).AMap

  const el = document.getElementById('amap-container')
  if (!el) {
    setTimeout(renderAmap, 200)
    return
  }

  try {
    el.innerHTML = ''
    el.style.width = '100%'
    el.style.height = '300px'
    el.style.position = 'relative'
    // 计算起终点中心点
    const o = routeData.value!
    const centerLng = (o.origin.lng + o.destination.lng) / 2
    const centerLat = (o.origin.lat + o.destination.lat) / 2
    // 计算缩放级别（距离越远缩放越小）
    const lngDiff = Math.abs(o.origin.lng - o.destination.lng)
    const latDiff = Math.abs(o.origin.lat - o.destination.lat)
    const maxDiff = Math.max(lngDiff, latDiff)
    const zoom = maxDiff > 30 ? 3 : maxDiff > 10 ? 4 : maxDiff > 3 ? 5 : 8

    const map = new AMap.Map('amap-container', {
      zoom,
      center: [centerLng, centerLat],
      mapStyle: 'amap://styles/whitesmoke',
      viewMode: '2D',
    })

    // 起点标记
    const startMarker = new AMap.Marker({
      position: [routeData.value!.origin.lng, routeData.value!.origin.lat],
      title: routeData.value!.origin.name,
      label: { content: '发货地', direction: 'top' },
    })

    // 终点标记
    const endMarker = new AMap.Marker({
      position: [routeData.value!.destination.lng, routeData.value!.destination.lat],
      title: routeData.value!.destination.name,
      label: { content: '收货地', direction: 'top' },
    })

    // 画弯曲路线（贝塞尔曲线模拟）
    const start = [routeData.value!.origin.lng, routeData.value!.origin.lat]
    const end = [routeData.value!.destination.lng, routeData.value!.destination.lat]
    // 计算控制点（向左上方偏移，形成弧线）
    const midLng = (start[0] + end[0]) / 2
    const midLat = (start[1] + end[1]) / 2
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    // 控制点偏移（向一侧弯曲形成弧线）
    const ctrlLng = midLng - dy * 0.2
    const ctrlLat = midLat + dx * 0.2
    // 生成贝塞尔曲线上的点
    const curvePoints: number[][] = []
    for (let t = 0; t <= 1; t += 0.02) {
      const lng = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * ctrlLng + t * t * end[0]
      const lat = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * ctrlLat + t * t * end[1]
      curvePoints.push([lng, lat])
    }
    const polyline = new AMap.Polyline({
      path: curvePoints,
      strokeColor: '#27ba9b',
      strokeWeight: 6,
      strokeOpacity: 0.9,
      showDir: true,
      lineJoin: 'round',
    })

    // 等地图加载完成后添加覆盖物
    map.on('complete', () => {
      map.add([startMarker, endMarker])
      if (polyline) map.add(polyline)
    })
  } catch (e) {
    error.value = '地图渲染失败'
  }
}

onMounted(async () => {
  try {
    const res = await getMapRouteAPI({
      origin: props.origin,
      destination: props.destination,
    })
    routeData.value = res.result
    formatInfo(res.result.distance, res.result.duration)

    // 设置小程序 markers
    markers.value = [
      {
        id: 1,
        latitude: res.result.origin.lat,
        longitude: res.result.origin.lng,
        title: '发货地',
        callout: {
          content: '发货地: ' + res.result.origin.name,
          display: 'ALWAYS',
          padding: 5,
          borderRadius: 3,
        },
      },
      {
        id: 2,
        latitude: res.result.destination.lat,
        longitude: res.result.destination.lng,
        title: '收货地',
        callout: {
          content: '收货地: ' + res.result.destination.name,
          display: 'ALWAYS',
          padding: 5,
          borderRadius: 3,
        },
      },
    ]

    if (res.result.polyline && res.result.polyline.length) {
      polylinePoints.value = [
        {
          points: res.result.polyline,
          color: '#27ba9b',
          width: 6,
          arrowLine: true,
        },
      ]
    }

    // H5 加载地图（JS API）
    // #ifdef H5
    setTimeout(() => initAmap(), 300)
    // #endif
  } catch (e: any) {
    error.value = '路线加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <view class="logistics-map">
    <view class="map-header">
      <text class="map-title">📍 物流路线</text>
      <view v-if="distanceText" class="map-info">
        <text class="info-item">{{ distanceText }}</text>
        <text class="info-divider">|</text>
        <text class="info-item">预计 {{ durationText }}</text>
      </view>
    </view>

    <view v-if="loading" class="map-loading">
      <text>路线加载中...</text>
    </view>

    <view v-else-if="error" class="map-error">
      <text>{{ error }}</text>
    </view>

    <template v-else-if="routeData">
      <!-- #ifdef H5 -->
      <view id="amap-container" class="map-canvas-h5"></view>
      <!-- #endif -->

      <!-- #ifdef APP-PLUS || MP-WEIXIN -->
      <map
        class="map-canvas-mp"
        :latitude="routeData.destination.lat"
        :longitude="routeData.destination.lng"
        :markers="markers"
        :polyline="polylinePoints"
        :include-points="markers"
        :scale="6"
        show-location
      />
      <!-- #endif -->
    </template>
  </view>
</template>

<style lang="scss" scoped>
.logistics-map {
  background: #fff;
  border-radius: 16rpx;
  margin: 20rpx;
  overflow: hidden;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f5f5f5;

  .map-title {
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
  }

  .map-info {
    display: flex;
    align-items: center;
    gap: 12rpx;

    .info-item {
      font-size: 24rpx;
      color: #666;
    }

    .info-divider {
      color: #ddd;
    }
  }
}

.map-loading,
.map-error {
  padding: 60rpx;
  text-align: center;

  text {
    font-size: 26rpx;
    color: #999;
  }
}

.map-canvas-h5 {
  width: 100%;
  height: 300px;
}

.map-canvas-mp {
  width: 100%;
  height: 400rpx;
  // #ifdef APP-PLUS
  position: relative;
  overflow: hidden;
  // #endif
}
</style>
