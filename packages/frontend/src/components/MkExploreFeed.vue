<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<div ref="containerRef" :class="$style.root">
	<div
		v-for="(note, i) in notes"
		:key="note.id"
		:class="$style.slide"
		:ref="(el) => { if (el) slideRefs[i] = el as HTMLElement }"
	>
		<!-- 全屏背景媒体 -->
		<div :class="$style.media">
			<video
				v-if="isVideo(note)"
				:src="getMediaUrl(note)"
				:class="$style.video"
				muted
				loop
				playsinline
				:autoplay="i === currentIndex"
			/>
			<img
				v-else-if="isImage(note)"
				:src="getMediaUrl(note)"
				:class="$style.image"
				:alt="note.text || ''"
			/>
			<div v-else :class="$style.textBg">
				<p>{{ note.text }}</p>
			</div>
		</div>

		<!-- 底部信息叠加 -->
		<div :class="$style.overlay">
			<div :class="$style.author" v-if="note.user">
				<img
					v-if="note.user.avatarUrl"
					:src="note.user.avatarUrl"
					:class="$style.avatar"
				/>
				<div :class="$style.authorInfo">
					<span :class="$style.name">{{ note.user.name || note.user.username }}</span>
					<span :class="$style.username">@{{ note.user.username }}</span>
				</div>
			</div>
			<p v-if="note.text && hasMedia(note)" :class="$style.text">{{ truncate(note.text, 100) }}</p>
		</div>

		<!-- 右侧操作栏 -->
		<div :class="$style.actions">
			<button :class="$style.actionBtn" @click.stop="openNote(note)">
				<svg viewBox="0 0 24 24" :class="$style.actionIcon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
				<span>{{ note.repliesCount || 0 }}</span>
			</button>
		</div>

		<!-- 滚动指示 -->
		<div v-if="i < notes.length - 1" :class="$style.scrollHint">
			<span>↓</span>
		</div>
	</div>

	<!-- 加载更多 -->
	<div v-if="loading" :class="$style.loading"><MkLoading :inline="true"/></div>
	<div v-if="!loading && notes.length === 0" :class="$style.empty">
		<MkResult type="empty"/>
	</div>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

interface Note {
	id: string;
	text?: string;
	files?: Array<{ type: string; url: string; name: string }>;
	user?: { id: string; name: string; username: string; avatarUrl: string };
	reactionCount?: number;
	repliesCount?: number;
	createdAt: string;
}

const notes = ref<Note[]>([]);
const loading = ref(false);
const currentIndex = ref(0);
const containerRef = ref<HTMLElement>();
const slideRefs = ref<HTMLElement[]>([]);
let observer: IntersectionObserver | null = null;

async function fetchNotes() {
	if (loading.value) return;
	loading.value = true;
	try {
		const res = await fetch('/api/notes/featured', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ limit: 20, offset: notes.value.length }),
		});
		if (res.ok) {
			const data = await res.json();
			notes.value = [...notes.value, ...data];
		} else {
			// fallback
			const res2 = await fetch('/api/notes/local-timeline', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ limit: 20 }),
			});
			if (res2.ok) notes.value = [...notes.value, ...await res2.json()];
		}
	} catch (e) {
		console.error('加载失败:', e);
	} finally {
		loading.value = false;
	}
}

function isVideo(n: Note) { return n.files?.some(f => f.type.startsWith('video/')); }
function isImage(n: Note) { return n.files?.some(f => f.type.startsWith('image/')); }
function hasMedia(n: Note) { return (n.files?.length ?? 0) > 0; }
function getMediaUrl(n: Note) { return n.files?.[0]?.url ?? ''; }
function truncate(t: string, max: number) { return t.length > max ? t.slice(0, max) + '...' : t; }

function openNote(n: Note) { window.open(`/notes/${n.id}`, '_blank'); }

onMounted(() => {
	fetchNotes();

	// 观察当前可见的 slide
	observer = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				const idx = slideRefs.value.indexOf(entry.target as HTMLElement);
				if (idx >= 0) {
					currentIndex.value = idx;
					// 自动播放当前视频，暂停其他
					const videos = entry.target.querySelectorAll('video');
					videos.forEach(v => { if (entry.isIntersecting) v.play().catch(() => {}); });
				}
			} else {
				const videos = entry.target.querySelectorAll('video');
				videos.forEach(v => { v.pause(); v.currentTime = 0; });
			}
		}
		// 滚到底部加载更多
		const last = entries[entries.length - 1];
		if (last.isIntersecting && !loading.value) fetchNotes();
	}, { threshold: 0.6 });

	nextTick(() => {
		slideRefs.value.forEach(el => { if (el) observer!.observe(el); });
	});
});

onUnmounted(() => { observer?.disconnect(); });
</script>

<style lang="scss" module>
.root {
	height: 100vh;
	overflow-y: scroll;
	scroll-snap-type: y mandatory;
	background: #000;
}

.slide {
	position: relative;
	width: 100%;
	height: 100vh;
	scroll-snap-align: start;
	overflow: hidden;
}

.media {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #0a0a1a;
}

.video, .image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.textBg {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	padding: 40px;
	box-sizing: border-box;

	p {
		color: #fff;
		font-size: 24px;
		text-align: center;
		line-height: 1.6;
	}
}

.overlay {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 60px;
	padding: 24px;
	background: linear-gradient(transparent, rgba(0,0,0,0.8));
	z-index: 2;
}

.author {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 12px;
}

.avatar {
	width: 44px;
	height: 44px;
	border-radius: 50%;
	border: 2px solid #fff;
	object-fit: cover;
}

.authorInfo {
	display: flex;
	flex-direction: column;
}

.name {
	color: #fff;
	font-weight: 700;
	font-size: 16px;
}

.username {
	color: rgba(255,255,255,0.7);
	font-size: 13px;
}

.text {
	color: #fff;
	font-size: 15px;
	line-height: 1.5;
	margin: 0;
}

.actions {
	position: absolute;
	right: 12px;
	bottom: 120px;
	display: flex;
	flex-direction: column;
	gap: 20px;
	z-index: 3;
}

.actionBtn {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	background: none;
	border: none;
	cursor: pointer;
	color: #fff;
	padding: 8px;
	transition: transform 0.2s;

	&:hover {
		transform: scale(1.2);
	}

	span {
		font-size: 12px;
	}
}

.actionIcon {
	width: 32px;
	height: 32px;
	filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.scrollHint {
	position: absolute;
	bottom: 16px;
	left: 50%;
	transform: translateX(-50%);
	color: rgba(255,255,255,0.5);
	font-size: 20px;
	animation: bounce 1.5s infinite;
	z-index: 2;
}

@keyframes bounce {
	0%, 100% { transform: translateX(-50%) translateY(0); }
	50% { transform: translateX(-50%) translateY(-8px); }
}

.loading, .empty {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100vh;
	color: rgba(255,255,255,0.5);
	font-size: 16px;
}
</style>
