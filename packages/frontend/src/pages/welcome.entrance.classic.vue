<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithAnimBg>
	<div :class="$style.layout">
		<!-- 左侧：登录区 -->
		<div :class="$style.left">
			<div :class="$style.form" class="_panel">
				<!-- 波浪装饰 SVG -->
				<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="z-index:1;position:relative" viewBox="0 0 854 300">
					<defs>
						<linearGradient id="linear" x1="0%" y1="0%" x2="100%" y2="0%">
							<stop offset="0%" stop-color="#ff6b35"/><stop offset="100%" stop-color="#ff8c5a"/>
						</linearGradient>
					</defs>
					<g transform="translate(427, 150) scale(1, 1) translate(-427, -150)">
						<path d="" fill="url(#linear)" opacity="0.4">
							<animate attributeName="d" dur="20s" repeatCount="indefinite" keyTimes="0;0.333;0.667;1" calcmod="spline" keySplines="0.2 0 0.2 1;0.2 0 0.2 1;0.2 0 0.2 1" begin="0s" values="M0 0L 0 220Q 213.5 260 427 230T 854 255L 854 0 Z;M0 0L 0 245Q 213.5 260 427 240T 854 230L 854 0 Z;M0 0L 0 265Q 213.5 235 427 265T 854 230L 854 0 Z;M0 0L 0 220Q 213.5 260 427 230T 854 255L 854 0 Z"/>
						</path>
						<path d="" fill="url(#linear)" opacity="0.4">
							<animate attributeName="d" dur="20s" repeatCount="indefinite" keyTimes="0;0.333;0.667;1" calcmod="spline" keySplines="0.2 0 0.2 1;0.2 0 0.2 1;0.2 0 0.2 1" begin="-10s" values="M0 0L 0 235Q 213.5 280 427 250T 854 260L 854 0 Z;M0 0L 0 250Q 213.5 220 427 220T 854 240L 854 0 Z;M0 0L 0 245Q 213.5 225 427 250T 854 265L 854 0 Z;M0 0L 0 235Q 213.5 280 427 250T 854 260L 854 0 Z"/>
						</path>
					</g>
				</svg>

				<!-- 标题区域 -->
				<div :class="$style.title">
					<img :src="cgvmisvg" :class="$style.logo" alt="CG微米"/>
					<div :class="$style.slogan">创作者的灵感社区</div>
				</div>

				<!-- 登录表单 -->
				<div :class="$style.body">
					<MkSignin :autoSet="true"/>
				</div>
			</div>
		</div>

		<!-- 右侧：视频展示区 -->
		<div :class="$style.right">
			<div v-if="videoNote" :class="$style.videoBox">
				<video
					ref="videoEl"
					:class="$style.video"
					:src="videoUrl"
					:poster="videoThumb"
					playsinline
					loop
					muted
					preload="metadata"
					@click="togglePlay"
				></video>

				<!-- 播放/暂停图标 -->
				<div v-if="!isPlaying" :class="$style.playIcon" @click="togglePlay">
					<i class="ti ti-player-play-filled"></i>
				</div>

				<!-- 底部信息叠加 -->
				<div :class="$style.videoInfo">
					<div :class="$style.videoAuthor">
						<img v-if="videoNote.user?.avatarUrl" :src="videoNote.user.avatarUrl" :class="$style.avatar"/>
						<span :class="$style.username">@{{ videoNote.user?.username }}</span>
					</div>
					<div v-if="videoNote.text" :class="$style.videoText">{{ videoNote.text }}</div>
					<div :class="$style.videoStats">
						<span><i class="ti ti-heart"></i> {{ formatCount(videoNote.reactionCount) }}</span>
						<span><i class="ti ti-message"></i> {{ formatCount(videoNote.repliesCount) }}</span>
					</div>
				</div>
			</div>

			<!-- 无视频时的占位 -->
			<div v-else :class="$style.videoPlaceholder">
				<i class="ti ti-movie" :class="$style.placeholderIcon"></i>
				<div>精选作品加载中...</div>
			</div>
		</div>
	</div>
</PageWithAnimBg>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import * as Misskey from 'misskey-js';
import PageWithAnimBg from '@/components/global/PageWithAnimBg.vue';
import MkSignin from '@/components/MkSignin.vue';
import cgvmisvg from '/client-assets/cgvmi.svg';
import { misskeyApiGet } from '@/utility/misskey-api.js';

