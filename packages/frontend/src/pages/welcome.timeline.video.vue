<!--
  CG微米 - 欢迎页视频播放器（弹窗卡片式，上下刷）
-->
<template>
<div :class="[$style.root, isVertical && $style.vertical]">
	<div :class="[$style.player, isVertical && $style.playerVertical]">
		<!-- 切换按钮 -->
		<button :class="$style.toggleBtn" @click="isVertical = !isVertical" :title="isVertical ? '切换横屏' : '切换竖屏'">
			<i :class="isVertical ? 'ti ti-device-desktop' : 'ti ti-device-mobile'"></i>
		</button>

		<!-- 视频区 -->
		<div :class="[$style.videoArea, isVertical && $style.videoAreaVertical]">
			<video
				v-if="currentVideo"
				ref="videoEl"
				:src="currentVideo.files[0].url"
				:class="$style.video"
				playsinline
				controls
				preload="metadata"
			/>
			<div v-else :class="$style.placeholder">
				<i class="ti ti-movie-off"></i>
				<p>暂无视频</p>
			</div>
		</div>

		<!-- 底部信息 -->
		<div v-if="currentNote" :class="$style.info">
			<div :class="$style.author">
				<img v-if="currentNote.user?.avatarUrl" :src="currentNote.user.avatarUrl" :class="$style.avatar"/>
				<span :class="$style.name">@{{ currentNote.user?.username }}</span>
			</div>
			<div v-if="currentNote.text" :class="$style.text">{{ truncateText(currentNote.text, 60) }}</div>
		</div>

		<!-- 上下翻页按钮 -->
		<div :class="$style.nav">
			<button :class="$style.navBtn" :disabled="currentIndex <= 0" @click="prev">
				<i class="ti ti-chevron-up"></i>
			</button>
			<span :class="$style.counter">{{ currentIndex + 1 }} / {{ notes.length }}</span>
			<button :class="$style.navBtn" :disabled="currentIndex >= notes.length - 1" @click="next">
				<i class="ti ti-chevron-down"></i>
			</button>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch, useTemplateRef } from 'vue';
import * as Misskey from 'misskey-js';
import { misskeyApiGet } from '@/utility/misskey-api.js';

const notes = ref<Misskey.entities.Note[]>([]);
const currentIndex = ref(0);
const isVertical = ref(false);
const videoEl = useTemplateRef('videoEl');

const currentNote = computed(() => notes.value[currentIndex.value] || null);
const currentVideo = computed(() => {
	const note = currentNote.value;
	return note?.files?.find(f => f.type.startsWith('video/')) ? note : null;
});

function truncateText(text: string, max: number): string {
	return text.length > max ? text.substring(0, max) + '...' : text;
}

function prev() {
	if (currentIndex.value > 0) {
		currentIndex.value--;
	}
}

function next() {
	if (currentIndex.value < notes.value.length - 1) {
		currentIndex.value++;
	}
}

// 键盘控制
function onKeydown(e: KeyboardEvent) {
	if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); prev(); }
	if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); next(); }
}

// 切换视频时自动播放
watch(currentIndex, () => {
	setTimeout(() => {
		videoEl.value?.play().catch(() => {});
	}, 100);
});

onMounted(async () => {
	try {
		// 拉热门视频 + 最新带文件的帖子
		const [featured, recent] = await Promise.all([
			misskeyApiGet('notes/featured', { limit: 20, fileType: 'video/' }).catch(() => []),
			misskeyApiGet('notes/local-timeline', { limit: 50, withFiles: true }).catch(() => []),
		]);

		// 合并去重，只保留有视频的帖子（热门优先）
		const seen = new Set<string>();
		const all = [...featured, ...recent].filter(n => {
			if (seen.has(n.id)) return false;
			if (!n.files?.some((f: any) => f.type.startsWith('video/'))) return false;
			seen.add(n.id);
			return true;
		});

		notes.value = all;
	} catch (e) {
		console.error('Failed to load videos:', e);
	}
	window.addEventListener('keydown', onKeydown);
});
</script>

<style module>
.root {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.root.vertical {
	align-items: center;
}

.player {
	width: 100%;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	overflow: hidden;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	position: relative;
}

.playerVertical {
	width: 420px;
	margin: 0 auto;
	border-radius: 16px;
}

.toggleBtn {
	position: absolute;
	top: 8px;
	right: 8px;
	z-index: 10;
	background: rgba(0, 0, 0, 0.5);
	border: none;
	border-radius: 6px;
	color: #fff;
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	font-size: 16px;
	opacity: 0.7;
	transition: opacity 0.2s;
}

.toggleBtn:hover {
	opacity: 1;
}

.videoArea {
	width: 100%;
	aspect-ratio: 16 / 9;
	background: #000;
	position: relative;
	overflow: hidden;
}

.videoAreaVertical {
	aspect-ratio: 9 / 16;
}

.video {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: #fff;
	opacity: 0.5;
}

.placeholder i {
	font-size: 40px;
	margin-bottom: 8px;
}

.info {
	padding: 12px;
}

.author {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 6px;
}

.avatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
}

.name {
	font-size: 13px;
	font-weight: 600;
	color: var(--MI_THEME-fg);
}

.text {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	line-height: 1.4;
}

.nav {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16px;
	padding: 8px 12px 12px;
}

.navBtn {
	background: var(--MI_THEME-buttonBg);
	border: none;
	border-radius: 50%;
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	color: var(--MI_THEME-fg);
	font-size: 16px;
}

.navBtn:disabled {
	opacity: 0.3;
	cursor: not-allowed;
}

.navBtn:hover:not(:disabled) {
	background: var(--MI_THEME-buttonHoverBg);
}

.counter {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
}
</style>
