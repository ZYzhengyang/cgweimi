<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.signinWrapper">
	<!-- 左侧登录表单 -->
	<div :class="$style.signinLeft">
		<div :class="$style.signinRoot">
			<!-- 快捷登录：微信/QQ/手机号 -->
			<MkThirdPartyLogin />

			<!-- 分隔线 -->
			<div :class="$style.orHr">
				<p :class="$style.orMsg">或使用账号密码登录</p>
			</div>

			<Transition
				mode="out-in"
				:enterActiveClass="$style.transition_enterActive"
				:leaveActiveClass="$style.transition_leaveActive"
				:enterFromClass="$style.transition_enterFrom"
				:leaveToClass="$style.transition_leaveTo"

				:inert="waiting"
			>
				<!-- 1. 外部サーバーへの転送・username入力・パスキー -->
				<XInput
					v-if="page === 'input'"
					key="input"
					:message="message"
					:openOnRemote="openOnRemote"
					:initialUsername="initialUsername"

					@usernameSubmitted="onUsernameSubmitted"
				/>

				<!-- 2. パスワード入力 -->
				<XPassword
					v-else-if="page === 'password'"
					key="password"
					ref="passwordPageEl"

					:user="userInfo!"
					:needCaptcha="needCaptcha"

					@passwordSubmitted="onPasswordSubmitted"
				/>

				<!-- 3. ワンタイムパスワード -->
				<XTotp
					v-else-if="page === 'totp'"
					key="totp"

					@totpSubmitted="onTotpSubmitted"
				/>

				<!-- 4. パスキー（已禁用） -->
				<!-- <XPasskey
					v-else-if="page === 'passkey'"
					key="passkey"

					:credentialRequest="credentialRequest!"
					:isPerformingPasswordlessLogin="doingPasskeyFromInputPage"

					@done="onPasskeyDone"
					@useTotp="onUseTotp"
				/> -->
			</Transition>

			<div v-if="waiting" :class="$style.waitingRoot">
				<MkLoading/>
			</div>
		</div>
	</div>
</div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue';
import * as Misskey from 'misskey-js';
import type { OpenOnRemoteOptions } from '@/utility/please-login.js';
import type { PwResponse } from '@/components/MkSignin.password.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { showSuspendedDialog } from '@/utility/show-suspended-dialog.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';

import XInput from '@/components/MkSignin.input.vue';
import XPassword from '@/components/MkSignin.password.vue';
import XTotp from '@/components/MkSignin.totp.vue';
// import XPasskey from '@/components/MkSignin.passkey.vue';
import MkThirdPartyLogin from '@/components/MkThirdPartyLogin.vue';
import { login } from '@/accounts.js';

const emit = defineEmits<{
	(ev: 'login', v: Misskey.entities.SigninFlowResponse & { finished: true }): void;
}>();

const props = withDefaults(defineProps<{
	autoSet?: boolean;
	message?: string,
	openOnRemote?: OpenOnRemoteOptions,
	initialUsername?: string;
}>(), {
	autoSet: false,
	message: '',
	openOnRemote: undefined,
	initialUsername: undefined,
});

const page = ref<'input' | 'password' | 'totp'>('input');
const waiting = ref(false);

const passwordPageEl = useTemplateRef('passwordPageEl');
const needCaptcha = ref(false);

const userInfo = ref<null | Misskey.entities.UserDetailed>(null);
const password = ref('');

//#region Passkey Passwordless（已禁用）
// const credentialRequest = shallowRef<PublicKeyCredentialRequestOptionsJSON | null>(null);
// const passkeyContext = ref('');
// const doingPasskeyFromInputPage = ref(false);

// function onPasskeyLogin(): void { ... }
// function onPasskeyDone(credential: AuthenticationResponseJSON): void { ... }

function onUseTotp(): void {
	page.value = 'totp';
}
//#endregion

async function onUsernameSubmitted(username: string) {
	waiting.value = true;

	userInfo.value = await misskeyApi('users/show', {
		username,
	}).catch(() => null);

	await tryLogin({
		username,
	});
}

async function onPasswordSubmitted(pw: PwResponse) {
	waiting.value = true;
	password.value = pw.password;

	if (userInfo.value == null) {
		await os.alert({
			type: 'error',
			title: i18n.ts.noSuchUser,
			text: i18n.ts.signinFailed,
		});
		waiting.value = false;
		return;
	} else {
		await tryLogin({
			username: userInfo.value.username,
			password: pw.password,
			'hcaptcha-response': pw.captcha.hcaptchaResponse,
			'g-recaptcha-response': pw.captcha.recaptchaResponse,
			'turnstile-response': pw.captcha.turnstileResponse,
			'm-captcha-response': pw.captcha.mcaptchaResponse,
			'testcaptcha-response': pw.captcha.testcaptchaResponse,
		});
	}
}

async function onTotpSubmitted(token: string) {
	waiting.value = true;

	if (userInfo.value == null) {
		await os.alert({
			type: 'error',
			title: i18n.ts.noSuchUser,
			text: i18n.ts.signinFailed,
		});
		waiting.value = false;
		return;
	} else {
		await tryLogin({
			username: userInfo.value.username,
			password: password.value,
			token,
		});
	}
}

