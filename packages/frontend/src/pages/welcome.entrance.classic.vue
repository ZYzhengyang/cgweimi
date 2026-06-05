<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="meta" :class="$style.root">
	<div :class="$style.hero">
		<!-- 左半区：品牌信息 + 登录表单 -->
		<div :class="$style.brandPanel">
			<div :class="$style.brandContent">
				<img ref="logoRef" :src="cgvmisvg" :class="$style.logo" alt="CG微米"/>
				<div ref="sloganRef" :class="$style.slogan">创作者的灵感社区</div>
				<p ref="descRef" :class="$style.description">
					CG微米 — CG 创作者社区平台<br>
					聚集 CG 人才，展示作品，交流技术，发现灵感
				</p>
				<div ref="loginRef" :class="$style.loginSection">
					<MkSignin :autoSet="true"/>
				</div>
			</div>
			<div :class="$style.brandDecor"></div>
		</div>

		<!-- 右半区：视频小窗 -->
		<div :class="$style.videoPanel">
			<div ref="videoRef" :class="[$style.videoWindow, isLandscape ? $style.landscape : $style.portrait]">
				<XVideoTimeline :class="$style.videoPlayer"/>
				<button :class="$style.orientationBtn" @click="toggleOrientation" title="切换横竖屏">
					<i class="ti ti-arrows-left-right"></i>
				</button>
			</div>
		</div>
	</div>

	<!-- 底部联邦实例跑马灯 -->
	<div v-if="instances && instances.length > 0" :class="$style.federation">
		<MkMarqueeText :duration="40">
			<MkA v-for="instance in instances" :key="instance.id" :class="$style.federationInstance" :to="`/instance-info/${instance.host}`" behavior="window">
				<img v-if="instance.iconUrl" :class="$style.federationInstanceIcon" :src="getInstanceIcon(instance)" alt=""/>
				<span class="_monospace">{{ instance.host }}</span>
			</MkA>
		</MkMarqueeText>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import gsap from 'gsap';
import * as Misskey from 'misskey-js';
import XVideoTimeline from './welcome.timeline.video.vue';
import MkMarqueeText from '@/components/MkMarqueeText.vue';
import MkSignin from '@/components/MkSignin.vue';
import cgvmisvg from '/client-assets/cgvmi.svg';
import { misskeyApiGet } from '@/utility/misskey-api.js';
import { getProxiedImageUrl } from '@/utility/media-proxy.js';
import { instance as meta } from '@/instance.js';

const instances = ref<Misskey.entities.FederationInstance[]>();
const isLandscape = ref(true);

const logoRef = ref<HTMLElement>();
const sloganRef = ref<HTMLElement>();
const descRef = ref<HTMLElement>();
const loginRef = ref<HTMLElement>();
const videoRef = ref<HTMLElement>();

function toggleOrientation() {
	isLandscape.value = !isLandscape.value;
}

function getInstanceIcon(instance: Misskey.entities.FederationInstance): string {
	if (!instance.iconUrl) return '';
	return getProxiedImageUrl(instance.iconUrl, 'preview');
}

misskeyApiGet('federation/instances', {
	sort: '+pubSub',
	limit: 20,
	blocked: false,
}).then(_instances => {
	instances.value = _instances;
});

onMounted(() => {
	const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

	tl.from(logoRef.value, { opacity: 0, y: -30, duration: 0.6 })
		.from(sloganRef.value, { opacity: 0, y: 20, duration: 0.5 }, '-=0.3')
		.from(descRef.value, { opacity: 0, y: 20, duration: 0.5 }, '-=0.3')
		.from(loginRef.value, { opacity: 0, y: 20, duration: 0.5 }, '-=0.2')
		.from(videoRef.value, { opacity: 0, scale: 0.92, duration: 0.7 }, '-=0.4');
});
</script>

