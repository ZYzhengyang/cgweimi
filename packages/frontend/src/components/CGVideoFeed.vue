<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
CG微米 (CGVMI) - 刷视频组件
自定义播放器：点击播放/暂停、双击点赞、进度条、自动播放
-->

<template>
<div :class="$style.root">
	<div ref="videoContainerEl" :class="$style.container" @scroll="onScroll">
		<div v-for="(note, index) in videoNotes" :key="note.id" :class="$style.videoItem" :data-index="index">
			<div :class="$style.videoWrapper">
				<video
					:ref="(el) => setVideoRef(index, el)"
					:src="getVideoUrl(note)"
					:poster="getVideoThumb(note)"
					:class="$style.video"
					playsinline
					loop
					preload="metadata"
					@click="onVideoClick(index)"
					@dblclick.prevent="onDoubleTap(note, index)"
					@timeupdate="onTimeUpdate(index)"
					@loadedmetadata="onMetadataLoaded(index)"
				/>

				<!-- 播放/暂停动画 -->
				<div v-if="showPlayIcon[index]" :class="$style.playPauseIcon">
					<i :class="isPlaying[index] ? 'ti ti-player-pause-filled' : 'ti ti-player-play-filled'"></i>
				</div>

				<!-- 双击爱心 -->
				<div v-if="showHeart[index]" :class="$style.heartAnim">
					<i class="ti ti-heart-filled"></i>
				</div>

				<!-- 底部进度条 -->
				<div :class="$style.progressBar" @click.stop="seekTo(index, $event)">
					<div :class="$style.progressTrack">
						<div :class="$style.progressFill" :style="{ width: (progress[index] || 0) + '%' }"></div>
					</div>
				</div>

				<!-- 底部信息 -->
				<div :class="$style.videoOverlay">
					<div :class="$style.userInfo">
						<MkAvatar :user="note.user" :class="$style.avatar"/>
						<span :class="$style.username">@{{ note.user.username }}</span>
					</div>
					<div v-if="note.text" :class="$style.caption" @click.stop="openNote(note)">
						{{ truncateText(note.text, 80) }}
					</div>
				</div>

				<!-- 右侧按钮 -->
				<div :class="$style.actions">
					<button class="_button" :class="$style.actionButton" @click.stop="toggleLike(note)">
						<i :class="note.myReaction ? 'ti ti-heart-filled' : 'ti ti-heart'" :style="note.myReaction ? 'color: #ff2d55' : ''"></i>
						<span>{{ note.reactionCount || 0 }}</span>
					</button>
					<button class="_button" :class="$style.actionButton" @click.stop="openNote(note)">
						<i class="ti ti-message-circle"></i>
						<span>{{ note.repliesCount || 0 }}</span>
					</button>
					<button class="_button" :class="$style.actionButton" @click.stop="shareNote(note)">
						<i class="ti ti-share"></i>
					</button>
				</div>
			</div>
		</div>

		<div v-if="loading" :class="$style.loading"><MkLoading/></div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, useTemplateRef } from 'vue';
