<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="currentTab" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">

			<!-- ===== 精选推荐管理 Tab ===== -->
			<template v-if="currentTab === 'manage'">

			<!-- 当前精选（带拖拽排序） -->
			<MkFolder :openByDefault="true">
				<template #label><i class="ti ti-star"></i> 当前推荐（{{ featuredIds.length }}/{{ MAX_FEATURED }}）</template>
				<div v-if="featuredIds.length > 0" :class="$style.dragList">
					<div
						v-for="(noteId, index) in featuredIds"
						:key="noteId"
						:class="[$style.dragItem, { [$style.dragging]: dragIndex === index }]"
						draggable="true"
						@dragstart="onDragStart(index, $event)"
						@dragover.prevent="onDragOver(index, $event)"
						@drop="onDrop(index)"
						@dragend="onDragEnd"
					>
						<div :class="$style.dragHandle">
							<i class="ti ti-grip-vertical"></i>
							<span :class="$style.dragOrder">{{ index + 1 }}</span>
						</div>
						<div :class="$style.dragThumb">
							<MkLoading v-if="loadingNotes[noteId]" />
							<img v-else-if="noteCache[noteId]?.files?.[0]" :src="getProxiedImageUrl(noteCache[noteId].files[0].thumbnailUrl || noteCache[noteId].files[0].url, 'preview')" :class="$style.thumbImg" loading="lazy" decoding="async" />
							<div v-else :class="$style.noThumb">无图</div>
						</div>
						<div :class="$style.dragInfo">
							<div :class="$style.dragAuthor">
								<span v-if="noteCache[noteId]">{{ noteCache[noteId].user?.name || noteCache[noteId].user?.username }}</span>
								<span v-else :class="$style.noteId">{{ noteId.slice(0, 8) }}...</span>
							</div>
							<div v-if="noteCache[noteId]" :class="$style.dragMeta">
								<span :class="$style.metaItem" title="反应数"><i class="ti ti-heart"></i> {{ noteCache[noteId].reactionCount ?? 0 }}</span>
								<span :class="$style.metaItem" title="转发数"><i class="ti ti-repeat"></i> {{ noteCache[noteId].renoteCount ?? 0 }}</span>
								<span :class="$style.metaItem" title="回复数"><i class="ti ti-message-circle"></i> {{ noteCache[noteId].repliesCount ?? 0 }}</span>
								<span v-if="isImportedNote(noteCache[noteId])" :class="$style.sourceTag"><i class="ti ti-robot"></i> 搬运</span>
							</div>
						</div>
						<button class="_button" :class="$style.removeBtn" @click="removeFeatured(noteId)" title="移除">
							<i class="ti ti-x"></i>
						</button>
					</div>
				</div>
				<div v-else :class="$style.emptyState">暂无精选推荐，在下方添加</div>
			</MkFolder>

			<!-- 筛选浏览 -->
			<MkFolder>
				<template #label><i class="ti ti-filter"></i> 浏览帖子添加</template>
				<div class="_gaps_s">
					<!-- 筛选 Tab -->
					<div :class="$style.filterTabs">
						<button
							v-for="tab in filterTabs"
							:key="tab.key"
							:class="[$style.filterTab, { [$style.filterTabActive]: browseFilter === tab.key }]"
							@click="browseFilter = tab.key"
						>
							<i :class="tab.icon"></i> {{ tab.label }}
						</button>
					</div>

					<!-- 搜索 -->
					<div :class="$style.searchRow">
						<MkInput v-model="searchQuery" :placeholder="'搜索帖子内容...'">
							<template #prefix><i class="ti ti-search"></i></template>
						</MkInput>
						<MkButton primary @click="doSearch">搜索</MkButton>
					</div>

					<!-- 搜索结果 -->
					<div v-if="searchResults.length > 0" :class="$style.browseGrid">
						<div
							v-for="note in filteredSearchResults"
							:key="note.id"
							:class="[$style.browseCard, { [$style.selected]: featuredIds.includes(note.id) }]"
							@click="addFeatured(note)"
						>
							<div :class="$style.browseCardImg">
								<img v-if="note.files?.[0]" :src="getProxiedImageUrl(note.files[0].thumbnailUrl || note.files[0].url, 'preview')" :class="$style.thumbImg" loading="lazy" decoding="async" />
								<div v-else :class="$style.noThumb">无图</div>
							</div>
							<div :class="$style.browseCardInfo">
								<div :class="$style.browseAuthor">{{ note.user?.name || note.user?.username }}</div>
								<div :class="$style.browseMeta">
									<span><i class="ti ti-heart"></i> {{ note.reactionCount ?? 0 }}</span>
									<span><i class="ti ti-repeat"></i> {{ note.renoteCount ?? 0 }}</span>
									<span v-if="isImportedNote(note)" :class="$style.sourceTag"><i class="ti ti-robot"></i> 搬运</span>
								</div>
							</div>
							<div v-if="featuredIds.includes(note.id)" :class="$style.checkMark">
								<i class="ti ti-check"></i>
							</div>
						</div>
					</div>
					<div v-else-if="searchLoading" :class="$style.emptyState">搜索中...</div>
					<div v-else-if="searchDone" :class="$style.emptyState">没有找到结果</div>

					<!-- 最近帖子 -->
					<div v-if="!searchDone" :class="$style.browseGrid">
						<div
							v-for="note in filteredRecentNotes"
							:key="note.id"
							:class="[$style.browseCard, { [$style.selected]: featuredIds.includes(note.id) }]"
							@click="addFeatured(note)"
						>
							<div :class="$style.browseCardImg">
								<img v-if="note.files?.[0]" :src="getProxiedImageUrl(note.files[0].thumbnailUrl || note.files[0].url, 'preview')" :class="$style.thumbImg" loading="lazy" decoding="async" />
								<div v-else :class="$style.noThumb">无图</div>
							</div>
							<div :class="$style.browseCardInfo">
								<div :class="$style.browseAuthor">{{ note.user?.name || note.user?.username }}</div>
								<div :class="$style.browseMeta">
									<span><i class="ti ti-heart"></i> {{ note.reactionCount ?? 0 }}</span>
									<span><i class="ti ti-repeat"></i> {{ note.renoteCount ?? 0 }}</span>
									<span v-if="isImportedNote(note)" :class="$style.sourceTag"><i class="ti ti-robot"></i> 搬运</span>
								</div>
							</div>
							<div v-if="featuredIds.includes(note.id)" :class="$style.checkMark">
								<i class="ti ti-check"></i>
							</div>
						</div>
					</div>
					<div style="text-align: center;">
						<MkButton :small="true" @click="loadRecentNotes">加载更多</MkButton>
					</div>
				</div>
			</MkFolder>
			</template>

			<!-- ===== 登录页播放器 Tab ===== -->
			<template v-if="currentTab === 'player'">
			<MkFolder :openByDefault="true">
				<template #label><i class="ti ti-player-play"></i> 登录页播放器配置</template>
				<div class="_gaps_s">
					<MkInfo>配置登录页视频/图片轮播区域播放的内容。从精选推荐中选择，或单独添加。未配置时自动使用精选推荐前 4 条。</MkInfo>

					<MkSwitch v-model="playerEnabled">
						<template #label>启用登录页播放器</template>
						<template #caption>关闭后登录页不显示精选内容轮播</template>
					</MkSwitch>

					<template v-if="playerEnabled">
					<div :class="$style.playerSlots">
						<div :class="$style.playerSlotsHeader">
							<span>播放列表（{{ playerIds.length }}/{{ MAX_PLAYER }} 条）</span>
							<MkButton :small="true" @click="syncFromFeatured"><i class="ti ti-copy"></i> 从精选同步</MkButton>
						</div>
						<div v-if="playerIds.length > 0" :class="$style.dragList">
							<div
								v-for="(noteId, index) in playerIds"
								:key="noteId"
								:class="[$style.dragItem, { [$style.dragging]: playerDragIndex === index }]"
								draggable="true"
								@dragstart="onPlayerDragStart(index, $event)"
								@dragover.prevent="onPlayerDragOver(index, $event)"
								@drop="onPlayerDrop(index)"
								@dragend="onPlayerDragEnd"
							>
								<div :class="$style.dragHandle">
									<i class="ti ti-grip-vertical"></i>
									<span :class="$style.dragOrder">{{ index + 1 }}</span>
								</div>
								<div :class="$style.dragThumb">
									<img v-if="noteCache[noteId]?.files?.[0]" :src="getProxiedImageUrl(noteCache[noteId].files[0].thumbnailUrl || noteCache[noteId].files[0].url, 'preview')" :class="$style.thumbImg" loading="lazy" decoding="async" />
									<div v-else :class="$style.noThumb">无图</div>
								</div>
								<div :class="$style.dragInfo">
									<div :class="$style.dragAuthor">
										<span v-if="noteCache[noteId]">{{ noteCache[noteId].user?.name || noteCache[noteId].user?.username }}</span>
										<span v-else :class="$style.noteId">{{ noteId.slice(0, 8) }}...</span>
									</div>
									<div v-if="noteCache[noteId]" :class="$style.dragMeta">
										<span :class="$style.metaItem"><i class="ti ti-heart"></i> {{ noteCache[noteId].reactionCount ?? 0 }}</span>
										<span v-if="isImportedNote(noteCache[noteId])" :class="$style.sourceTag"><i class="ti ti-robot"></i> 搬运</span>
									</div>
								</div>
								<button class="_button" :class="$style.removeBtn" @click="removePlayer(noteId)" title="移除">
									<i class="ti ti-x"></i>
								</button>
							</div>
						</div>
						<div v-else :class="$style.emptyState">播放列表为空，从精选同步或在下方添加</div>
					</div>

					<!-- 从精选添加到播放器 -->
					<div v-if="featuredIds.length > 0" :class="$style.playerAddSection">
						<div :class="$style.sectionLabel">从精选推荐添加到播放器</div>
						<div :class="$style.browseGrid">
							<div
								v-for="noteId in featuredIds"
								:key="noteId"
								:class="[$style.browseCard, { [$style.selected]: playerIds.includes(noteId) }]"
								@click="togglePlayer(noteId)"
							>
								<div :class="$style.browseCardImg">
									<img v-if="noteCache[noteId]?.files?.[0]" :src="getProxiedImageUrl(noteCache[noteId].files[0].thumbnailUrl || noteCache[noteId].files[0].url, 'preview')" :class="$style.thumbImg" loading="lazy" decoding="async" />
									<div v-else :class="$style.noThumb">无图</div>
								</div>
								<div :class="$style.browseCardInfo">
									<div :class="$style.browseAuthor">
										<span v-if="noteCache[noteId]">{{ noteCache[noteId].user?.name || noteCache[noteId].user?.username }}</span>
									</div>
								</div>
								<div v-if="playerIds.includes(noteId)" :class="$style.checkMark">
									<i class="ti ti-check"></i>
								</div>
							</div>
						</div>
					</div>
					</template>
				</div>
			</MkFolder>
			</template>

		</div>
	</div>
	<template #footer>
		<div :class="$style.footer">
			<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 16px; --MI_SPACER-max: 16px;">
				<MkButton primary rounded @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
			</div>
		</div>
	</template>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInput from '@/components/MkInput.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInfo from '@/components/MkInfo.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { getProxiedImageUrl } from '@/utility/media-proxy.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';

