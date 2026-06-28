<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="rootClass">
	<GridLayout
		v-model:layout="layout"
		:col-num="columns"
		:row-height="rowHeight"
		:margin="margin"
		:is-draggable="editMode"
		:is-resizable="editMode"
		:is-bounded="false"
		:auto-size="true"
		:vertical-compact="false"
		:use-css-transforms="true"
		:use-style-cursor="true"
		:prevent-collision="false"
		:max-rows="40"
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

	<!-- 浮动齿轮：常驻右下角，点击展开菜单 -->
	<button :class="fabClass" :title="editMode ? i18n.ts._widgetGrid.finishEdit : i18n.ts._widgetGrid.addWidget" @click="onFabClick">
		<i :class="editMode ? 'ti ti-check' : 'ti ti-settings'"></i>
	</button>

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
import { ref, nextTick, onUnmounted, computed } from 'vue';
import { GridLayout, GridItem } from 'grid-layout-plus';
import WidgetGridItem from '@/components/WidgetGridItem.vue';
import { useWidgetGrid, type StoredWidget, type GridItem as WGridItem } from '@/composables/use-widget-grid.js';
import { widgets, federationWidgets, type WidgetName } from '@/widgets/index.js';
import { WIDGET_LABELS } from '@/widgets/labels.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import { iAmModerator } from '@/i.js';
import { misskeyApi } from '@/utility/misskey-api.js';

// 注意：原版用 <style module> + $style.X，但 esbuild 压缩 + 跨模块导入别名碰撞下
// useCssModule() 偶尔返回空对象（具体场景：setup 里 import {instance} 与 useCssModule
// 同名分配时被 esbuild 合并），导致 class 全空。改用 <style scoped> + 静态 class 名，
// Vite 直接走 scoped CSS 编译，无运行时 class 查表，零空对象风险。
const rootClass = 'cgvmi-widget-grid-root';
const gridViewClass = 'cgvmi-widget-grid-view';
const gridEditingClass = 'cgvmi-widget-grid-editing';
const fabBaseClass = 'cgvmi-widget-grid-fab';
const fabActiveClass = 'cgvmi-widget-grid-fab-active';

const props = defineProps<{
	source: StoredWidget[];
}>();

const emit = defineEmits<{
	(e: 'update', value: StoredWidget[]): void;
}>();

const editMode = ref(false);
const configureTarget = ref<{ i: string; name: WidgetName; data: Record<string, unknown> } | null>(null);
const hiddenWidgetRef = ref<{ configure: () => Promise<void> } | null>(null);

// 必须用 ref 包 props.source 让 watch 能追踪；并保持响应式
const sourceRef = computed(() => props.source);

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
} = useWidgetGrid(sourceRef as any, {
	onItemsMutated: () => {
		// grid-layout-plus 对程序化变更（addItem/removeItem）不会 emit update:layout，
		// 这里用 onItemsMutated 回调直接触发 scheduleUpdate，让 dirty 状态正确传播。
		// 与 onLayoutUpdate 的处理完全一致，区别只是触发来源不同（程序化 vs 用户拖拽）。
		scheduleUpdate();
	},
});

const gridClass = computed(() => editMode.value ? gridEditingClass : gridViewClass);
const fabClass = computed(() => editMode.value ? `${fabBaseClass} ${fabActiveClass}` : fabBaseClass);

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

defineExpose({
	editMode,
	enterEditMode: () => { editMode.value = true; },
	exitEditMode: () => { editMode.value = false; },
	// 暴露给父组件直接读取当前 grid 状态 — 用于 admin 保存为全站默认时
	// 不依赖 grid-layout-plus 是否 emit 过 update:layout（程序化 addItem 不一定触发）。
	getCurrentLayout: () => serialize(),
});

async function resetLayout() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.ts._widgetGrid.resetConfirm,
	});
	if (canceled) return;
	try {
		// 优先取 admin 配置的默认布局；没有则用内置 timeline-only 默认
		const res = await misskeyApi('widget-layout/default' as any, {} as any) as { layout: StoredWidget[] | null } | null;
		if (res?.layout != null && res.layout.length > 0) {
			emit('update', res.layout);
		} else {
			emit('update', [{
				name: 'timeline',
				id: crypto.randomUUID(),
				place: null,
				data: {},
				layout: { x: 0, y: 0, w: 12, h: 20 },
				pinned: false,
			} as StoredWidget]);
		}
		os.toast('已恢复默认布局');
	} catch (e) {
		console.error(e);
		os.toast('恢复失败');
	}
}

