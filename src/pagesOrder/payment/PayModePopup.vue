<script setup lang="ts">
/**
 * 支付方式选择弹窗
 * - 微信支付（仅微信小程序端可用）
 * - 支付宝支付（仅 H5 端可用）
 * - 模拟支付（所有端可用）
 */
defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'select', mode: 'wxpay' | 'alipay' | 'mock'): void
  (e: 'close'): void
}>()
</script>

<template>
  <view class="pay-mode-mask" v-if="visible" @tap="emit('close')">
    <view class="pay-mode-popup" @tap.stop>
      <view class="popup-title">选择支付方式</view>

      <!-- 微信支付 -->
      <view
        class="pay-option"
        @tap="emit('select', 'wxpay')"
      >
        <view class="pay-icon wxpay-icon">
          <text class="iconfont icon-wechat"></text>
        </view>
        <view class="pay-info">
          <view class="pay-name">微信支付</view>
          <view class="pay-desc">推荐微信用户使用</view>
        </view>
        <view class="pay-arrow">›</view>
      </view>

      <!-- 支付宝支付 -->
      <view
        class="pay-option"
        @tap="emit('select', 'alipay')"
      >
        <view class="pay-icon alipay-icon">
          <text class="iconfont icon-alipay"></text>
        </view>
        <view class="pay-info">
          <view class="pay-name">支付宝支付</view>
          <view class="pay-desc">推荐支付宝用户使用</view>
        </view>
        <view class="pay-arrow">›</view>
      </view>

      <!-- 模拟支付 -->
      <view
        class="pay-option"
        @tap="emit('select', 'mock')"
      >
        <view class="pay-icon mock-icon">
          <text class="iconfont icon-mock"></text>
        </view>
        <view class="pay-info">
          <view class="pay-name">模拟支付</view>
          <view class="pay-desc">开发调试，不会产生真实交易</view>
        </view>
        <view class="pay-arrow">›</view>
      </view>

      <!-- 取消按钮 -->
      <view class="popup-cancel" @tap="emit('close')">取消</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.pay-mode-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}

.pay-mode-popup {
  width: 100%;
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 30rpx;
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
}

.popup-title {
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  padding: 20rpx 0 30rpx;
}

.pay-option {
  display: flex;
  align-items: center;
  padding: 30rpx 20rpx;
  margin-bottom: 20rpx;
  border-radius: 16rpx;
  background-color: #f7f7f8;
  transition: background-color 0.2s;

  &:active {
    background-color: #eee;
  }
}

.pay-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  font-size: 44rpx;

  &.wxpay-icon {
    background-color: #e6f9e6;
    color: #07c160;
  }

  &.alipay-icon {
    background-color: #e6f0ff;
    color: #1677ff;
  }

  &.mock-icon {
    background-color: #fff3e0;
    color: #ff9800;
  }
}

.pay-info {
  flex: 1;
}

.pay-name {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.pay-desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
}

.pay-arrow {
  font-size: 36rpx;
  color: #ccc;
}

.popup-cancel {
  text-align: center;
  font-size: 30rpx;
  color: #666;
  padding: 30rpx 0 10rpx;
  border-top: 1rpx solid #eee;
  margin-top: 10rpx;
}
</style>