import * as Misskey from 'misskey-js';
import MkAvatar from '@/components/global/MkAvatar.vue';
import { misskeyApiGet, misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { popup, toast } from '@/os.js';
import MkNotePopup from '@/components/MkNotePopup.vue';

const props = withDefaults(defineProps<{
	startNote?: Misskey.entities.Note | null;
	notes?: Misskey.entities.Note[];
}>(), {
	startNote: null,
	notes: () => [],
});

const videoNotes = ref<Misskey.entities.Note[]>([]);
const loading = ref(false);
const hasMore = ref(true);
const videoContainerEl = useTemplateRef('videoContainerEl');
const videoRefs = new Map<number, HTMLVideoElement>();
const isPlaying = reactive<Record<number, boolean>>({});
const showPlayIcon = reactive<Record<number, boolean>>({});
const showHeart = reactive<Record<number, boolean>>({});
const progress = reactive<Record<number, number>>({});
let observer: IntersectionObserver | null = null;
let clickTimer: ReturnType<typeof setTimeout> | null = null;

function setVideoRef(index: number, el: any) {
	if (el) videoRefs.set(index, el as HTMLVideoElement);
}
function getVideoUrl(note: Misskey.entities.Note): string {
	return note.files?.find(f => f.type.startsWith('video/'))?.url || '';
}
function getVideoThumb(note: Misskey.entities.Note): string {
	return note.files?.find(f => f.type.startsWith('video/'))?.thumbnailUrl || '';
}
function truncateText(text: string, max: number): string {
	return text.length > max ? text.substring(0, max) + '...' : text;
}

// 单击播放/暂停（延迟以区分双击）
function onVideoClick(index: number) {
	if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
	clickTimer = setTimeout(() => togglePlay(index), 250);
}

function togglePlay(index: number) {
	const video = videoRefs.get(index);
	if (!video) return;
	if (video.paused) {
		video.play().catch(() => {});
		isPlaying[index] = true;
	} else {
		video.pause();
		isPlaying[index] = false;
	}
	showPlayIcon[index] = true;
	setTimeout(() => { showPlayIcon[index] = false; }, 500);
}

// 双击点赞
function onDoubleTap(note: Misskey.entities.Note, index: number) {
	if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
	showHeart[index] = true;
	setTimeout(() => { showHeart[index] = false; }, 800);
	if (!note.myReaction) toggleLike(note);
}

function onTimeUpdate(index: number) {
	const video = videoRefs.get(index);
	if (!video?.duration) return;
	progress[index] = (video.currentTime / video.duration) * 100;
}
function onMetadataLoaded(index: number) { progress[index] = 0; }

function seekTo(index: number, ev: MouseEvent) {
	const video = videoRefs.get(index);
	if (!video?.duration) return;
	const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
	video.currentTime = ((ev.clientX - rect.left) / rect.width) * video.duration;
}

function openNote(note: Misskey.entities.Note) {
	popup(MkNotePopup, { note }, { closed: () => {} });
}
function shareNote(note: Misskey.entities.Note) {
	navigator.clipboard.writeText(`https://www.cgvmi.com/notes/${note.id}`);
	toast('链接已复制');
}
async function toggleLike(note: Misskey.entities.Note) {
	if (!$i) return;
	try {
		if (note.myReaction) {
			await misskeyApi('notes/reactions/delete', { noteId: note.id });
			note.myReaction = null;
			note.reactionCount = (note.reactionCount || 1) - 1;
		} else {
			await misskeyApi('notes/reactions/create', { noteId: note.id, reaction: '❤️' });
			note.myReaction = '❤️';
			note.reactionCount = (note.reactionCount || 0) + 1;
		}
	} catch (err) { console.error('Failed to toggle reaction:', err); }
}

async function fetchVideoNotes(untilId?: string) {
	if (loading.value || !hasMore.value) return;
	loading.value = true;
	try {
		const [featured, recent] = await Promise.all([
			misskeyApiGet('notes/featured', { limit: 20, fileType: 'video/', untilId }).catch(() => []),
			misskeyApiGet('notes/local-timeline', { limit: 30, withFiles: true, untilId }).catch(() => []),
		]);
		const seen = new Set(videoNotes.value.map(n => n.id));
		const all = [...featured, ...recent].filter(n => {
			if (seen.has(n.id)) return false;
			if (!n.files?.some((f: any) => f.type.startsWith('video/'))) return false;
			seen.add(n.id);
			return true;
		});
		if (all.length === 0) hasMore.value = false;
		else videoNotes.value.push(...all);
	} catch (err) { console.error('Failed to fetch video notes:', err); }
	loading.value = false;
}

function onScroll() {
	if (!videoContainerEl.value) return;
	const { scrollTop, scrollHeight, clientHeight } = videoContainerEl.value;
	if (scrollHeight - scrollTop - clientHeight < 300) {
		const lastNote = videoNotes.value[videoNotes.value.length - 1];
		if (lastNote) fetchVideoNotes(lastNote.id);
	}
}

function setupAutoPlay() {
	observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			const index = parseInt(entry.target.getAttribute('data-index') || '0');
			const video = videoRefs.get(index);
			if (!video) return;
			if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
				video.play().catch(() => {});
				isPlaying[index] = true;
			} else {
				video.pause();
				isPlaying[index] = false;
			}
		});
	}, { threshold: [0.6] });

	nextTick(() => {
		videoContainerEl.value?.querySelectorAll('[data-index]')
			.forEach(item => observer?.observe(item));
	});
}

