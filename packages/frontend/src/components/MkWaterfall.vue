<!--
  CG微米 - 瀑布流作品展示
  点击卡片弹窗打开帖子
-->
<template>
<div :class="$style.root">
	<div :class="$style.grid">
		<div
			v-for="note in notes"
			:key="note.id"
			:class="$style.card"
			@click="openNote(note)"
		>
			<!-- 封面图 -->
			<div :class="$style.cover">
				<img
					v-if="getThumbUrl(note)"
					:src="getThumbUrl(note)"
					:class="$style.coverImg"
					loading="lazy"
				/>
				<div v-else :class="$style.coverPlaceholder">
					<i class="ti ti-photo" style="font-size: 32px; opacity: 0.3;"></i>
				</div>
				<!-- 视频标记 -->
				<div v-if="hasVideo(note)" :class="$style.videoBadge">
					<i class="ti ti-player-play"></i>
				</div>
				<!-- 多图标记 -->
				<div v-if="getImageCount(note) > 1" :class="$style.multiBadge">
					{{ getImageCount(note) }}
				</div>
			</div>

			<!-- 底部信息 -->
			<div :class="$style.info">
				<div :class="$style.title">{{ getTitle(note) }}</div>
				<div :class="$style.author">
					<img v-if="note.user?.avatarUrl" :src="note.user.avatarUrl" :class="$style.authorAvatar"/>
					<span :class="$style.authorName">{{ getAuthor(note) || '@' + note.user?.username }}</span>
				</div>
			</div>
		</div>
	</div>

	<!-- 加载更多 -->
	<div v-if="hasMore" :class="$style.loadMore">
		<MkButton :loading="loading" @click="loadMore">加载更多</MkButton>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import * as Misskey from 'misskey-js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import MkNotePopup from '@/components/MkNotePopup.vue';
import MkButton from '@/components/MkButton.vue';

const notes = ref<Misskey.entities.Note[]>([]);
const loading = ref(false);
const hasMore = ref(true);
const untilId = ref<string | null>(null);

async function loadNotes() {
	loading.value = true;
	try {
		const params: any = {
			limit: 20,
			withFiles: true,
		};
		if (untilId.value) params.untilId = untilId.value;

		const result = await misskeyApi('notes/local-timeline', params);
		console.log('[Waterfall] Loaded', result.length, 'notes');
		if (result.length > 0) {
			notes.value.push(...result);
			untilId.value = result[result.length - 1].id;
		}
		if (result.length < 20) hasMore.value = false;
	} catch (e) {
		console.error('Failed to load waterfall notes:', e);
	}
	loading.value = false;
}

function loadMore() {
	loadNotes();
}

function openNote(note: Misskey.entities.Note) {
	const { dispose } = os.popup(MkNotePopup, { note }, {
		closed: () => dispose(),
	});
}

function getThumbUrl(note: Misskey.entities.Note): string | null {
	// 优先找图片文件的缩略图
	const imageFile = note.files?.find(f => f.type.startsWith('image/'));
	if (imageFile) return imageFile.thumbnailUrl || imageFile.url;
	// 如果只有视频，用视频的缩略图（如果有的话）
	const videoFile = note.files?.find(f => f.type.startsWith('video/'));
	if (videoFile?.thumbnailUrl) return videoFile.thumbnailUrl;
	// 都没有则返回 null
	return null;
}

function hasVideo(note: Misskey.entities.Note): boolean {
	return note.files?.some(f => f.type.startsWith('video/')) ?? false;
}

function getImageCount(note: Misskey.entities.Note): number {
	return note.files?.filter(f => f.type.startsWith('image/')).length ?? 0;
}

function getTitle(note: Misskey.entities.Note): string {
	if (!note.text) return 'CG作品';
	let title = note.text.split('\n')[0].trim();
	title = title.replace(/^[""「」『』【】（）()\s]+/, '');
	if (title.length < 4) title = note.text.replace(/\n/g, ' ').substring(0, 30);
	return title.length > 28 ? title.substring(0, 28) + '...' : title;
}

function getAuthor(note: Misskey.entities.Note): string {
	const match = note.text?.match(/作者[：:]\s*(.+)/);
	return match ? match[1].trim() : note.user?.username || '';
}

onMounted(() => {
	loadNotes();
});
</script>

<style module lang="scss">
.root {
	width: 100%;
	max-width: 1400px;
	margin: 0 auto;
	padding: 0 8px;
}

.grid {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	grid-auto-rows: 180px;
	gap: 3px;

	@media (max-width: 1200px) { grid-template-columns: repeat(4, 1fr); }
	@media (max-width: 900px) { grid-template-columns: repeat(3, 1fr); }
	@media (max-width: 600px) { grid-template-columns: repeat(2, 1fr); }
}

.card {
	overflow: hidden;
	cursor: pointer;
	border-radius: 4px;
	position: relative;
	background: var(--MI_THEME-panel);
}

/* 每4张图中第1张放大（2x2） */
.card:nth-child(4n+1) {
	grid-column: span 2;
	grid-row: span 2;
}

.cover {
	position: relative;
	overflow: hidden;
}

.coverImg {
	width: 100%;
	display: block;
	object-fit: cover;
	transition: transform 0.3s ease;
}

.card:hover .coverImg {
	transform: scale(1.05);
}

.coverPlaceholder {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 200px;
	background: var(--MI_THEME-bg);
}

.videoBadge {
	position: absolute;
	top: 8px;
	right: 8px;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.6);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 12px;
}

.multiBadge {
	position: absolute;
	bottom: 8px;
	right: 8px;
	padding: 2px 8px;
	border-radius: 10px;
	background: rgba(0, 0, 0, 0.6);
	color: #fff;
	font-size: 11px;
}

.info {
	padding: 10px 12px;
}

.title {
	font-size: 13px;
	font-weight: 500;
	color: var(--MI_THEME-fg);
	margin-bottom: 6px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.author {
	display: flex;
	align-items: center;
	gap: 6px;
}

.authorAvatar {
	width: 20px;
	height: 20px;
	border-radius: 50%;
}

.authorName {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.loadMore {
	display: flex;
	justify-content: center;
	padding: 24px;
}
</style>
