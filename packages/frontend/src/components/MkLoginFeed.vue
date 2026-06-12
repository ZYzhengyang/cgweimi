<template>
	<div :class="$style.root">
		<div
			v-for="note in notes"
			:key="note.id"
			:class="$style.item"
			@click="openNote(note)"
		>
			<!-- 媒体内容 -->
			<div :class="$style.media">
				<!-- 视频 -->
				<video
					v-if="isVideo(note)"
					ref="videoRefs"
					:src="getMediaUrl(note)"
					:class="$style.video"
					muted
					loop
					playsinline
					@mouseenter="playVideo"
					@mouseleave="pauseVideo"
				/>
				<!-- 图片 -->
				<img
					v-else-if="isImage(note)"
					:src="getMediaUrl(note)"
					:class="$style.image"
					:alt="note.text || '作品'"
				/>
				<!-- 纯文字 -->
				<div v-else :class="$style.textOnly">
					<p>{{ note.text }}</p>
				</div>
			</div>

			<!-- 作者信息 -->
			<div :class="$style.author">
				<img
					v-if="note.user"
					:src="note.user.avatarUrl"
					:class="$style.avatar"
					:alt="note.user.name"
				/>
				<div :class="$style.authorInfo">
					<span :class="$style.name">{{ note.user?.name || '匿名用户' }}</span>
					<span :class="$style.username">@{{ note.user?.username }}</span>
				</div>
			</div>

			<!-- 帖子文字 -->
			<p v-if="note.text" :class="$style.text">{{ truncateText(note.text, 50) }}</p>

			<!-- 互动数据 -->
			<div :class="$style.stats">
				<span :class="$style.stat">
					<svg viewBox="0 0 16 16" :class="$style.icon">
						<path d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z" fill="currentColor"/>
					</svg>
					{{ note.reactionCount || 0 }}
				</span>
				<span :class="$style.stat">
					<svg viewBox="0 0 16 16" :class="$style.icon">
						<path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.437 10.437 0 0 1-.71 1.222z" fill="currentColor"/>
					</svg>
					{{ note.repliesCount || 0 }}
				</span>
			</div>
		</div>

		<!-- 加载更多 -->
		<div v-if="loading" :class="$style.loading">
			<MkLoading :inline="true"/>
		</div>
		<div v-else-if="hasMore" ref="loadMoreRef" :class="$style.loadMore">
			<span @click="fetchNotes">加载更多</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Note {
	id: string;
	text?: string;
	files?: Array<{
		type: string;
		url: string;
		name: string;
	}>;
	user?: {
		id: string;
		name: string;
		username: string;
		avatarUrl: string;
	};
	reactionCount?: number;
	repliesCount?: number;
	createdAt: string;
}

const notes = ref<Note[]>([]);
const loading = ref(false);
const hasMore = ref(true);
const videoRefs = ref<HTMLVideoElement[]>([]);
const loadMoreRef = ref<HTMLElement>();

// 获取帖子（使用公开API，不需要登录）
async function fetchNotes() {
	if (loading.value) return;
	loading.value = true;

	try {
		// 优先尝试 featured（热门笔记，公开接口）
		const response = await fetch('/api/notes/featured', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ limit: 20, offset: notes.value.length }),
		});

		if (response.ok) {
			const data = await response.json();
			notes.value = [...notes.value, ...data];
			if (data.length < 20) hasMore.value = false;
		} else {
			// 降级到 local-timeline
			const resp2 = await fetch('/api/notes/local-timeline', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ limit: 20 }),
			});
			if (resp2.ok) {
				const data2 = await resp2.json();
				notes.value = [...notes.value, ...data2];
				if (data2.length < 20) hasMore.value = false;
			}
		}
	} catch (error) {
		console.error('获取帖子失败:', error);
	} finally {
		loading.value = false;
	}
}

// 判断是否为视频
function isVideo(note: Note): boolean {
	return note.files?.some(f => f.type.startsWith('video/')) || false;
}

// 判断是否为图片
function isImage(note: Note): boolean {
	return note.files?.some(f => f.type.startsWith('image/')) || false;
}

// 获取媒体URL
function getMediaUrl(note: Note): string {
	if (note.files && note.files.length > 0) {
		return note.files[0].url;
	}
	return '';
}

// 播放视频
function playVideo(event: MouseEvent) {
	const video = event.target as HTMLVideoElement;
	video.play().catch(() => {});
}

// 暂停视频
function pauseVideo(event: MouseEvent) {
	const video = event.target as HTMLVideoElement;
	video.pause();
	video.currentTime = 0;
}

// 截断文字
function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength) + '...';
}

// 打开帖子详情
function openNote(note: Note) {
	// 可以实现弹窗详情，暂时跳转到帖子页面
	window.open(`/notes/${note.id}`, '_blank');
}

// Intersection Observer 用于无限滚动
let observer: IntersectionObserver | null = null;

onMounted(() => {
	fetchNotes();

	// 设置无限滚动
	observer = new IntersectionObserver(
		(entries) => {
			if (entries[0].isIntersecting && hasMore.value && !loading.value) {
				fetchNotes();
			}
		},
		{ threshold: 0.1 }
	);

	if (loadMoreRef.value) {
		observer.observe(loadMoreRef.value);
	}
});

onUnmounted(() => {
	if (observer) {
		observer.disconnect();
	}
});
</script>

<style module>
.root {
	display: flex;
	flex-direction: column;
	gap: 16px;
	height: 100%;
	overflow-y: auto;
	scroll-snap-type: y mandatory;
	padding: 16px;
	scrollbar-width: thin;
	scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.root::-webkit-scrollbar {
	width: 6px;
}

.root::-webkit-scrollbar-track {
	background: transparent;
}

.root::-webkit-scrollbar-thumb {
	background-color: rgba(255, 255, 255, 0.3);
	border-radius: 3px;
}

.item {
	scroll-snap-align: start;
	background: rgba(255, 255, 255, 0.05);
	border-radius: 12px;
	overflow: hidden;
	cursor: pointer;
	transition: transform 0.2s, background 0.2s;
}

.item:hover {
	transform: scale(1.02);
	background: rgba(255, 255, 255, 0.1);
}

.media {
	width: 100%;
	aspect-ratio: 4/3;
	overflow: hidden;
	background: #1a1a2e;
}

.video,
.image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.textOnly {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px;
	min-height: 150px;
}

.textOnly p {
	color: #fff;
	font-size: 16px;
	text-align: center;
}

.author {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 12px 16px 8px;
}

.avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	object-fit: cover;
}

.authorInfo {
	display: flex;
	flex-direction: column;
}

.name {
	color: #fff;
	font-size: 14px;
	font-weight: 600;
}

.username {
	color: rgba(255, 255, 255, 0.5);
	font-size: 12px;
}

.text {
	padding: 0 16px 8px;
	color: rgba(255, 255, 255, 0.8);
	font-size: 14px;
	line-height: 1.4;
	margin: 0;
}

.stats {
	display: flex;
	gap: 16px;
	padding: 8px 16px 12px;
}

.stat {
	display: flex;
	align-items: center;
	gap: 4px;
	color: rgba(255, 255, 255, 0.5);
	font-size: 12px;
}

.icon {
	width: 14px;
	height: 14px;
}

.loading,
.loadMore {
	display: flex;
	justify-content: center;
	padding: 20px;
	color: rgba(255, 255, 255, 0.5);
	font-size: 14px;
}

.loadMore span {
	cursor: pointer;
	transition: color 0.2s;
}

.loadMore span:hover {
	color: #fff;
}
</style>
