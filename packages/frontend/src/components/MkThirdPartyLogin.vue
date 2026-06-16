<!--
  CG微米 - 第三方登录组件
  微信/QQ弹窗，手机号内嵌
-->

<template>
  <div :class="$style.container">
    <div :class="$style.title">快捷登录</div>

    <!-- 三个切换按钮 -->
    <div :class="$style.buttons">
      <!-- 微信登录（弹窗） -->
      <button :class="[$style.btn, $style.wechat]" @click="loginWithWechat">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.295.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .246-.11.246-.245 0-.06-.024-.118-.04-.177l-.325-1.233a.492.492 0 0 1 .177-.554C23.025 18.39 24 16.708 24 14.868c0-3.407-3.021-5.96-7.062-6.01zm-2.036 2.87c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.072 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/>
        </svg>
        <span>微信</span>
      </button>

      <!-- QQ登录（弹窗） -->
      <button :class="[$style.btn, $style.qq]" @click="loginWithQQ">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.395 1.025.225 0 .555-.36.555-.36s.835-1.395 1.66-1.395h.01c.825 0 1.66 1.395 1.66 1.395s.33.36.555.36c.225 0 .395-.36.395-1.025 0-2.514-2.16-6.953-2.16-6.953V9.325C6.623 4.364 9.738 2 12.003 2h-.006zm5.88 4.225c-.195 0-.39.045-.57.135-.45.225-.66.63-.66 1.23v1.195s2.16 4.44 2.16 6.953c0 .665-.17 1.025-.395 1.025-.225 0-.555-.36-.555-.36s-.835-1.395-1.66-1.395h-.01c-.825 0-1.66 1.395-1.66 1.395s-.33.36-.555.36c-.225 0-.395-.36-.395-1.025 0-2.514 2.16-6.953 2.16-6.953V8.59c0-.6-.21-1.005-.66-1.23a1.258 1.258 0 0 0-.57-.135h-.015c-.57 0-1.095.36-1.275.885-.18.525-.06 1.14.285 1.56.045.06.045.12 0 .18-.345.42-.93.63-1.5.63h-.015c-.57 0-1.155-.21-1.5-.63a.203.203 0 0 1 0-.18c.345-.42.465-1.035.285-1.56-.18-.525-.705-.885-1.275-.885h-.015c-.57 0-1.095.36-1.275.885-.18.525-.06 1.14.285 1.56.045.06.045.12 0 .18-.345.42-.93.63-1.5.63h-.015c-.57 0-1.155-.21-1.5-.63a.203.203 0 0 1 0-.18c.345-.42.465-1.035.285-1.56C8.258 6.585 7.733 6.225 7.163 6.225h-.015c-.57 0-1.095.36-1.275.885-.18.525-.06 1.14.285 1.56.045.06.045.12 0 .18-.345.42-.93.63-1.5.63h-.015c-.57 0-1.155-.21-1.5-.63a.203.203 0 0 1 0-.18c.345-.42.465-1.035.285-1.56-.18-.525-.705-.885-1.275-.885z"/>
        </svg>
        <span>QQ</span>
      </button>

      <!-- 手机号登录（内嵌展开） -->
      <button :class="[$style.btn, $style.phone, showPhone && $style.active]" @click="togglePhone">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
        </svg>
        <span>手机号</span>
      </button>
    </div>

    <!-- 手机号内嵌表单 -->
    <Transition name="slide-fade">
      <div v-if="showPhone" :class="$style.phoneForm">
        <div :class="$style.inputGroup">
          <input
            v-model="phone"
            type="tel"
            placeholder="请输入手机号"
            maxlength="11"
            :class="$style.input"
          />
        </div>
        <div :class="$style.inputGroup">
          <div :class="$style.codeRow">
            <input
              v-model="smsCode"
              type="text"
              placeholder="验证码"
              maxlength="6"
              :class="$style.input"
            />
            <button
              :class="$style.sendBtn"
              :disabled="cooldown > 0"
              @click="sendCode"
            >
              {{ cooldown > 0 ? `${cooldown}s` : '获取验证码' }}
            </button>
          </div>
        </div>
        <button :class="$style.loginBtn" @click="loginWithPhone">
          登录
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { login } from '@/accounts.js';
import * as os from '@/os.js';
import { misskeyApi, misskeyApiGet } from '@/utility/misskey-api.js';

const emit = defineEmits<{
  (e: 'togglePhoneLogin', value: boolean): void;
}>();

const showPhone = ref(false);
const phone = ref('');
const smsCode = ref('');
const cooldown = ref(0);

// 第三方登录配置（从后端获取，不在前端硬编码）
const wechatAppId = ref<string | null>(null);
const qqClientId = ref<string | null>(null);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

// 获取第三方登录配置
async function loadThirdPartyConfig() {
  try {
    const config = await misskeyApiGet('auth/config' as any) as any;
    if (config.wechat?.enabled && config.wechat?.appId) {
      wechatAppId.value = config.wechat.appId;
    }
    if (config.qq?.enabled && config.qq?.appId) {
      qqClientId.value = config.qq.appId;
    }
  } catch (err) {
    console.error('Failed to load third-party login config:', err);
  }
}

function togglePhone() {
  showPhone.value = !showPhone.value;
  emit('togglePhoneLogin', showPhone.value);
}