<style lang="scss" module>
.root {
	min-height: 100cqh;
	overflow: auto;
	overscroll-behavior: contain;
	background: var(--MI_THEME-bg);
}

.hero {
	display: flex;
	align-items: stretch;
	width: 100%;
	min-height: 100vh;

	@media (max-width: 1024px) {
		flex-direction: column;
		min-height: auto;
	}
}

.brandPanel {
	position: relative;
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 48px;
	overflow: hidden;
	background: linear-gradient(135deg, var(--MI_THEME-accent) 0%, color-mix(in srgb, var(--MI_THEME-accent) 70%, #000) 100%);
	color: #fff;

	@media (max-width: 1024px) {
		padding: 48px 32px;
	}

	@media (max-width: 768px) {
		padding: 40px 24px;
	}
}

.brandContent {
	position: relative;
	z-index: 2;
	width: 100%;
	max-width: 440px;
}

.brandDecor {
	position: absolute;
	top: -20%;
	right: -10%;
	width: 400px;
	height: 400px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.06);
	pointer-events: none;

	&::after {
		content: '';
		position: absolute;
		bottom: -30%;
		left: -40%;
		width: 300px;
		height: 300px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.04);
	}
}

.logo {
	width: 140px;
	margin-bottom: 12px;

	@media (max-width: 768px) {
		width: 120px;
	}
}

.slogan {
	font-size: 28px;
	font-weight: 700;
	letter-spacing: 2px;
	line-height: 1.3;
	margin-bottom: 8px;

	@media (max-width: 768px) {
		font-size: 22px;
	}
}

.description {
	font-size: 14px;
	line-height: 1.6;
	opacity: 0.8;
	margin-bottom: 24px;
}

.loginSection {
	background: rgba(255, 255, 255, 0.12);
	border-radius: 16px;
	padding: 28px 24px;
	backdrop-filter: blur(10px);
	border: 1px solid rgba(255, 255, 255, 0.15);
}

.videoPanel {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 32px;
	background: var(--MI_THEME-bg);

	@media (max-width: 1024px) {
		padding: 24px;
	}
}

.videoWindow {
	position: relative;
	width: 100%;
	max-width: 400px;
	border-radius: 16px;
	overflow: hidden;
	box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05);
	background: #000;
	transition: aspect-ratio 0.4s ease, max-height 0.4s ease;

	@media (max-width: 1024px) {
		max-width: 320px;
	}

	@media (max-width: 768px) {
		max-width: 280px;
		border-radius: 12px;
	}
}

.landscape {
	aspect-ratio: 16 / 9;
	max-height: calc(100vh - 64px);
}

.portrait {
	aspect-ratio: 9 / 16;
	max-height: calc(100vh - 64px);
}

.videoPlayer {
	width: 100%;
	height: 100%;
}

.orientationBtn {
	position: absolute;
	bottom: 12px;
	right: 12px;
	z-index: 5;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	border: none;
	background: rgba(0, 0, 0, 0.45);
	color: #fff;
	font-size: 16px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: background 0.2s;

	&:hover {
		background: rgba(0, 0, 0, 0.7);
	}
}

.federation {
	position: fixed;
	bottom: 16px;
	left: 0;
	right: 0;
	margin: auto;
	background: color-mix(in srgb, var(--MI_THEME-panel) 50%, transparent);
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
	border-radius: 999px;
	overflow: clip;
	width: 800px;
	padding: 8px 0;
	z-index: 3;

	@media (max-width: 900px) {
		display: none;
	}
}

.federationInstance {
	display: inline-flex;
	align-items: center;
	vertical-align: bottom;
	padding: 6px 12px 6px 6px;
	margin: 0 10px 0 0;
	background: var(--MI_THEME-panel);
	border-radius: 999px;
}

.federationInstanceIcon {
	display: inline-block;
	width: 20px;
	height: 20px;
	margin-right: 5px;
	border-radius: 999px;
}
</style>
