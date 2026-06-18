<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps">
			<!-- 搬运统计卡片 -->
			<div :class="$style.statsGrid">
				<div :class="$style.statCard">
					<div :class="$style.statIcon" style="background: var(--MI_THEME-accentedBg);">
						<i class="ti ti-database"></i>
					</div>
					<div :class="$style.statInfo">
						<div :class="$style.statValue">{{ stats.total }}</div>
						<div :class="$style.statLabel">搬运总数</div>
					</div>
				</div>
				<div :class="$style.statCard">
					<div :class="$style.statIcon" style="background: var(--MI_THEME-success-bg);">
						<i class="ti ti-check" style="color: var(--MI_THEME-success);"></i>
					</div>
					<div :class="$style.statInfo">
						<div :class="$style.statValue">{{ stats.published }}</div>
						<div :class="$style.statLabel">已发布</div>
					</div>
				</div>
				<div :class="$style.statCard">
					<div :class="$style.statIcon" style="background: var(--MI_THEME-warn-bg);">
						<i class="ti ti-clock" style="color: var(--MI_THEME-warn);"></i>
					</div>
					<div :class="$style.statInfo">
						<div :class="$style.statValue">{{ stats.pending }}</div>
						<div :class="$style.statLabel">待发布</div>
					</div>
				</div>
				<div :class="$style.statCard">
					<div :class="$style.statIcon" style="background: var(--MI_THEME-error-bg);">
						<i class="ti ti-alert-circle" style="color: var(--MI_THEME-error);"></i>
					</div>
					<div :class="$style.statInfo">
						<div :class="$style.statValue">{{ stats.failed }}</div>
						<div :class="$style.statLabel">失败</div>
					</div>
				</div>
			</div>

			<!-- 来源分布 -->
			<MkFolder>
				<template #label><i class="ti ti-pie-chart"></i> 来源分布</template>
				<div :class="$style.sourceGrid">
					<div v-for="(count, source) in stats.bySource" :key="source" :class="$style.sourceItem">
						<div :class="$style.sourceIcon">
							<i :class="getSourceIcon(source)"></i>
						</div>
						<div :class="$style.sourceInfo">
							<div :class="$style.sourceName">{{ getSourceName(source) }}</div>
							<div :class="$style.sourceCount">{{ count }} 条</div>
						</div>
					</div>
					<div v-if="Object.keys(stats.bySource).length === 0" :class="$style.empty">
						暂无数据
					</div>
				</div>
			</MkFolder>

			<!-- 状态控制区 -->
			<MkFolder :defaultOpen="true">
				<template #label><i class="ti ti-player-play"></i> 搬运控制</template>
				<div class="_gaps">
					<MkInfo>手动触发从各来源抓取最新内容</MkInfo>
					<div :class="$style.controlGrid">
						<MkButton :disabled="syncing.cara" primary @click="syncSource('cara')">
							<i class="ti ti-brand-cera"></i>
							{{ syncing.cara ? '采集中...' : '抓取 Cara' }}
						</MkButton>
						<MkButton :disabled="syncing.youtube" primary @click="syncSource('youtube')">
							<i class="ti ti-brand-youtube"></i>
							{{ syncing.youtube ? '采集中...' : '抓取 YouTube' }}
						</MkButton>
						<MkButton :disabled="syncing.artstation" primary @click="syncSource('artstation')">
							<i class="ti ti-palette"></i>
							{{ syncing.artstation ? '采集中...' : '抓取 ArtStation' }}
						</MkButton>
					</div>
					<MkInfo v-if="lastSyncResult" :type="lastSyncResult.failed > 0 ? 'warn' : 'info'">
						上次同步结果: 成功 {{ lastSyncResult.success }}, 失败 {{ lastSyncResult.failed }}, 跳过 {{ lastSyncResult.skipped }}
					</MkInfo>
				</div>
			</MkFolder>

			<!-- 暂停/恢复开关 -->
			<MkFolder>
				<template #label><i class="ti ti-toggle-left"></i> 调度设置</template>
				<div class="_gaps">
					<MkInfo>控制定时搬运任务的运行状态</MkInfo>
					<MkSwitch v-model="scheduleEnabled" @update:modelValue="toggleSchedule">
						{{ scheduleEnabled ? '定时任务运行中' : '定时任务已暂停' }}
					</MkSwitch>
					<div :class="$style.scheduleInfo">
						<i class="ti ti-clock"></i>
						<span>当前调度间隔: {{ scheduleInterval }} 分钟</span>
					</div>
				</div>
			</MkFolder>

			<!-- 最近搬运记录 -->
			<MkFolder :defaultOpen="true">
				<template #label><i class="ti ti-history"></i> 最近搬运记录</template>
				<div class="_gaps">
					<div :class="$style.recordList">
						<div v-for="record in records" :key="record.id" :class="$style.recordItem">
							<div :class="$style.recordLeft">
								<span :class="$style.recordSource" :style="{ background: getSourceColor(record.source) }">
									<i :class="getSourceIcon(record.source)"></i>
									{{ getSourceName(record.source) }}
								</span>
								<div :class="$style.recordContent">
									<div :class="$style.recordAuthor">{{ record.author }}</div>
									<div v-if="record.content" :class="$style.recordText">{{ record.content?.slice(0, 80) }}{{ (record.content?.length ?? 0) > 80 ? '...' : '' }}</div>
									<div :class="$style.recordTags">
										<span v-for="tag in (record.tags ?? []).slice(0, 5)" :key="tag" :class="$style.tag">{{ tag }}</span>
									</div>
								</div>
							</div>
							<div :class="$style.recordRight">
								<div :class="$style.recordMeta">
									<span :class="$style.recordTime">{{ formatTime(record.createdAt) }}</span>
									<span :class="$style.recordImages"><i class="ti ti-photo"></i> {{ record.imageUrls?.length ?? 0 }}</span>
								</div>
								<div :class="$style.recordStatus">
									<span v-if="record.published" :class="$style.statusPublished">
										<i class="ti ti-check"></i> 已发布
									</span>
									<span v-else-if="record.errorMessage" :class="$style.statusFailed">
										<i class="ti ti-x"></i> 失败
									</span>
									<span v-else :class="$style.statusPending">
										<i class="ti ti-clock"></i> 待发布
									</span>
								</div>
								<div v-if="record.errorMessage" :class="$style.errorMsg" :title="record.errorMessage">
									{{ record.errorMessage }}
								</div>
							</div>
						</div>
						<div v-if="records.length === 0" :class="$style.empty">
							暂无搬运记录
						</div>
					</div>
					<div v-if="hasMore" style="text-align: center;">
						<MkButton :small="true" :disabled="loadingMore" @click="loadMore">
							<i class="ti ti-reload"></i> 加载更多
						</MkButton>
					</div>
				</div>
			</MkFolder>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';

