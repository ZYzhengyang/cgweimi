<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_spacer" style="--MI_SPACER-w: 1200px;">
	<div :class="$style.root">
		<!-- 页面头部 -->
		<div :class="$style.pageHeader">
			<div :class="$style.pageTitle">
				<i class="ti ti-chart-bar"></i>
				<span>运营数据面板</span>
			</div>
			<div :class="$style.headerActions">
				<div :class="$style.rangeBtns">
					<button
						v-for="r in ranges"
						:key="r.value"
						class="_button"
						:class="[$style.rangeBtn, { [$style.active]: span === r.value }]"
						@click="changeSpan(r.value)"
					>{{ r.label }}</button>
				</div>
				<MkButton :class="$style.refreshBtn" @click="fetchData">
					<i class="ti ti-refresh"></i>
					刷新
				</MkButton>
			</div>
		</div>

		<Transition :name="prefer.s.animation ? '_transition_zoom' : ''" mode="out-in">
			<MkLoading v-if="fetching" :class="$style.loading"/>
			<div v-else-if="data" :class="$style.content">

				<!-- 核心指标卡片 -->
				<div :class="$style.metricsGrid">
					<div :class="[$style.metricCard, $style.users]">
						<div :class="$style.metricIcon"><i class="ti ti-users"></i></div>
						<div :class="$style.metricBody">
							<div :class="$style.metricValue">
								<MkNumber :value="data.totalUsers"/>
								<span v-if="data.newUsers > 0" :class="$style.metricBadge">+{{ data.newUsers }}</span>
							</div>
							<div :class="$style.metricLabel">总用户</div>
							<div :class="$style.metricSub">本周期新增 {{ data.newUsers }}</div>
						</div>
					</div>

					<div :class="[$style.metricCard, $style.notes]">
						<div :class="$style.metricIcon"><i class="ti ti-pencil"></i></div>
						<div :class="$style.metricBody">
							<div :class="$style.metricValue">
								<MkNumber :value="data.totalNotes"/>
								<span v-if="data.newNotes > 0" :class="$style.metricBadge">+{{ data.newNotes }}</span>
							</div>
							<div :class="$style.metricLabel">总帖子</div>
							<div :class="$style.metricSub">本周期新增 {{ data.newNotes }}</div>
						</div>
					</div>

					<div :class="[$style.metricCard, $style.reactions]">
						<div :class="$style.metricIcon"><i class="ti ti-heart"></i></div>
						<div :class="$style.metricBody">
							<div :class="$style.metricValue">
								<MkNumber :value="data.totalReactions"/>
							</div>
							<div :class="$style.metricLabel">总互动</div>
							<div :class="$style.metricSub">点赞+反应</div>
						</div>
					</div>

					<div :class="[$style.metricCard, $style.online]">
						<div :class="$style.metricIcon"><i class="ti ti-access-point"></i></div>
						<div :class="$style.metricBody">
							<div :class="$style.metricValue">
								<MkNumber :value="data.onlineUsers"/>
							</div>
							<div :class="$style.metricLabel">在线用户</div>
							<div :class="$style.metricSub">5分钟内活跃</div>
						</div>
					</div>

					<div :class="[$style.metricCard, $style.active]">
						<div :class="$style.metricIcon"><i class="ti ti-user-check"></i></div>
						<div :class="$style.metricBody">
							<div :class="$style.metricValue">
								<MkNumber :value="data.activeUsers"/>
							</div>
							<div :class="$style.metricLabel">活跃用户</div>
							<div :class="$style.metricSub">本周期活跃</div>
						</div>
					</div>

					<div :class="[$style.metricCard, $style.drive]">
						<div :class="$style.metricIcon"><i class="ti ti-cloud"></i></div>
						<div :class="$style.metricBody">
							<div :class="$style.metricValue">
								<span>{{ formatBytes(data.totalDriveUsage) }}</span>
							</div>
							<div :class="$style.metricLabel">存储空间</div>
							<div :class="$style.metricSub">{{ data.totalDriveFiles }} 个文件</div>
						</div>
					</div>
				</div>

				<!-- 趋势图表 -->
				<div :class="$style.section">
					<h2 :class="$style.sectionTitle"><i class="ti ti-trending-up"></i> 数据趋势</h2>
					<div :class="$style.chartsGrid">
						<div :class="$style.chartCard">
							<div :class="$style.chartHeader">
								<span :class="$style.chartTitle"><i class="ti ti-users"></i> 用户增长</span>
							</div>
							<div :class="$style.chartBody">
								<canvas ref="userChartEl"></canvas>
							</div>
						</div>

						<div :class="$style.chartCard">
							<div :class="$style.chartHeader">
								<span :class="$style.chartTitle"><i class="ti ti-pencil"></i> 帖子发布</span>
							</div>
							<div :class="$style.chartBody">
								<canvas ref="noteChartEl"></canvas>
							</div>
						</div>

						<div :class="$style.chartCard">
							<div :class="$style.chartHeader">
								<span :class="$style.chartTitle"><i class="ti ti-user-check"></i> 活跃用户</span>
							</div>
							<div :class="$style.chartBody">
								<canvas ref="activeChartEl"></canvas>
							</div>
						</div>

						<div :class="$style.chartCard">
							<div :class="$style.chartHeader">
								<span :class="$style.chartTitle"><i class="ti ti-cloud"></i> 存储使用</span>
							</div>
							<div :class="$style.chartBody">
								<canvas ref="driveChartEl"></canvas>
							</div>
						</div>
					</div>
				</div>

				<!-- Top 榜单 -->
				<div :class="$style.section">
					<h2 :class="$style.sectionTitle"><i class="ti ti-trophy"></i> Top 榜单</h2>
					<div :class="$style.topGrid">
						<!-- Top 发帖用户 -->
						<div :class="$style.topCard">
							<div :class="$style.topHeader">
								<i class="ti ti-crown"></i>
								<span>活跃创作者</span>
							</div>
							<div :class="$style.topList">
								<div
									v-for="(item, index) in data.topPosters"
									:key="item.userId"
									:class="$style.topItem"
								>
									<span :class="[$style.topRank, getRankClass(index)]">{{ index + 1 }}</span>
									<img
										v-if="item.user"
										:class="$style.topAvatar"
										:src="item.user.avatarUrl || '/static-assets/transparent.png'"
									/>
									<div v-else :class="$style.topAvatarPlaceholder"><i class="ti ti-user"></i></div>
									<div :class="$style.topInfo">
										<span :class="$style.topName">{{ item.user?.name || item.user?.username || '未知用户' }}</span>
										<span :class="$style.topCount">{{ item.count }} 帖</span>
									</div>
								</div>
								<div v-if="data.topPosters.length === 0" :class="$style.topEmpty">
									<i class="ti ti-users"></i>
									<span>暂无数据</span>
								</div>
							</div>
						</div>

						<!-- Top 互动帖子 -->
						<div :class="$style.topCard">
							<div :class="$style.topHeader">
								<i class="ti ti-heart"></i>
								<span>热门帖子</span>
							</div>
							<div :class="$style.topList">
								<div
									v-for="(item, index) in data.topReactedNotes"
									:key="item.noteId"
									:class="$style.topItem"
								>
									<span :class="[$style.topRank, getRankClass(index)]">{{ index + 1 }}</span>
									<div :class="$style.topNotePreview">
										<span :class="$style.topNoteText">{{ getNotePreview(item.note) }}</span>
										<span :class="$style.topCount"><i class="ti ti-heart"></i> {{ item.count }}</span>
									</div>
								</div>
								<div v-if="data.topReactedNotes.length === 0" :class="$style.topEmpty">
									<i class="ti ti-message-circle"></i>
									<span>暂无数据</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- 时间范围说明 -->
				<div :class="$style.timeRange">
					<i class="ti ti-calendar"></i>
					数据时间范围: {{ formatDate(data.startDate) }} ~ {{ formatDate(data.endDate) }}
				</div>
			</div>
			<MkError v-else :class="$style.error"/>
		</Transition>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, nextTick, useTemplateRef } from 'vue';
