<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_spacer" style="--MI_SPACER-w: 1000px;">
	<div :class="$style.root">
		<!-- 页面头部 -->
		<div :class="$style.pageHeader">
			<div :class="$style.pageTitle">
				<i class="ti ti-shield-check"></i>
				<span>内容审核中心</span>
			</div>
			<div :class="$style.headerActions">
				<!-- 统计卡片 -->
				<div :class="$style.statsRow">
					<div :class="$style.statItem">
						<span :class="$style.statNum">{{ stats.pending }}</span>
						<span :class="$style.statLabel">待审核</span>
					</div>
					<div :class="$style.statDivider"></div>
					<div :class="$style.statItem">
						<span :class="[$style.statNum, $style.success]">{{ stats.approved }}</span>
						<span :class="$style.statLabel">已通过</span>
					</div>
					<div :class="$style.statDivider"></div>
					<div :class="$style.statItem">
						<span :class="[$style.statNum, $style.error]">{{ stats.rejected }}</span>
						<span :class="$style.statLabel">已拒绝</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Tab 切换 -->
		<div :class="$style.tabs">
			<button
				v-for="tab in tabs"
				:key="tab.value"
				:class="[$style.tab, { [$style.active]: currentTab === tab.value }]"
				@click="switchTab(tab.value)"
			>
				<i :class="tab.icon"></i>
				{{ tab.label }}
				<span v-if="tab.badge !== undefined" :class="$style.badge">{{ tab.badge }}</span>
			</button>
		</div>

		<!-- 筛选区 -->
		<div :class="$style.filters">
			<MkSelect v-model="sourceFilter" style="flex: 0 0 150px;">
				<template #label>来源</template>
				<option value="">全部来源</option>
				<option value="cara">Cara</option>
				<option value="youtube">YouTube</option>
				<option value="artstation">ArtStation</option>
			</MkSelect>
		</div>

		<!-- 批量操作栏 -->
		<div v-if="selectedIds.size > 0" :class="$style.batchBar">
			<div :class="$style.batchInfo">
				<span>已选择 <strong>{{ selectedIds.size }}</strong> 项</span>
				<button class="_button" @click="clearSelection">清除</button>
			</div>
			<div :class="$style.batchActions">
				<MkButton :disabled="submitting" @click="batchApprove">
					<i class="ti ti-check"></i>
					批量通过
				</MkButton>
				<MkButton danger :disabled="submitting" @click="batchReject">
					<i class="ti ti-x"></i>
					批量拒绝
				</MkButton>
			</div>
		</div>

		<!-- 加载状态 -->
		<MkLoading v-if="loading" :class="$style.loading"/>

		<!-- 空状态 -->
		<div v-else-if="items.length === 0" :class="$style.empty">
			<i class="ti ti-inbox"></i>
			<span>{{ emptyText }}</span>
		</div>

		<!-- 列表 -->
		<div v-else :class="$style.list">
			<!-- 全选 -->
			<div :class="$style.selectAll">
				<input
					type="checkbox"
					:checked="allSelected"
					:indeterminate="someSelected && !allSelected"
					@change="toggleSelectAll"
				/>
				<span>全选</span>
			</div>

			<!-- 列表项 -->
			<div
				v-for="item in items"
				:key="item.id"
				:class="[$style.item, { [$style.selected]: selectedIds.has(item.id) }]"
			>
				<div :class="$style.itemMain">
					<!-- 复选框 -->
					<input
						type="checkbox"
						:class="$style.checkbox"
						:checked="selectedIds.has(item.id)"
						@change="toggleSelect(item.id)"
					/>

					<!-- 内容 -->
					<div :class="$style.itemContent">
						<div :class="$style.itemHeader">
							<span :class="$style.sourceTag" :style="{ background: getSourceColor(item.source) }">
								<i :class="getSourceIcon(item.source)"></i>
								{{ getSourceName(item.source) }}
							</span>
							<span :class="$style.itemTime">{{ formatTime(item.createdAt) }}</span>
						</div>
						<div :class="$style.author">@{{ item.author }}</div>
						<div v-if="item.content" :class="$style.content">{{ item.content?.slice(0, 120) }}{{ (item.content?.length ?? 0) > 120 ? '...' : '' }}</div>
						<div v-if="item.tags?.length" :class="$style.tags">
							<span v-for="tag in item.tags.slice(0, 5)" :key="tag" :class="$style.tag">#{{ tag }}</span>
						</div>
						<div v-if="item.imageUrls?.length" :class="$style.images">
							<img
								v-for="(url, idx) in item.imageUrls.slice(0, 3)"
								:key="idx"
								:class="$style.thumb"
								:src="url"
								@error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
							/>
							<span v-if="item.imageUrls.length > 3" :class="$style.moreImages">
								+{{ item.imageUrls.length - 3 }}
							</span>
						</div>
						<div v-if="item.errorMessage && item.errorMessage !== 'rejected'" :class="$style.errorMsg">
							<i class="ti ti-alert-circle"></i>
							{{ item.errorMessage }}
						</div>
					</div>

					<!-- 操作按钮 -->
					<div :class="$style.itemActions">
						<MkButton
							v-if="currentTab === 'pending'"
							:small="true"
							primary
							:disabled="submitting"
							@click="approveItem(item)"
						>
							<i class="ti ti-check"></i>
							通过
						</MkButton>
						<MkButton
							v-if="currentTab === 'pending'"
							:small="true"
							danger
							:disabled="submitting"
							@click="rejectItem(item)"
						>
							<i class="ti ti-x"></i>
							拒绝
						</MkButton>
						<span v-if="currentTab === 'approved'" :class="$style.statusApproved">
							<i class="ti ti-check"></i> 已通过
						</span>
						<span v-if="currentTab === 'rejected'" :class="$style.statusRejected">
							<i class="ti ti-x"></i> 已拒绝
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- 加载更多 -->
		<div v-if="hasMore && !loading" :class="$style.loadMore">
			<MkButton :disabled="loadingMore" @click="loadMore">
				<i class="ti ti-reload"></i>
				加载更多
			</MkButton>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';