const MAX_FEATURED = 12;
const MAX_PLAYER = 8;

// 搬运账号前缀，用于判断是否为搬运内容
const SCRAPER_BOT_PREFIX = 'cgb_';

function isImportedNote(note: any): boolean {
	return note?.user?.username?.startsWith(SCRAPER_BOT_PREFIX) ?? false;
}

// --- Tabs ---
const currentTab = ref('manage');
const headerTabs = computed(() => [{
	key: 'manage',
	title: '精选管理',
	icon: 'ti ti-star',
}, {
	key: 'player',
	title: '播放器配置',
	icon: 'ti ti-player-play',
}]);

// --- 筛选 Tab ---
const filterTabs = [
	{ key: 'all', label: '全部', icon: 'ti ti-list' },
	{ key: 'imported', label: '搬运内容', icon: 'ti ti-robot' },
	{ key: 'user', label: '用户发布', icon: 'ti ti-user' },
];
const browseFilter = ref('all');

// --- 数据 ---
const meta = await misskeyApi('admin/meta');
const featuredIds = ref<string[]>(meta.clientOptions?.featuredNoteIds ?? []);
const playerIds = ref<string[]>(meta.clientOptions?.playerNoteIds ?? []);
const playerEnabled = ref(meta.clientOptions?.playerEnabled ?? true);
const noteCache = ref<Record<string, any>>({});
const loadingNotes = ref<Record<string, boolean>>({});
const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const searchDone = ref(false);
const searchLoading = ref(false);
const recentNotes = ref<any[]>([]);

