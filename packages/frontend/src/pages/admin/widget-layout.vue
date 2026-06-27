<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div :class="$style.toolbar">
		<MkButton primary @click="save">
			<i class="ti ti-device-floppy"></i>
			保存为默认布局
		</MkButton>
		<MkButton @click="reset">
			<i class="ti ti-rotate"></i>
			重置为系统默认
		</MkButton>
		<div :class="$style.status">
			<span v-if="loading">加载中…</span>
			<span v-else-if="dirty" :class="$style.dirty">● 有未保存的改动</span>
			<span v-else :class="$style.saved">✓ 已保存</span>
		</div>
	</div>

	<MkInfo>
		此处编辑的是<strong>全站默认 widget 布局</strong>。新用户首次访问首页时将获得此布局;已有用户不受影响(他们使用自己的偏好)。
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
		text: '确定重置为系统默认?所有自定义的默认布局将被清空,新用户将使用系统硬编码默认。',
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
	title: 'Widget 布局编辑器',
	icon: 'ti ti-layout-grid',
}));
</script>

<style lang="scss" module>
.root {
	padding: 16px;
}

.toolbar {
	display: flex;
	gap: 8px;
	align-items: center;
	margin-bottom: 16px;
}

.status {
	margin-left: auto;
	font-size: 0.9em;
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