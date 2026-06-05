<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="meta" :class="$style.root">
	<!-- 左品牌 + 右视频小窗 主布局 -->
	<div :class="$style.hero">
		<!-- 左半区：品牌信息 -->
		<div :class="$style.brandPanel">
			<div :class="$style.brandContent">
				<img :src="cgvmisvg" :class="$style.logo" alt="CG微米"/>
				<div :class="$style.slogan">创作者的灵感社区</div>
				<p :class="$style.description">
					CG微米 — CG 创作者社区平台<br>
					聚集 CG 人才，展示作品，交流技术，发现灵感
				</p>
				<div :class="$style.cta">
					<MkA :class="$style.ctaBtn" to="/signup">立即加入</MkA>
					<MkA :class="$style.ctaBtnSecondary" to="/timeline">浏览内容</MkA>
				</div>
			</div>
			<!-- 装饰背景 -->
			<div :class="$style.brandDecor"></div>
		</div>

		<!-- 右半区：视频小窗（复用 P1-5 XVideoTimeline 组件） -->
		<div :class="$style.videoPanel">
			<div :class="$style.videoWindow">
				<XVideoTimeline :class="$style.videoPlayer"/>
			</div>
		</div>
	</div>

	<!-- 下方内容区 -->
	<div :class="$style.contents">
		<MkVisitorDashboard/>
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
import { ref } from 'vue';
import * as Misskey from 'misskey-js';
import XVideoTimeline from './welcome.timeline.video.vue';
import MkMarqueeText from '@/components/MkMarqueeText.vue';
import cgvmisvg from '/client-assets/cgvmi.svg';
import { misskeyApiGet } from '@/utility/misskey-api.js';
import MkVisitorDashboard from '@/components/MkVisitorDashboard.vue';
import { getProxiedImageUrl } from '@/utility/media-proxy.js';
import { instance as meta } from '@/instance.js';

const instances = ref<Misskey.entities.FederationInstance[]>();

function getInstanceIcon(instance: Misskey.entities.FederationInstance): string {
	if (!instance.iconUrl) {
		return '';
	}

	return getProxiedImageUrl(instance.iconUrl, 'preview');
}

misskeyApiGet('federation/instances', {
	sort: '+pubSub',
	limit: 20,
	blocked: false,
}).then(_instances => {
	instances.value = _instances;
});
</script>

<style lang="scss" module>
.root {
	min-height: 100cqh;
	overflow: auto;
	overscroll-behavior: contain;
	background: var(--MI_THEME-bg);
}

// ── 主布局：左品牌 + 右视频小窗 ──
.hero {
	display: flex;
	align-items: stretch;
	width: 100%;
	min-height: 560px;
	height: 80vh;
	max-height: 800px;

	// 平板：上下布局
	@media (max-width: 1024px) {
		flex-direction: column;
		height: auto;
		min-height: auto;
		max-height: none;
	}
}

// ── 左半区：品牌信息 ──
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
		min-height: 360px;
	}

	@media (max-width: 768px) {
		padding: 40px 24px;
		min-height: 320px;
	}
}

.brandContent {
	position: relative;
	z-index: 2;
	max-width: 480px;
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
	width: 180px;
	margin-bottom: 16px;

	@media (max-width: 768px) {
		width: 140px;
	}
}

.slogan {
	font-size: 32px;
	font-weight: 700;
	letter-spacing: 2px;
	line-height: 1.3;
	margin-bottom: 16px;

	@media (max-width: 768px) {
		font-size: 24px;
	}
}

.description {
	font-size: 15px;
	line-height: 1.8;
	opacity: 0.85;
	margin-bottom: 32px;
}

.cta {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
}

.ctaBtn {
	display: inline-block;
	padding: 12px 32px;
	background: #fff;
	color: var(--MI_THEME-accent);
	font-weight: 600;
	font-size: 15px;
	border-radius: 8px;
	text-decoration: none;
	transition: transform 0.15s ease, box-shadow 0.15s ease;

	&:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
	}
}

.ctaBtnSecondary {
	display: inline-block;
	padding: 12px 32px;
	background: transparent;
	color: #fff;
	font-weight: 600;
	font-size: 15px;
	border: 2px solid rgba(255, 255, 255, 0.6);
	border-radius: 8px;
	text-decoration: none;
	transition: border-color 0.15s ease, background 0.15s ease;

	&:hover {
		border-color: #fff;
		background: rgba(255, 255, 255, 0.1);
	}
}

// ── 右半区：视频小窗 ──
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
	width: 100%;
	max-width: 480px;
	aspect-ratio: 9 / 16;
	max-height: calc(80vh - 64px);
	border-radius: 16px;
	overflow: hidden;
	box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05);
	background: #000;

	@media (max-width: 1024px) {
		max-width: 360px;
		max-height: 640px;
	}

	@media (max-width: 768px) {
		max-width: 320px;
		border-radius: 12px;
	}
}

.videoPlayer {
	width: 100%;
	height: 100%;
}

// ── 下方内容区 ──
.contents {
	position: relative;
	width: min(800px, calc(100% - 32px));
	margin: 0 auto;
	padding: 48px 0;
	z-index: 3;

	@media (max-width: 768px) {
		padding: 24px 16px 80px;
	}
}

// ── 底部联邦实例跑马灯 ──
.federation {
	position: fixed;
	bottom: 16px;
	left: 0;
	right: 0;
	margin: auto;
	background: color(from var(--MI_THEME-panel) srgb r g b / 0.5);
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
