<script setup lang="ts">
import { postLoginAPI, postLoginWxMinAPI, postLoginWxMinSimpleAPI } from '@/services/login'
import { postSendSmsAPI, postSmsLoginAPI } from '@/services/sms'
import { useMemberStore } from '@/stores'
import type { LoginResult } from '@/types/member'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

// ─── 登录方式切换 ──────────────────────────────────────────
const loginMode = ref<'password' | 'sms'>('sms') // 默认短信登录

// ─── 微信小程序登录 ────────────────────────────────────────
// #ifdef MP-WEIXIN
let code = ''
onLoad(async () => {
  const res = await wx.login()
  code = res.code
})

const onGetphonenumber: UniHelper.ButtonOnGetphonenumber = async (ev) => {
  await checkedAgreePrivacy()
  const { encryptedData, iv } = ev.detail
  const res = await postLoginWxMinAPI({ code, encryptedData, iv })
  loginSuccess(res.result)
}
// #endif

// ─── 模拟登录 ──────────────────────────────────────────────
const onGetphonenumberSimple = async () => {
  await checkedAgreePrivacy()
  const res = await postLoginWxMinSimpleAPI('13123456789')
  loginSuccess(res.result)
}

// ─── 登录成功 ──────────────────────────────────────────────
const loginSuccess = (profile: LoginResult) => {
  const memberStore = useMemberStore()
  memberStore.setProfile(profile)
  uni.showToast({ icon: 'success', title: '登录成功' })
  setTimeout(() => {
    uni.navigateBack()
  }, 500)
}

// ─── 账号密码登录 ──────────────────────────────────────────
// #ifdef H5 || APP-PLUS
const form = ref({
  account: '13123456789',
  password: '',
})

const onSubmit = async () => {
  await checkedAgreePrivacy()
  const res = await postLoginAPI(form.value)
  loginSuccess(res.result)
}
// #endif

// ─── 短信验证码登录 ────────────────────────────────────────
const smsForm = ref({
  mobile: '',
  code: '',
})
const smsCountdown = ref(0)
const smsSending = ref(false)
let smsTimer: ReturnType<typeof setInterval> | null = null

// 发送验证码
const sendSmsCode = async () => {
  if (smsSending.value || smsCountdown.value > 0) return
  const mobile = smsForm.value.mobile.trim()
  if (!/^1[3-9]\d{9}$/.test(mobile)) {
    uni.showToast({ icon: 'none', title: '请输入正确的手机号' })
    return
  }
  await checkedAgreePrivacy()
  smsSending.value = true
  try {
    const res = await postSendSmsAPI({ mobile })
    if (res.code === '1') {
      uni.showToast({ icon: 'success', title: '验证码已发送' })
      // 开始倒计时
      smsCountdown.value = 60
      smsTimer = setInterval(() => {
        smsCountdown.value--
        if (smsCountdown.value <= 0) {
          if (smsTimer) clearInterval(smsTimer)
          smsTimer = null
        }
      }, 1000)
    } else {
      uni.showToast({ icon: 'none', title: res.msg || '发送失败' })
    }
  } catch {
    uni.showToast({ icon: 'none', title: '发送失败' })
  } finally {
    smsSending.value = false
  }
}

// 短信验证码登录
const onSmsLogin = async () => {
  await checkedAgreePrivacy()
  const { mobile, code } = smsForm.value
  if (!mobile.trim()) {
    uni.showToast({ icon: 'none', title: '请输入手机号' })
    return
  }
  if (!code.trim()) {
    uni.showToast({ icon: 'none', title: '请输入验证码' })
    return
  }
  try {
    const res = await postSmsLoginAPI({ mobile, code })
    if (res.code === '1') {
      loginSuccess(res.result as any)
    } else {
      uni.showToast({ icon: 'none', title: res.msg || '登录失败' })
    }
  } catch {
    uni.showToast({ icon: 'none', title: '登录失败' })
  }
}

// ─── 协议 ──────────────────────────────────────────────────
const isAgreePrivacy = ref(false)
const isAgreePrivacyShakeY = ref(false)
const checkedAgreePrivacy = async () => {
  if (!isAgreePrivacy.value) {
    uni.showToast({ icon: 'none', title: '请先阅读并勾选协议' })
    isAgreePrivacyShakeY.value = true
    setTimeout(() => {
      isAgreePrivacyShakeY.value = false
    }, 500)
    return Promise.reject(new Error('请先阅读并勾选协议'))
  }
}

const onOpenPrivacyContract = () => {
  // #ifdef MP-WEIXIN
  wx.openPrivacyContract({})
  // #endif
}
</script>

