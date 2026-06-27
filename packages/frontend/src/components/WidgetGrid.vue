<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div :class="$style.toolbar">
		<MkButton primary @click="addWidgetDialog"><i class="ti ti-plus"></i> 添加 widget</MkButton>
		<MkButton @click="editMode = !editMode">
			<i :class="editMode ? 'ti ti-check' : 'ti ti-edit'"></i>
			{{ editMode ? '完成编辑' : '编辑' }}
		</MkButton>
		<MkButton @click="resetLayout"><i class="ti ti-rotate"></i> 恢复默认</MkButton>
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
import { ref, nextTick } from 'vue';
import { GridLayout, GridItem } from 'grid-layout-plus';
import MkButton from '@/components/MkButton.vue';
import WidgetGridItem from '@/components/WidgetGridItem.vue';
import MkWidgetSettingsDialog from '@/components/MkWidgetSettingsDialog.vue';
import { useWidgetGrid, type StoredWidget, type GridItem as WGridItem } from '@/composables/use-widget-grid.js';
import { widgets, type WidgetName } from '@/widgets/index.js';
import * as os from '@/os.js';

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

function onLayoutUpdate() {
	emit('update', serialize());
}

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
		text: '确定恢复默认布局？',
	}).then(({ canceled }) => {
		if (canceled) return;
		emit('update', []);
	});
}

async function addWidgetDialog() {
	const items: { label: string; value: string }[] = widgets.map(name => ({ label: name, value: name }));
	const { canceled, result } = await os.select({
		title: '选择 widget',
		items,
	});
	if (canceled || result == null) return;
	addItem(result as WidgetName, {}, true);
	emit('update', serialize());
	os.toast(`已添加 ${result}`);
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
}
</style>