import { Chart } from 'chart.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { useChartTooltip } from '@/composables/use-chart-tooltip.js';
import { initChart } from '@/utility/init-chart.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import MkNumber from '@/components/MkNumber.vue';
import MkButton from '@/components/MkButton.vue';
import { prefer } from '@/preferences.js';

await initChart();

interface AnalyticsData {
	totalUsers: number;
	totalNotes: number;
	totalReactions: number;
	totalDriveUsage: number;
	totalDriveFiles: number;
	onlineUsers: number;
	newUsers: number;
	newNotes: number;
	newReactions: number;
	newDriveUsage: number;
	newDriveFiles: number;
	activeUsers: number;
	usersChart: { labels: string[]; inc: number[]; total: number[] };
	notesChart: { labels: string[]; inc: number[]; total: number[] };
	reactionsChart: { labels: string[]; inc: number[]; total: number[] };
	driveChart: { labels: string[]; inc: number[]; total: number[] };
	activeUsersChart: { labels: string[]; inc: number[]; total: number[] };
	topPosters: { userId: string; count: number; user: any }[];
	topReactedNotes: { noteId: string; count: number; note: any }[];
	span: string;
	startDate: string;
	endDate: string;
}

const ranges = [
	{ value: 'day', label: '24小时' },
	{ value: 'week', label: '7天' },
	{ value: 'month', label: '30天' },
];

