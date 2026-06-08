<script setup lang="ts">
import { useGuessList } from '@/composables'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getPayStatusAPI, getPayAlipayQueryAPI } from '@/services/pay'

// 获取页面参数
const query = defineProps<{
  id: string
  mode?: string
}>()

// 猜你喜欢
const { guessRef, onScrolltolower } = useGuessList()

// 支付状态：loading / success / fail
const payStatus = ref<'loading' | 'success' | 'fail'>('loading')
// 是否为模拟支付
const isMock = query.mode !== 'wxpay' && query.mode !== 'alipay'
// 是否为支付宝支付
const isAlipay = query.mode === 'alipay'

// 轮询次数限制
const MAX_POLL_COUNT = 10
const POLL_INTERVAL = 2000
// 组件卸载标记（防止轮询继续运行）
let cancelled = false

/** 向后端查询订单真实支付状态 */
const verifyPayment = async () => {
  for (let i = 0; i < MAX_POLL_COUNT; i++) {
    if (cancelled) return
    try {
      const res = await getPayStatusAPI({ orderId: query.id })
      if (res.result.paid) {
        payStatus.value = 'success'
        return
      }
    } catch {
      // 查询失败，继续重试
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
  }
  if (!cancelled) payStatus.value = 'fail'
}

/** 支付宝支付：主动查询支付宝交易状态 */
const verifyAlipayPayment = async () => {
  for (let i = 0; i < MAX_POLL_COUNT; i++) {
    if (cancelled) return
    try {
      const res = await getPayAlipayQueryAPI({ orderId: query.id })
      if (res.result.paid) {
        payStatus.value = 'success'
        return
      }
    } catch {
      // 查询失败，继续重试
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
  }
  if (!cancelled) payStatus.value = 'fail'
}

onLoad(() => {
  if (isMock) {
    payStatus.value = 'success'
    uni.showModal({
      title: '温馨提示',
      content: '此交易是模拟支付，您并未付款，不会导致实际购买商品或服务',
      confirmText: '知道了',
      showCancel: false,
    })
  } else if (isAlipay) {
    // 支付宝：主动查询支付宝接口（不依赖异步回调）
    verifyAlipayPayment()
  } else {
    // 微信支付：查本地数据库
    verifyPayment()
  }
})

// 页面卸载时取消轮询
onUnload(() => {
  cancelled = true
})
</script>

<template>
  <scroll-view enable-back-to-top class="viewport" scroll-y @scrolltolower="onScrolltolower">
    <!-- 验证中 -->
    <view v-if="payStatus === 'loading'" class="overview loading-state">
      <view class="status">
        <view class="loading-spinner"></view>
      </view>
      <view class="tips">正在验证支付结果，请稍候...</view>
    </view>

    <!-- 支付成功 -->
    <view v-else-if="payStatus === 'success'" class="overview">
      <view class="status icon-checked">支付成功</view>
      <view v-if="isMock" class="tips">
        提示: 本小程序仅为教学演示用途，并未实际支付或购买商品或服务
      </view>
      <view v-else class="tips">
        您的订单已支付成功，我们将尽快为您发货
      </view>
      <view class="buttons">
        <navigator
          hover-class="none"
          class="button navigator"
          url="/pages/index/index"
          open-type="switchTab"
        >
          返回首页
        </navigator>
        <navigator
          hover-class="none"
          class="button navigator"
          :url="`/pagesOrder/detail/detail?id=${query.id}`"
          open-type="redirect"
        >
          查看订单
        </navigator>
      </view>
    </view>

    <!-- 支付失败/超时 -->
    <view v-else class="overview fail-state">
      <view class="status icon-clock">支付验证超时</view>
      <view class="tips">
        未能确认支付结果，请前往订单详情页查看。如已付款成功，订单状态将自动更新。
      </view>
      <view class="buttons">
        <navigator
          hover-class="none"
          class="button navigator"
          :url="`/pagesOrder/detail/detail?id=${query.id}`"
          open-type="redirect"
        >
          查看订单
        </navigator>
        <navigator
          hover-class="none"
          class="button navigator"
          url="/pages/index/index"
          open-type="switchTab"
        >
          返回首页
        </navigator>
      </view>
    </view>

    <!-- 猜你喜欢 -->
    <XtxGuess ref="guessRef" />
  </scroll-view>
</template>

<style lang="scss">
page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.viewport {
  background-color: #f7f7f8;
}

.overview {
  line-height: 1;
  padding: 50rpx 0;
  color: #fff;
  background-color: #27ba9b;

  .tips {
    width: 70%;
    font-size: 24rpx;
    text-align: center;
    line-height: 1.5;
    margin: 60rpx auto;
  }

  .status {
    font-size: 36rpx;
    font-weight: 500;
    text-align: center;
  }

  .status::before {
    display: block;
    font-size: 110rpx;
    margin-bottom: 20rpx;
  }

  .buttons {
    height: 60rpx;
    line-height: 60rpx;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 60rpx;
  }

  .button {
    text-align: center;
    margin: 0 10rpx;
    font-size: 28rpx;
    color: #fff;

    &:first-child {
      width: 200rpx;
      border-radius: 64rpx;
      border: 1rpx solid #fff;
    }
  }
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  margin: 0 auto 20rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
