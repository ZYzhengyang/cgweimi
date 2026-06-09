<!--
  CG微米 - 瀑布流作品展示（Cara 风格）
  CSS columns 实现瀑布流：column-width 250px，最多4列
  每张卡片只显示封面图，hover 时底部渐变遮罩显示作者信息
-->
<template>
<div :class="$style.root">
	<!-- 骨架屏 -->
	<div v-if="initialLoading" :class="$style.grid">
		<div v-for="i in 12" :key="'sk-' + i" :class="[$style.card, $style.skeleton]">
			<div :class="$style.skeletonImg"></div>
		</div>
	</div>

	<!-- 瀑布流 -->
	<div v-else :class="$style.grid">
		<div
			v-for="(note, index) in notes"
			:key="note.id"
			:class="[$style.card, { [$style.cardBig]: index % 5 === 0 }]"
			@mouseenter="hoveredId = note.id"
			@mouseleave="hoveredId = null"
			@click="openNote(note)"
		>
			<!-- 封面图 -->
			<img
				v-if="getThumbUrl(note)"
				:src="getThumbUrl(note)"
				:class="$style.cover"
				loading="lazy"
				@error="handleImageError($event, note)"
			/>
			<div v-else :class="$style.coverPlaceholder">
				<i class="ti ti-photo" style="font-size: 32px; opacity: 0.3;"></i>
			</div>

			<!-- hover 渐变遮罩 + 作者名 -->
			<div :class="[$style.overlay, hoveredId === note.id ? $style.overlayVisible : '']">
				<div :class="$style.overlayAuthor">
					<span :class="$style.overlayName">{{ getAuthor(note) || note.user?.name || note.user?.username }}</span>
				</div>
			</div>

			<!-- 视频/多图角标 -->
			<div v-if="hasVideo(note)" :class="$style.badge">
				<i class="ti ti-player-play"></i>
			</div>
			<div v-if="getImageCount(note) > 1" :class="[$style.badge, $style.badgeRight]">
				1/{{ getImageCount(note) }}
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
import { getCategoryTagMap } from '@/config/categories.js';

const categoryTagMap = getCategoryTagMap();

const props = withDefaults(defineProps<{
	userId?: string;
	/** 分类 key，传入后按该分类的第一个 tag 筛选笔记 */
	category?: string;
}>(), {
	userId: undefined,
	category: undefined,
});

const notes = ref<Misskey.entities.Note[]>([]);
const loading = ref(false);
const initialLoading = ref(true);
const hasMore = ref(true);
const untilId = ref<string | null>(null);
const hoveredId = ref<string | null>(null);

