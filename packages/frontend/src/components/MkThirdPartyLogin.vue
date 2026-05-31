<!--
  CG微米 - 第三方登录组件
  支持微信、QQ、手机号登录
-->

<template>
  <div :class="$style.container">
    <div :class="$style.title">其他登录方式</div>
    
    <div :class="$style.buttons">
      <!-- 微信登录 -->
      <button :class="[$style.btn, $style.wechat]" @click="loginWithWechat">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.295.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .246-.11.246-.245 0-.06-.024-.118-.04-.177l-.325-1.233a.492.492 0 0 1 .177-.554C23.025 18.39 24 16.708 24 14.868c0-3.407-3.021-5.96-7.062-6.01zm-2.036 2.87c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.072 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/>
        </svg>
        <span>微信登录</span>
      </button>

      <!-- QQ登录 -->
      <button :class="[$style.btn, $style.qq]" @click="loginWithQQ">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.395 1.025.225 0 .555-.36.555-.36s.835-1.395 1.66-1.395h.01c.825 0 1.66 1.395 1.66 1.395s.33.36.555.36c.225 0 .395-.36.395-1.025 0-2.514-2.16-6.953-2.16-6.953V9.325C6.623 4.364 9.738 2 12.003 2h-.006zm5.88 4.225c-.195 0-.39.045-.57.135-.45.225-.66.63-.66 1.23v1.195s2.16 4.44 2.16 6.953c0 .665-.17 1.025-.395 1.025-.225 0-.555-.36-.555-.36s-.835-1.395-1.66-1.395h-.01c-.825 0-1.66 1.395-1.66 1.395s-.33.36-.555.36c-.225 0-.395-.36-.395-1.025 0-2.514 2.16-6.953 2.16-6.953V8.59c0-.6-.21-1.005-.66-1.23a1.258 1.258 0 0 0-.57-.135h-.015c-.57 0-1.095.36-1.275.885-.18.525-.06 1.14.285 1.56.045.06.045.12 0 .18-.345.42-.93.63-1.5.63h-.015c-.57 0-1.155-.21-1.5-.63a.203.203 0 0 1 0-.18c.345-.42.465-1.035.285-1.56-.18-.525-.705-.885-1.275-.885h-.015c-.57 0-1.095.36-1.275.885-.18.525-.06 1.14.285 1.56.045.06.045.12 0 .18-.345.42-.93.63-1.5.63h-.015c-.57 0-1.155-.21-1.5-.63a.203.203 0 0 1 0-.18c.345-.42.465-1.035.285-1.56C8.258 6.585 7.733 6.225 7.163 6.225h-.015c-.57 0-1.095.36-1.275.885-.18.525-.06 1.14.285 1.56.045.06.045.12 0 .18-.345.42-.93.63-1.5.63h-.015c-.57 0-1.155-.21-1.5-.63a.203.203 0 0 1 0-.18c.345-.42.465-1.035.285-1.56-.18-.525-.705-.885-1.275-.885z"/>
        </svg>
        <span>QQ登录</span>
      </button>

      <!-- 手机号登录 -->
      <button :class="[$style.btn, $style.phone]" @click="showPhoneLogin = true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
        </svg>
        <span>手机号登录</span>
      </button>
    </div>

    <!-- 手机号登录弹窗 -->
    <MkModal v-if="showPhoneLogin" @close="showPhoneLogin = false">
      <div :class="$style.phoneModal">
        <h3>手机号登录</h3>
        
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
    </MkModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import MkModal from '@/components/MkModal.vue';
import { login } from '@/accounts.js';

const showPhoneLogin = ref(false);
const phone = ref('');
const smsCode = ref('');
const cooldown = ref(0);

// 微信登录
function loginWithWechat() {
  const state = Math.random().toString(36).substring(2);
  sessionStorage.setItem('wechat_oauth_state', state);
  
  const redirectUri = encodeURIComponent('https://www.cgvmi.com/api/auth/wechat/callback');
  const authUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=wxe5afebe19d7dbf50&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
  
  const width = 800;
  const height = 600;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  
  window.open(authUrl, 'wechat_login', `width=${width},height=${height},left=${left},top=${top}`);
}

// QQ登录
function loginWithQQ() {
  const state = Math.random().toString(36).substring(2);
  sessionStorage.setItem('qq_oauth_state', state);
  
  const redirectUri = encodeURIComponent('https://www.cgvmi.com/api/auth/qq/callback');
  const authUrl = `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=102082357&redirect_uri=${redirectUri}&state=${state}&scope=get_user_info`;
  
  const width = 800;
  const height = 600;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  
  window.open(authUrl, 'qq_login', `width=${width},height=${height},left=${left},top=${top}`);
}

// 发送短信验证码
async function sendCode() {
  if (!phone.value || !/^1[3-9]\d{9}$/.test(phone.value)) {
    alert('请输入正确的手机号');
    return;
  }

  try {
    const res = await fetch('/api/auth/phone/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.value }),
    });
    const data = await res.json();
    
    if (data.success) {
      cooldown.value = 60;
      const timer = setInterval(() => {
        cooldown.value--;
        if (cooldown.value <= 0) clearInterval(timer);
      }, 1000);
    } else {
      alert(data.error || '发送失败');
    }
  } catch (error: any) {
    alert(error.message || '发送失败');
  }
}

// 手机号登录
async function loginWithPhone() {
  if (!phone.value || !smsCode.value) {
    alert('请输入手机号和验证码');
    return;
  }

  try {
    const res = await fetch('/api/auth/phone/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.value, code: smsCode.value }),
    });
    const data = await res.json();
    
    if (data.i) {
      await login(data.i);
      showPhoneLogin.value = false;
    } else if (data.error) {
      alert(data.error);
    }
  } catch (error: any) {
    alert(error.message || '登录失败');
  }
}

// 监听第三方登录回调
function handleMessage(event: MessageEvent) {
  if (event.data?.success && event.data?.token) {
    login(event.data.token);
  } else if (event.data?.error) {
    alert(event.data.error);
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage);
});

onUnmounted(() => {
  window.removeEventListener('message', handleMessage);
});
</script>

<style module>
.container {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--MI_THEME-divider);
}

.title {
  font-size: 14px;
  color: var(--MI_THEME-fgTransparentWeak);
  margin-bottom: 16px;
  text-align: center;
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:hover {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wechat {
  background: #07C160;
  color: white;
}

.qq {
  background: #12B7F5;
  color: white;
}

.phone {
  background: var(--MI_THEME-panel);
  color: var(--MI_THEME-fg);
  border: 1px solid var(--MI_THEME-divider);
}

.phoneModal {
  padding: 24px;
  max-width: 400px;
  margin: 0 auto;
}

.phoneModal h3 {
  margin: 0 0 20px;
  font-size: 18px;
  text-align: center;
}

.inputGroup {
  margin-bottom: 16px;
}

.input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--MI_THEME-divider);
  border-radius: 8px;
  font-size: 14px;
  background: var(--MI_THEME-panel);
  color: var(--MI_THEME-fg);
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: var(--MI_THEME-accent);
}

.codeRow {
  display: flex;
  gap: 12px;
}

.codeRow .input {
  flex: 1;
}

.sendBtn {
  padding: 12px 16px;
  background: var(--MI_THEME-accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
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
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
}

.loginBtn:hover {
  opacity: 0.9;
}
</style>
