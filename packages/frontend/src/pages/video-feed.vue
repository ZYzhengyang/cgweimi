<!--
  CG微米 - 刷视频页面
  两层结构：浏览选内容 → 点击全屏沉浸播放
-->
<template>
<div :class="$style.root">
	<!-- 全屏播放模式 -->
	<div v-if="playingNote" :class="$style.playerMode">
		<button :class="$style.backBtn" class="_button" @click="playingNote = null">
			<i class="ti ti-arrow-left"></i> 返回
		</button>
		<CGVideoFeed :startNote="playingNote" :notes="filteredNotes"/>
	</div>

	<!-- 浏览模式 -->
	<div v-else :class="$style.browseMode">
		<!-- 分类标签 -->
		<div :class="$style.categories">
			<button
				v-for="cat in categories"
				:key="cat.key"
				class="_button"
				:class="[$style.catBtn, { [$style.catBtnActive]: activeCategory === cat.key }]"
				@click="activeCategory = cat.key"
			>
				<i :class="cat.icon"></i>
				{{ cat.label }}
			</button>
		</div>

		<!-- 视频卡片网格 -->
		<div :class="$style.grid">
			<div
				v-for="note in filteredNotes"
				:key="note.id"
				:class="$style.card"
				@click="playingNote = note"
			>
				<div :class="$style.cardThumb">
					<img
						v-if="getThumb(note)"
						:src="getThumb(note)"
						:class="$style.cardImg"
						loading="lazy"
					/>
					<div :class="$style.cardPlay">
						<i class="ti ti-player-play-filled"></i>
					</div>
					<div :class="$style.cardDuration" v-if="getDuration(note)">
						{{ getDuration(note) }}
					</div>
				</div>
				<div :class="$style.cardInfo">
					<div :class="$style.cardTitle">{{ getTitle(note) }}</div>
					<div :class="$style.cardAuthor">
						<img v-if="note.user?.avatarUrl" :src="note.user.avatarUrl" :class="$style.cardAuthorAvatar"/>
						<span>@{{ note.user?.username }}</span>
					</div>
					<div :class="$style.cardStats">
						<span><i class="ti ti-heart"></i> {{ note.reactionCount || 0 }}</span>
						<span><i class="ti ti-message-circle"></i> {{ note.repliesCount || 0 }}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- 加载更多 -->
		<div v-if="loading" :class="$style.loading"><MkLoading/></div>
		<div v-else-if="hasMore" :class="$style.loadMore">
			<MkButton @click="loadMore">加载更多</MkButton>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import * as Misskey from 'misskey-js';
import CGVideoFeed from '@/components/CGVideoFeed.vue';
import MkButton from '@/components/MkButton.vue';
import { misskeyApiGet } from '@/utility/misskey-api.js';
import { definePage } from '@/page.js';

const categories = [
	{ key: 'all', label: '全部', icon: 'ti ti-apps' },
	{ key: 'concept', label: '原画', icon: 'ti ti-pencil' },
	{ key: 'modeling', label: '建模', icon: 'ti ti-cube' },
	{ key: 'animation', label: '动画', icon: 'ti ti-player-play' },
	{ key: 'vfx', label: '特效', icon: 'ti ti-sparkles' },
	{ key: 'env', label: '场景', icon: 'ti ti-mountain' },
];

const categoryKeywords: Record<string, string[]> = {
	concept: ['原画', 'concept', 'illustration', 'character', 'painting'],
	modeling: ['建模', 'model', 'sculpt', 'zbrush', 'blender', '3d'],
	animation: ['动画', 'animation', 'animat', 'reel', 'motion'],
	vfx: ['特效', 'vfx', 'effect', 'houdini', 'particle', 'cgi'],
	env: ['场景', 'environment', 'level', 'landscape', 'scene'],
};

const activeCategory = ref('all');
const playingNote = ref<Misskey.entities.Note | null>(null);
const notes = ref<Misskey.entities.Note[]>([]);
const loading = ref(false);
const hasMore = ref(true);
const untilId = ref<string | null>(null);

const filteredNotes = computed(() => {
	if (activeCategory.value === 'all') return notes.value;
	const keywords = categoryKeywords[activeCategory.value] || [];
	return notes.value.filter(note => {
		const text = ((note.text || '') + ' ' + (note.tags || []).join(' ')).toLowerCase();
		return keywords.some(kw => text.includes(kw));
	});
});

