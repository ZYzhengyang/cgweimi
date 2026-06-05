<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="meta" :class="$style.root">
	<!-- 全屏视频背景 -->
	<div :class="$style.videoBg">
		<XVideoTimeline :class="$style.videoPlayer"/>
	</div>
	<!-- 暗色遮罩层 -->
	<div :class="$style.overlay"></div>
	<div :class="$style.shape1"></div>
	<div :class="$style.shape2"></div>
	<div :class="$style.logoWrapper">
		<img :src="cgvmisvg" :class="$style.logo"/>
		<div :class="$style.slogan">创作者的灵感社区</div>
	</div>
	<div :class="$style.contents">
		<MkVisitorDashboard/>
	</div>
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
	height: 100cqh;
	overflow: auto;
	overscroll-behavior: contain;
}

.videoBg {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	z-index: 0;

	// 平板：视频高度缩小
	@media (max-width: 1200px) {
		height: 60vh;
	}

	// 手机：视频作为顶部 Banner
	@media (max-width: 768px) {
		position: relative;
		height: 300px;
		width: 100%;
	}
}

.videoPlayer {
	width: 100%;
	height: 100%;
}

.overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: rgba(0, 0, 0, 0.4);
	z-index: 1;
	pointer-events: none;

	@media (max-width: 1200px) {
		height: 60vh;
	}

	@media (max-width: 768px) {
		position: absolute;
		height: 300px;
		width: 100%;
	}
}

.shape1 {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: var(--MI_THEME-accent);
	clip-path: polygon(0% 0%, 45% 0%, 20% 100%, 0% 100%);
	opacity: 0.3;
	z-index: 2;
	pointer-events: none;
}

.shape2 {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: var(--MI_THEME-accent);
	clip-path: polygon(0% 0%, 25% 0%, 35% 100%, 0% 100%);
	opacity: 0.15;
	z-index: 2;
	pointer-events: none;
}

.logoWrapper {
	position: fixed;
	top: 36px;
	left: 36px;
	flex: auto;
	color: #fff;
	user-select: none;
	pointer-events: none;
	z-index: 3;
}

.logo {
	width: 160px;

	@media (max-width: 450px) {
		width: 130px;
	}
}

.slogan {
	margin-top: 6px;
	font-size: 14px;
	opacity: 0.85;
	letter-spacing: 1px;
}

.contents {
	position: relative;
	width: min(430px, calc(100% - 32px));
	margin-left: 128px;
	padding: 100px 0 100px 0;
	z-index: 3;

	@media (max-width: 1200px) {
		margin: auto;
		padding-top: 40px;
	}

	@media (max-width: 768px) {
		margin: auto;
		padding: 24px 16px 100px;
	}
}

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