// 浮动齿轮点击：非编辑态 → 弹出菜单；编辑态 → 直接退出编辑
async function onFabClick(ev: PointerEvent) {
	if (editMode.value) {
		editMode.value = false;
		return;
	}
	const items: any[] = [
		{
			type: 'button',
			icon: 'ti ti-plus',
			text: i18n.ts._widgetGrid.addWidget,
			action: () => { addWidgetDialog(); },
		},
		{
			type: 'button',
			icon: 'ti ti-edit',
			text: i18n.ts._widgetGrid.edit,
			action: () => { editMode.value = true; },
		},
		{
			type: 'button',
			icon: 'ti ti-rotate',
			text: i18n.ts._widgetGrid.resetLayout,
			action: () => { resetLayout(); },
		},
	];
	await os.popupMenu(items, ev.currentTarget ?? ev.target);
}

// 可选 widget 列表（参考 MkWidgets.vue 的过滤逻辑）：
const availableWidgetNames = computed<WidgetName[]>(() => {
	const hidden = (instance as any).hiddenWidgets as string[] | undefined;
	return (widgets as readonly WidgetName[]).filter(name => {
		if (instance.federation === 'none' && (federationWidgets as readonly string[]).includes(name)) return false;
		if (!iAmModerator.value && hidden && hidden.length > 0 && hidden.includes(name)) return false;
		return true;
	});
});

async function addWidgetDialog() {
	const grouped = new Map<string, WidgetName[]>();
	for (const name of availableWidgetNames.value) {
		const cat = WIDGET_LABELS[name]?.category ?? '其他';
		const arr = grouped.get(cat) ?? [];
		arr.push(name);
		grouped.set(cat, arr);
	}

	const sortedCats = [...grouped.keys()].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
	const selectItems: { type: 'group'; label: string; items: { value: string; label: string }[] }[] = [];
	for (const cat of sortedCats) {
		selectItems.push({
			type: 'group',
			label: cat,
			items: grouped.get(cat)!.map(name => {
				const label = WIDGET_LABELS[name]?.label ?? name;
				return {
					value: name,
					label,
				};
			}),
		});
	}

	if (selectItems.every(g => g.items.length === 0)) {
		os.toast('暂无可添加的小工具');
		return;
	}

	const { canceled, result } = await os.select({
		title: i18n.ts._widgetGrid.addWidget,
		items: selectItems as any,
	});
	if (canceled || result == null || typeof result !== 'string') return;
	// addItem 内部调用 onItemsMutated 回调 → scheduleUpdate() → emit('update', serialize())
	addItem(result as WidgetName, {});
	os.toast(`已添加 ${WIDGET_LABELS[result]?.label ?? result}`);
}
</script>

<style lang="scss" scoped>
.cgvmi-widget-grid-root {
	position: relative;
	padding: 0;
	// 撑满左侧栏以外的整块主区域 — grid 高度随 widget 自适应
	min-height: calc(100vh - 200px);
}

.cgvmi-widget-grid-view {
	border-radius: 12px;
	transition: background 0.15s ease;
	width: 100%;
}

.cgvmi-widget-grid-editing {
	border-radius: 12px;
	padding: 8px;
	background: color-mix(in srgb, var(--MI_THEME-accent, #3b82f6) 6%, transparent);
	border: 1px dashed color-mix(in srgb, var(--MI_THEME-accent, #3b82f6) 40%, transparent);
	transition: background 0.15s ease, border-color 0.15s ease;
	width: 100%;
}

// 浮动齿轮按钮 — 右下角常驻，不占 grid 布局空间
.cgvmi-widget-grid-fab {
	position: fixed;
	right: 24px;
	bottom: 80px; // 避开 navbar
	z-index: 1000;
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);
	border: 1px solid var(--MI_THEME-divider);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease;

	&:hover {
		transform: scale(1.08);
		background: var(--MI_THEME-buttonHoverBg);
	}

	&:active {
		transform: scale(0.96);
	}
}

.cgvmi-widget-grid-fab-active {
	background: var(--MI_THEME-accent);
	color: var(--MI_THEME-accentFg, #fff);
	border-color: var(--MI_THEME-accent);
}
</style>