const span = ref<'day' | 'week' | 'month'>('week');
const fetching = ref(true);
const data = ref<AnalyticsData | null>(null);

const userChartEl = useTemplateRef<HTMLCanvasElement>('userChartEl');
const noteChartEl = useTemplateRef<HTMLCanvasElement>('noteChartEl');
const activeChartEl = useTemplateRef<HTMLCanvasElement>('activeChartEl');
const driveChartEl = useTemplateRef<HTMLCanvasElement>('driveChartEl');

let userChart: Chart | null = null;
let noteChart: Chart | null = null;
let activeChart: Chart | null = null;
let driveChart: Chart | null = null;

const { handler: externalTooltipHandler } = useChartTooltip();

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleString('zh-CN', {
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function getNotePreview(note: any): string {
	if (!note) return '已删除';
	const text = note.text || '';
	return text.length > 30 ? text.substring(0, 30) + '...' : text || '图片/媒体';
}

function getRankClass(index: number): string {
	if (index === 0) return 'gold';
	if (index === 1) return 'silver';
	if (index === 2) return 'bronze';
	return '';
}

function getThemeVar(name: string): string {
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getChartColors() {
	const accent = getThemeVar('--MI_THEME-accent') || '#7b61ff';
	const fg = getThemeVar('--MI_THEME-fg') || '#1a1a1a';
	const isDark = isColorDark(fg);
	const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

	return {
		users: accent,
		notes: '#4caf50',
		active: '#ff6384',
		drive: '#ff9800',
		grid: gridColor,
	};
}

function isColorDark(hex: string): boolean {
	const rgb = hexToRgb(hex);
	if (!rgb) return false;
	const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
	return luminance < 0.5;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16),
	} : null;
}

function createLineChart(canvas: HTMLCanvasElement, label: string, data: number[], color: string, labels: string[]): Chart {
	return new Chart(canvas, {
		type: 'line',
		data: {
			labels,
			datasets: [{
				label,
				data,
				borderColor: color,
				backgroundColor: color + '20',
				fill: true,
				tension: 0.4,
				pointRadius: 2,
				pointHoverRadius: 4,
			}],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					enabled: false,
					position: 'nearest',
					external: externalTooltipHandler,
				},
			},
			scales: {
				x: { display: false },
				y: {
					beginAtZero: true,
					ticks: { maxTicksLimit: 4, font: { size: 10 } },
					grid: { color: getChartColors().grid },
				},
			},
			interaction: { intersect: false, mode: 'index' },
		},
	});
}