// --- 筛选后的笔记列表 ---
const filteredSearchResults = computed(() => {
	if (browseFilter.value === 'all') return searchResults.value;
	return searchResults.value.filter((n: any) => {
		if (browseFilter.value === 'imported') return isImportedNote(n);
		if (browseFilter.value === 'user') return !isImportedNote(n);
		return true;
	});
});

const filteredRecentNotes = computed(() => {
	if (browseFilter.value === 'all') return recentNotes.value;
	return recentNotes.value.filter((n: any) => {
		if (browseFilter.value === 'imported') return isImportedNote(n);
		if (browseFilter.value === 'user') return !isImportedNote(n);
		return true;
	});
});

// --- 加载笔记数据 ---
async function loadFeaturedNotes() {
	for (const id of featuredIds.value) {
		if (noteCache.value[id]) continue;
		loadingNotes.value[id] = true;
		try {
			const note = await misskeyApi('notes/show', { noteId: id });
			noteCache.value[id] = note;
		} catch (e) {
			console.error('Failed to load note:', id, e);
		}
		loadingNotes.value[id] = false;
	}
}

async function loadPlayerNotes() {
	for (const id of playerIds.value) {
		if (noteCache.value[id]) continue;
		try {
			const note = await misskeyApi('notes/show', { noteId: id });
			noteCache.value[id] = note;
		} catch (e) {
			console.error('Failed to load player note:', id, e);
		}
	}
}

