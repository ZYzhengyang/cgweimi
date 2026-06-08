<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div :class="$style.header">
		<div :class="$style.rangeBtns">
			<button
				v-for="r in ranges"
				:key="r.value"
				class="_button"
				:class="[$style.rangeBtn, { [$style.active]: range === r.value }]"
				@click="range = r.value"
			>{{ r.label }}</button>
		</div>
	</div>

	<div :class="$style.charts">
		<!-- 用户增长 -->
		<div :class="$style.chartCard">
			<div :class="$style.chartHeader">
				<span :class="$style.chartTitle"><i class="ti ti-users"></i> 用户增长</span>
				<span v-if="userDiff !== null" :class="[$style.chartDiff, userDiff >= 0 ? $style.positive : $style.negative]">
					{{ userDiff >= 0 ? '+' : '' }}{{ userDiff }}
				</span>
			</div>
			<div :class="$style.chartBody">
				<canvas ref="userChartEl"></canvas>
			</div>
			<div :class="$style.chartFooter">
				<span>总计: {{ userTotal ?? '-' }}</span>
			</div>
		</div>

		<!-- 帖子发布 -->
		<div :class="$style.chartCard">
			<div :class="$style.chartHeader">
				<span :class="$style.chartTitle"><i class="ti ti-pencil"></i> 帖子发布</span>
				<span v-if="noteDiff !== null" :class="[$style.chartDiff, noteDiff >= 0 ? $style.positive : $style.negative]">
					{{ noteDiff >= 0 ? '+' : '' }}{{ noteDiff }}
				</span>
			</div>
			<div :class="$style.chartBody">
				<canvas ref="noteChartEl"></canvas>
			</div>
			<div :class="$style.chartFooter">
				<span>总计: {{ noteTotal ?? '-' }}</span>
			</div>
		</div>

		<!-- 活跃用户 -->
		<div :class="$style.chartCard">
			<div :class="$style.chartHeader">
				<span :class="$style.chartTitle"><i class="ti ti-heartbeat"></i> 活跃用户</span>
				<span v-if="activeDiff !== null" :class="[$style.chartDiff, activeDiff >= 0 ? $style.positive : $style.negative]">
					{{ activeDiff >= 0 ? '+' : '' }}{{ activeDiff }}
				</span>
			</div>
			<div :class="$style.chartBody">
				<canvas ref="activeChartEl"></canvas>
			</div>
			<div :class="$style.chartFooter">
				<span>今日: {{ activeTotal ?? '-' }}</span>
			</div>
		</div>

		<!-- 文件存储 -->
		<div :class="$style.chartCard">
			<div :class="$style.chartHeader">
				<span :class="$style.chartTitle"><i class="ti ti-cloud"></i> 文件存储</span>
				<span v-if="driveDiff !== null" :class="[$style.chartDiff, $style.positive]">
					+{{ formatBytes(driveDiff) }}
				</span>
			</div>
			<div :class="$style.chartBody">
				<canvas ref="driveChartEl"></canvas>
			</div>
			<div :class="$style.chartFooter">
				<span>总计: {{ formatBytes(driveTotal) }}</span>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, nextTick, useTemplateRef } from 'vue';
import { Chart } from 'chart.js';
import { misskeyApiGet } from '@/utility/misskey-api.js';
import { useChartTooltip } from '@/composables/use-chart-tooltip.js';
import { initChart } from '@/utility/init-chart.js';
import { i18n } from '@/i18n.js';

initChart();

const ranges = [
	{ value: 'day', label: '24小时' },
	{ value: 'week', label: '7天' },
	{ value: 'month', label: '30天' },
];

const range = ref<'day' | 'week' | 'month'>('week');
const limit = ref(7);

const userChartEl = useTemplateRef('userChartEl');
const noteChartEl = useTemplateRef('noteChartEl');
const activeChartEl = useTemplateRef('activeChartEl');
const driveChartEl = useTemplateRef('driveChartEl');

const userDiff = ref<number | null>(null);
const userTotal = ref<number | null>(null);
const noteDiff = ref<number | null>(null);
const noteTotal = ref<number | null>(null);
const activeDiff = ref<number | null>(null);
const activeTotal = ref<number | null>(null);
const driveDiff = ref<number | null>(null);
const driveTotal = ref<number | null>(null);

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

function makeLabels(span: string, data: any[]): string[] {
	return data.map((_, i) => {
		if (span === 'day') return `${i}时`;
		if (span === 'week') return `${i + 1}天前`;
		return `${i + 1}天前`;
	}).reverse();
}