interface ScrapingRecord {
	id: string;
	source: string;
	sourceId: string;
	author: string;
	authorUrl: string | null;
	content: string | null;
	imageUrls: string[];
	cosUrls: string[];
	tags: string[];
	category: string | null;
	published: boolean;
	publishedNoteId: string | null;
	errorMessage: string | null;
	createdAt: string;
	updatedAt: string;
}

interface ScrapingStats {
	total: number;
	published: number;
	pending: number;
	failed: number;
	bySource: Record<string, number>;
}

const records = ref<ScrapingRecord[]>([]);
const stats = ref<ScrapingStats>({
	total: 0,
	published: 0,
	pending: 0,
	failed: 0,
	bySource: {},
});
const syncing = ref({
	cara: false,
	youtube: false,
	artstation: false,
});
const lastSyncResult = ref<{ success: number; failed: number; skipped: number } | null>(null);
const loadingMore = ref(false);
const hasMore = ref(false);
const recordsOffset = ref(0);

const scheduleEnabled = ref(true);
const scheduleInterval = ref(30);

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
		stats.value = await misskeyApi('admin/scraping/stats');
	} catch (e) {
		console.error('Failed to load stats:', e);
	}
}

async function loadRecords() {
	try {
		const items = await misskeyApi('admin/scraping/list', {
			limit: 10,
			offset: 0,
		});
		records.value = items;
		hasMore.value = items.length >= 10;
		recordsOffset.value = 10;
	} catch (e) {
		console.error('Failed to load records:', e);
	}
}