onMounted(() => {
	if (featuredIds.value.length > 0) loadFeaturedNotes();
	if (playerIds.value.length > 0) loadPlayerNotes();
	loadRecentNotes();
});

async function loadRecentNotes() {
	try {
		const notes = await misskeyApi('notes/local-timeline', {
			limit: 20,
			withFiles: true,
			untilId: recentNotes.value.length > 0 ? recentNotes.value[recentNotes.value.length - 1].id : undefined,
		});
		const withImages = notes.filter((n: any) => n.files?.length > 0);
		recentNotes.value = [...recentNotes.value, ...withImages].slice(0, 60);
	} catch (e) {
		console.error('Failed to load recent notes:', e);
	}
}

async function doSearch() {
	if (!searchQuery.value.trim()) return;
	searchDone.value = false;
	searchLoading.value = true;
	try {
		const results = await misskeyApi('notes/search', {
			query: searchQuery.value,
			limit: 20,
		});
		searchResults.value = results.filter((n: any) => n.files?.length > 0);
		searchDone.value = true;
	} catch (e) {
		console.error('Search failed:', e);
		searchResults.value = [];
		searchDone.value = true;
	} finally {
		searchLoading.value = false;
	}
}

// --- 精选管理 ---
function addFeatured(note: any) {
	if (featuredIds.value.includes(note.id)) {
		featuredIds.value = featuredIds.value.filter(id => id !== note.id);
		return;
	}
	if (featuredIds.value.length >= MAX_FEATURED) return;
	featuredIds.value.push(note.id);
	noteCache.value[note.id] = note;
}

