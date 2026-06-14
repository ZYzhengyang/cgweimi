<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<GridLayout
	v-model:layout="layoutItems"
	:col-num="colNum"
	:row-height="rowHeight"
	:is-draggable="editable"
	:is-resizable="editable"
	:vertical-compact="true"
	:use-css-transforms="true"
	:class="[$style.grid, { [$style.gridEditable]: editable }]"
>
	<GridItem
		v-for="item in layoutItems"
		:key="item.i"
		:x="item.x"
		:y="item.y"
		:w="item.w"
		:h="item.h"
		:i="item.i"
		:is-draggable="editable"
		:is-resizable="editable"
		:drag-allow-from="editable ? '.drag-handle' : ''"
		:min-w="2"
		:min-h="2"
		:class="$style.item"
		@moved="onLayoutChange"
		@resized="onLayoutChange"
	>
		<div :class="$style.itemInner">
			<div v-if="editable" :class="$style.dragHandle" class="drag-handle">
				<i class="ti ti-grip-vertical"></i>
			</div>
			<component
				:is="getWidgetComponent(item.i)"
				v-if="getWidgetComponent(item.i)"
				:widget="getWidgetData(item.i)"
				:class="$style.widgetContent"
			/>
		</div>
	</GridItem>
</GridLayout>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { GridLayout, GridItem } from 'grid-layout-plus';

export interface Widget {
	id: string;
	name: string;
	data: Record<string, any>;
	layout?: { x: number; y: number; w: number; h: number };
}

interface GridLayoutItem {
	i: string;
	x: number;
	y: number;
	w: number;
	h: number;
}

const props = withDefaults(defineProps<{
	widgets: Widget[];
	editable?: boolean;
}>(), {
	editable: false,
});

const emit = defineEmits<{
	(ev: 'update:layout', layout: GridLayoutItem[]): void;
}>();

// === Responsive breakpoints ===
const colNum = ref(12);
const rowHeight = ref(30);

function updateBreakpoint() {
	const width = window.innerWidth;
	if (width >= 1024) {
		colNum.value = 12;
		rowHeight.value = 30;
	} else if (width >= 768) {
		colNum.value = 8;
		rowHeight.value = 28;
	} else {
		colNum.value = 4;
		rowHeight.value = 26;
	}
}

onMounted(() => {
	updateBreakpoint();
	window.addEventListener('resize', updateBreakpoint);
});

onUnmounted(() => {
	window.removeEventListener('resize', updateBreakpoint);
});

// === Layout items ===
const layoutItems = computed<GridLayoutItem[]>({
	get() {
		return props.widgets.map((w, index) => ({
			i: w.id,
			x: w.layout?.x ?? (index % colNum.value) * 3,
			y: w.layout?.y ?? Math.floor(index / (colNum.value / 3)) * 4,
			w: w.layout?.w ?? 3,
			h: w.layout?.h ?? 4,
		}));
	},
	set(_val) {
		// v-model:layout writes handled via moved/resized events
	},
});

function onLayoutChange() {
	emit('update:layout', layoutItems.value);
}

// === Widget component resolution ===
const widgetModules = import.meta.glob('../widgets/*.vue', { eager: true });

const widgetComponentMap = new Map<string, any>();
for (const path in widgetModules) {
	const mod = widgetModules[path] as any;
	const fileName = path.split('/').pop()!.replace('.vue', '');
	// Map e.g. "WidgetCalendar" -> component
	widgetComponentMap.set(fileName, mod.default ?? mod);
}

function toPascalCase(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function getWidgetComponent(widgetId: string): any {
	const widget = props.widgets.find(w => w.id === widgetId);
	if (!widget) return null;
	const componentName = `Widget${toPascalCase(widget.name)}`;
	return widgetComponentMap.get(componentName) ?? null;
}

function getWidgetData(widgetId: string): Widget | undefined {
	return props.widgets.find(w => w.id === widgetId);
}
</script>

<style lang="scss" module>
.grid {
	min-height: 200px;
}

.item {
	:global(.vue-resizable-handle) {
		opacity: 0;
		transition: opacity 0.2s;
	}
}

.gridEditable {
	.item {
		:global(.vue-resizable-handle) {
			opacity: 0;
			transition: opacity 0.2s;
		}

		&:hover {
			:global(.vue-resizable-handle) {
				opacity: 1;
			}

			.itemInner {
				box-shadow: 0 0 0 2px var(--accent);
			}
		}
	}
}

.itemInner {
	position: relative;
	width: 100%;
	height: 100%;
	background: var(--panel);
	border-radius: var(--radius);
	overflow: hidden;
	box-sizing: border-box;
	transition: box-shadow 0.2s;

	&:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}
}

.dragHandle {
	display: flex;
	align-items: center;
	justify-content: center;
	position: absolute;
	top: 0;
	left: 0;
	width: 28px;
	height: 28px;
	z-index: 10;
	cursor: grab;
	color: var(--fg-muted);
	background: var(--panel);
	border-bottom-right-radius: var(--radius);
	border: 1px solid var(--divider);
	border-top: 0;
	border-left: 0;
	opacity: 0.7;
	transition: opacity 0.2s, color 0.2s;

	&:hover {
		opacity: 1;
		color: var(--accent);
	}

	&:active {
		cursor: grabbing;
	}
}

.widgetContent {
	width: 100%;
	height: 100%;
}
</style>
