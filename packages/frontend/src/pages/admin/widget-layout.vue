<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<!-- 浮动顶部栏：sticky + 可折叠，不占 grid 布局空间 -->
	<div :class="[$style.toolbar, { [$style.toolbarCollapsed]: collapsed }]">
		<div :class="$style.toolbarMain">
			<MkButton primary @click="save">
				<i class="ti ti-device-floppy"></i>
				{{ i18n.ts._widgetGrid._admin.saveAsDefault }}
			</MkButton>
			<MkButton @click="reset">
				<i class="ti ti-rotate"></i>
				{{ i18n.ts._widgetGrid._admin.resetDefault }}
			</MkButton>
			<div :class="$style.status">
				<span v-if="loading">加载中…</span>
				<span v-else-if="dirty" :class="$style.dirty">● 有未保存的改动</span>
				<span v-else :class="$style.saved">✓ 已保存</span>
			</div>
			<!-- 折叠按钮：折叠后整个 toolbar 缩成右下角小药丸，让 widget 占据 y=0 -->
			<button :class="$style.collapseBtn" class="_button" :title="collapsed ? '展开工具栏' : '折叠工具栏'" @click="collapsed = !collapsed">
				<i :class="collapsed ? 'ti ti-chevron-down' : 'ti ti-chevron-up'"></i>
			</button>
		</div>
	</div>

	<!-- 折叠后只显示小药丸提示 -->
	<button v-if="collapsed" :class="[$style.statusPill, '_button', { [$style.statusPillDirty]: dirty }]" @click="collapsed = false">
		<i class="ti ti-layout-grid"></i>
		<span>{{ dirty ? '有未保存改动' : '工具栏已折叠 — 点此展开' }}</span>
	</button>

	<MkInfo v-if="!collapsed">
		{{ i18n.ts._widgetGrid._admin.description }}
	</MkInfo>

	<div v-if="loading" :class="$style.empty">
		<i class="ti ti-loader"></i>
	</div>
	<div v-else-if="widgets.length === 0" :class="$style.empty">
		<i class="ti ti-layout-grid"></i>
		<div>当前没有默认布局。点「保存为默认布局」以保存当前编辑结果,或点「重置为系统默认」恢复硬编码默认。</div>
	</div>
	<WidgetGrid
		v-else
		:source="widgets"
		@update="onUpdate"
	/>
</div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import WidgetGrid from '@/components/WidgetGrid.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import type { StoredWidget } from '@/composables/use-widget-grid.js';

const widgets = ref<StoredWidget[]>([]);
const loading = ref(true);
const dirty = ref(false);
// 工具栏折叠状态 — 折叠后 widget grid 可占据 y=0 完整空间
const collapsed = ref(false);

async function load() {
	loading.value = true;
	try {
		const res = await misskeyApi('admin/widget-layout/get-default' as any, {} as any) as { layout: StoredWidget[] | null } | null;
		widgets.value = res?.layout ?? [];
		dirty.value = false;
	} finally {
		loading.value = false;
	}
}

function onUpdate(value: StoredWidget[]) {
	widgets.value = value;
	dirty.value = true;
}

async function save() {
	if (!dirty.value && widgets.value.length > 0) {
		os.toast('没有需要保存的改动');
		return;
	}
	try {
		await misskeyApi('admin/widget-layout/set-default' as any, { layout: widgets.value } as any);
		dirty.value = false;
		os.toast(i18n.ts.saved);
	} catch (e) {
		os.toast(i18n.ts.somethingHappened);
		console.error(e);
	}
}

async function reset() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.ts._widgetGrid._admin.resetConfirm,
	});
	if (canceled) return;
	try {
		await misskeyApi('admin/widget-layout/reset-default' as any, {} as any);
		await load();
		os.toast('已重置为系统默认');
	} catch (e) {
		os.toast('重置失败');
		console.error(e);
	}
}

onMounted(() => {
	load();
});

definePage(() => ({
	title: i18n.ts._widgetGrid._admin.title,
	icon: 'ti ti-layout-grid',
}));
</script>

<style lang="scss" module>
.root {
	padding: 16px;
	padding-top: 64px; // 给 sticky toolbar 留出空间，避免首次加载时被遮挡
	position: relative;
}

// 浮动 toolbar：sticky 顶部，滚动时跟随，不占 grid 布局空间
.toolbar {
	position: sticky;
	top: 8px;
	z-index: 50;
	margin: -48px 0 12px; // 负 margin 把 toolbar 视觉上拉到 root 顶部
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
	padding: 8px 12px;
	background: color-mix(in srgb, var(--MI_THEME-panel, #fff) 92%, transparent);
	backdrop-filter: blur(8px);
	border: 1px solid var(--MI_THEME-divider, rgba(0,0,0,0.1));
	border-radius: 10px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.toolbarCollapsed {
	opacity: 0.5;

	&:hover {
		opacity: 1;
	}
}

.toolbarMain {
	display: flex;
	gap: 8px;
	align-items: center;
	width: 100%;
}

.status {
	margin-left: auto;
	font-size: 0.9em;
}

.collapseBtn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 8px;
	background: transparent;
	color: var(--MI_THEME-fg, #555);
	transition: background 0.15s ease;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg, rgba(0,0,0,0.05));
	}
}

// 折叠后右下角小药丸，提示用户点此展开
.statusPill {
	position: fixed;
	right: 24px;
	top: 80px; // 避开 admin 顶部 nav
	z-index: 49;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	border-radius: 999px;
	background: var(--MI_THEME-panel, #fff);
	color: var(--MI_THEME-fg, #555);
	border: 1px solid var(--MI_THEME-divider, rgba(0,0,0,0.1));
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	font-size: 0.85em;
	cursor: pointer;
	transition: transform 0.15s ease, background 0.15s ease;

	i {
		font-size: 14px;
	}

	&:hover {
		transform: scale(1.04);
		background: var(--MI_THEME-buttonHoverBg, rgba(0,0,0,0.05));
	}
}

.statusPillDirty {
	color: var(--MI-warning, #f0a020);
	border-color: color-mix(in srgb, var(--MI-warning, #f0a020) 40%, transparent);
}

.dirty {
	color: var(--MI-warning, #f0a020);
}

.saved {
	color: var(--MI-success, #4caf50);
}

.empty {
	padding: 48px;
	text-align: center;
	color: var(--MI-text-secondary, #888);

	i {
		font-size: 48px;
		display: block;
		margin-bottom: 16px;
	}
}
</style>