<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div :class="$style.grid">
		<!-- CPU -->
		<div :class="$style.card">
			<div :class="$style.cardHeader">
				<i class="ti ti-cpu" :style="{ color: '#3d96c1' }"></i>
				<span>CPU</span>
				<span :class="$style.detail">{{ serverInfo?.cpu.model ?? '...' }}</span>
			</div>
			<div :class="$style.gaugeRow">
				<div :class="$style.gauge">
					<div :class="$style.gaugeBg">
						<div :class="$style.gaugeFill" :style="{ width: `${cpuPercent}%`, background: cpuColor }"></div>
					</div>
				</div>
				<span :class="$style.gaugeValue">{{ cpuPercent }}%</span>
			</div>
			<div :class="$style.sub">{{ serverInfo?.cpu.cores ?? '?' }} cores</div>
		</div>

		<!-- Memory -->
		<div :class="$style.card">
			<div :class="$style.cardHeader">
				<i class="ti ti-device-desktop-analytics" :style="{ color: '#9c5df6' }"></i>
				<span>Memory</span>
			</div>
			<div :class="$style.gaugeRow">
				<div :class="$style.gauge">
					<div :class="$style.gaugeBg">
						<div :class="$style.gaugeFill" :style="{ width: `${memPercent}%`, background: memColor }"></div>
					</div>
				</div>
				<span :class="$style.gaugeValue">{{ memPercent }}%</span>
			</div>
			<div :class="$style.sub">{{ memUsed }} / {{ memTotal }}</div>
		</div>

		<!-- Disk -->
		<div :class="$style.card">
			<div :class="$style.cardHeader">
				<i class="ti ti-database" :style="{ color: '#ff6384' }"></i>
				<span>Disk</span>
			</div>
			<div :class="$style.gaugeRow">
				<div :class="$style.gauge">
					<div :class="$style.gaugeBg">
						<div :class="$style.gaugeFill" :style="{ width: `${diskPercent}%`, background: diskColor }"></div>
					</div>
				</div>
				<span :class="$style.gaugeValue">{{ diskPercent }}%</span>
			</div>
			<div :class="$style.sub">{{ diskUsed }} / {{ diskTotal }}</div>
		</div>

		<!-- Network -->
		<div :class="$style.card">
			<div :class="$style.cardHeader">
				<i class="ti ti-arrows-down-up" :style="{ color: '#00c795' }"></i>
				<span>Network</span>
			</div>
			<div :class="$style.netValues">
				<div :class="$style.netItem">
					<i class="ti ti-arrow-down"></i>
					<span>{{ netRx }}</span>
				</div>
				<div :class="$style.netItem">
					<i class="ti ti-arrow-up"></i>
					<span>{{ netTx }}</span>
				</div>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { markRaw, onMounted, onBeforeUnmount, ref, computed } from 'vue';
import * as Misskey from 'misskey-js';
import { useStream } from '@/stream.js';
import { misskeyApiGet } from '@/utility/misskey-api.js';
import { genId } from '@/utility/id.js';

const connection = markRaw(useStream().useChannel('serverStats'));

const cpuUsage = ref(0);
const memActive = ref(0);
const netRxBytes = ref(0);
const netTxBytes = ref(0);

const serverInfo = ref<Misskey.entities.ServerInfoResponse | null>(null);

misskeyApiGet('server-info', {}).then(res => {
	serverInfo.value = res;
});

function onStats(stats: Misskey.entities.ServerStats) {
	cpuUsage.value = stats.cpu;
	memActive.value = stats.mem.active;
	netRxBytes.value = stats.net.rx;
	netTxBytes.value = stats.net.tx;
}

function onStatsLog(statsLog: Misskey.entities.ServerStatsLog) {
	if (statsLog.length > 0) {
		onStats(statsLog[0]);
	}
}

onMounted(() => {
	connection.on('stats', onStats);
	connection.on('statsLog', onStatsLog);
	connection.send('requestLog', {
		id: genId(),
		length: 1,
	});
});

onBeforeUnmount(() => {
	connection.off('stats', onStats);
	connection.off('statsLog', onStatsLog);
	connection.dispose();
});

const cpuPercent = computed(() => Math.round(cpuUsage.value * 100));
const memPercent = computed(() => {
	if (!serverInfo.value || serverInfo.value.mem.total === 0) return 0;
	return Math.round(memActive.value / serverInfo.value.mem.total * 100);
});
const memUsed = computed(() => formatBytes(memActive.value));
const memTotal = computed(() => serverInfo.value ? formatBytes(serverInfo.value.mem.total) : '...');

const diskPercent = computed(() => {
	if (!serverInfo.value || serverInfo.value.fs.total === 0) return 0;
	return Math.round(serverInfo.value.fs.used / serverInfo.value.fs.total * 100);
});

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const diskUsed = computed(() => serverInfo.value ? formatBytes(serverInfo.value.fs.used) : '...');
const diskTotal = computed(() => serverInfo.value ? formatBytes(serverInfo.value.fs.total) : '...');

function formatSpeed(bytesPerSec: number): string {
	if (bytesPerSec < 1024) return bytesPerSec.toFixed(0) + ' B/s';
	if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
	return (bytesPerSec / 1024 / 1024).toFixed(1) + ' MB/s';
}

const netRx = computed(() => formatSpeed(netRxBytes.value));
const netTx = computed(() => formatSpeed(netTxBytes.value));

function percentColor(p: number): string {
	if (p < 60) return 'var(--MI_THEME-success)';
	if (p < 85) return '#e6a817';
	return 'var(--MI_THEME-error)';
}

const cpuColor = computed(() => percentColor(cpuPercent.value));
const memColor = computed(() => percentColor(memPercent.value));
const diskColor = computed(() => percentColor(diskPercent.value));
</script>

<style lang="scss" module>
.root {
	padding: 4px 0;
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 12px;
}

.card {
	padding: 14px;
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius);
}

.cardHeader {
	display: flex;
	align-items: center;
	gap: 6px;
	font-weight: bold;
	font-size: 0.9em;
	margin-bottom: 10px;

	> i {
		font-size: 16px;
	}

	.detail {
		margin-left: auto;
		font-weight: normal;
		font-size: 0.75em;
		opacity: 0.5;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.gaugeRow {
	display: flex;
	align-items: center;
	gap: 10px;
}

.gauge {
	flex: 1;
}

.gaugeBg {
	height: 8px;
	background: var(--MI_THEME-panelHighlight);
	border-radius: 4px;
	overflow: hidden;
}

.gaugeFill {
	height: 100%;
	border-radius: 4px;
	transition: width 0.5s ease;
}

.gaugeValue {
	font-size: 1.1em;
	font-weight: bold;
	min-width: 42px;
	text-align: right;
}

.sub {
	margin-top: 6px;
	font-size: 0.75em;
	opacity: 0.5;
}

.netValues {
	display: flex;
	gap: 20px;
}

.netItem {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.95em;

	> i {
		font-size: 14px;
		opacity: 0.6;
	}
}
</style>
