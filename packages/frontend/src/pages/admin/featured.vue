<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">
			<!-- 当前精选 -->
			<MkFolder>
				<template #label><i class="ti ti-star"></i> 当前推荐（{{ featuredIds.length }}/{{ MAX_FEATURED }}）</template>
				<div :class="$style.grid">
					<div v-for="noteId in featuredIds" :key="noteId" :class="$style.card">
						<div :class="$style.cardImg">
							<MkLoading v-if="loadingNotes[noteId]" />
							<img v-else-if="noteCache[noteId]?.files?.[0]" :src="getProxiedImageUrl(noteCache[noteId].files[0].thumbnailUrl || noteCache[noteId].files[0].url, 'preview')" :class="$style.thumb" loading="lazy" decoding="async" />
							<div v-else :class="$style.noThumb">无图</div>
						</div>
						<div :class="$style.cardInfo">
							<span v-if="noteCache[noteId]">{{ noteCache[noteId].user?.name || noteCache[noteId].user?.username }}</span>
							<span v-else :class="$style.noteId">{{ noteId.slice(0, 8) }}...</span>
						</div>
						<button class="_button" :class="$style.removeBtn" @click="removeFeatured(noteId)">
							<i class="ti ti-x"></i>
						</button>
					</div>
					<div v-if="featuredIds.length < MAX_FEATURED" :class="$style.addCard" @click="showSearch = true">
						<i class="ti ti-plus" style="font-size: 24px;"></i>
						<span>添加推荐</span>
					</div>
				</div>
			</MkFolder>

			<!-- 搜索添加 -->
			<MkFolder v-if="showSearch" :openByDefault="true">
				<template #label><i class="ti ti-search"></i> 搜索帖子添加</template>
				<div class="_gaps_s">
					<div :class="$style.searchRow">
						<MkInput v-model="searchQuery" :placeholder="'搜索帖子内容...'">
							<template #prefix><i class="ti ti-search"></i></template>
						</MkInput>
						<MkButton primary @click="doSearch">搜索</MkButton>
					</div>
					<div v-if="searchResults.length > 0" :class="$style.grid">
						<div
							v-for="note in searchResults"
							:key="note.id"
							:class="[$style.card, { [$style.selected]: featuredIds.includes(note.id) }]"
							@click="addFeatured(note)"
						>
							<div :class="$style.cardImg">
								<img v-if="note.files?.[0]" :src="getProxiedImageUrl(note.files[0].thumbnailUrl || note.files[0].url, 'preview')" :class="$style.thumb" loading="lazy" decoding="async" />
								<div v-else :class="$style.noThumb">无图</div>
							</div>
							<div :class="$style.cardInfo">
								<span>{{ note.user?.name || note.user?.username }}</span>
							</div>
							<div v-if="featuredIds.includes(note.id)" :class="$style.checkMark">
								<i class="ti ti-check"></i>
							</div>
						</div>
					</div>
					<div v-else-if="searchLoading" :class="$style.empty">搜索中...</div>
					<div v-else-if="searchDone" :class="$style.empty">没有找到结果</div>
				</div>
			</MkFolder>

			<!-- 浏览最近帖子 -->
			<MkFolder>
				<template #label><i class="ti ti-clock"></i> 浏览最近帖子（有图片）</template>
				<div class="_gaps_s">
					<div :class="$style.grid">
						<div
							v-for="note in recentNotes"
							:key="note.id"
							:class="[$style.card, { [$style.selected]: featuredIds.includes(note.id) }]"
							@click="addFeatured(note)"
						>
							<div :class="$style.cardImg">
								<img v-if="note.files?.[0]" :src="getProxiedImageUrl(note.files[0].thumbnailUrl || note.files[0].url, 'preview')" :class="$style.thumb" loading="lazy" decoding="async" />
								<div v-else :class="$style.noThumb">无图</div>
							</div>
							<div :class="$style.cardInfo">
								<span>{{ note.user?.name || note.user?.username }}</span>
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
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { getProxiedImageUrl } from '@/utility/media-proxy.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';

