<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="visible" :class="$style.root" :style="{ zIndex }">
	<div :class="$style.inner">
		<div :class="$style.text">
			<i class="ti ti-sparkles" :class="$style.icon"></i>
			<span :class="$style.title">加入 CG微米，发现更多精彩</span>
			<span :class="$style.desc">注册即可点赞、评论、关注创作者</span>
		</div>
		<div :class="$style.actions">
			<button :class="[$style.btn, $style.btnPrimary]" @click="signup">注册</button>
			<button :class="[$style.btn, $style.btnSecondary]" @click="signin">登录</button>
		</div>
		<button :class="$style.close" @click="dismiss"><i class="ti ti-x"></i></button>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import * as os from '@/os.js';
import XSigninDialog from '@/components/MkSigninDialog.vue';
import XSignupDialog from '@/components/MkSignupDialog.vue';

const STORAGE_KEY = 'guestGuideBarDismissed';

const visible = ref(sessionStorage.getItem(STORAGE_KEY) !== 'true');
const zIndex = os.claimZIndex('low');

function dismiss() {
	visible.value = false;
	sessionStorage.setItem(STORAGE_KEY, 'true');
}

function signin() {
	const { dispose } = os.popup(XSigninDialog, {}, {
		done: () => dispose(),
		closed: () => dispose(),
	});
}

function signup() {
	const { dispose } = os.popup(XSignupDialog, {}, {
		done: () => dispose(),
		closed: () => dispose(),
	});
}
</script>

<style lang="scss" module>
.root {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: var(--MI_THEME-panel);
	border-top: solid 1px var(--MI_THEME-divider);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	padding-bottom: env(safe-area-inset-bottom, 0px);
}

.inner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	max-width: 1200px;
	margin: 0 auto;
	padding: 10px 16px;
}

.text {
	display: flex;
	align-items: center;
	gap: 8px;
	flex: 1;
	min-width: 0;
}

.icon {
	color: var(--MI_THEME-accent);
	font-size: 20px;
	flex-shrink: 0;
}

.title {
	font-weight: 700;
	font-size: 14px;
	color: var(--MI_THEME-fg);
	white-space: nowrap;
}

.desc {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparent);
	white-space: nowrap;
}

.actions {
	display: flex;
	gap: 8px;
	flex-shrink: 0;
}

.btn {
	border: none;
	border-radius: 8px;
	padding: 8px 20px;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	transition: opacity 0.2s;

	&:hover {
		opacity: 0.85;
	}
}

.btnPrimary {
	background: var(--MI_THEME-accent);
	color: #fff;
}

.btnSecondary {
	background: var(--MI_THEME-panelHighlight);
	color: var(--MI_THEME-fg);
}

.close {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border: none;
	background: transparent;
	color: var(--MI_THEME-fgTransparent);
	cursor: pointer;
	border-radius: 6px;
	flex-shrink: 0;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
	}
}

@media (max-width: 600px) {
	.inner {
		flex-wrap: wrap;
		padding: 10px 12px;
	}

	.text {
		flex-basis: 100%;
	}

	.desc {
		display: none;
	}

	.actions {
		flex: 1;
	}

	.btn {
		flex: 1;
		text-align: center;
	}
}
</style>