async function tryLogin(req: Partial<Misskey.entities.SigninFlowRequest>): Promise<Misskey.entities.SigninFlowResponse> {
	const _req = {
		username: req.username ?? userInfo.value?.username,
		...req,
	};

	function assertIsSigninFlowRequest(x: Partial<Misskey.entities.SigninFlowRequest>): x is Misskey.entities.SigninFlowRequest {
		return x.username != null;
	}

	if (!assertIsSigninFlowRequest(_req)) {
		throw new Error('Invalid request');
	}

	return await misskeyApi('signin-flow', _req).then(async (res) => {
		if (res.finished) {
			emit('login', res);
			await onLoginSucceeded(res);
		} else {
			switch (res.next) {
				case 'captcha': {
					needCaptcha.value = true;
					page.value = 'password';
					break;
				}
				case 'password': {
					needCaptcha.value = false;
					page.value = 'password';
					break;
				}
				case 'totp': {
					page.value = 'totp';
					break;
				}
				case 'passkey': {
					// Passkey已禁用，跳过
					page.value = 'input';
					break;
				}
			}

			passwordPageEl.value?.resetCaptcha();
			nextTick(() => {
				waiting.value = false;
			});
		}
		return res;
	}).catch((err) => {
		onSigninApiError(err);
		return Promise.reject(err);
	});
}

async function onLoginSucceeded(res: Misskey.entities.SigninFlowResponse & { finished: true }) {
	if (props.autoSet) {
		await login(res.i);
	}
}

function onSigninApiError(err?: any): void {
	const id = err?.id ?? null;

	switch (id) {
		case '6cc579cc-885d-43d8-95c2-b8c7fc963280': {
			os.alert({
				type: 'error',
				title: i18n.ts.loginFailed,
				text: i18n.ts.noSuchUser,
			});
			break;
		}
		case '932c904e-9460-45b7-9ce6-7ed33be7eb2c': {
			os.alert({
				type: 'error',
				title: i18n.ts.loginFailed,
				text: i18n.ts.incorrectPassword,
			});
			break;
		}
		case 'e03a5f46-d309-4865-9b69-56282d94e1eb': {
			showSuspendedDialog();
			break;
		}
		case '22d05606-fbcf-421a-a2db-b32610dcfd1b': {
			os.alert({
				type: 'error',
				title: i18n.ts.loginFailed,
				text: i18n.ts.rateLimitExceeded,
			});
			break;
		}
		case 'cdf1235b-ac71-46d4-a3a6-84ccce48df6f': {
			os.alert({
				type: 'error',
				title: i18n.ts.loginFailed,
				text: i18n.ts.incorrectTotp,
			});
			break;
		}
		case '36b96a7d-b547-412d-aeed-2d611cdc8cdc':
		case '93b86c4b-72f9-40eb-9815-798928603d1e':
		case 'b18c89a7-5b5e-4cec-bb5b-0419f332d430':
		case '2d84773e-f7b7-4d0b-8f72-bb69b584c912': {
			// Passkey相关错误，已禁用
			break;
		}
		default: {
			console.error(err);
			os.alert({
				type: 'error',
				title: i18n.ts.loginFailed,
				text: JSON.stringify(err),
			});
		}
	}

	passwordPageEl.value?.resetCaptcha();
	nextTick(() => {
		waiting.value = false;
	});
}

onBeforeUnmount(() => {
	password.value = '';
	needCaptcha.value = false;
	userInfo.value = null;
});
</script>

<style lang="scss" module>
.transition_enterActive,
.transition_leaveActive {
	transition: opacity 0.3s cubic-bezier(0,0,.35,1), transform 0.3s cubic-bezier(0,0,.35,1);
}
.transition_enterFrom {
	opacity: 0;
	transform: translateX(50px);
}
.transition_leaveTo {
	opacity: 0;
	transform: translateX(-50px);
}

.signinWrapper {
	display: flex;
	width: 100%;
	min-height: 400px;
	gap: 24px;
}

.signinLeft {
	flex: 1;
	max-width: 450px;
	min-width: 300px;
}

.signinRight {
	flex: 1;
	max-width: 500px;
	min-width: 250px;
	height: 500px;
	border-radius: 12px;
	overflow: hidden;
	background: var(--MI_THEME-panel);
}

.signinRoot {
	overflow-x: hidden;
	overflow-x: clip;

	position: relative;
}

.orHr {
	position: relative;
	margin: 1.2em auto;
	width: 100%;
	height: 1px;
	background: var(--MI_THEME-divider);
}

.orMsg {
	position: absolute;
	top: -.6em;
	display: inline-block;
	padding: 0 1em;
	background: var(--MI_THEME-panel);
	font-size: 0.8em;
	color: var(--MI_THEME-fgOnPanel);
	margin: 0;
	left: 50%;
	transform: translateX(-50%);
	white-space: nowrap;
}

.waitingRoot {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: color-mix(in srgb, var(--MI-theme-panel), transparent 50%);
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 1;
}

/* 响应式：小屏幕时垂直堆叠 */
@media (max-width: 768px) {
	.signinWrapper {
		flex-direction: column;
	}
	.signinLeft,
	.signinRight {
		max-width: 100%;
	}
	.signinRight {
		height: 350px;
	}
}
</style>
