<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<!-- Swiper 垂直视频流 -->
	<Swiper
		direction="vertical"
		:slidesPerView="1"
		:spaceBetween="0"
		:speed="300"
		:keyboard="{ enabled: true }"
		:mousewheel="{ sensitivity: 1 }"
		:modules="[Mousewheel, Keyboard]"
		@swiper="onSwiper"
		@slideChange="onSlideChange"
	>
		<SwiperSlide v-for="(note, index) in notes" :key="note.id">
			<div :class="$style.slide">
				<div :class="$style.videoWrapper">
					<video
						:ref="(el: any) => setVideoRef(index, el)"
						:src="getVideoUrl(note)"
						:poster="getVideoThumb(note)"
						:class="$style.video"
						playsinline
						loop
						muted
						preload="metadata"
						@click="togglePlay(index)"
						@waiting="onWaiting(index)"
						@canplay="onCanplay(index)"
						@timeupdate="onTimeUpdate(index)"
					></video>

					<!-- Loading spinner -->
					<div v-if="buffering[index]" :class="$style.loadingSpinner">
						<i class="ti ti-loader-2" :class="$style.spinnerIcon"></i>
					</div>

					<!-- 底部进度条 -->
					<div :class="$style.progressBar" @click.stop="seekTo(index, $event)">
						<div :class="$style.progressTrack">
							<div :class="$style.progressFill" :style="{ width: (progress[index] || 0) + '%' }"></div>
						</div>
						<!-- 时间气泡 -->
						<div
							v-if="hoverTime[index] !== null"
							:class="$style.timeBubble"
							:style="{ left: hoverTimePos[index] + '%' }"
						>{{ formatTime(hoverTime[index]!) }}
						</div>
					</div>

					<!-- 底部作者信息 -->
					<div :class="$style.videoOverlay">
						<div :class="$style.userInfo">
							<img v-if="note.user?.avatarUrl" :src="note.user.avatarUrl" :class="$style.avatar" alt=""/>
							<span :class="$style.username">@{{ note.user?.username }}</span>
						</div>
						<div v-if="note.text" :class="$style.caption">{{ truncateText(note.text, 80) }}</div>
					</div>

					<!-- 右侧互动预览 -->
					<div :class="$style.actions">
						<div :class="$style.actionItem">
							<i class="ti ti-heart-filled" :class="$style.actionIcon"></i>
							<span :class="$style.actionCount">{{ formatCount(note.reactionCount) }}</span>
						</div>
						<div :class="$style.actionItem">
							<img v-if="note.user?.avatarUrl" :src="note.user.avatarUrl" :class="$style.actionAvatar" alt=""/>
						</div>
					</div>
				</div>
			</div>
		</SwiperSlide>
	</Swiper>

	<!-- 暂无视频提示 -->
	<div v-if="!loading && notes.length === 0" :class="$style.empty">
		<i class="ti ti-movie-off" :class="$style.emptyIcon"></i>
		<p>暂无视频</p>
	</div>

	<!-- 初始加载 -->
	<div v-if="loading" :class="$style.loadingOverlay">
		<i class="ti ti-loader-2" :class="$style.spinnerIcon"></i>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import * as Misskey from 'misskey-js';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { Mousewheel, Keyboard } from 'swiper/modules';
import type SwiperClass from 'swiper';
import 'swiper/css';
import 'swiper/css/mousewheel';
import { misskeyApiGet } from '@/utility/misskey-api.js';

const MAX_VIDEOS = 30;

const notes = ref<Misskey.entities.Note[]>([]);
const loading = ref(false);
const videoRefs = new Map<number, HTMLVideoElement>();
const isMuted = ref(true);
const progress = reactive<Record<number, number>>({});
const buffering = reactive<Record<number, boolean>>({});
const hoverTime = reactive<Record<number, number | null>>({});
const hoverTimePos = reactive<Record<number, number>>({});
let swiperInstance: SwiperClass | null = null;

function setVideoRef(index: number, el: any) {
	if (el) videoRefs.set(index, el as HTMLVideoElement);
}

function getVideoUrl(note: Misskey.entities.Note): string {
	return note.files?.find(f => f.type.startsWith('video/'))?.url ?? '';
}

function getVideoThumb(note: Misskey.entities.Note): string {
	return note.files?.find(f => f.type.startsWith('video/'))?.thumbnailUrl ?? '';
}

function truncateText(text: string, max: number): string {
	return text.length > max ? text.substring(0, max) + '...' : text;
}

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCount(count: number | undefined): string {
	if (!count) return '0';
	if (count >= 10000) return (count / 10000).toFixed(1) + 'w';
	if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
	return String(count);
}

// Swiper 事件
function onSwiper(swiper: SwiperClass) {
	swiperInstance = swiper;
	window.setTimeout(() => playVideo(0), 300);
}

function onSlideChange() {
	if (!swiperInstance) return;
	const newIndex = swiperInstance.activeIndex;
	// 暂停所有非当前视频
	videoRefs.forEach((video, idx) => {
		if (idx !== newIndex) {
			video.pause();
		}
	});
	playVideo(newIndex);
}

// 视频播放控制
function playVideo(index: number) {
	const video = videoRefs.get(index);
	if (video) {
		video.muted = isMuted.value;
		video.currentTime = 0;
		video.play().catch(() => {});
	}
}

