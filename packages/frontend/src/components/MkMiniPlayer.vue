<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<!--
  MkMiniPlayer - 悬浮小窗播放器
  可拖拽，带关闭/播放暂停控件
-->
<template>
<Teleport to="body">
	<div
		v-if="visible"
		ref="playerEl"
		:class="$style.player"
		:style="playerStyle"
	>
		<video
			ref="videoEl"
			:class="$style.video"
			:src="src"
			:poster="poster"
			playsinline
			loop
			preload="auto"
			@loadedmetadata="onLoadedMetadata"
			@timeupdate="onTimeUpdate"
			@click="togglePlay"
		></video>

		<!-- 顶部信息栏 — 可拖拽区域 -->
		<div
			:class="$style.topBar"
			@mousedown.stop.prevent="onDragStart"
			@touchstart.stop.prevent="onDragStart"
		>
			<span :class="$style.username">@{{ username }}</span>
			<button class="_button" :class="$style.closeBtn" @click.stop="$emit('close')">
				<i class="ti ti-x"></i>
			</button>
		</div>

		<!-- 底部控制栏 -->
		<div :class="$style.bottomBar">
			<button class="_button" :class="$style.ctrlBtn" @click.stop="$emit('restore')">
				<i class="ti ti-maximize"></i>
			</button>
			<button class="_button" :class="$style.ctrlBtn" @click.stop="togglePlay">
				<i :class="isPlaying ? 'ti ti-player-pause-filled' : 'ti ti-player-play-filled'"></i>
			</button>
			<span :class="$style.time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
		</div>
	</div>
</Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';

const props = withDefaults(defineProps<{
	visible: boolean;
	src: string;
	poster?: string;
	username?: string;
	startTime?: number;
	startPaused?: boolean;
	muted?: boolean;
}>(), {
	muted: true,
});

const emit = defineEmits<{
	(event: 'close'): void;
	(event: 'restore'): void;
	(event: 'timeUpdate', time: number): void;
	(event: 'paused'): void;
	(event: 'playing'): void;
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
const playerEl = ref<HTMLElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);

// 拖拽状态
const posX = ref(window.innerWidth - 260);
const posY = ref(window.innerHeight - 230);
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;

const playerStyle = computed(() => ({
	left: `${posX.value}px`,
	top: `${posY.value}px`,
}));

// 可见性变化时同步播放状态
watch(() => props.visible, async (visible) => {
	if (visible) {
		await nextTick();
		const video = videoEl.value;
		if (!video) return;

		if (props.startTime != null && isFinite(props.startTime)) {
			video.currentTime = props.startTime;
		}

		video.muted = props.muted;
		if (props.startPaused) {
			video.pause();
			isPlaying.value = false;
		} else {
			video.play().then(() => {
				isPlaying.value = true;
			}).catch(() => {
				isPlaying.value = false;
			});
		}
	} else {
		const video = videoEl.value;
		if (video) {
			video.pause();
			isPlaying.value = false;
		}
	}
});

function onLoadedMetadata() {
	const video = videoEl.value;
	if (video) {
		duration.value = video.duration;
	}
}

function onTimeUpdate() {
	const video = videoEl.value;
	if (video) {
		currentTime.value = video.currentTime;
		emit('timeUpdate', video.currentTime);
	}
}

function togglePlay() {
	const video = videoEl.value;
	if (!video) return;

	if (video.paused) {
		video.play().then(() => {
			isPlaying.value = true;
			emit('playing');
		}).catch(() => {});
	} else {
		video.pause();
		isPlaying.value = false;
		emit('paused');
	}
}

// 拖拽逻辑
function onDragStart(ev: MouseEvent | TouchEvent) {
	isDragging = true;

	const clientX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
	const clientY = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;

	dragStartX = clientX;
	dragStartY = clientY;
	dragOffsetX = posX.value;
	dragOffsetY = posY.value;

	window.document.addEventListener('mousemove', onDragMove);
	window.document.addEventListener('mouseup', onDragEnd);
	window.document.addEventListener('touchmove', onDragMove, { passive: false });
	window.document.addEventListener('touchend', onDragEnd);
}

function onDragMove(ev: MouseEvent | TouchEvent) {
	if (!isDragging) return;
	ev.preventDefault();

	const clientX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
	const clientY = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;

	posX.value = Math.max(0, Math.min(window.innerWidth - 240, dragOffsetX + (clientX - dragStartX)));
	posY.value = Math.max(0, Math.min(window.innerHeight - 180, dragOffsetY + (clientY - dragStartY)));
}

function onDragEnd() {
	isDragging = false;
	window.document.removeEventListener('mousemove', onDragMove);
	window.document.removeEventListener('mouseup', onDragEnd);
	window.document.removeEventListener('touchmove', onDragMove);
	window.document.removeEventListener('touchend', onDragEnd);
}

function formatTime(seconds: number): string {
	if (!isFinite(seconds)) return '0:00';
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

// 暴露方法给父组件
function getCurrentTime(): number {
	return videoEl.value?.currentTime ?? 0;
}

function getPaused(): boolean {
	return videoEl.value?.paused ?? true;
}

defineExpose({ getCurrentTime, getPaused });

onUnmounted(() => {
	window.document.removeEventListener('mousemove', onDragMove);
	window.document.removeEventListener('mouseup', onDragEnd);
	window.document.removeEventListener('touchmove', onDragMove);
	window.document.removeEventListener('touchend', onDragEnd);
});
</script>

<style lang="scss" module>
.player {
	position: fixed;
	z-index: 100000;
	width: 240px;
	height: 180px;
	border-radius: 12px;
	overflow: hidden;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	background: #000;
	cursor: default;
	user-select: none;
	-webkit-user-select: none;
}

.video {
	width: 100%;
	height: 100%;
	object-fit: contain;
	cursor: pointer;
}

.topBar {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 4px 8px;
	background: linear-gradient(rgba(0, 0, 0, 0.6), transparent);
	cursor: grab;
	z-index: 1;

	&:active {
		cursor: grabbing;
	}
}

.username {
	font-size: 11px;
	font-weight: 600;
	color: #fff;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 160px;
}

.closeBtn {
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	color: #fff;
	font-size: 14px;
	background: rgba(0, 0, 0, 0.4);
	transition: background 0.15s;

	&:hover {
		background: rgba(255, 0, 0, 0.6);
	}
}

.bottomBar {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 4px 8px;
	background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
	z-index: 1;
}

.ctrlBtn {
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 6px;
	color: #fff;
	font-size: 16px;
	transition: background 0.15s;

	&:hover {
		background: rgba(255, 255, 255, 0.2);
	}
}

.time {
	font-size: 10px;
	color: rgba(255, 255, 255, 0.8);
	margin-left: auto;
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
}
</style>