interface ScrapedContentItem {
	id: string;
	source: string;
	sourceId: string;
	author: string;
	authorUrl: string | null;
	content: string | null;
	imageUrls: string[];
	tags: string[];
	category: string | null;
	published: boolean;
	errorMessage: string | null;
	createdAt: string;
	updatedAt: string;
}

interface Stats {
	pending: number;
	approved: number;
	rejected: number;
}

const tabs = [
	{ value: 'pending', label: '待审核', icon: 'ti ti-clock' },
	{ value: 'approved', label: '已通过', icon: 'ti ti-check' },
	{ value: 'rejected', label: '已拒绝', icon: 'ti ti-x' },
];

const sourceNames: Record<string, string> = {
	cara: 'Cara',
	youtube: 'YouTube',
	artstation: 'ArtStation',
};

const sourceIcons: Record<string, string> = {
	cara: 'ti ti-user',
	youtube: 'ti ti-brand-youtube',
	artstation: 'ti ti-palette',
};

const sourceColors: Record<string, string> = {
	cara: 'var(--MI_THEME-accent)',
	youtube: '#ff0000',
	artstation: '#0099ff',
};

const currentTab = ref<'pending' | 'approved' | 'rejected'>('pending');
const sourceFilter = ref('');
const items = ref<ScrapedContentItem[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const submitting = ref(false);
const selectedIds = ref(new Set<string>());
const offset = ref(0);
const hasMore = ref(false);

const stats = ref<Stats>({
	pending: 0,
	approved: 0,
	rejected: 0,
});

const allSelected = computed(() => items.value.length > 0 && items.value.every(item => selectedIds.value.has(item.id)));
const someSelected = computed(() => items.value.some(item => selectedIds.value.has(item.id)));

const emptyText = computed(() => {
	switch (currentTab.value) {
		case 'pending': return '暂无待审核内容';
		case 'approved': return '暂无已通过内容';
		case 'rejected': return '暂无已拒绝内容';
	}
});

function getSourceName(source: string): string {
	return sourceNames[source] || source;
}

function getSourceIcon(source: string): string {
	return sourceIcons[source] || 'ti ti-globe';
}

function getSourceColor(source: string): string {
	return sourceColors[source] || 'var(--MI_THEME-fgTransparentWeak)';
}

function formatTime(isoString: string): string {
	const date = new Date(isoString);
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return '刚刚';
	if (minutes < 60) return `${minutes} 分钟前`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} 小时前`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days} 天前`;
	return date.toLocaleDateString('zh-CN');
}

async function loadStats() {
	try {
		const result = await misskeyApi('admin/scraping/stats');
		stats.value = {
			pending: result.pending,
			approved: result.published,
			rejected: result.failed,
		};
	} catch (e) {
		console.error('Failed to load stats:', e);
	}
}