function removeFeatured(id: string) {
	featuredIds.value = featuredIds.value.filter(i => i !== id);
}

// --- 播放器管理 ---
function togglePlayer(noteId: string) {
	if (playerIds.value.includes(noteId)) {
		playerIds.value = playerIds.value.filter(id => id !== noteId);
	} else if (playerIds.value.length < MAX_PLAYER) {
		playerIds.value.push(noteId);
	}
}

function removePlayer(id: string) {
	playerIds.value = playerIds.value.filter(i => i !== id);
}

function syncFromFeatured() {
	const ids = featuredIds.value.slice(0, MAX_PLAYER);
	playerIds.value = [...ids];
	for (const id of ids) {
		if (!noteCache.value[id]) {
			misskeyApi('notes/show', { noteId: id }).then(note => {
				noteCache.value[id] = note;
			});
		}
	}
}

// --- 拖拽排序（精选） ---
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

function onDragStart(index: number, ev: DragEvent) {
	dragIndex.value = index;
	if (ev.dataTransfer) {
		ev.dataTransfer.effectAllowed = 'move';
		ev.dataTransfer.setData('text/plain', String(index));
	}
}

function onDragOver(index: number, _ev: DragEvent) {
	dragOverIndex.value = index;
}

function onDrop(targetIndex: number) {
	if (dragIndex.value === null || dragIndex.value === targetIndex) return;
	const arr = [...featuredIds.value];
	const [moved] = arr.splice(dragIndex.value, 1);
	arr.splice(targetIndex, 0, moved);
	featuredIds.value = arr;
	dragIndex.value = null;
	dragOverIndex.value = null;
}

function onDragEnd() {
	dragIndex.value = null;
	dragOverIndex.value = null;
}

// --- 拖拽排序（播放器） ---
const playerDragIndex = ref<number | null>(null);

function onPlayerDragStart(index: number, ev: DragEvent) {
	playerDragIndex.value = index;
	if (ev.dataTransfer) {
		ev.dataTransfer.effectAllowed = 'move';
		ev.dataTransfer.setData('text/plain', String(index));
	}
}

function onPlayerDragOver(_index: number, _ev: DragEvent) {
	// placeholder for visual feedback
}

function onPlayerDrop(targetIndex: number) {
	if (playerDragIndex.value === null || playerDragIndex.value === targetIndex) return;
	const arr = [...playerIds.value];
	const [moved] = arr.splice(playerDragIndex.value, 1);
	arr.splice(targetIndex, 0, moved);
	playerIds.value = arr;
	playerDragIndex.value = null;
}

function onPlayerDragEnd() {
	playerDragIndex.value = null;
}

// --- 保存 ---
function save() {
	os.apiWithDialog('admin/update-meta', {
		clientOptions: {
			...meta.clientOptions,
			featuredNoteIds: featuredIds.value,
			playerNoteIds: playerIds.value,
			playerEnabled: playerEnabled.value,
		},
	}).then(() => {
		fetchInstance(true);
	});
}

definePage(() => ({
	title: '精选推荐',
	icon: 'ti ti-star',
}));
</script>

<style lang="scss" module>
.footer {
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
}

/* --- Filter Tabs --- */
.filterTabs {
	display: flex;
	gap: 4px;
	background: var(--MI_THEME-bg);
	border-radius: 10px;
	padding: 4px;
}

.filterTab {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 8px 12px;
	border: none;
	border-radius: 8px;
	background: transparent;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 13px;
	cursor: pointer;
	transition: all 0.15s;

	&:hover {
		background: var(--MI_THEME-panel);
		color: var(--MI_THEME-fg);
	}

	&.filterTabActive {
		background: var(--MI_THEME-panel);
		color: var(--MI_THEME-accent);
		font-weight: 600;
		box-shadow: 0 1px 4px color-mix(in srgb, var(--MI_THEME-fg) 8%, transparent);
	}
}

