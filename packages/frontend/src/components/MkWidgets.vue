<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root" class="_gaps_s">
	<template v-if="edit">
		<header :class="$style.editHeader">
			<MkSelect v-model="widgetAdderSelected" :items="widgetAdderSelectedDef" style="margin-bottom: var(--MI-margin)" data-cy-widget-select>
				<template #label>{{ i18n.ts.selectWidget }}</template>
			</MkSelect>
			<MkButton inline primary data-cy-widget-add @click="addWidget"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>
			<MkButton inline @click="resetLayout"><i class="ti ti-refresh"></i> {{ i18n.ts.resetLayout }}</MkButton>
			<MkButton inline @click="emit('exit')">{{ i18n.ts.close }}</MkButton>
		</header>
		<div @contextmenu.prevent.stop="onGridContextmenu($event, true)">
			<MkGridLayout
				:widgets="props.widgets"
				:editable="true"
				@update:layout="onLayoutUpdate"
			/>
		</div>
	</template>
	<div v-else @contextmenu.prevent.stop="onGridContextmenu($event, false)">
		<MkGridLayout
			:widgets="_widgets"
			:editable="false"
			@update:layout="onLayoutUpdate"
		/>
	</div>
</div>
</template>

<script lang="ts">
export type Widget = {
	name: string;
	id: string;
	data: Record<string, any>;
	layout?: { x: number; y: number; w: number; h: number };
};
export type DefaultStoredWidget = {
	place: string | null;
} & Widget;
</script>

<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { isLink } from '@@/js/is-link.js';
import type { Component } from 'vue';
import { genId } from '@/utility/id.js';
import MkSelect from '@/components/MkSelect.vue';
import MkButton from '@/components/MkButton.vue';
import MkGridLayout from '@/components/MkGridLayout.vue';
import { widgets as widgetDefs, federationWidgets } from '@/widgets/index.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import { useMkSelect } from '@/composables/use-mkselect.js';

const props = defineProps<{
	widgets: Widget[];
	edit: boolean;
}>();

const _widgetDefs = computed(() => {
	let defs: typeof widgetDefs[number][] = [...widgetDefs];

	// 連合無効時は連合関連ウィジェットを隠す
	if (instance.federation === 'none') {
		defs = defs.filter(x => !federationWidgets.includes(x as any));
	}

	// 管理者非表示設定のウィジェットを隠す（全ユーザーに適用）
	const hiddenWidgets = (instance as any).hiddenWidgets as string[] | undefined;
	if (hiddenWidgets && hiddenWidgets.length > 0) {
		defs = defs.filter(x => !hiddenWidgets.includes(x));
	}

	return defs;
});

const _widgets = computed(() => props.widgets.filter(x => _widgetDefs.value.includes(x.name as any)));

const emit = defineEmits<{
	(ev: 'updateWidgets', widgets: Widget[]): void;
	(ev: 'addWidget', widget: Widget): void;
	(ev: 'removeWidget', widget: Widget): void;
	(ev: 'updateWidget', widget: { id: Widget['id']; data: Widget['data']; }): void;
	(ev: 'exit'): void;
}>();

const widgetRefs = {} as Record<string, Component & { configure: () => void }>;

// === T11: 旧データ移行 — layout がない widget にデフォルト配置を割り当て ===
function assignDefaultLayout(widgets: Widget[]): Widget[] {
	return widgets.map((w, index) => {
		if (w.layout) return w;
		return {
			...w,
			layout: {
				x: (index % 3) * 4,
				y: Math.floor(index / 3) * 4,
				w: 4,
				h: 4,
			},
		};
	});
}

// マウント時に layout のない widget にデフォルト値を保存（永続化）
onMounted(() => {
	const needsMigration = props.widgets.some(w => !w.layout);
	if (needsMigration) {
		emit('updateWidgets', assignDefaultLayout(props.widgets));
	}
});

// === T7: レイアウト永続化 ===
function onLayoutUpdate(layout: Array<{ i: string; x: number; y: number; w: number; h: number }>) {
	const layoutMap = new Map(layout.map(l => [l.i, { x: l.x, y: l.y, w: l.w, h: l.h }]));
	const updatedWidgets = props.widgets.map(w => ({
		...w,
		layout: layoutMap.get(w.id) ?? w.layout,
	}));
	emit('updateWidgets', updatedWidgets);
}

// === T10: レイアウトリセット ===
function resetLayout() {
	const resetWidgets = props.widgets.map((w, index) => ({
		...w,
		layout: {
			x: (index % 3) * 4,
			y: Math.floor(index / 3) * 4,
			w: 4,
			h: 4,
		},
	}));
	emit('updateWidgets', resetWidgets);
}

// === Widget management ===
function configWidget(id: string) {
	widgetRefs[id]?.configure();
}

const {
	model: widgetAdderSelected,
	def: widgetAdderSelectedDef,
} = useMkSelect({
	items: computed(() => [{ label: i18n.ts.none, value: null }, ..._widgetDefs.value.map(x => ({ label: i18n.ts._widgets[x], value: x }))]),
	initialValue: null,
});

function addWidget() {
	if (widgetAdderSelected.value == null) return;

	const index = props.widgets.length;
	emit('addWidget', {
		name: widgetAdderSelected.value,
		id: genId(),
		data: {},
		layout: {
			x: (index % 3) * 4,
			y: Math.floor(index / 3) * 4,
			w: 4,
			h: 4,
		},
	});

	widgetAdderSelected.value = null;
}

function removeWidget(widget: Widget) {
	emit('removeWidget', widget);
}

function updateWidget(id: Widget['id'], data: Widget['data']) {
	emit('updateWidget', { id, data });
}

// === Context menu (via event delegation on grid wrapper) ===
function onGridContextmenu(ev: MouseEvent, isEdit: boolean) {
	const element = ev.target as HTMLElement | null;
	if (element && isLink(element)) return;
	if (element && (['INPUT', 'TEXTAREA', 'IMG', 'VIDEO', 'CANVAS'].includes(element.tagName) || element.attributes.getNamedItem('contenteditable') != null)) return;
	if (window.getSelection()?.toString() !== '') return;

	// grid-layout-plus の GridItem は <section> をレンダリングする
	const section = (ev.target as HTMLElement).closest('section');
	if (!section) return;

	const container = ev.currentTarget as HTMLElement;
	const allSections = container.querySelectorAll('section');
	const index = Array.from(allSections).indexOf(section);
	if (index === -1) return;

	const sourceWidgets = isEdit ? props.widgets : _widgets.value;
	if (index >= sourceWidgets.length) return;
	const widget = sourceWidgets[index];

	const items: Parameters<typeof os.contextMenu>[0] = [{
		type: 'label',
		text: i18n.ts._widgets[widget.name as typeof widgetDefs[number]],
	}, {
		icon: 'ti ti-settings',
		text: i18n.ts.settings,
		action: () => configWidget(widget.id),
	}];

	if (isEdit) {
		items.push({
			type: 'divider',
		}, {
			icon: 'ti ti-trash',
			text: i18n.ts.remove,
			action: () => removeWidget(widget),
		});
	}

	os.contextMenu(items, ev as PointerEvent);
}
</script>

<style lang="scss" module>
.root {
	container-type: inline-size;
}

.edit {
	&Header {
		margin: 16px 0;

		> * {
			width: 100%;
			padding: 4px;
		}
	}
}
</style>