async function loadItems(append = false) {
	if (append) {
		loadingMore.value = true;
	} else {
		loading.value = true;
		offset.value = 0;
	}

	try {
		const params: Record<string, unknown> = {
			limit: 20,
			offset: append ? offset.value : 0,
		};

		// 根据 Tab 设置筛选条件
		switch (currentTab.value) {
			case 'pending':
				params.published = false;
				params.errorMessage = null;
				break;
			case 'approved':
				params.published = true;
				break;
			case 'rejected':
				params.published = false;
				params.errorMessage = 'rejected';
				break;
		}

		// 来源筛选
		if (sourceFilter.value) {
			params.source = sourceFilter.value;
		}

		const result = await misskeyApi('admin/scraping/list', params);

		if (append) {
			items.value = [...items.value, ...result];
			offset.value += result.length;
		} else {
			items.value = result;
			offset.value = result.length;
		}

		hasMore.value = result.length >= 20;

		// 更新 Tab badge
		await loadStats();
	} catch (e) {
		console.error('Failed to load items:', e);
		os.alert({
			type: 'error',
			text: '加载失败: ' + String(e),
		});
	} finally {
		loading.value = false;
		loadingMore.value = false;
	}
}

async function loadMore() {
	await loadItems(true);
}

function switchTab(tab: 'pending' | 'approved' | 'rejected') {
	currentTab.value = tab;
	clearSelection();
	loadItems();
}

function toggleSelect(id: string) {
	const newSet = new Set(selectedIds.value);
	if (newSet.has(id)) {
		newSet.delete(id);
	} else {
		newSet.add(id);
	}
	selectedIds.value = newSet;
}

function toggleSelectAll() {
	if (allSelected.value) {
		selectedIds.value = new Set();
	} else {
		selectedIds.value = new Set(items.value.map(item => item.id));
	}
}

function clearSelection() {
	selectedIds.value = new Set();
}

async function approveItem(item: ScrapedContentItem) {
	submitting.value = true;
	try {
		await misskeyApi('admin/scraping/approve', { id: [item.id] });
		os.success('审核通过');
		// 从列表移除或更新
		if (currentTab.value === 'pending') {
			items.value = items.value.filter(i => i.id !== item.id);
		}
		await loadStats();
	} catch (e) {
		console.error('Approve failed:', e);
		os.alert({
			type: 'error',
			text: '操作失败: ' + String(e),
		});
	} finally {
		submitting.value = false;
	}
}

async function rejectItem(item: ScrapedContentItem) {
	submitting.value = true;
	try {
		await misskeyApi('admin/scraping/reject', { id: [item.id] });
		os.success('已拒绝');
		// 从列表移除或更新
		if (currentTab.value === 'pending') {
			items.value = items.value.filter(i => i.id !== item.id);
		}
		await loadStats();
	} catch (e) {
		console.error('Reject failed:', e);
		os.alert({
			type: 'error',
			text: '操作失败: ' + String(e),
		});
	} finally {
		submitting.value = false;
	}
}

async function batchApprove() {
	if (selectedIds.value.size === 0) return;
	submitting.value = true;
	try {
		const ids = Array.from(selectedIds.value);
		await misskeyApi('admin/scraping/approve', { id: ids });
		os.success(`已通过 ${ids.length} 项`);
		clearSelection();
		await loadItems();
		await loadStats();
	} catch (e) {
		console.error('Batch approve failed:', e);
		os.alert({
			type: 'error',
			text: '操作失败: ' + String(e),
		});
	} finally {
		submitting.value = false;
	}
}

async function batchReject() {
	if (selectedIds.value.size === 0) return;
	submitting.value = true;
	try {
		const ids = Array.from(selectedIds.value);
		await misskeyApi('admin/scraping/reject', { id: ids });
		os.success(`已拒绝 ${ids.length} 项`);
		clearSelection();
		await loadItems();
		await loadStats();
	} catch (e) {
		console.error('Batch reject failed:', e);
		os.alert({
			type: 'error',
			text: '操作失败: ' + String(e),
		});
	} finally {
		submitting.value = false;
	}
}

watch(sourceFilter, () => {
	loadItems();
});

onMounted(async () => {
	await loadStats();
	await loadItems();
});

definePage(() => ({
	title: '内容审核中心',
	icon: 'ti ti-shield-check',
}));
</script>

<style lang="scss" module>
.root {
	padding: 20px;
}

.loading {
	padding: 60px 0;
	text-align: center;
}

// 页面头部
.pageHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20px;
	padding: 20px 24px;
	background: var(--MI_THEME-panel);
	border-radius: 16px;
	border: 1px solid var(--MI_THEME-divider);
}

.pageTitle {
	display: flex;
	align-items: center;
	gap: 12px;
	font-size: 20px;
	font-weight: 600;

	i {
		font-size: 24px;
		color: var(--MI_THEME-accent);
	}
}

.headerActions {
	display: flex;
	align-items: center;
	gap: 16px;
}

.statsRow {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 12px 20px;
	background: var(--MI_THEME-bg);
	border-radius: 12px;
}

.statItem {
	display: flex;
	flex-direction: column;
	align-items: center;
	min-width: 60px;
}

.statNum {
	font-size: 24px;
	font-weight: 700;
	color: var(--MI_THEME-warn);

	&.success {
		color: var(--MI_THEME-success);
	}

	&.error {
		color: var(--MI_THEME-error);
	}
}

