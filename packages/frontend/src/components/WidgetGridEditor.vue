<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModalWindow
	ref="modal"
	:width="900"
	:height="600"
	:with-ok-button="true"
	:ok-button-disabled="!dirty"
	@close="onCancel"
	@ok="onSave"
	@closed="onClosed"
>
	<template #header>
		<span :class="$style.headerTitle"><i class="ti ti-layout-grid"></i> 管理小工具</span>
	</template>

	<div :class="$style.body">
		<div v-if="dirty" :class="$style.dirtyHint">
			<i class="ti ti-circle-dot"></i>
			<span>有未保存的改动。点「完成」保存，或点 × 放弃。</span>
		</div>

		<div v-if="!initialWidgets.length" :class="$style.emptyHint">
			<i class="ti ti-info-circle"></i>
			<div>还没有小工具。点上方「添加小工具」开始布置你的首页。</div>
		</div>

		<WidgetGrid
			v-else
			:source="currentWidgets"
			@update="onUpdate"
		/>
	</div>

	<template #footer>
		<MkButton @click="onResetLayout"><i class="ti ti-rotate"></i> 恢复默认</MkButton>
		<span :class="$style.footerSpacer"></span>
		<MkButton @click="onCancel"><i class="ti ti-x"></i> 取消</MkButton>
	</template>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import WidgetGrid from '@/components/WidgetGrid.vue';
import { prefer } from '@/preferences.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import type { StoredWidget } from '@/composables/use-widget-grid.js';

const emit = defineEmits<{
	(e: 'closed'): void;
}>();

const modal = ref<InstanceType<typeof MkModalWindow> | null>(null);

// 加载初始 widgets（如果用户尚未初始化，则采用 admin 默认）
const initialWidgets = ref<StoredWidget[]>(prefer.r.widgets.value);
const currentWidgets = ref<StoredWidget[]>(prefer.r.widgets.value);

const dirty = computed(() => {
	return JSON.stringify(currentWidgets.value) !== JSON.stringify(initialWidgets.value);
});

async function loadAdminDefaultIfFresh() {
	if (prefer.r.widgetsInitialized.value) return;
	try {
		const res = await misskeyApi('widget-layout/default' as any, {} as any) as { layout: StoredWidget[] | null } | null;
		if (res?.layout != null) {
			currentWidgets.value = res.layout as StoredWidget[];
			initialWidgets.value = res.layout as StoredWidget[];
			prefer.commit('widgets', res.layout as any);
		}
	} catch (e) {
		console.error('Failed to apply admin default widget layout:', e);
	} finally {
		prefer.commit('widgetsInitialized', true);
	}
}

void loadAdminDefaultIfFresh();

function onUpdate(value: StoredWidget[]) {
	currentWidgets.value = value;
}

function onSave() {
	prefer.commit('widgets', currentWidgets.value as any);
	initialWidgets.value = currentWidgets.value;
	modal.value?.close();
}

function onCancel() {
	// 不保存，直接关闭
	modal.value?.close();
}

function onClosed() {
	emit('closed');
}

async function onResetLayout() {
	try {
		const res = await misskeyApi('widget-layout/default' as any, {} as any) as { layout: StoredWidget[] | null } | null;
		const defaultLayout = res?.layout ?? [];
		currentWidgets.value = defaultLayout as StoredWidget[];
	} catch (e) {
		console.error('Failed to load default widget layout:', e);
	}
}
</script>

<style lang="scss" module>
.headerTitle {
	display: inline-flex;
	align-items: center;
	gap: 8px;
}

.body {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 16px;
	overflow: auto;
}

.dirtyHint {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	margin-bottom: 12px;
	background: color-mix(in srgb, #f59e0b 12%, transparent);
	border: 1px solid color-mix(in srgb, #f59e0b 30%, transparent);
	border-radius: 8px;
	font-size: 13px;
	color: #b45309;

	& > i {
		font-size: 16px;
	}
}

.emptyHint {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 16px;
	background: var(--cg-bg-secondary);
	border-radius: 12px;
	font-size: 14px;
	color: var(--cg-fg-secondary);

	& > i {
		font-size: 20px;
		flex-shrink: 0;
		margin-top: 2px;
		color: var(--cg-accent);
	}
}

.footerSpacer {
	flex: 1;
}
</style>