/* --- Drag List (shared for featured & player) --- */
.dragList {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.dragItem {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	background: var(--MI_THEME-panel);
	border-radius: 10px;
	cursor: grab;
	transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
	border: 1px solid transparent;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
		box-shadow: 0 2px 8px color-mix(in srgb, var(--MI_THEME-fg) 8%, transparent);
	}

	&.dragging {
		opacity: 0.5;
		transform: scale(0.98);
	}

	&:active {
		cursor: grabbing;
	}
}

.dragHandle {
	display: flex;
	align-items: center;
	gap: 6px;
	color: var(--MI_THEME-fgTransparentWeak);
	flex-shrink: 0;

	i {
		font-size: 16px;
	}
}

.dragOrder {
	font-size: 12px;
	font-weight: 700;
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
	border-radius: 50%;
}

.dragThumb {
	width: 48px;
	height: 48px;
	border-radius: 8px;
	overflow: hidden;
	background: var(--MI_THEME-bg);
	flex-shrink: 0;
}

.thumbImg {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.noThumb {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 11px;
}

.dragInfo {
	flex: 1;
	min-width: 0;
}

.dragAuthor {
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.dragMeta {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-top: 4px;
	flex-wrap: wrap;
}

.metaItem {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);

	i {
		font-size: 12px;
	}
}

.sourceTag {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	font-size: 10px;
	padding: 2px 6px;
	background: color-mix(in srgb, var(--MI_THEME-accent) 15%, transparent);
	color: var(--MI_THEME-accent);
	border-radius: 4px;
	font-weight: 600;

	i {
		font-size: 11px;
	}
}

.removeBtn {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);
	flex-shrink: 0;
	transition: all 0.15s;

	&:hover {
		background: var(--MI_THEME-badge);
		color: var(--MI_THEME-error);
	}
}

.noteId {
	font-family: monospace;
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

/* --- Browse Grid --- */
.browseGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	gap: 10px;
}

.browseCard {
	position: relative;
	background: var(--MI_THEME-panel);
	border-radius: 10px;
	overflow: hidden;
	cursor: pointer;
	transition: transform 0.15s, box-shadow 0.15s;
	border: 2px solid transparent;

	&:hover {
		transform: scale(1.02);
		box-shadow: 0 4px 12px color-mix(in srgb, var(--MI_THEME-fg) 10%, transparent);
	}

	&.selected {
		border-color: var(--MI_THEME-accent);
	}
}

.browseCardImg {
	aspect-ratio: 1;
	overflow: hidden;
	background: var(--MI_THEME-bg);
}

.browseCardInfo {
	padding: 8px 10px;
}

.browseAuthor {
	font-size: 12px;
	font-weight: 600;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.browseMeta {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 4px;
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);

	span {
		display: inline-flex;
		align-items: center;
		gap: 2px;
	}

	i {
		font-size: 12px;
	}
}

.checkMark {
	position: absolute;
	top: 6px;
	right: 6px;
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background: var(--MI_THEME-accent);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
	box-shadow: 0 2px 8px color-mix(in srgb, var(--MI_THEME-accent) 40%, transparent);
}

.searchRow {
	display: flex;
	gap: 10px;
	align-items: center;
}

.emptyState {
	text-align: center;
	padding: 32px;
	color: var(--MI_THEME-fgTransparentWeak);
	background: var(--MI_THEME-panel);
	border-radius: 12px;
}

/* --- Player Section --- */
.playerSlots {
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	padding: 16px;
}

.playerSlotsHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
	font-weight: 600;
	font-size: 14px;
}

.playerAddSection {
	margin-top: 8px;
}

.sectionLabel {
	font-size: 13px;
	font-weight: 600;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-bottom: 8px;
}

@media (max-width: 600px) {
	.browseGrid {
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 8px;
	}

	.searchRow {
		flex-direction: column;
	}

	.searchRow > * {
		width: 100%;
	}

	.filterTab {
		padding: 6px 8px;
		font-size: 12px;
	}

	.dragItem {
		padding: 8px;
		gap: 8px;
	}

	.dragThumb {
		width: 40px;
		height: 40px;
	}
}
</style>
