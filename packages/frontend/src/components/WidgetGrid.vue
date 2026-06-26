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
			/>
		</GridItem>
	</GridLayout>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { GridLayout, GridItem } from 'grid-layout-plus';
import MkButton from '@/components/MkButton.vue';
import WidgetGridItem from '@/components/WidgetGridItem.vue';
import { useWidgetGrid, type StoredWidget } from '@/composables/use-widget-grid.js';
import * as os from '@/os.js';

const props = defineProps<{
	source: StoredWidget[];
}>();

const emit = defineEmits<{
	(e: 'update', value: StoredWidget[]): void;
}>();

const editMode = ref(false);

const {
	items,
	layout,
	columns,
	rowHeight,
	margin,
	togglePin,
	removeItem,
	serialize,
} = useWidgetGrid(ref(props.source));

function onLayoutUpdate() {
	emit('update', serialize());
}

function onConfigure(_item: unknown) {
	// TODO Stage B: 打开 MkWidgetSettingsDialog
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

function addWidgetDialog() {
	// TODO Stage B: 弹出 widget 列表
	os.alert({ type: 'info', text: '添加 widget 功能在 Stage B 实现' });
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
