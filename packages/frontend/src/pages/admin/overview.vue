<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_spacer" style="--MI_SPACER-w: 1000px;">
	<div ref="rootEl" :class="$style.root">
		<!-- 快速操作 -->
		<div :class="$style.quickActions">
			<MkA to="/admin/featured" :class="$style.quickBtn">
				<i class="ti ti-star"></i>
				<span>精选推荐</span>
			</MkA>
			<MkA to="/admin/categories" :class="$style.quickBtn">
				<i class="ti ti-folder"></i>
				<span>分类管理</span>
			</MkA>
			<MkA to="/admin/banners" :class="$style.quickBtn">
				<i class="ti ti-photo"></i>
				<span>Banner</span>
			</MkA>
			<MkA to="/admin/page-layout" :class="$style.quickBtn">
				<i class="ti ti-layout"></i>
				<span>页面布局</span>
			</MkA>
			<MkA to="/admin/users" :class="$style.quickBtn">
				<i class="ti ti-users"></i>
				<span>用户管理</span>
			</MkA>
			<MkA to="/admin/files" :class="$style.quickBtn">
				<i class="ti ti-cloud"></i>
				<span>文件管理</span>
			</MkA>
		</div>

		<MkFoldableSection class="item" :defaultOpen="true">
			<template #header><i class="ti ti-server"></i> 服务器状态</template>
			<XServerMetric/>
		</MkFoldableSection>

		<MkFoldableSection class="item">
			<template #header><i class="ti ti-chart-bar"></i> 数据概览</template>
			<XStats/>
		</MkFoldableSection>

		<MkFoldableSection class="item" :defaultOpen="true">
			<template #header><i class="ti ti-trending-up"></i> 趋势图表</template>
			<XTrends/>
		</MkFoldableSection>

		<MkFoldableSection class="item">
			<template #header><i class="ti ti-users"></i> 活跃用户</template>
			<XActiveUsers/>
		</MkFoldableSection>

		<MkFoldableSection class="item">
			<template #header><i class="ti ti-robot"></i> 内容搬运</template>
			<XScraping/>
		</MkFoldableSection>

		<MkFoldableSection class="item">
			<template #header><i class="ti ti-calendar"></i> 活跃热图</template>
			<XHeatmap/>
		</MkFoldableSection>

		<MkFoldableSection class="item">
			<template #header><i class="ti ti-shield"></i> 管理员</template>
			<XModerators/>
		</MkFoldableSection>

		<MkFoldableSection class="item">
			<template #header><i class="ti ti-world"></i> 联邦</template>
			<XFederation/>
		</MkFoldableSection>

		<MkFoldableSection class="item">
			<template #header><i class="ti ti-server"></i> 实例</template>
			<XInstances/>
		</MkFoldableSection>

		<MkFoldableSection class="item">
			<template #header><i class="ti ti-cloud-computing"></i> AP 请求</template>
			<XApRequests/>
		</MkFoldableSection>

		<MkFoldableSection class="item">
			<template #header><i class="ti ti-user-plus"></i> 新用户</template>
			<XUsers/>
		</MkFoldableSection>

		<MkFoldableSection class="item">
			<template #header><i class="ti ti-truck-delivery"></i> 发送队列</template>
			<XQueue domain="deliver"/>
		</MkFoldableSection>

		<MkFoldableSection class="item">
			<template #header><i class="ti ti-inbox"></i> 接收队列</template>
			<XQueue domain="inbox"/>
		</MkFoldableSection>
	</div>
</div>
</template>

<script lang="ts" setup>
import { markRaw, onMounted, onBeforeUnmount, nextTick, shallowRef, ref, computed, useTemplateRef } from 'vue';
import * as Misskey from 'misskey-js';
import XFederation from './overview.federation.vue';
import XInstances from './overview.instances.vue';
import XQueue from './overview.queue.vue';
import XApRequests from './overview.ap-requests.vue';
import XUsers from './overview.users.vue';
import XActiveUsers from './overview.active-users.vue';
import XStats from './overview.stats.vue';
import XRetention from './overview.retention.vue';
import XModerators from './overview.moderators.vue';
import XHeatmap from './overview.heatmap.vue';
import XScraping from './overview.scraping.vue';
import XTrends from './overview.trends.vue';
import XServerMetric from './overview.server-metric.vue';
import type { InstanceForPie } from './overview.pie.vue';
import * as os from '@/os.js';
import { misskeyApi, misskeyApiGet } from '@/utility/misskey-api.js';
import { useStream } from '@/stream.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import MkFoldableSection from '@/components/MkFoldableSection.vue';
import { genId } from '@/utility/id.js';

