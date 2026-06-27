<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<!-- 桌面端：左栏品牌区 + 中栏时间线 / 平板：左栏 / 移动：单列 -->
	<aside v-if="layout !== 'mobile'" :class="$style.leftRail">
		<div :class="$style.hero">
			<div :class="$style.heroSlogan">创作者的灵感社区</div>
			<div :class="$style.heroSub">CG微米 · 值得学习的创作者都在这里</div>
		</div>
		<MkA to="/creator-zone" :class="$style.zoneCard">
			<div :class="$style.zoneCardTitle">认证创作者</div>
			<div :class="$style.zoneCardSub">查看创作者名录 →</div>
		</MkA>
	</aside>

	<main :class="$style.center">
		<WidgetGrid :source="widgets" @update="onUpdate" />
	</main>
</div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import WidgetGrid from '@/components/WidgetGrid.vue';
import { prefer } from '@/preferences.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import type { StoredWidget } from '@/composables/use-widget-grid.js';
import { definePage } from '@/page.js';

const widgets = prefer.r.widgets.value;

function onUpdate(value: StoredWidget[]) {
	prefer.commit('widgets', value);
}

// 响应式断点
const DESKTOP_MIN = 1100;
const TABLET_MIN = 900;
const layout = ref<'desktop' | 'tablet' | 'mobile'>('desktop');
function updateLayout() {
	const w = window.innerWidth;
	if (w >= DESKTOP_MIN) layout.value = 'desktop';
	else if (w >= TABLET_MIN) layout.value = 'tablet';
	else layout.value = 'mobile';
}

// 首次访问：若 admin 设置了默认布局且用户尚未初始化，则采用 admin 默认
async function applyAdminDefaultIfFresh() {
	if (prefer.r.widgetsInitialized.value) return;
	try {
		const res = await misskeyApi('widget-layout/default' as any, {} as any) as { layout: StoredWidget[] | null } | null;
		if (res?.layout != null) {
			prefer.commit('widgets', res.layout);
		}
	} catch (e) {
		console.error('Failed to apply admin default widget layout:', e);
	} finally {
		prefer.commit('widgetsInitialized', true);
	}
}

onMounted(() => {
	updateLayout();
	window.addEventListener('resize', updateLayout);
	applyAdminDefaultIfFresh();
});
onUnmounted(() => window.removeEventListener('resize', updateLayout));

definePage(() => ({
	title: '首页',
	icon: 'ti ti-home',
}));
</script>

<style lang="scss" module>
.root {
	display: grid;
	grid-template-columns: 1fr;
	gap: var(--cg-space-6);
	padding: var(--cg-space-6);
	max-width: 880px;
	margin: 0 auto;
	background: var(--cg-bg-primary);
	min-height: 100%;

	@media (min-width: 900px) {
		grid-template-columns: 240px 1fr;
		max-width: 1280px;
	}
}

.leftRail {
	display: none;
	flex-direction: column;
	gap: var(--cg-space-4);

	@media (min-width: 900px) {
		display: flex;
		position: sticky;
		top: var(--cg-space-6);
		align-self: start;
		max-height: calc(100dvh - var(--cg-space-6) * 2);
		overflow-y: auto;
	}
}

.hero {
	padding: var(--cg-space-4);
	background: var(--cg-bg-secondary);
	border: 1px solid var(--cg-border);
	border-radius: var(--cg-radius-lg);
}

.heroSlogan {
	font-size: 18px;
	font-weight: 600;
	color: var(--cg-text-primary);
	margin-bottom: var(--cg-space-1);
}

.heroSub {
	font-size: 13px;
	color: var(--cg-text-secondary);
}

.zoneCard {
	display: block;
	padding: var(--cg-space-4);
	background: var(--cg-bg-secondary);
	border: 1px solid var(--cg-border);
	border-radius: var(--cg-radius-lg);
	text-decoration: none;
	transition: border-color 0.15s ease;

	&:hover {
		border-color: var(--cg-accent);
	}
}

.zoneCardTitle {
	font-size: 14px;
	font-weight: 600;
	color: var(--cg-text-primary);
	margin-bottom: var(--cg-space-1);
}

.zoneCardSub {
	font-size: 12px;
	color: var(--cg-text-secondary);
}

.center {
	min-width: 0;
}
</style>