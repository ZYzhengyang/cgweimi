<!--
  CG微米 - Explore 作品页面
  纯瀑布流展示
-->
<template>
<div :class="$style.root">
	<!-- Banner 轮播 -->
	<div :class="$style.banner" v-if="bannerNotes.length > 0 || bannerLoading">
		<!-- 骨架屏 -->
		<div v-if="bannerLoading" :class="$style.bannerSkeleton">
			<div :class="$style.bannerSkeletonInner"></div>
		</div>

		<!-- 幻灯片 -->
		<div
			v-for="(note, i) in bannerNotes"
			:key="note.id"
			:class="[$style.bannerSlide, { [$style.bannerSlideActive]: i === currentBannerIndex }]"
			@click="openBannerNote(note)"
		>
			<div :class="$style.bannerImgWrap">
				<img v-if="getBannerImage(note)" :src="getBannerImage(note)!" :class="$style.bannerImg" loading="lazy"/>
				<div v-else :class="$style.bannerImgPlaceholder">
					<i class="ti ti-photo" style="font-size:48px;opacity:0.3"></i>
				</div>
			</div>
			<div :class="$style.bannerOverlay">
				<div :class="$style.bannerTitle">{{ getBannerTitle(note) }}</div>
				<div :class="$style.bannerMeta">
					<img v-if="note.user?.avatarUrl" :src="note.user.avatarUrl" :class="$style.bannerAvatar"/>
					<span :class="$style.bannerAuthor">{{ note.user?.name || note.user?.username }}</span>
					<span :class="$style.bannerLikes">
						<i class="ti ti-heart"></i> {{ formatCount(getReactionCount(note)) }}
					</span>
				</div>
			</div>
		</div>

		<!-- 左右箭头 -->
		<button v-if="bannerNotes.length > 1" :class="[$style.bannerArrow, $style.bannerArrowLeft]" @click.stop="prevBanner">
			<i class="ti ti-chevron-left"></i>
		</button>
		<button v-if="bannerNotes.length > 1" :class="[$style.bannerArrow, $style.bannerArrowRight]" @click.stop="nextBanner">
			<i class="ti ti-chevron-right"></i>
		</button>

		<!-- 底部圆点指示器 -->
		<div v-if="bannerNotes.length > 1" :class="$style.bannerDots">
			<button
				v-for="(_, i) in bannerNotes"
				:key="i"
				:class="[$style.bannerDot, { [$style.bannerDotActive]: i === currentBannerIndex }]"
				@click.stop="goToBanner(i)"
			></button>
		</div>
	</div>

	<!-- 工具栏：分类 + 换一换 -->
	<div :class="$style.toolbar">
		<div :class="$style.categories">
			<button
				v-for="cat in categories"
				:key="cat.key"
				:class="[$style.catBtn, { [$style.catBtnActive]: activeCategory === cat.key }]"
				@click="selectCategory(cat.key)"
			>
				<i :class="cat.icon"></i> {{ cat.label }}
			</button>
		</div>
		<button :class="[$style.refreshBtn, { [$style.refreshBtnLoading]: refreshing }]" :disabled="refreshing" @click="handleRefresh">
			<i :class="['ti ti-refresh', { [$style.spin]: refreshing }]"></i> 换一换
		</button>
	</div>

	<!-- 瀑布流 -->
	<MkWaterfall :key="waterfallKey"/>
</div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as Misskey from 'misskey-js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { getProxiedImageUrl } from '@/utility/media-proxy.js';
import MkNotePopup from '@/components/MkNotePopup.vue';
import MkWaterfall from '@/components/MkWaterfall.vue';
import { categories, getCategoryTagMap } from '@/config/categories.js';

const categoryTagMap = getCategoryTagMap();

const activeCategory = ref('all');

// --- Banner ---
const bannerNotes = ref<Misskey.entities.Note[]>([]);
const bannerLoading = ref(true);
const currentBannerIndex = ref(0);
let bannerTimer: ReturnType<typeof setInterval> | null = null;