<template>
  <view class="viewport">
    <view class="logo">
      <image
        src="https://pcapi-xiaotuxian-front-devtest.itheima.net/miniapp/images/logo_icon.png"
      ></image>
    </view>
    <view class="login">
      <!-- 登录方式切换（H5/App端） -->
      <!-- #ifdef H5 || APP-PLUS -->
      <view class="login-tabs">
        <view
          class="tab-item"
          :class="{ active: loginMode === 'sms' }"
          @tap="loginMode = 'sms'"
        >
          短信验证码登录
        </view>
        <view
          class="tab-item"
          :class="{ active: loginMode === 'password' }"
          @tap="loginMode = 'password'"
        >
          账号密码登录
        </view>
      </view>

      <!-- 短信验证码登录 -->
      <template v-if="loginMode === 'sms'">
        <input
          v-model="smsForm.mobile"
          class="input"
          type="number"
          maxlength="11"
          placeholder="请输入手机号"
        />
        <view class="sms-row">
          <input
            v-model="smsForm.code"
            class="input sms-input"
            type="number"
            maxlength="6"
            placeholder="请输入验证码"
            @confirm="onSmsLogin()"
          />
          <view
            class="sms-btn"
            :class="{ disabled: smsCountdown > 0 }"
            @tap="sendSmsCode"
          >
            <text>{{ smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码' }}</text>
          </view>
        </view>
        <button @tap="onSmsLogin" class="button phone">登录</button>
      </template>

      <!-- 账号密码登录 -->
      <template v-if="loginMode === 'password'">
        <input v-model="form.account" class="input" type="text" placeholder="请输入用户名/手机号码" />
        <input v-model="form.password" class="input" type="text" password placeholder="请输入密码" />
        <button @tap="onSubmit" class="button phone">登录</button>
      </template>
      <!-- #endif -->

      <!-- 小程序端授权登录 -->
      <!-- #ifdef MP-WEIXIN -->
      <view class="button-privacy-wrap">
        <button
          :hidden="isAgreePrivacy"
          class="button-opacity button phone"
          @tap="checkedAgreePrivacy"
        >
          请先阅读并勾选协议
        </button>
        <button class="button phone" open-type="getPhoneNumber" @getphonenumber="onGetphonenumber">
          <text class="icon icon-phone"></text>
          手机号快捷登录
        </button>
      </view>
      <!-- #endif -->

      <view class="extra">
        <view class="caption">
          <text>其他登录方式</text>
        </view>
        <view class="options">
          <button @tap="onGetphonenumberSimple">
            <text class="icon icon-phone">模拟快捷登录</text>
          </button>
        </view>
      </view>
      <view class="tips" :class="{ animate__shakeY: isAgreePrivacyShakeY }">
        <label class="label">
          <radio
            class="radio"
            color="#28bb9c"
            :checked="isAgreePrivacy"
            @tap="isAgreePrivacy = !isAgreePrivacy"
          />
          <text @tap="isAgreePrivacy = !isAgreePrivacy">登录/注册即视为你同意小兔鲜儿</text>
        </label>
        <navigator class="link" hover-class="none" url="./protocal">《服务条款》</navigator>
        和
        <text class="link" @tap="onOpenPrivacyContract">《隐私协议》</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss">
page {
  height: 100%;
}

.viewport {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20rpx 40rpx;
}

.logo {
  flex: 1;
  text-align: center;
  image {
    width: 220rpx;
    height: 220rpx;
    margin-top: 15vh;
  }
}

.login {
  display: flex;
  flex-direction: column;
  height: 60vh;
  padding: 40rpx 20rpx 20rpx;

  .input {
    width: 100%;
    height: 80rpx;
    font-size: 28rpx;
    border-radius: 72rpx;
    border: 1px solid #ddd;
    padding-left: 30rpx;
    margin-bottom: 20rpx;
  }

  .button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 80rpx;
    font-size: 28rpx;
    border-radius: 72rpx;
    color: #fff;
    .icon {
      font-size: 40rpx;
      margin-right: 6rpx;
    }
  }

  .phone {
    background-color: #28bb9c;
  }

  .wechat {
    background-color: #06c05f;
  }

  .extra {
    flex: 1;
    padding: 70rpx 70rpx 0;
    .caption {
      width: 440rpx;
      line-height: 1;
      border-top: 1rpx solid #ddd;
      font-size: 26rpx;
      color: #999;
      position: relative;
      text {
        transform: translate(-40%);
        background-color: #fff;
        position: absolute;
        top: -12rpx;
        left: 50%;
      }
    }

    .options {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: 70rpx;
      button {
        padding: 0;
        background-color: transparent;
        &::after {
          border: none;
        }
      }
    }

    .icon {
      font-size: 24rpx;
      color: #444;
      display: flex;
      flex-direction: column;
      align-items: center;

      &::before {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 80rpx;
        height: 80rpx;
        margin-bottom: 6rpx;
        font-size: 40rpx;
        border: 1rpx solid #444;
        border-radius: 50%;
      }
    }
    .icon-weixin::before {
      border-color: #06c05f;
      color: #06c05f;
    }
  }
}

// ─── 登录方式切换 ────────────────────────────────────────
.login-tabs {
  display: flex;
  margin-bottom: 30rpx;
  border-bottom: 1rpx solid #eee;

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 20rpx 0;
    font-size: 28rpx;
    color: #999;
    position: relative;

    &.active {
      color: #28bb9c;
      font-weight: bold;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 30%;
        width: 40%;
        height: 4rpx;
        background: #28bb9c;
        border-radius: 2rpx;
      }
    }
  }
}

// ─── 验证码行 ────────────────────────────────────────────
.sms-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;

  .sms-input {
    flex: 1;
    margin-bottom: 0;
  }

  .sms-btn {
    flex-shrink: 0;
    width: 220rpx;
    height: 80rpx;
    line-height: 80rpx;
    text-align: center;
    background: #28bb9c;
    color: #fff;
    font-size: 26rpx;
    border-radius: 72rpx;

    &.disabled {
      background: #ccc;
    }
  }
}

@keyframes animate__shakeY {
  0% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(0, -5rpx);
  }
  100% {
    transform: translate(0, 0);
  }
}

.animate__shakeY {
  animation: animate__shakeY 0.2s ease-in-out 3;
}

.button-privacy-wrap {
  position: relative;
  .button-opacity {
    opacity: 0;
    position: absolute;
    z-index: 1;
  }
}

.tips {
  position: absolute;
  bottom: 80rpx;
  left: 20rpx;
  right: 20rpx;
  font-size: 22rpx;
  color: #999;
  text-align: center;

  .radio {
    transform: scale(0.6);
    margin-right: -4rpx;
    margin-top: -4rpx;
    vertical-align: middle;
  }

  .link {
    display: inline;
    color: #28bb9c;
  }
}
</style>