const videoNote = ref<Misskey.entities.Note | null>(null);
const videoEl = ref<HTMLVideoElement>();
const isPlaying = ref(false);

const videoUrl = computed(() => {
	return videoNote.value?.files?.find(f => f.type.startsWith('video/'))?.url ?? '';
});

const videoThumb = computed(() => {
	return videoNote.value?.files?.find(f => f.type.startsWith('video/'))?.thumbnailUrl ?? undefined;
});

function togglePlay() {
	if (!videoEl.value) return;
	if (videoEl.value.paused) {
		videoEl.value.play();
		isPlaying.value = true;
	} else {
		videoEl.value.pause();
		isPlaying.value = false;
	}
}

function formatCount(count: number | undefined): string {
	if (!count) return '0';
	if (count >= 10000) return (count / 10000).toFixed(1) + 'w';
	if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
	return String(count);
}

// 获取精选视频帖子
onMounted(async () => {
	try {
		const notes = await misskeyApiGet('notes/featured', { limit: 10 });
		const videoNotes = notes.filter((n: Misskey.entities.Note) =>
			n.files?.some(f => f.type.startsWith('video/')),
		);
		if (videoNotes.length > 0) {
			videoNote.value = videoNotes[0];
			// 自动播放
			setTimeout(() => {
				if (videoEl.value) {
					videoEl.value.play().then(() => {
						isPlaying.value = true;
					}).catch(() => {});
				}
			}, 500);
		}
	} catch (e) {
		console.error('Failed to load featured video:', e);
	}
});

onUnmounted(() => {
	if (videoEl.value) {
		videoEl.value.pause();
	}
});
</script>

<style lang="scss" module>
.layout {
	display: flex;
	width: 100%;
	min-height: 100svh;
	box-sizing: border-box;
}

/* 左侧：登录区 */
.left {
	flex: 0 0 45%;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 32px;
	min-width: 0;
}

.form {
	position: relative;
	z-index: 10;
	border-radius: var(--MI-radius);
	box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
	overflow: clip;
	width: 100%;
	max-width: 420px;
}

.title {
	position: absolute;
	top: 16px;
	left: 0;
	right: 0;
	z-index: 1;
	margin: 0;
	text-align: center;
	padding: 32px;
}

.logo {
	width: 48px;
	margin-bottom: 8px;
}

.slogan {
	font-size: 14px;
	font-weight: 500;
	color: #fff;
	opacity: 0.8;
	text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3);
	letter-spacing: 0.5px;
}

.body {
	padding: 16px 32px 32px 32px;
}

/* 右侧：视频展示区 */
.right {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 32px 32px 32px 0;
	min-width: 0;
}

.videoBox {
	position: relative;
	width: 100%;
	max-width: 340px;
	aspect-ratio: 9 / 16;
	border-radius: 16px;
	overflow: hidden;
	background: #000;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.video {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

/* 播放图标 */
.playIcon {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 56px;
	height: 56px;
	background: rgba(0, 0, 0, 0.4);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: background 0.2s;
	color: #fff;
	font-size: 20px;

	&:hover {
		background: rgba(0, 0, 0, 0.6);
	}
}

/* 底部视频信息叠加 */
.videoInfo {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 40px 14px 14px;
	background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
}

.videoAuthor {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 6px;
}

.avatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	border: 1.5px solid rgba(255, 255, 255, 0.8);
}

.username {
	font-size: 13px;
	font-weight: 600;
	color: #fff;
}

.videoText {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.85);
	line-height: 1.4;
	margin-bottom: 6px;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.videoStats {
	display: flex;
	gap: 14px;
	font-size: 12px;
	color: rgba(255, 255, 255, 0.7);

	i {
		margin-right: 3px;
	}
}

/* 无视频占位 */
.videoPlaceholder {
	width: 100%;
	max-width: 340px;
	aspect-ratio: 9 / 16;
	border-radius: 16px;
	background: color-mix(in srgb, var(--MI_THEME-panel) 80%, transparent);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 14px;
}

.placeholderIcon {
	font-size: 36px;
	opacity: 0.5;
}

/* 响应式：移动端上下布局 */
@media (max-width: 900px) {
	.layout {
		flex-direction: column;
	}

	.left {
		flex: none;
		padding: 24px 20px;
	}

	.right {
		padding: 0 20px 32px;
		justify-content: center;
	}

	.videoBox {
		max-width: 260px;
	}
}
</style>