function togglePlay(index: number) {
	const video = videoRefs.get(index);
	if (!video) return;
	if (video.paused) {
		video.play().catch(() => {});
	} else {
		video.pause();
	}
}

function onWaiting(index: number) {
	buffering[index] = true;
}

function onCanplay(index: number) {
	buffering[index] = false;
}

function onTimeUpdate(index: number) {
	const video = videoRefs.get(index);
	if (!video?.duration) return;
	progress[index] = (video.currentTime / video.duration) * 100;
}

function seekTo(index: number, ev: MouseEvent) {
	const video = videoRefs.get(index);
	if (!video?.duration) return;
	const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
	const pct = (ev.clientX - rect.left) / rect.width;
	video.currentTime = pct * video.duration;
	progress[index] = pct * 100;
}

// 键盘控制（Space 暂停、M 静音）
function onKeydown(event: KeyboardEvent) {
	if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
	const idx = swiperInstance?.activeIndex ?? 0;

	if (event.key === ' ' || event.code === 'Space') {
		event.preventDefault();
		togglePlay(idx);
	} else if (event.key === 'm' || event.key === 'M') {
		event.preventDefault();
		isMuted.value = !isMuted.value;
		const video = videoRefs.get(idx);
		if (video) video.muted = isMuted.value;
	}
}

// 数据加载
async function fetchVideoNotes() {
	if (loading.value) return;
	loading.value = true;
	try {
		const [featured, recent] = await Promise.all([
			misskeyApiGet('notes/featured', { limit: 20 }).catch(() => []),
			misskeyApiGet('notes/local-timeline', { limit: 50, withFiles: true }).catch(() => []),
		]);

		const seen = new Set<string>();
		const all = [...featured, ...recent].filter(n => {
			if (seen.has(n.id)) return false;
			if (!n.files?.some((f: any) => f.type.startsWith('video/'))) return false;
			seen.add(n.id);
			return true;
		}).slice(0, MAX_VIDEOS);

		notes.value = all;
	} catch (err) {
		console.error('Failed to load videos:', err);
	}
	loading.value = false;
}

onMounted(() => {
	fetchVideoNotes();
	window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
	window.removeEventListener('keydown', onKeydown);
	videoRefs.forEach(v => v.pause());
});
</script>

<style lang="scss" module>
.root {
	width: 100%;
	height: 100%;
	position: relative;
	background: #000;

	:global(.swiper) {
		width: 100%;
		height: 100%;
	}

	:global(.swiper-slide) {
		width: 100%;
		height: 100%;
	}
}

.slide {
	width: 100%;
	height: 100%;
	position: relative;
}

.videoWrapper {
	width: 100%;
	height: 100%;
	position: relative;
	background: #000;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
}

.video {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

/* Loading spinner */
.loadingSpinner {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 15;
}

.spinnerIcon {
	font-size: 36px;
	color: rgba(255, 255, 255, 0.8);
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* 进度条 */
.progressBar {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 15;
	padding: 8px 16px 6px;
	cursor: pointer;
}

.progressTrack {
	width: 100%;
	height: 2px;
	background: rgba(255, 255, 255, 0.3);
	border-radius: 2px;
	overflow: hidden;
	transition: height 0.15s ease;
}

.progressBar:hover .progressTrack {
	height: 4px;
}

.progressFill {
	height: 100%;
	background: #fff;
	border-radius: 2px;
	transition: width 0.1s linear;
}

.timeBubble {
	position: absolute;
	bottom: 20px;
	transform: translateX(-50%);
	background: rgba(0, 0, 0, 0.75);
	color: #fff;
	font-size: 11px;
	padding: 2px 6px;
	border-radius: 4px;
	white-space: nowrap;
	pointer-events: none;
}

/* 底部作者信息 */
.videoOverlay {
	position: absolute;
	bottom: 36px;
	left: 16px;
	right: 80px;
	z-index: 10;
	pointer-events: none;
}

.userInfo {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 8px;
}

.avatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	border: 2px solid rgba(255, 255, 255, 0.8);
}

.username {
	font-weight: 600;
	font-size: 14px;
	color: #fff;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.caption {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.9);
	line-height: 1.4;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* 右侧互动预览 */
.actions {
	position: absolute;
	right: 16px;
	bottom: 100px;
	z-index: 10;
	display: flex;
	flex-direction: column;
	gap: 20px;
	align-items: center;
}

.actionItem {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
}

.actionIcon {
	font-size: 28px;
	color: #fff;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.actionCount {
	font-size: 11px;
	font-weight: 600;
	color: #fff;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.actionAvatar {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	border: 2px solid #fff;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 空状态 */
.empty {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	text-align: center;
	color: rgba(255, 255, 255, 0.5);
	z-index: 5;
}

.emptyIcon {
	font-size: 48px;
	margin-bottom: 12px;
	display: block;
}

/* 加载层 */
.loadingOverlay {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 20;
}

@media (max-width: 768px) {
	.actions {
		right: 8px;
		bottom: 80px;
		gap: 16px;
	}

	.actionIcon {
		font-size: 22px;
	}

	.videoOverlay {
		right: 60px;
		bottom: 28px;
	}
}
</style>
