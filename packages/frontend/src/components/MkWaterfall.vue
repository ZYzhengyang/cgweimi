<!--
  CG微米 - 瀑布流作品展示（小红书风格）
  点击卡片弹窗打开帖子
-->
<template>
<div :class="$style.root">
	<div :class="$style.grid">
		<!-- 骨架屏 -->
		<template v-if="initialLoading">
			<div v-for="i in 10" :key="'skeleton-' + i" :class="[$style.card, $style.skeleton]">
				<div :class="$style.skeletonCover"></div>
				<div :class="$style.skeletonInfo">
					<div :class="$style.skeletonLine"></div>
					<div :class="[$style.skeletonLine, $style.skeletonLineShort]"></div>
					<div :class="$style.skeletonBottom">
						<div :class="$style.skeletonAvatar"></div>
						<div :class="[$style.skeletonLine, $style.skeletonLineName]"></div>
					</div>
				</div>
			</div>
		</template>

		<!-- 真实卡片 -->
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
				<!-- 视频时长角标 -->
				<div v-if="hasVideo(note)" :class="$style.durationBadge">
					<i class="ti ti-player-play"></i>
					<span v-if="getVideoDuration(note)">{{ getVideoDuration(note) }}</span>
				</div>
				<!-- 多图角标 1/N 格式 -->
				<div v-if="getImageCount(note) > 1" :class="$style.multiBadge">
					1/{{ getImageCount(note) }}
				</div>
			</div>

			<!-- 底部信息 -->
			<div :class="$style.info">
				<div :class="$style.title">{{ getTitle(note) }}</div>
				<div :class="$style.bottomRow">
					<div :class="$style.author">
						<img v-if="note.user?.avatarUrl" :src="note.user.avatarUrl" :class="$style.authorAvatar"/>
						<span :class="$style.authorName">{{ getAuthor(note) || '@' + note.user?.username }}</span>
					</div>
					<div :class="$style.stats">
						<span :class="$style.statItem">
							<i class="ti ti-heart"></i>
							<span>{{ formatCount(getReactionCount(note)) }}</span>
						</span>
						<span :class="$style.statItem">
							<i class="ti ti-message"></i>
							<span>{{ formatCount(note.repliesCount ?? 0) }}</span>
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- 加载更多 -->
	<div v-if="hasMore && !initialLoading" :class="$style.loadMore">
		<MkButton :loading="loading" @click="loadMore">加载更多</MkButton>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import * as Misskey from 'misskey-js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { getProxiedImageUrl } from '@/utility/media-proxy.js';
import MkNotePopup from '@/components/MkNotePopup.vue';
import MkButton from '@/components/MkButton.vue';

const props = withDefaults(defineProps<{
	/** 按用户筛选作品；不传则使用公共时间线 */
	userId?: string;
}>(), {
	userId: undefined,
});

const notes = ref<Misskey.entities.Note[]>([]);
const loading = ref(false);
const initialLoading = ref(true);
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

		let result: Misskey.entities.Note[];
		if (props.userId) {
			params.userId = props.userId;
			result = await misskeyApi('users/notes', params);
		} else {
			result = await misskeyApi('notes/local-timeline', params);
		}
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
	initialLoading.value = false;
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
	const imageFile = note.files?.find(f => f.type.startsWith('image/'));
	if (imageFile) {
		const rawUrl = imageFile.thumbnailUrl || imageFile.url;
		return rawUrl ? getProxiedImageUrl(rawUrl, 'preview') : null;
	}
	const videoFile = note.files?.find(f => f.type.startsWith('video/'));
	if (videoFile?.thumbnailUrl) return getProxiedImageUrl(videoFile.thumbnailUrl, 'preview');
	return null;
}

function hasVideo(note: Misskey.entities.Note): boolean {
	return note.files?.some(f => f.type.startsWith('video/')) ?? false;
}

function getImageCount(note: Misskey.entities.Note): number {
	return note.files?.filter(f => f.type.startsWith('image/')).length ?? 0;
}