// --- 瀑布流刷新 ---
const waterfallKey = ref(0);
const refreshing = ref(false);

// ---- 分类切换 ----
function selectCategory(key: string) {
	activeCategory.value = key;
	waterfallKey.value++;
}

// ---- 换一换 ----
function handleRefresh() {
	refreshing.value = true;
	waterfallKey.value++;
	loadBanner();
	setTimeout(() => {
		refreshing.value = false;
	}, 600);
}

// ---- Banner 数据 ----
async function loadBanner() {
	bannerLoading.value = true;
	try {
		const params: any = {
			limit: 5,
			withFiles: true,
		};
		if (activeCategory.value !== 'all') {
			const tags = categoryTagMap[activeCategory.value];
			if (tags && tags.length > 0) {
				// 使用第一个标签作为 API 筛选条件（本地时间线 API 只支持单标签）
				params.tag = tags[0];
			}
		}
		const result = await misskeyApi('notes/local-timeline', params);
		// 按反应数降序排序
		bannerNotes.value = result
			.sort((a: Misskey.entities.Note, b: Misskey.entities.Note) => getReactionCount(b) - getReactionCount(a))
			.slice(0, 5);
	} catch (e) {
		console.error('[ExploreWorks] Failed to load banner:', e);
	}
	bannerLoading.value = false;
	currentBannerIndex.value = 0;
	resetBannerTimer();
}

// ---- Banner 轮播控制 ----
function resetBannerTimer() {
	if (bannerTimer) clearInterval(bannerTimer);
	if (bannerNotes.value.length <= 1) return;
	bannerTimer = setInterval(() => {
		currentBannerIndex.value = (currentBannerIndex.value + 1) % bannerNotes.value.length;
	}, 5000);
}

function prevBanner() {
	if (bannerNotes.value.length === 0) return;
	currentBannerIndex.value = (currentBannerIndex.value - 1 + bannerNotes.value.length) % bannerNotes.value.length;
	resetBannerTimer();
}

function nextBanner() {
	if (bannerNotes.value.length === 0) return;
	currentBannerIndex.value = (currentBannerIndex.value + 1) % bannerNotes.value.length;
	resetBannerTimer();
}

function goToBanner(index: number) {
	currentBannerIndex.value = index;
	resetBannerTimer();
}

// ---- Banner 辅助 ----
function getBannerImage(note: Misskey.entities.Note): string | null {
	const imageFile = note.files?.find(f => f.type.startsWith('image/'));
	if (imageFile) {
		const rawUrl = imageFile.thumbnailUrl || imageFile.url;
		return rawUrl ? getProxiedImageUrl(rawUrl) : null;
	}
	const videoFile = note.files?.find(f => f.type.startsWith('video/'));
	if (videoFile?.thumbnailUrl) return getProxiedImageUrl(videoFile.thumbnailUrl);
	return null;
}

