<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="meta" :class="$style.root">
	<!-- Hero 区域：布料背景 (~40vh) -->
	<section :class="$style.hero">
		<ClothCanvas :class="$style.cloth" :cols="70" :rows="45" :interactive="true" :wind="true"/>
		<div :class="$style.heroOverlay">
			<img ref="logoRef" :src="cgvmisvg" :class="$style.logo" alt="CG微米"/>
			<div ref="sloganRef" :class="$style.slogan">创作者的灵感社区</div>
			<a ref="ctaRef" :class="$style.cta" href="#login">{{ i18n.ts.login }}</a>
		</div>
	</section>

	<!-- 主内容区：登录 + 视频 -->
	<div :class="$style.content">
		<div id="login" :class="$style.left">
			<div ref="loginRef" :class="$style.loginBox">
				<MkSignin :autoSet="true"/>
			</div>
		</div>

		<div v-if="showVideo" :class="$style.right">
			<XVideoTimeline :class="$style.videoPlayer"/>
		</div>
	</div>

	<!-- 底部联邦实例跑马灯 -->
	<div v-if="showFederation && instances && instances.length > 0" :class="$style.federation">
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
import { ref, computed, onMounted } from 'vue';
import gsap from 'gsap';
import * as Misskey from 'misskey-js';
import XVideoTimeline from './welcome.timeline.video.vue';
import ClothCanvas from '@/components/ClothCanvas.vue';
import MkMarqueeText from '@/components/MkMarqueeText.vue';
import MkSignin from '@/components/MkSignin.vue';
import cgvmisvg from '/client-assets/cgvmi.svg';
import { misskeyApiGet } from '@/utility/misskey-api.js';
import { getProxiedImageUrl } from '@/utility/media-proxy.js';
import { instance as meta } from '@/instance.js';
import { i18n } from '@/i18n.js';

const instances = ref<Misskey.entities.FederationInstance[]>();

const logoRef = ref<HTMLElement>();
const sloganRef = ref<HTMLElement>();
const ctaRef = ref<HTMLElement>();
const loginRef = ref<HTMLElement>();

const showVideo = computed(() => meta.clientOptions?.entranceVideoShow !== false);
const showFederation = computed(() => meta.clientOptions?.entranceShowFederation !== false);

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

	tl.from(logoRef.value, { opacity: 0, x: -20, duration: 0.4 })
		.from(sloganRef.value, { opacity: 0, x: -10, duration: 0.3 }, '-=0.2')
		.from(ctaRef.value, { opacity: 0, y: 20, duration: 0.4 }, '-=0.1')
		.from(loginRef.value, { opacity: 0, y: 20, duration: 0.5 }, '-=0.1');
});
</script>

<style lang="scss" module>
.root {
	position: relative;
	width: 100%;
	min-height: 100vh;
	background: var(--MI_THEME-bg);
}

/* Hero 区域：布料背景 (~40vh) */
.hero {
	position: relative;
	width: 100%;
	height: 40vh;
	min-height: 280px;
	overflow: hidden;
}

.cloth {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 0;
}

.heroOverlay {
	position: relative;
	z-index: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	height: 100%;
	padding: 32px;
	text-align: center;
}

.logo {
	width: 56px;
	margin-bottom: 12px;
}

.slogan {
	font-size: 16px;
	font-weight: 500;
	color: var(--MI_THEME-fgOnAccent);
	margin-bottom: 20px;
	letter-spacing: 0.5px;
	text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3);
}

.cta {
	display: inline-block;
	padding: 10px 28px;
	font-size: 14px;
	font-weight: 600;
	color: var(--MI_THEME-fgOnAccent);
	background: var(--MI_THEME-accent);
	border-radius: 999px;
	text-decoration: none;
	transition: transform 0.2s, box-shadow 0.2s;

	&:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
	}
}

/* 主内容区：登录 + 视频 */
.content {
	display: flex;
	width: 100%;
	max-width: 960px;
	margin: 0 auto;
	padding: 40px 32px;
}

.left {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	padding: 32px;
}

.loginBox {
	width: 100%;
	max-width: 360px;
	background: color-mix(in srgb, var(--MI_THEME-panel) 88%, transparent);
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	border-radius: 14px;
	border: 1px solid var(--MI_THEME-divider);
	padding: 20px;
	box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

/* 右侧：视频预览 */
.right {
	width: 50%;
	max-width: 500px;
	display: flex;
	align-items: center;
	justify-content: center;

	@media (max-width: 900px) {
		display: none;
	}
}

.videoPlayer {
	width: 100%;
	height: 100%;
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
