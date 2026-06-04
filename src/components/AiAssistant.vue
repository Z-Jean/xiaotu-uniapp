<script setup lang="ts">
import { ref } from 'vue'
import ChatPanel from './ChatPanel.vue'

const showChat = ref(false)

// 点击打开聊天
const onTap = () => {
  showChat.value = true
}

const onCloseChat = () => {
  showChat.value = false
}
</script>

<template>
  <view class="ai-assistant">
    <!-- 悬浮球 -->
    <view class="floating-ball" @tap="onTap">
      <view class="ball-inner">🐰</view>
      <view class="pulse"></view>
    </view>

    <!-- 聊天面板 -->
    <ChatPanel v-if="showChat" @close="onCloseChat" />
  </view>
</template>

<style lang="scss" scoped>
.ai-assistant {
  position: fixed;
  bottom: 300rpx;
  right: 30rpx;
  z-index: 999;
}

.floating-ball {
  width: 100rpx;
  height: 100rpx;
  position: relative;

  .ball-inner {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #27ba9b, #1ea885);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48rpx;
    box-shadow: 0 6rpx 20rpx rgba(39, 186, 155, 0.4);
    position: relative;
    z-index: 2;
  }

  .pulse {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: rgba(39, 186, 155, 0.3);
    animation: pulse 2s ease-in-out infinite;
    z-index: 1;
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.5); opacity: 0; }
}
</style>