async function loadMore() {
	loadingMore.value = true;
	try {
		const items = await misskeyApi('admin/scraping/list', {
			limit: 10,
			offset: recordsOffset.value,
		});
		records.value = [...records.value, ...items];
		hasMore.value = items.length >= 10;
		recordsOffset.value += items.length;
	} catch (e) {
		console.error('Failed to load more records:', e);
	}
	loadingMore.value = false;
}

async function syncSource(source: 'cara' | 'youtube' | 'artstation') {
	syncing.value[source] = true;
	try {
		const result = await misskeyApi('admin/scraping/sync', { source });
		lastSyncResult.value = result;
		os.success('同步完成: 成功 ' + result.success + ', 失败 ' + result.failed + ', 跳过 ' + result.skipped);
		// 刷新数据
		await loadStats();
		await loadRecords();
	} catch (e) {
		console.error('Sync failed:', e);
		os.success('同步失败');
	}
	syncing.value[source] = false;
}

async function toggleSchedule(enabled: boolean) {
	// TODO: 调用后端 API 切换调度状态
	// 目前仅前端状态切换，后续后端实现后再对接
	os.success(enabled ? '定时任务已启用' : '定时任务已暂停');
}

onMounted(async () => {
	await Promise.all([loadStats(), loadRecords()]);
});

const headerTabs = computed(() => []);

definePage(() => ({
	title: '搬运管理',
	icon: 'ti ti-robot',
}));
</script>

<style lang="scss" module>
.statsGrid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 12px;

	@media (max-width: 700px) {
		grid-template-columns: repeat(2, 1fr);
	}
}

.statCard {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
}

.statIcon {
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--MI_THEME-accentedBg);
	border-radius: 12px;
	font-size: 20px;
	color: var(--MI_THEME-accent);
}

.statInfo {
	flex: 1;
	min-width: 0;
}

.statValue {
	font-size: 24px;
	font-weight: 700;
	color: var(--MI_THEME-fg);
}

.statLabel {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-top: 4px;
}

.sourceGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	gap: 12px;
}

.sourceItem {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	background: var(--MI_THEME-panel);
	border-radius: 8px;
}

.sourceIcon {
	width: 40px;
	height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--MI_THEME-accentedBg);
	border-radius: 8px;
	font-size: 18px;
	color: var(--MI_THEME-accent);
}

.sourceInfo {
	flex: 1;
	min-width: 0;
}

.sourceName {
	font-weight: 600;
	font-size: 13px;
}

.sourceCount {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-top: 2px;
}

.controlGrid {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}

.scheduleInfo {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	padding: 8px 12px;
	background: var(--MI_THEME-bg);
	border-radius: 6px;
}

.recordList {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.recordItem {
	display: flex;
	justify-content: space-between;
	gap: 16px;
	padding: 16px;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	transition: background 0.15s;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
	}
}

.recordLeft {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.recordSource {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 4px 8px;
	border-radius: 6px;
	font-size: 11px;
	font-weight: 600;
	color: white;
	width: fit-content;
}

.recordContent {
	flex: 1;
	min-width: 0;
}

.recordAuthor {
	font-weight: 600;
	font-size: 13px;
	color: var(--MI_THEME-fg);
}

.recordText {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-top: 4px;
	line-height: 1.4;
}

.recordTags {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 8px;
}

.tag {
	padding: 2px 6px;
	background: var(--MI_THEME-bg);
	border-radius: 4px;
	font-size: 10px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.recordRight {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 8px;
	min-width: 100px;
}

.recordMeta {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 4px;
}

.recordTime {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.recordImages {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.recordStatus {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	font-weight: 500;
}

.statusPublished {
	color: var(--MI_THEME-success);
}

.statusFailed {
	color: var(--MI_THEME-error);
}

.statusPending {
	color: var(--MI_THEME-warn);
}

.errorMsg {
	font-size: 10px;
	color: var(--MI_THEME-error);
	max-width: 150px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.empty {
	padding: 32px;
	text-align: center;
	color: var(--MI_THEME-fgTransparentWeak);
	background: var(--MI_THEME-panel);
	border-radius: 12px;
}
</style>