function updateCharts() {
	if (!data.value) return;

	const colors = getChartColors();

	// 销毁旧图表
	if (userChart) { userChart.destroy(); userChart = null; }
	if (noteChart) { noteChart.destroy(); noteChart = null; }
	if (activeChart) { activeChart.destroy(); activeChart = null; }
	if (driveChart) { driveChart.destroy(); driveChart = null; }

	nextTick(() => {
		if (userChartEl.value && data.value) {
			userChart = createLineChart(
				userChartEl.value,
				'用户增长',
				data.value.usersChart.inc,
				colors.users,
				data.value.usersChart.labels,
			);
		}

		if (noteChartEl.value && data.value) {
			noteChart = createLineChart(
				noteChartEl.value,
				'帖子发布',
				data.value.notesChart.inc,
				colors.notes,
				data.value.notesChart.labels,
			);
		}

		if (activeChartEl.value && data.value) {
			activeChart = createLineChart(
				activeChartEl.value,
				'活跃用户',
				data.value.activeUsersChart.inc,
				colors.active,
				data.value.activeUsersChart.labels,
			);
		}

		if (driveChartEl.value && data.value) {
			driveChart = createLineChart(
				driveChartEl.value,
				'存储使用',
				data.value.driveChart.inc,
				colors.drive,
				data.value.driveChart.labels,
			);
		}
	});
}

async function fetchData() {
	fetching.value = true;
	try {
		const result = await misskeyApi('admin/analytics', { span: span.value });
		data.value = result;
		updateCharts();
	} catch (e) {
		console.error('Failed to fetch analytics data:', e);
		data.value = null;
	} finally {
		fetching.value = false;
	}
}

function changeSpan(newSpan: 'day' | 'week' | 'month') {
	span.value = newSpan;
	fetchData();
}

watch(span, () => {
	fetchData();
});

onMounted(() => {
	fetchData();
});

definePage(() => ({
	title: '运营数据',
	icon: 'ti ti-chart-bar',
}));
</script>

<style lang="scss" module>
.root {
	padding: 20px;
}

.loading {
	padding: 60px 0;
}

.error {
	padding: 60px 0;
}

.pageHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 24px;
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
	gap: 12px;
}

.rangeBtns {
	display: flex;
	gap: 4px;
	background: var(--MI_THEME-bg);
	border-radius: 8px;
	padding: 4px;
}

.rangeBtn {
	padding: 8px 16px;
	border-radius: 6px;
	font-size: 13px;
	font-weight: 500;
	color: var(--MI_THEME-fgTransparentWeak);
	transition: all 0.15s;

	&:hover {
		color: var(--MI_THEME-fg);
	}

	&.active {
		background: var(--MI_THEME-accent);
		color: var(--MI_THEME-fgOnAccent, #fff);
	}
}

.refreshBtn {
	padding: 8px 16px;
	font-size: 13px;
}

.content {
	display: flex;
	flex-direction: column;
	gap: 24px;
}

// 核心指标网格
.metricsGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	gap: 16px;
}

.metricCard {
	display: flex;
	align-items: flex-start;
	gap: 14px;
	padding: 20px;
	background: var(--MI_THEME-panel);
	border-radius: 16px;
	border: 1px solid var(--MI_THEME-divider);
	transition: all 0.2s;

	&:hover {
		border-color: var(--MI_THEME-accent);
		box-shadow: 0 8px 24px color-mix(in srgb, var(--MI_THEME-accent) 15%, transparent);
		transform: translateY(-2px);
	}
}

.metricIcon {
	display: grid;
	place-items: center;
	width: 48px;
	height: 48px;
	border-radius: 12px;
	font-size: 22px;
	flex-shrink: 0;

	.users & {
		background: #0088d726;
		color: #0088d7;
	}

	.notes & {
		background: #ff6b3526;
		color: #ff6b35;
	}

	.reactions & {
		background: #e91e6326;
		color: #e91e63;
	}

	.online & {
		background: #8a00d126;
		color: #8a00d1;
	}

	.active & {
		background: #ff638426;
		color: #ff6384;
	}

	.drive & {
		background: #ff980026;
		color: #ff9800;
	}
}