.statLabel {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-top: 2px;
}

.statDivider {
	width: 1px;
	height: 32px;
	background: var(--MI_THEME-divider);
}

// Tab 切换
.tabs {
	display: flex;
	gap: 4px;
	margin-bottom: 16px;
	padding: 4px;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
}

.tab {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 10px 20px;
	border: none;
	background: transparent;
	border-radius: 8px;
	font-size: 14px;
	font-weight: 500;
	color: var(--MI_THEME-fgTransparentWeak);
	cursor: pointer;
	transition: all 0.15s;

	&:hover {
		color: var(--MI_THEME-fg);
		background: var(--MI_THEME-bg);
	}

	&.active {
		color: var(--MI_THEME-fgOnAccent, #fff);
		background: var(--MI_THEME-accent);
	}
}

.badge {
	padding: 2px 8px;
	border-radius: 10px;
	font-size: 11px;
	font-weight: 600;
	background: rgba(255, 255, 255, 0.2);
}

// 筛选区
.filters {
	display: flex;
	gap: 12px;
	margin-bottom: 16px;
}

// 批量操作栏
.batchBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	margin-bottom: 16px;
	background: var(--MI_THEME-accentedBg);
	border: 1px solid var(--MI_THEME-accent);
	border-radius: 12px;
}

.batchInfo {
	display: flex;
	align-items: center;
	gap: 12px;
	font-size: 13px;
	color: var(--MI_THEME-accent);

	button {
		padding: 4px 12px;
		border: none;
		background: var(--MI_THEME-bg);
		border-radius: 6px;
		font-size: 12px;
		cursor: pointer;

		&:hover {
			background: var(--MI_THEME-panel);
		}
	}
}

.batchActions {
	display: flex;
	gap: 8px;
}

// 空状态
.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 60px 0;
	color: var(--MI_THEME-fgTransparentWeak);

	i {
		font-size: 48px;
	}

	span {
		font-size: 14px;
	}
}

// 列表
.list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.selectAll {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	font-size: 13px;
	color: var(--MI_THEME-fgTransparentWeak);

	input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}
}

.item {
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 12px;
	transition: all 0.15s;

	&:hover {
		border-color: var(--MI_THEME-accent);
	}

	&.selected {
		border-color: var(--MI_THEME-accent);
		background: var(--MI_THEME-accentedBg);
	}
}

.itemMain {
	display: flex;
	gap: 16px;
	padding: 16px;
}

.checkbox {
	width: 18px;
	height: 18px;
	flex-shrink: 0;
	margin-top: 4px;
	cursor: pointer;
}

.itemContent {
	flex: 1;
	min-width: 0;
}

.itemHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8px;
}

.sourceTag {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 4px 10px;
	border-radius: 6px;
	font-size: 11px;
	font-weight: 600;
	color: white;
}

.itemTime {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.author {
	font-size: 13px;
	font-weight: 600;
	color: var(--MI_THEME-fg);
	margin-bottom: 6px;
}

.content {
	font-size: 13px;
	color: var(--MI_THEME-fgTransparentWeak);
	line-height: 1.5;
	margin-bottom: 8px;
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-bottom: 8px;
}

.tag {
	padding: 2px 6px;
	background: var(--MI_THEME-bg);
	border-radius: 4px;
	font-size: 10px;
	color: var(--MI_THEME-accent);
}

.images {
	display: flex;
	gap: 8px;
	margin-bottom: 8px;
}

.thumb {
	width: 60px;
	height: 60px;
	object-fit: cover;
	border-radius: 6px;
	border: 1px solid var(--MI_THEME-divider);
}

.moreImages {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 60px;
	height: 60px;
	border-radius: 6px;
	background: var(--MI_THEME-bg);
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.errorMsg {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 11px;
	color: var(--MI_THEME-error);
}

.itemActions {
	display: flex;
	flex-direction: column;
	gap: 8px;
	flex-shrink: 0;
	min-width: 100px;
	align-items: flex-end;
}

.statusApproved {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	font-weight: 500;
	color: var(--MI_THEME-success);
}

.statusRejected {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	font-weight: 500;
	color: var(--MI_THEME-error);
}

// 加载更多
.loadMore {
	display: flex;
	justify-content: center;
	margin-top: 20px;
}

@media (max-width: 768px) {
	.pageHeader {
		flex-direction: column;
		gap: 16px;
		align-items: flex-start;
	}

	.tabs {
		flex-wrap: wrap;
	}

	.itemMain {
		flex-direction: column;
	}

	.itemActions {
		flex-direction: row;
		width: 100%;
		justify-content: flex-end;
		margin-top: 12px;
	}
}
</style>