const rootEl = useTemplateRef('rootEl');
const serverInfo = ref<Misskey.entities.ServerInfoResponse | null>(null);
const topSubInstancesForPie = ref<InstanceForPie[] | null>(null);
const topPubInstancesForPie = ref<InstanceForPie[] | null>(null);
const federationPubActive = ref<number | null>(null);
const federationPubActiveDiff = ref<number | null>(null);
const federationSubActive = ref<number | null>(null);
const federationSubActiveDiff = ref<number | null>(null);
const newUsers = ref<Misskey.entities.UserDetailed[] | null>(null);
const activeInstances = shallowRef<Misskey.entities.FederationInstancesResponse | null>(null);
const queueStatsConnection = markRaw(useStream().useChannel('queueStats'));
const now = new Date();
const filesPagination = {
	endpoint: 'admin/drive/files' as const,
	limit: 9,
	noPaging: true,
};

function onInstanceClick(i: Misskey.entities.FederationInstance) {
	os.pageWindow(`/instance-info/${i.host}`);
}

onMounted(async () => {
	/*
	const magicGrid = new MagicGrid({
		container: rootEl,
		static: true,
		animate: true,
	});

	magicGrid.listen();
	*/

	misskeyApiGet('charts/federation', { limit: 2, span: 'day' }).then(chart => {
		federationPubActive.value = chart.pubActive[0];
		federationPubActiveDiff.value = chart.pubActive[0] - chart.pubActive[1];
		federationSubActive.value = chart.subActive[0];
		federationSubActiveDiff.value = chart.subActive[0] - chart.subActive[1];
	});

	misskeyApiGet('federation/stats', { limit: 10 }).then(res => {
		topSubInstancesForPie.value = [
			...res.topSubInstances.map(x => ({
				name: x.host,
				color: x.themeColor,
				value: x.followersCount,
				onClick: () => {
					os.pageWindow(`/instance-info/${x.host}`);
				},
			})),
			{ name: '(other)', color: '#80808080', value: res.otherFollowersCount },
		];
		topPubInstancesForPie.value = [
			...res.topPubInstances.map(x => ({
				name: x.host,
				color: x.themeColor,
				value: x.followingCount,
				onClick: () => {
					os.pageWindow(`/instance-info/${x.host}`);
				},
			})),
			{ name: '(other)', color: '#80808080', value: res.otherFollowingCount },
		];
	});

	misskeyApi('admin/server-info').then(serverInfoResponse => {
		serverInfo.value = serverInfoResponse;
	});

	misskeyApi('admin/show-users', {
		limit: 5,
		sort: '+createdAt',
	}).then(res => {
		newUsers.value = res;
	});

	misskeyApi('federation/instances', {
		sort: '+latestRequestReceivedAt',
		limit: 25,
	}).then(res => {
		activeInstances.value = res;
	});

	nextTick(() => {
		queueStatsConnection.send('requestLog', {
			id: genId(),
			length: 100,
		});
	});
});

onBeforeUnmount(() => {
	queueStatsConnection.dispose();
});

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePage(() => ({
	title: i18n.ts.dashboard,
	icon: 'ti ti-dashboard',
}));
</script>

<style lang="scss" module>
.root {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
	grid-gap: 16px;
}

.quickActions {
	grid-column: 1 / -1;
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	padding: 16px;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
}

.quickBtn {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 16px;
	background: var(--MI_THEME-bg);
	border-radius: 8px;
	font-size: 13px;
	font-weight: 500;
	color: var(--MI_THEME-fg);
	text-decoration: none;
	transition: all 0.15s;

	&:hover {
		background: var(--MI_THEME-accentedBg);
		color: var(--MI_THEME-accent);
		text-decoration: none;
	}

	i {
		font-size: 16px;
	}
}
</style>