.metricBody {
	flex: 1;
	min-width: 0;
}

.metricValue {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 24px;
	font-weight: 700;
	line-height: 1.2;
}

.metricBadge {
	font-size: 11px;
	font-weight: 600;
	padding: 3px 8px;
	border-radius: 10px;
	background: color-mix(in srgb, var(--MI_THEME-success, #4caf50) 15%, transparent);
	color: var(--MI_THEME-success, #4caf50);
}

.metricLabel {
	font-size: 13px;
	font-weight: 500;
	color: var(--MI_THEME-fg);
	margin-top: 4px;
}

.metricSub {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-top: 2px;
}

// 区块标题
.section {
	background: var(--MI_THEME-panel);
	border-radius: 16px;
	border: 1px solid var(--MI_THEME-divider);
	padding: 20px;
}

.sectionTitle {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 16px;
	font-weight: 600;
	margin: 0 0 20px 0;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--MI_THEME-divider);

	i {
		color: var(--MI_THEME-accent);
	}
}

// 图表网格
.chartsGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 20px;
}

.chartCard {
	background: var(--MI_THEME-bg);
	border-radius: 12px;
	padding: 16px;
	border: 1px solid var(--MI_THEME-divider);
}

.chartHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.chartTitle {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
	font-weight: 600;

	i {
		color: var(--MI_THEME-accent);
		font-size: 16px;
	}
}

.chartBody {
	height: 120px;
	position: relative;
}

// Top 榜单
.topGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: 20px;
}

.topCard {
	background: var(--MI_THEME-bg);
	border-radius: 12px;
	border: 1px solid var(--MI_THEME-divider);
	overflow: hidden;
}

.topHeader {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 14px 16px;
	background: linear-gradient(135deg, color-mix(in srgb, var(--MI_THEME-accent) 8%, var(--MI_THEME-bg)), var(--MI_THEME-bg));
	border-bottom: 1px solid var(--MI_THEME-divider);
	font-size: 14px;
	font-weight: 600;

	i {
		color: var(--MI_THEME-accent);
		font-size: 18px;
	}
}

.topList {
	padding: 8px;
}

.topItem {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 8px;
	border-radius: 8px;
	transition: background 0.15s;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
	}
}

.topRank {
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 6px;
	font-size: 12px;
	font-weight: 700;
	background: var(--MI_THEME-divider);
	color: var(--MI_THEME-fgTransparentWeak);

	&.gold {
		background: linear-gradient(135deg, #ffd700, #ffb300);
		color: #fff;
	}

	&.silver {
		background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
		color: #fff;
	}

	&.bronze {
		background: linear-gradient(135deg, #cd7f32, #b86b2a);
		color: #fff;
	}
}

.topAvatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	object-fit: cover;
	border: 2px solid var(--MI_THEME-divider);
}

.topAvatarPlaceholder {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--MI_THEME-divider);
	color: var(--MI_THEME-fgTransparentWeak);
}

.topInfo {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.topName {
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.topCount {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.topNotePreview {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.topNoteText {
	font-size: 12px;
	color: var(--MI_THEME-fg);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.topEmpty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 24px;
	color: var(--MI_THEME-fgTransparentWeak);

	i {
		font-size: 32px;
	}

	span {
		font-size: 13px;
	}
}

// 时间范围
.timeRange {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 16px;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	border: 1px solid var(--MI_THEME-divider);

	i {
		font-size: 14px;
	}
}

@media (max-width: 768px) {
	.root {
		padding: 12px;
	}

	.pageHeader {
		flex-direction: column;
		gap: 16px;
		align-items: flex-start;
	}

	.metricsGrid {
		grid-template-columns: repeat(2, 1fr);
	}

	.chartsGrid {
		grid-template-columns: 1fr;
	}

	.topGrid {
		grid-template-columns: 1fr;
	}
}
</style>