onMounted(() => {
	if (props.notes.length > 0) videoNotes.value = props.notes;
	else fetchVideoNotes();
	setupAutoPlay();
});

onUnmounted(() => {
	observer?.disconnect();
	videoRefs.forEach(v => v.pause());
});
</script>

<style lang="scss" module>
.root {
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.container {
	width: 100%;
	height: 100%;
	overflow-y: auto;
	scroll-snap-type: y mandatory;
	scroll-behavior: smooth;
	&::-webkit-scrollbar { display: none; }
}

.videoItem {
	width: 100%;
	height: 100%;
	scroll-snap-align: start;
	position: relative;
}

.videoWrapper {
	width: 100%;
	height: 100%;
	position: relative;
	background: #000;
	overflow: hidden;
}

.video {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

/* 播放/暂停图标 */
.playPauseIcon {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	font-size: 64px;
	color: rgba(255, 255, 255, 0.8);
	pointer-events: none;
	animation: fadeOut 0.5s ease forwards;
}

/* 双击爱心 */
.heartAnim {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	font-size: 80px;
	color: #ff2d55;
	pointer-events: none;
	animation: heartPop 0.8s ease forwards;
}

@keyframes fadeOut {
	0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
	100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }
}

@keyframes heartPop {
	0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
	15% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
	30% { transform: translate(-50%, -50%) scale(0.95); }
	45% { transform: translate(-50%, -50%) scale(1); }
	80% { opacity: 1; }
	100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
}

/* 进度条 */
.progressBar {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 15;
	padding: 12px 16px 8px;
	cursor: pointer;
}

.progressTrack {
	width: 100%;
	height: 3px;
	background: rgba(255, 255, 255, 0.3);
	border-radius: 2px;
	overflow: hidden;
}

.progressFill {
	height: 100%;
	background: #fff;
	border-radius: 2px;
	transition: width 0.1s linear;
}

/* 底部信息 */
.videoOverlay {
	position: absolute;
	bottom: 32px;
	left: 16px;
	right: 80px;
	z-index: 10;
	pointer-events: none;
	& > * { pointer-events: auto; }
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
	border: 2px solid #fff;
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
	cursor: pointer;
}

/* 右侧按钮 */
.actions {
	position: absolute;
	right: 12px;
	bottom: 120px;
	z-index: 10;
	display: flex;
	flex-direction: column;
	gap: 20px;
	align-items: center;
}

.actionButton {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	color: #fff;
	font-size: 26px;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	transition: transform 0.2s;
	span { font-size: 11px; font-weight: 500; }
	&:active { transform: scale(0.85); }
}

.loading {
	display: flex;
	justify-content: center;
	padding: 24px;
}

/* 移动端适配 */
@media (max-width: 768px) {
	.avatar { width: 32px; height: 32px; }
	.username { font-size: 13px; }
	.caption { font-size: 12px; }
	.actionButton { font-size: 22px; }
	.actions { right: 8px; bottom: 100px; gap: 16px; }
	.videoOverlay { right: 60px; bottom: 24px; }
}
</style>
