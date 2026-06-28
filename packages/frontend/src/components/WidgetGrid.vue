<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div :class="$style.toolbar">
		<MkButton primary @click="addWidgetDialog"><i class="ti ti-plus"></i> {{ i18n.ts._widgetGrid.addWidget }}</MkButton>
		<MkButton @click="editMode = !editMode">
			<i :class="editMode ? 'ti ti-check' : 'ti ti-edit'"></i>
			{{ editMode ? i18n.ts._widgetGrid.finishEdit : i18n.ts._widgetGrid.edit }}
		</MkButton>
		<MkButton @click="resetLayout"><i class="ti ti-rotate"></i> {{ i18n.ts._widgetGrid.resetLayout }}</MkButton>
	</div>

	<GridLayout
		v-model:layout="layout"
		:col-num="columns"
		:row-height="rowHeight"
		:margin="margin"
		:is-draggable="editMode"
		:is-resizable="editMode"
		:vertical-compact="true"
		:use-css-transforms="true"
		:class="gridClass"
		@update:layout="onLayoutUpdate"
	>
		<GridItem
			v-for="item in items"
			:key="item.i"
			:x="item.x"
			:y="item.y"
			:w="item.w"
			:h="item.h"
			:i="item.i"
			:static="item.pinned"
		>
			<WidgetGridItem
				:widget="item"
				:edit-mode="editMode"
				@configure="onConfigure(item)"
				@toggle-pin="togglePin(item.i)"
				@remove="removeItem(item.i)"
				@update-data="onUpdateData"
			/>
		</GridItem>
	</GridLayout>

	<!-- Hidden widget instance for configure() invocation -->
	<component
		:is="configureTarget?.name != null ? `widget-${configureTarget.name}` : null"
		v-show="false"
		ref="hiddenWidgetRef"
		:widget="{ id: configureTarget?.i, data: configureTarget?.data ?? {} }"
		@updateProps="onHiddenUpdate"
	/>
</div>
</template>

<script lang="ts" setup>
import { ref, nextTick, onUnmounted, computed, useCssModule } from 'vue';
import { GridLayout, GridItem } from 'grid-layout-plus';
import MkButton from '@/components/MkButton.vue';
import WidgetGridItem from '@/components/WidgetGridItem.vue';
import { useWidgetGrid, type StoredWidget, type GridItem as WGridItem } from '@/composables/use-widget-grid.js';
import { widgets, type WidgetName } from '@/widgets/index.js';
import { WIDGET_LABELS } from '@/widgets/labels.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';

const $style = useCssModule();

const props = defineProps<{
	source: StoredWidget[];
}>();

const emit = defineEmits<{
	(e: 'update', value: StoredWidget[]): void;
}>();

const editMode = ref(false);
const configureTarget = ref<{ i: string; name: WidgetName; data: Record<string, unknown> } | null>(null);
const hiddenWidgetRef = ref<{ configure: () => Promise<void> } | null>(null);

const {
	items,
	layout,
	columns,
	rowHeight,
	margin,
	togglePin,
	removeItem,
	addItem,
	serialize,
} = useWidgetGrid(ref(props.source));

// 已添加的 widget 类型（用于"已添加"标记）
const addedWidgetNames = computed(() => new Set(props.source.map(w => w.name)));

// 编辑模式下高亮 grid
const gridClass = computed(() => editMode.value ? $style.gridEditing : $style.gridView);

const updateTimer = ref<ReturnType<typeof setTimeout> | null>(null);

function scheduleUpdate() {
	if (updateTimer.value != null) {
		clearTimeout(updateTimer.value);
	}
	updateTimer.value = setTimeout(() => {
		emit('update', serialize());
		updateTimer.value = null;
	}, 1000);
}

function onLayoutUpdate() {
	scheduleUpdate();
}

onUnmounted(() => {
	if (updateTimer.value) clearTimeout(updateTimer.value);
});

async function onConfigure(item: WGridItem) {
	configureTarget.value = {
		i: item.i,
		name: item.name as WidgetName,
		data: item.data ?? {},
	};
	await nextTick();
	const inst = hiddenWidgetRef.value;
	if (inst != null && typeof inst.configure === 'function') {
		await inst.configure();
	}
	configureTarget.value = null;
}

function onHiddenUpdate(data: Record<string, unknown>) {
	const target = configureTarget.value;
	if (target == null) return;
	onUpdateData({ id: target.i, data });
}

function onUpdateData(payload: { id: string; data: Record<string, unknown> }) {
	const { id, data } = payload;
	const next = props.source.map(w => w.id === id ? { ...w, data } : w);
	emit('update', next);
}

function resetLayout() {
	os.confirm({
		type: 'warning',
		text: i18n.ts._widgetGrid.resetConfirm,
	}).then(({ canceled }) => {
		if (canceled) return;
		emit('update', []);
	});
}

async function addWidgetDialog() {
	// 第一步：让用户输入搜索关键词
	const { canceled: cancelSearch, result: query } = await os.inputText({
		title: i18n.ts._widgetGrid.addWidget,
		text: '输入名称（留空显示全部）',
		placeholder: '例如：通知 / 时间线 / RSS',
		default: '',
		minLength: 0,
	});
	if (cancelSearch) return;

	const q = (query ?? '').trim().toLowerCase();
	const filtered = (widgets as readonly WidgetName[]).filter(name => {
		if (q === '') return true;
		const meta = WIDGET_LABELS[name];
		return (
			name.toLowerCase().includes(q) ||
			(meta?.label ?? '').toLowerCase().includes(q) ||
			(meta?.category ?? '').toLowerCase().includes(q)
		);
	});

	if (filtered.length === 0) {
		os.toast('没有匹配的小工具');
		return;
	}

	const items = filtered.map(name => {
		const meta = WIDGET_LABELS[name];
		const label = meta ? `${meta.label}（${name}）` : name;
		return {
			value: name,
			label,
		};
	});

	const { canceled, result } = await os.select({
		title: q === '' ? i18n.ts._widgetGrid.addWidget : `搜索「${query}」：${filtered.length} 个结果`,
		items,
	});
	if (canceled || result == null) return;
	addItem(result as WidgetName, {}, true);
	emit('update', serialize());
	os.toast(`已添加 ${WIDGET_LABELS[result]?.label ?? result}`);
}
</script>

<style lang="scss" module>
.root {
	padding: 16px;
}

.toolbar {
	display: flex;
	gap: 8px;
	margin-bottom: 16px;
	flex-wrap: wrap;
}

.gridView {
	border-radius: 12px;
	transition: background 0.15s ease;
}

.gridEditing {
	border-radius: 12px;
	padding: 8px;
	background: color-mix(in srgb, var(--MI_THEME-accent, #3b82f6) 6%, transparent);
	border: 1px dashed color-mix(in srgb, var(--MI_THEME-accent, #3b82f6) 40%, transparent);
	transition: background 0.15s ease, border-color 0.15s ease;
}
</style>