const MAX_FEATURED = 8;

const meta = await misskeyApi('admin/meta');
const featuredIds = ref<string[]>(meta.clientOptions?.featuredNoteIds ?? []);
const noteCache = ref<Record<string, any>>({});
const loadingNotes = ref<Record<string, boolean>>({});
const showSearch = ref(false);
const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const searchDone = ref(false);
const searchLoading = ref(false);
const recentNotes = ref<any[]>([]);

// Load featured notes
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

onMounted(() => {
	if (featuredIds.value.length > 0) loadFeaturedNotes();
	loadRecentNotes();
});

async function loadRecentNotes() {
	try {
		const notes = await misskeyApi('notes/local-timeline', {
			limit: 20,
			withFiles: true,
		});
		const withImages = notes.filter((n: any) => n.files?.length > 0);
		recentNotes.value = [...recentNotes.value, ...withImages].slice(0, 40);
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

function save() {
	os.apiWithDialog('admin/update-meta', {
		clientOptions: {
			...meta.clientOptions,
			featuredNoteIds: featuredIds.value,
		},
	}).then(() => {
		fetchInstance(true);
	});
}

const headerTabs = computed(() => []);

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

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	gap: 14px;
}

.card {
	position: relative;
	background: var(--MI_THEME-panel);
	border-radius: 16px;
	overflow: hidden;
	cursor: pointer;
	transition: transform 0.2s, box-shadow 0.2s;
	border: 2px solid transparent;

	&:hover {
		transform: scale(1.03);
		box-shadow: 0 12px 28px color-mix(in srgb, var(--MI_THEME-accent) 18%, transparent);
	}

	&.selected {
		border-color: var(--MI_THEME-accent);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--MI_THEME-accent) 30%, transparent);
	}
}

.cardImg {
	aspect-ratio: 1;
	overflow: hidden;
	background: var(--MI_THEME-bg);
}

.thumb {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.2s;

	.card:hover & {
		transform: scale(1.05);
	}
}

.noThumb {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 13px;
}

.cardInfo {
	padding: 10px;
	font-size: 13px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	color: var(--MI_THEME-fg);
}

.noteId {
	font-family: monospace;
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.removeBtn {
	position: absolute;
	top: 6px;
	right: 6px;
	width: 26px;
	height: 26px;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.7);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
	opacity: 0;
	transition: opacity 0.15s, transform 0.15s;
	backdrop-filter: blur(4px);

	.card:hover & {
		opacity: 1;
	}

	&:hover {
		transform: scale(1.1);
		background: var(--MI_THEME-danger);
	}
}

.checkMark {
	position: absolute;
	top: 6px;
	right: 6px;
	width: 26px;
	height: 26px;
	border-radius: 50%;
	background: var(--MI_THEME-accent);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
	box-shadow: 0 2px 8px color-mix(in srgb, var(--MI_THEME-accent) 40%, transparent);
}

.addCard {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	aspect-ratio: 1;
	border: 2px dashed var(--MI_THEME-divider);
	border-radius: 14px;
	color: var(--MI_THEME-fgTransparentWeak);
	cursor: pointer;
	transition: border-color 0.2s, color 0.2s, background 0.2s;

	&:hover {
		border-color: var(--MI_THEME-accent);
		color: var(--MI_THEME-accent);
		background: var(--MI_THEME-accentedBg);
	}
}

.searchRow {
	display: flex;
	gap: 10px;
	align-items: center;
}

.empty {
	text-align: center;
	padding: 40px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 14px;
}

@media (max-width: 600px) {
	.grid {
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 10px;
	}

	.cardInfo {
		padding: 8px;
		font-size: 12px;
	}

	.searchRow {
		flex-direction: column;
	}

	.searchRow > * {
		width: 100%;
	}
}
</style>