function getBannerTitle(note: Misskey.entities.Note): string {
	if (!note.text) return '精选作品';
	let title = note.text.split('\n')[0].trim();
	title = title.replace(/^[""「」『』【】（）()\s]+/, '');
	if (title.length < 4) title = note.text.replace(/\n/g, ' ').substring(0, 40);
	return title.length > 36 ? title.substring(0, 36) + '...' : title;
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

// ---- Banner 点击 ----
function openBannerNote(note: Misskey.entities.Note) {
	const { dispose } = os.popup(MkNotePopup, { note }, {
		closed: () => dispose(),
	});
}

// ---- 分类变更刷新Banner ----
watch(activeCategory, () => {
	loadBanner();
});

// ---- 生命周期 ----
onMounted(() => {
	loadBanner();
});

onUnmounted(() => {
	if (bannerTimer) clearInterval(bannerTimer);
});
</script>

<style module lang="scss">
.root {
	padding: 0;
}

/* === 轮播Banner === */
.banner {
	position: relative;
	width: 100%;
	height: 240px;
	border-radius: 8px;
	overflow: hidden;
	margin-bottom: 16px;
	background: var(--MI_THEME-panel);

	@media (max-width: 600px) {
		height: 160px;
	}
}

.bannerSlide {
	position: absolute;
	inset: 0;
	opacity: 0;
	transition: opacity 0.6s ease;
	cursor: pointer;
}

.bannerSlideActive {
	opacity: 1;
	z-index: 1;
}

.bannerImgWrap {
	width: 100%;
	height: 100%;
}

.bannerImg {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.bannerImgPlaceholder {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	background: var(--MI_THEME-bg);
}

.bannerOverlay {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	padding: 20px 24px;
	background: linear-gradient(0deg, rgba(0, 0, 0, 0.65) 0%, transparent 60%);
	z-index: 2;

	@media (max-width: 600px) {
		padding: 12px 16px;
	}
}

.bannerTitle {
	font-size: 20px;
	font-weight: 700;
	color: #fff;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	margin-bottom: 8px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	@media (max-width: 600px) {
		font-size: 16px;
		margin-bottom: 4px;
	}
}

.bannerMeta {
	display: flex;
	align-items: center;
	gap: 8px;
}

.bannerAvatar {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	border: 2px solid rgba(255, 255, 255, 0.5);
	flex-shrink: 0;
}

.bannerAuthor {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.85);
}

.bannerLikes {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.75);
	display: flex;
	align-items: center;
	gap: 3px;
	margin-left: auto;
}

/* Banner箭头 */
.bannerArrow {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	z-index: 3;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.35);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	opacity: 0;
	transition: opacity 0.25s ease;
	backdrop-filter: blur(4px);

	&:hover {
		background: rgba(0, 0, 0, 0.55);
	}
}

.banner:hover .bannerArrow {
	opacity: 1;
}

.bannerArrowLeft {
	left: 12px;
}

.bannerArrowRight {
	right: 12px;
}

/* Banner底部圆点 */
.bannerDots {
	position: absolute;
	bottom: 10px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 3;
	display: flex;
	gap: 6px;
}

.bannerDot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.4);
	transition: all 0.3s ease;
	padding: 0;

	&:hover {
		background: rgba(255, 255, 255, 0.7);
	}
}

.bannerDotActive {
	background: #fff;
	width: 20px;
	border-radius: 4px;
}

/* Banner骨架屏 */
.bannerSkeleton {
	position: absolute;
	inset: 0;
	z-index: 5;
	display: flex;
	align-items: center;
	justify-content: center;
}

.bannerSkeletonInner {
	width: 100%;
	height: 100%;
	background: linear-gradient(90deg, var(--MI_THEME-panel) 25%, var(--MI_THEME-divider) 50%, var(--MI_THEME-panel) 75%);
	background-size: 800px 100%;
	animation: shimmer 1.5s infinite linear;
}

/* === 工具栏：分类 + 换一换 === */
.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16px;
	gap: 12px;
}

.categories {
	display: flex;
	gap: 8px;
	overflow-x: auto;
	padding-bottom: 4px;
	flex: 1;
	min-width: 0;
}

.catBtn {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 6px 14px;
	border-radius: 16px;
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
	color: var(--MI_THEME-fgOnAccent);
	border-color: var(--MI_THEME-accent);
}

/* 换一换按钮 */
.refreshBtn {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 6px 16px;
	border-radius: 16px;
	font-size: 13px;
	font-weight: 500;
	color: var(--MI_THEME-fg);
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	transition: all 0.2s;
	white-space: nowrap;
	flex-shrink: 0;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
}

.refreshBtnLoading {
	pointer-events: none;
}

.spin {
	display: inline-block;
	animation: rotate 0.8s linear infinite;
}

@keyframes rotate {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

@keyframes shimmer {
	0% { background-position: -400px 0; }
	100% { background-position: 400px 0; }
}
</style>