function getThumb(note: Misskey.entities.Note): string {
	const video = note.files?.find(f => f.type.startsWith('video/'));
	return video?.thumbnailUrl || note.files?.[0]?.thumbnailUrl || '';
}

function getTitle(note: Misskey.entities.Note): string {
	if (!note.text) return '无标题';
	const firstLine = note.text.split('\n')[0];
	return firstLine.length > 40 ? firstLine.substring(0, 40) + '...' : firstLine;
}

function getDuration(note: Misskey.entities.Note): string {
	const video = note.files?.find(f => f.type.startsWith('video/'));
	if (!video?.duration) return '';
	const min = Math.floor(video.duration / 60);
	const sec = Math.floor(video.duration % 60);
	return `${min}:${sec.toString().padStart(2, '0')}`;
}

async function loadVideos() {
	if (loading.value) return;
	loading.value = true;

	try {
		const [featured, recent] = await Promise.all([
			misskeyApiGet('notes/featured', { limit: 30, fileType: 'video/', untilId: untilId.value }).catch(() => []),
			misskeyApiGet('notes/local-timeline', { limit: 50, withFiles: true, untilId: untilId.value }).catch(() => []),
		]);

		const seen = new Set(notes.value.map(n => n.id));
		const all = [...featured, ...recent].filter(n => {
			if (seen.has(n.id)) return false;
			if (!n.files?.some((f: any) => f.type.startsWith('video/'))) return false;
			seen.add(n.id);
			return true;
		});

		notes.value.push(...all);
		if (all.length > 0) {
			untilId.value = all[all.length - 1].id;
		} else {
			hasMore.value = false;
		}
	} catch (e) {
		console.error('Failed to load videos:', e);
	}
	loading.value = false;
}

function loadMore() {
	loadVideos();
}

definePage(() => ({
	title: '刷视频',
	icon: 'ti ti-movie',
}));

onMounted(() => {
	loadVideos();
});
</script>

<style module lang="scss">
.root {
	min-height: 100vh;
}

/* 全屏播放模式 */
.playerMode {
	position: fixed;
	inset: 0;
	z-index: 100;
	background: #000;
}

.backBtn {
	position: fixed;
	top: 16px;
	left: 16px;
	z-index: 110;
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 16px;
	border-radius: 20px;
	background: rgba(0, 0, 0, 0.5);
	color: #fff;
	font-size: 14px;
	backdrop-filter: blur(8px);
	transition: background 0.2s;

	&:hover {
		background: rgba(0, 0, 0, 0.7);
	}
}

/* 浏览模式 */
.browseMode {
	max-width: 1200px;
	margin: 0 auto;
	padding: 16px;
}

.categories {
	display: flex;
	gap: 8px;
	margin-bottom: 20px;
	overflow-x: auto;
	padding-bottom: 4px;
}

.catBtn {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 8px 16px;
	border-radius: 20px;
	font-size: 13px;
	color: var(--MI_THEME-fg);
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	transition: all 0.2s;
	white-space: nowrap;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.catBtnActive {
	background: var(--MI_THEME-accent);
	color: #fff;
	border-color: var(--MI_THEME-accent);
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 16px;
}

.card {
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	overflow: hidden;
	cursor: pointer;
	transition: transform 0.2s, box-shadow 0.2s;

	&:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
	}
}

.cardThumb {
	position: relative;
	aspect-ratio: 16 / 9;
	overflow: hidden;
	background: #000;
}

.cardImg {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.3s;
}

.card:hover .cardImg {
	transform: scale(1.05);
}

.cardPlay {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	font-size: 20px;
	opacity: 0.8;
	transition: opacity 0.2s;
}

.card:hover .cardPlay {
	opacity: 1;
}

.cardDuration {
	position: absolute;
	bottom: 8px;
	right: 8px;
	padding: 2px 6px;
	border-radius: 4px;
	background: rgba(0, 0, 0, 0.7);
	color: #fff;
	font-size: 11px;
}

.cardInfo {
	padding: 12px;
}

.cardTitle {
	font-size: 13px;
	font-weight: 500;
	color: var(--MI_THEME-fg);
	margin-bottom: 8px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cardAuthor {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 6px;
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.cardAuthorAvatar {
	width: 20px;
	height: 20px;
	border-radius: 50%;
}

.cardStats {
	display: flex;
	gap: 12px;
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.loading, .loadMore {
	display: flex;
	justify-content: center;
	padding: 24px;
}
</style>
