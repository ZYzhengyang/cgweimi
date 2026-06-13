<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<!-- 全屏视频流背景 -->
	<div :class="$style.videoFeed">
		<XVideoTimeline preview :class="$style.videoPlayer"/>
	</div>

	<!-- 左上角 Logo -->
	<div :class="$style.logoWrapper">
		<img :src="cgvmisvg" :class="$style.logo" alt="CGVMI"/>
	</div>

	<!-- 右侧登录/注册面板 -->
	<div :class="[$style.authPanel, { [$style.authPanelCollapsed]: panelCollapsed }]">
		<button class="_button" :class="$style.toggleBtn" @click="panelCollapsed = !panelCollapsed">
			<i :class="panelCollapsed ? 'ti ti-chevron-left' : 'ti ti-chevron-right'"></i>
		</button>
		<div v-show="!panelCollapsed" :class="$style.authContent">
			<div :class="$style.authHeader">
				<img :src="instanceIcon" :class="$style.authIcon" alt=""/>
				<h2 :class="$style.authTitle">{{ instanceName }}</h2>
				<p :class="$style.authDesc">创作者的灵感社区</p>
			</div>
			<div :class="$style.authForms">
				<MkButton :class="$style.authBtn" full rounded gradate @click="signup()">注册账号</MkButton>
				<MkButton :class="$style.authBtn" full rounded @click="signin()">登录</MkButton>
			</div>
			<div :class="$style.authHint">
				<i class="ti ti-arrow-up" :class="$style.hintIcon"></i>
				<span>上滑刷视频，发现更多精彩</span>
			</div>
		</div>
	</div>

	<!-- 底部提示条 -->
	<div v-if="!panelCollapsed" :class="$style.bottomHint" @click="panelCollapsed = true">
		<i class="ti ti-device-mobile"></i>
		<span>沉浸刷视频</span>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { instanceName } from '@@/js/config.js';
import XVideoTimeline from './welcome.timeline.video.vue';
import MkButton from '@/components/MkButton.vue';
import XSigninDialog from '@/components/MkSigninDialog.vue';
import XSignupDialog from '@/components/MkSignupDialog.vue';
import * as os from '@/os.js';
import { instance } from '@/instance.js';
import cgvmisvg from '/client-assets/cgvmi.svg';

const panelCollapsed = ref(false);
const instanceIcon = computed(() => instance.iconUrl || '/favicon.ico');

function signin() {
	const { dispose } = os.popup(XSigninDialog, {
		autoSet: true,
	}, {
		closed: () => dispose(),
	});
}

function signup() {
	const { dispose } = os.popup(XSignupDialog, {
		autoSet: true,
	}, {
		closed: () => dispose(),
	});
}
</script>

<style lang="scss" module>
.root {
	width: 100%;
	height: 100cqh;
	position: relative;
	overflow: hidden;
	background: #000;
}

.videoFeed {
	position: absolute;
	inset: 0;
	z-index: 1;
}

.videoPlayer {
	width: 100%;
	height: 100%;
}

/* Logo */
.logoWrapper {
	position: fixed;
	top: 20px;
	left: 24px;
	z-index: 100;
	pointer-events: none;
}

.logo {
	width: 100px;
	filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));

	@media (max-width: 768px) {
		width: 80px;
	}
}

/* 登录面板 */
.authPanel {
	position: fixed;
	top: 50%;
	right: 24px;
	transform: translateY(-50%);
	z-index: 100;
	width: 320px;
	background: rgba(0, 0, 0, 0.65);
	backdrop-filter: blur(20px);
	border-radius: 20px;
	border: 1px solid rgba(255, 255, 255, 0.1);
	overflow: hidden;
	transition: all 0.3s ease;

	@media (max-width: 768px) {
		top: auto;
		bottom: 0;
		right: 0;
		left: 0;
		width: 100%;
		transform: none;
		border-radius: 20px 20px 0 0;
		background: rgba(0, 0, 0, 0.78);
	}
}

.authPanelCollapsed {
	width: 48px;
	background: rgba(0, 0, 0, 0.45);
	border-radius: 24px;

	@media (max-width: 768px) {
		width: 100%;
		height: 44px;
		border-radius: 20px 20px 0 0;
	}
}

.toggleBtn {
	position: absolute;
	top: 50%;
	left: -1px;
	transform: translateY(-50%);
	width: 28px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.8);
	font-size: 16px;
	z-index: 5;
	transition: color 0.2s;
	&:hover { color: #fff; }

	@media (max-width: 768px) {
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 48px;
		height: 28px;
		border-radius: 0 0 12px 12px;

		> i {
			transform: rotate(90deg);
		}
	}
}

.authContent {
	padding: 32px 24px;

	@media (max-width: 768px) {
		padding: 20px 24px 28px;
	}
}

.authHeader {
	text-align: center;
	margin-bottom: 24px;
}

.authIcon {
	width: 56px;
	height: 56px;
	border-radius: 16px;
	margin-bottom: 12px;
}

.authTitle {
	margin: 0 0 6px;
	font-size: 20px;
	font-weight: 700;
	color: #fff;
}

.authDesc {
	margin: 0;
	font-size: 13px;
	color: rgba(255, 255, 255, 0.6);
}

.authForms {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.authBtn {
	backdrop-filter: blur(8px);
}

.authHint {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	margin-top: 20px;
	font-size: 12px;
	color: rgba(255, 255, 255, 0.4);
}

.hintIcon {
	animation: bounceUp 1.5s ease infinite;
}

@keyframes bounceUp {
	0%, 100% { transform: translateY(0); }
	50% { transform: translateY(-4px); }
}

/* 底部提示 */
.bottomHint {
	position: fixed;
	bottom: 24px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 100;
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 20px;
	background: rgba(0, 0, 0, 0.45);
	backdrop-filter: blur(12px);
	border-radius: 20px;
	color: rgba(255, 255, 255, 0.7);
	font-size: 13px;
	cursor: pointer;
	transition: all 0.2s;
	&:hover {
		background: rgba(0, 0, 0, 0.65);
		color: #fff;
	}

	@media (max-width: 768px) {
		bottom: 52px;
	}
}
</style>
