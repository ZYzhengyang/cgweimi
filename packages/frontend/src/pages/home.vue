<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<WidgetGrid :source="widgets" @update="onUpdate" />
</div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import WidgetGrid from '@/components/WidgetGrid.vue';
import { prefer } from '@/preferences.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import type { StoredWidget } from '@/composables/use-widget-grid.js';
import { definePage } from '@/page.js';

// 必须用 computed 跟随 prefer 实时变化 — 用静态 const 引用会导致
// WidgetGrid 在删除后再添加时 source 不刷新，items 不会重新计算
const widgets = computed<StoredWidget[]>(() => prefer.r.widgets.value);

function onUpdate(value: StoredWidget[]) {
	prefer.commit('widgets', value);
}

// 首次访问：若 admin 设置了默认布局且用户尚未初始化，则采用 admin 默认
// 注意：admin 默认可能为 null（未设置），此时强制使用系统内置 timeline-only 默认，
// 避免沿用历史偏好（早期版本可能在 prefer.r.widgets 里塞了 8 个 widget）
async function applyAdminDefaultIfFresh() {
	if (prefer.r.widgetsInitialized.value) return;
	try {
		const res = await misskeyApi('widget-layout/default' as any, {} as any) as { layout: StoredWidget[] | null } | null;
		if (res?.layout != null && res.layout.length > 0) {
			// admin 显式配置了非空默认 — 用 admin 的
			prefer.commit('widgets', res.layout);
		} else if (prefer.r.widgets.value.length === 0) {
			// admin 没配置且用户偏好为空 — 用内置 timeline-only 默认
			prefer.commit('widgets', [{
				name: 'timeline',
				id: crypto.randomUUID(),
				place: null,
				data: {},
				layout: { x: 0, y: 0, w: 12, h: 20 },
				pinned: false,
			}]);
		}
		// admin 没配置但用户偏好非空：保留用户已有偏好（尊重用户历史选择）
	} finally {
		prefer.commit('widgetsInitialized', true);
	}
}

onMounted(() => {
	applyAdminDefaultIfFresh();
});

definePage(() => ({
	title: '首页',
	icon: 'ti ti-home',
}));
</script>

<style lang="scss" module>
.root {
	// 整页都是 widget grid，撑满主区域 — 不限制高度
	// grid-layout-plus 已配 :is-bounded="false" :vertical-compact="false"，可拖到任何位置
	display: flex;
	flex-direction: column;
	// Bug B: 默认布局居中 + 两侧留白。
	// - max-width=1400 让大屏幕最多只占中间 1400px
	// - width=calc(100% - 96px) 留出左右各 48px 边距（窄屏下至少保留视觉留白）
	// - margin: 0 auto 在 block 容器里让元素水平居中
	// - padding: 0 24px 给 widget 容器自身再加 24px 内边距
	max-width: 1400px;
	width: calc(100% - 96px);
	margin-left: auto;
	margin-right: auto;
	min-height: calc(100dvh - var(--MI-stickyTop, 0px));
	padding: 0 24px;
}
</style>