function getVideoDuration(note: Misskey.entities.Note): string | null {
	const videoFile = note.files?.find(f => f.type.startsWith('video/'));
	if (!videoFile?.duration) return null;
	const duration = videoFile.duration;
	const minutes = Math.floor(duration / 60);
	const seconds = Math.floor(duration % 60);
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

function getReactionCount(note: Misskey.entities.Note): number {
	if (!note.reactions) return 0;
	return Object.values(note.reactions).reduce((sum: number, count: any) => sum + (typeof count === 'number' ? count : 0), 0);
}

function formatCount(count: number): string {
	if (count <= 0) return '0';
	if (count >= 10000) return (count / 10000).toFixed(1) + 'w';
	if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
	return String(count);
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
	grid-auto-rows: auto;
	gap: 8px;

	@media (max-width: 1200px) { grid-template-columns: repeat(4, 1fr); }
	@media (max-width: 900px) { grid-template-columns: repeat(3, 1fr); }
	@media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
}

.card {
	overflow: hidden;
	cursor: pointer;
	border-radius: 8px;
	position: relative;
	background: var(--MI_THEME-panel);
	transition: box-shadow 0.3s ease, transform 0.2s ease;

	&:hover {
		box-shadow: 0 4px 20px var(--MI_THEME-shadow);

		.title {
			white-space: normal;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}

		.stats {
			opacity: 1;
			transform: translateY(0);
		}
	}
}

/* 每4张图中第1张放大（2x2） */
.card:nth-child(4n+1) {
	grid-column: span 2;
	grid-row: span 2;
}

@media (max-width: 768px) {
	.card:nth-child(4n+1) {
		grid-column: span 1;
		grid-row: span 1;
	}
}

.cover {
	position: relative;
	overflow: hidden;
	min-height: 180px;
	background: var(--MI_THEME-bg);
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

.durationBadge {
	position: absolute;
	bottom: 8px;
	left: 8px;
	display: flex;
	align-items: center;
	gap: 3px;
	padding: 2px 8px;
	border-radius: 10px;
	background: rgba(0, 0, 0, 0.65);
	color: #fff;
	font-size: 11px;
	font-weight: 500;
	backdrop-filter: blur(4px);

	i {
		font-size: 10px;
	}
}

.multiBadge {
	position: absolute;
	bottom: 8px;
	right: 8px;
	padding: 2px 8px;
	border-radius: 10px;
	background: rgba(0, 0, 0, 0.65);
	color: #fff;
	font-size: 11px;
	font-weight: 500;
	backdrop-filter: blur(4px);
}

.info {
	padding: 8px 10px 10px;
}

.title {
	font-size: 13px;
	font-weight: 500;
	color: var(--MI_THEME-fg);
	margin-bottom: 8px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	transition: all 0.25s ease;
	line-height: 1.4;
}

.bottomRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 6px;
}

.author {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
	flex: 1;
}

.authorAvatar {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	flex-shrink: 0;
}

.authorName {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.stats {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
	opacity: 0.5;
	transform: translateY(2px);
	transition: opacity 0.25s ease, transform 0.25s ease;
}

.statItem {
	display: flex;
	align-items: center;
	gap: 2px;
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);

	i {
		font-size: 12px;
	}
}

.loadMore {
	display: flex;
	justify-content: center;
	padding: 24px;
}

/* === 骨架屏 === */
@keyframes shimmer {
	0% { background-position: -400px 0; }
	100% { background-position: 400px 0; }
}

.skeleton {
	pointer-events: none;

	&:nth-child(4n+1) {
		grid-column: span 2;
		grid-row: span 2;
	}
}

@media (max-width: 768px) {
	.skeleton:nth-child(4n+1) {
		grid-column: span 1;
		grid-row: span 1;
	}
}

.skeletonCover {
	width: 100%;
	height: 180px;
	background: linear-gradient(90deg, var(--MI_THEME-panel) 25%, var(--MI_THEME-divider) 50%, var(--MI_THEME-panel) 75%);
	background-size: 800px 100%;
	animation: shimmer 1.5s infinite linear;
}

.card:nth-child(4n+1).skeleton .skeletonCover {
	height: 368px;
}

.skeletonInfo {
	padding: 8px 10px 10px;
}

.skeletonLine {
	width: 80%;
	height: 12px;
	border-radius: 4px;
	background: linear-gradient(90deg, var(--MI_THEME-panel) 25%, var(--MI_THEME-divider) 50%, var(--MI_THEME-panel) 75%);
	background-size: 800px 100%;
	animation: shimmer 1.5s infinite linear;
	margin-bottom: 6px;
}

.skeletonLineShort {
	width: 50%;
}

.skeletonBottom {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-top: 8px;
}

.skeletonAvatar {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: linear-gradient(90deg, var(--MI_THEME-panel) 25%, var(--MI_THEME-divider) 50%, var(--MI_THEME-panel) 75%);
	background-size: 800px 100%;
	animation: shimmer 1.5s infinite linear;
	flex-shrink: 0;
}

.skeletonLineName {
	width: 40%;
	height: 10px;
	margin-bottom: 0;
}
</style>