// 微信登录（弹窗）
function loginWithWechat() {
  if (!wechatAppId.value) {
    os.alert({ type: 'error', text: '微信登录未配置' });
    return;
  }

  const state = Math.random().toString(36).substring(2);
  sessionStorage.setItem('wechat_oauth_state', state);

  const redirectUri = encodeURIComponent('https://www.cgvmi.com/api/auth/wechat/callback');
  const authUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${wechatAppId.value}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;

  const width = 800;
  const height = 600;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  window.open(authUrl, 'wechat_login', `width=${width},height=${height},left=${left},top=${top}`);
}

// QQ登录（弹窗）
function loginWithQQ() {
  if (!qqClientId.value) {
    os.alert({ type: 'error', text: 'QQ登录未配置' });
    return;
  }

  const state = Math.random().toString(36).substring(2);
  sessionStorage.setItem('qq_oauth_state', state);

  const redirectUri = encodeURIComponent('https://www.cgvmi.com/api/auth/qq/callback');
  const authUrl = `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${qqClientId.value}&redirect_uri=${redirectUri}&state=${state}&scope=get_user_info`;

  const width = 800;
  const height = 600;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  window.open(authUrl, 'qq_login', `width=${width},height=${height},left=${left},top=${top}`);
}

// 发送短信验证码
async function sendCode() {
  if (!phone.value || !/^1[3-9]\d{9}$/.test(phone.value)) {
    os.alert({ type: 'error', text: '请输入正确的手机号' });
    return;
  }

  try {
    const data = await misskeyApi('auth/phone/send-code' as any, { phone: phone.value } as any) as any;

    if (data.success) {
      cooldown.value = 60;
      if (cooldownTimer) clearInterval(cooldownTimer);
      cooldownTimer = setInterval(() => {
        cooldown.value--;
        if (cooldown.value <= 0) {
          if (cooldownTimer) clearInterval(cooldownTimer);
          cooldownTimer = null;
        }
      }, 1000);
    } else {
      os.alert({ type: 'error', text: data.error || '发送失败' });
    }
  } catch (error: any) {
    os.alert({ type: 'error', text: error.message || '发送失败' });
  }
}

// 手机号登录
async function loginWithPhone() {
  if (!phone.value || !smsCode.value) {
    os.alert({ type: 'error', text: '请输入手机号和验证码' });
    return;
  }

  try {
    const data = await misskeyApi('auth/phone/login' as any, { phone: phone.value, code: smsCode.value } as any) as any;

    if (data.i) {
      await login(data.i);
    } else if (data.error) {
      os.alert({ type: 'error', text: data.error });
    }
  } catch (error: any) {
    os.alert({ type: 'error', text: error.message || '登录失败' });
  }
}

// 第三方登录 postMessage 回调的合法来源白名单
// 微信/QQ OAuth 回调页面在 https://www.cgvmi.com,以及当前页面 origin(用于开发/同源场景)
const EXPECTED_MESSAGE_ORIGIN = 'https://www.cgvmi.com';

// 监听第三方登录回调
function handleMessage(event: MessageEvent) {
  // 验证消息来源,防止跨站消息伪造/钓鱼窗口窃取 token
  if (event.origin !== EXPECTED_MESSAGE_ORIGIN && event.origin !== window.location.origin) {
    return;
  }

  if (event.data?.success && event.data?.token) {
    login(event.data.token);
  } else if (event.data?.error) {
    os.alert({ type: 'error', text: event.data.error });
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage);
  loadThirdPartyConfig();
});

onUnmounted(() => {
  window.removeEventListener('message', handleMessage);
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
    cooldownTimer = null;
  }
});
</script>

<style module>
.container {
  padding-top: 8px;
}

.title {
  font-size: 12px;
  color: var(--MI_THEME-fgTransparentWeak);
  margin-bottom: 12px;
  text-align: center;
}

.buttons {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 10px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  height: 40px;
  border: 1px solid var(--MI_THEME-divider);
  border-radius: 10px;
  background: var(--MI_THEME-panel);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--MI_THEME-fg);
  font-size: 13px;
}

.btn:hover {
  border-color: var(--MI_THEME-accent);
  background: var(--MI_THEME-buttonHoverBg);
}

.btn:active {
  transform: scale(0.97);
}

.btn.active {
  border-color: var(--MI_THEME-accent);
  background: var(--MI_THEME-accentedBg);
}

.wechat svg {
  color: #07C160;
}

.qq svg {
  color: #12B7F5;
}

.phone svg {
  color: var(--MI_THEME-accent);
}

/* 手机号内嵌表单 */
.phoneForm {
  margin-top: 14px;
  padding: 16px;
  background: color-mix(in srgb, var(--MI_THEME-panel) 60%, transparent);
  border-radius: 12px;
  border: 1px solid var(--MI_THEME-divider);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inputGroup {
  margin: 0;
}

.input {
  width: 100%;
  padding: 11px 12px;
  border: 1px solid var(--MI_THEME-divider);
  border-radius: 8px;
  font-size: 14px;
  background: var(--MI_THEME-panel);
  color: var(--MI_THEME-fg);
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: var(--MI_THEME-accent);
}

.codeRow {
  display: flex;
  gap: 10px;
}

.codeRow .input {
  flex: 1;
}

.sendBtn {
  padding: 11px 16px;
  background: var(--MI_THEME-accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.sendBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loginBtn {
  width: 100%;
  padding: 12px;
  background: var(--MI_THEME-accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.loginBtn:hover {
  opacity: 0.9;
}
</style>

<style>
.slide-fade-enter-active {
  transition: all 0.25s ease;
}
.slide-fade-leave-active {
  transition: all 0.2s ease;
}
.slide-fade-enter-from {
  transform: translateY(-8px);
  opacity: 0;
}
.slide-fade-leave-to {
  transform: translateY(-4px);
  opacity: 0;
}
</style>