async function loadNotes() {
	loading.value = true;
	try {
		const params: any = {
			limit: 30,
			withFiles: true,
		};
		if (untilId.value) params.untilId = untilId.value;

		let result: Misskey.entities.Note[];
		if (props.userId) {
			params.userId = props.userId;
			result = await misskeyApi('users/notes', params);
		} else {
			// 按分类 tag 筛选
			if (props.category && props.category !== 'all') {
				const tags = categoryTagMap[props.category];
				if (tags && tags.length > 0) {
					params.tag = tags[0];
				}
			}
			result = await misskeyApi('notes/local-timeline', params);
		}
		// 过滤掉纯文字帖子（防御性，withFiles: true 已在 API 层过滤）
		const mediaNotes = result.filter(n => n.files && n.files.length > 0);
		if (mediaNotes.length > 0) {
			notes.value.push(...mediaNotes);
			untilId.value = result[result.length - 1].id;
		}
		if (result.length < 30) hasMore.value = false;
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
	// 打开详情面板（和主页共用同一个弹窗）
	const { dispose } = os.popup(MkNotePopup, { note }, {
		closed: () => dispose(),
	});
}

function getThumbUrl(note: Misskey.entities.Note): string | null {
	// 只取第一张图做封面（使用缩略图，加载快）
	const imageFile = note.files?.find(f => f.type.startsWith('image/'));
	if (imageFile) {
		// 优先使用缩略图
		if (imageFile.thumbnailUrl) return getProxiedImageUrl(imageFile.thumbnailUrl, 'preview');
		// 如果缩略图不存在，使用原图
		if (imageFile.url) return getProxiedImageUrl(imageFile.url, 'preview');
	}
	// 视频文件使用缩略图
	const videoFile = note.files?.find(f => f.type.startsWith('video/'));
	if (videoFile) {
		if (videoFile.thumbnailUrl) return getProxiedImageUrl(videoFile.thumbnailUrl, 'preview');
	}
	return null;
}

// 图片加载失败时的 fallback
function handleImageError(event: Event, note: Misskey.entities.Note) {
	const img = event.target as HTMLImageElement;
	const imageFile = note.files?.find(f => f.type.startsWith('image/'));
	const videoFile = note.files?.find(f => f.type.startsWith('video/'));

	// 如果当前加载的是缩略图，尝试原图
	if (imageFile?.url && img.src.includes('thumbnail')) {
		img.src = getProxiedImageUrl(imageFile.url, 'preview');
		return;
	}
	// 如果都失败了，隐藏图片
	img.style.display = 'none';
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
	return match ? match[1].trim() : '';
}

function getTags(note: Misskey.entities.Note): string[] {
	if (note.tags && note.tags.length > 0) return note.tags.slice(0, 3);
	// 从文本中提取 hashtag
	const matches = note.text?.match(/#[^\s#]+/g);
	return matches ? matches.slice(0, 3).map(t => t.slice(1)) : [];
}

onMounted(() => {
	loadNotes();
});
</script>

<style module lang="scss">
.root {
	width: 100%;
	padding: 0;
}

.grid {
	display: grid;
	grid-template-columns: repeat(8, 1fr);
	grid-auto-rows: 200px;
	gap: 4px;

	@media (max-width: 1600px) {
		grid-template-columns: repeat(6, 1fr);
	}

	@media (max-width: 1200px) {
		grid-template-columns: repeat(4, 1fr);
	}

	@media (max-width: 768px) {
		grid-template-columns: repeat(2, 1fr);
	}
}

.card {
	overflow: hidden;
	cursor: pointer;
	border-radius: 8px;
	position: relative;
	background: var(--MI_THEME-panel);
	transition: transform 0.3s ease;

	&:hover {
		transform: scale(1.02);
	}
}

// 大卡片：2x2
.cardBig {
	grid-row: span 2;
	grid-column: span 2;
}

.cover {
	width: 100%;
	height: 100%;
	display: block;
	object-fit: cover;
}

.coverPlaceholder {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	background: var(--MI_THEME-bg);
}

/* === hover 渐变遮罩 === */
.overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(transparent 50%, rgba(0, 0, 0, 0.6));
	opacity: 0;
	transition: opacity 0.3s ease;
	pointer-events: none;
}

.overlayVisible {
	opacity: 1;
}

.overlayAuthor {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 8px 10px;
}

.overlayName {
	font-size: 12px;
	font-weight: 500;
	color: #fff;
	margin: 0;
	line-height: 1.2;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.overlayTitle {
	font-size: 13px;
	color: #fff;
	margin: 0 0 6px;
	line-height: 1.4;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.overlayTags {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.tag {
	padding: 2px 8px;
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.2);
	color: #fff;
	font-size: 11px;
	backdrop-filter: blur(4px);
}

/* === 角标 === */
.badge {
	position: absolute;
	top: 8px;
	left: 8px;
	padding: 3px 8px;
	border-radius: 8px;
	background: rgba(0, 0, 0, 0.6);
	color: #fff;
	font-size: 11px;
	font-weight: 500;
	backdrop-filter: blur(4px);
	display: flex;
	align-items: center;
	gap: 3px;

	i {
		font-size: 10px;
	}
}

.badgeRight {
	left: auto;
	right: 8px;
}

/* === 加载更多 === */
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
}

.skeletonImg {
	width: 100%;
	height: 220px;
	border-radius: 12px;
	background: linear-gradient(90deg, var(--MI_THEME-panel) 25%, var(--MI_THEME-divider) 50%, var(--MI_THEME-panel) 75%);
	background-size: 800px 100%;
	animation: shimmer 1.5s infinite linear;
}
</style>