function createChart(canvas: HTMLCanvasElement, label: string, data: number[], color: string, span: string): Chart {
	return new Chart(canvas, {
		type: 'line',
		data: {
			labels: makeLabels(span, data),
			datasets: [{
				label,
				data,
				borderColor: color,
				backgroundColor: color + '20',
				fill: true,
				tension: 0.4,
				pointRadius: 3,
				pointHoverRadius: 5,
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
					ticks: { maxTicksLimit: 3, font: { size: 10 } },
					grid: { color: 'rgba(128,128,128,0.1)' },
				},
			},
			interaction: { intersect: false, mode: 'index' },
		},
	});
}

async function fetchData() {
	const span = range.value;
	const l = range.value === 'day' ? 24 : range.value === 'week' ? 7 : 30;

	// 用户增长
	try {
		const users = await misskeyApiGet('charts/users', { limit: l, span });
		const data = users.local.inc;
		userDiff.value = data.length >= 2 ? data[data.length - 1] - data[data.length - 2] : null;
		userTotal.value = users.local.total[users.local.total.length - 1] ?? null;

		await nextTick();
		if (userChart) userChart.destroy();
		if (userChartEl.value) {
			userChart = createChart(userChartEl.value, '新增用户', data, '#86b300', span);
		}
	} catch (e) {
		console.error('Failed to fetch users chart:', e);
	}

	// 帖子发布
	try {
		const notes = await misskeyApiGet('charts/notes', { limit: l, span });
		const data = notes.local.inc;
		noteDiff.value = data.length >= 2 ? data[data.length - 1] - data[data.length - 2] : null;
		noteTotal.value = notes.local.total[notes.local.total.length - 1] ?? null;

		await nextTick();
		if (noteChart) noteChart.destroy();
		if (noteChartEl.value) {
			noteChart = createChart(noteChartEl.value, '新增帖子', data, '#36a2eb', span);
		}
	} catch (e) {
		console.error('Failed to fetch notes chart:', e);
	}

	// 活跃用户
	try {
		const active = await misskeyApiGet('charts/active-users', { limit: l, span });
		const data = active.local.inc;
		activeDiff.value = data.length >= 2 ? data[data.length - 1] - data[data.length - 2] : null;
		activeTotal.value = data[data.length - 1] ?? null;

		await nextTick();
		if (activeChart) activeChart.destroy();
		if (activeChartEl.value) {
			activeChart = createChart(activeChartEl.value, '活跃用户', data, '#ff6384', span);
		}
	} catch (e) {
		console.error('Failed to fetch active-users chart:', e);
	}

	// 文件存储
	try {
		const drive = await misskeyApiGet('charts/drive', { limit: l, span });
		const data = drive.local.inc;
		driveDiff.value = data.length >= 2 ? data[data.length - 1] : null;
		driveTotal.value = drive.local.total[drive.local.total.length - 1] ?? null;

		await nextTick();
		if (driveChart) driveChart.destroy();
		if (driveChartEl.value) {
			driveChart = createChart(driveChartEl.value, '新增存储', data, '#ffce56', span);
		}
	} catch (e) {
		console.error('Failed to fetch drive chart:', e);
	}
}

watch(range, () => {
	limit.value = range.value === 'day' ? 24 : range.value === 'week' ? 7 : 30;
	fetchData();
});

onMounted(() => {
	fetchData();
});
</script>

<style lang="scss" module>
.root {
	/* no extra margin needed, parent handles spacing */
}

.header {
	display: flex;
	justify-content: flex-end;
	margin-bottom: 12px;
}

.rangeBtns {
	display: flex;
	gap: 4px;
	background: var(--MI_THEME-panel);
	border-radius: 8px;
	padding: 4px;
}

.rangeBtn {
	padding: 6px 14px;
	border-radius: 6px;
	font-size: 12px;
	font-weight: 500;
	color: var(--MI_THEME-fgTransparentWeak);
	transition: all 0.15s;

	&:hover {
		color: var(--MI_THEME-fg);
	}

	&.active {
		background: var(--MI_THEME-accent);
		color: #fff;
	}
}

.charts {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 12px;
}

.chartCard {
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	padding: 16px;
	overflow: hidden;
}

.chartHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.chartTitle {
	font-size: 13px;
	font-weight: 600;
	color: var(--MI_THEME-fg);

	i {
		margin-right: 6px;
		color: var(--MI_THEME-fgTransparentWeak);
	}
}

.chartDiff {
	font-size: 13px;
	font-weight: 600;
	padding: 2px 8px;
	border-radius: 6px;

	&.positive {
		color: #4caf50;
		background: rgba(76, 175, 80, 0.1);
	}

	&.negative {
		color: #f44336;
		background: rgba(244, 67, 54, 0.1);
	}
}

.chartBody {
	height: 120px;
	margin-bottom: 8px;
}

.chartFooter {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	text-align: right;
}
</style>
