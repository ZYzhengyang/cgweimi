/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ref, computed, watch, type Ref } from 'vue';
import { genId } from '@/utility/id.js';

export type StoredWidget = {
	id: string;
	name: string;
	place: string | null;
	data: Record<string, any>;
	layout?: { x: number; y: number; w: number; h: number };
	pinned?: boolean;
};

export type GridItem = StoredWidget & {
	x: number;
	y: number;
	w: number;
	h: number;
	i: string;
	pinned: boolean;
};

export type GridLayout = GridItem[];

export type WidgetGridOptions = {
	columns?: number;
	rowHeight?: number;
	margin?: [number, number];
};

export function useWidgetGrid(
	source: Ref<StoredWidget[]>,
	options: WidgetGridOptions = {},
) {
	const columns = options.columns ?? 12;
	const rowHeight = options.rowHeight ?? 80;
	const margin = options.margin ?? [8, 8];

	const items = ref<GridItem[]>([]);

	// 把 StoredWidget[] 转成 grid-layout-plus 需要的 GridItem[]
	function toGrid(src: StoredWidget[]): GridItem[] {
		return src
			.filter(w => w.layout != null)
			.map(w => ({
				...w,
				x: w.layout!.x,
				y: w.layout!.y,
				w: w.layout!.w,
				h: w.layout!.h,
				i: w.id,
				pinned: w.pinned ?? false,
			}));
	}

	// 反向：GridItem[] → StoredWidget[]（用于持久化）
	function fromGrid(grid: GridItem[]): StoredWidget[] {
		return grid.map(g => {
			const { x, y, w, h, i, pinned, ...rest } = g;
			return {
				...rest,
				id: i,
				layout: { x, y, w, h },
				pinned,
			} as StoredWidget;
		});
	}

	// 监听源数据变化
	watch(source, (src) => {
		items.value = toGrid(src);
	}, { immediate: true, deep: true });

	const layout = computed<GridLayout>(() => items.value);

	function moveItem(id: string, x: number, y: number) {
		const item = items.value.find(i => i.i === id);
		if (item == null || item.pinned) return;
		item.x = x;
		item.y = y;
	}

	function resizeItem(id: string, w: number, h: number) {
		const item = items.value.find(i => i.i === id);
		if (item == null || item.pinned) return;
		item.w = w;
		item.h = h;
	}

	function togglePin(id: string) {
		const item = items.value.find(i => i.i === id);
		if (item == null) return;
		item.pinned = !item.pinned;
	}

	// 新加 widget 默认大高度 — grid-layout-plus 不支持 Infinity，按内容撑开，
	// 必须给一个够装下"内容 + 滚动"的初始 h，rowHeight=80 时 h=20=1600px
	const DEFAULT_NEW_W = 6;
	const DEFAULT_NEW_H = 20;
	function addItem(name: string, data: Record<string, any> = {}, atEnd = true) {
		const newItem: GridItem = {
			id: genId(),
			name,
			place: null,
			data,
			x: 0,
			y: atEnd ? 1000 : 0, // 1000 触发 grid-layout-plus 自动放到末尾
			w: DEFAULT_NEW_W,
			h: DEFAULT_NEW_H,
			i: genId(),
			pinned: false,
		};
		items.value = [...items.value, newItem];
		return newItem;
	}

	function removeItem(id: string) {
		items.value = items.value.filter(i => i.i !== id);
	}

	function serialize(): StoredWidget[] {
		return fromGrid(items.value);
	}

	function deserialize(grid: GridItem[]) {
		items.value = grid;
	}

	return {
		items,
		layout,
		columns,
		rowHeight,
		margin,
		moveItem,
		resizeItem,
		togglePin,
		addItem,
		removeItem,
		serialize,
		deserialize,
	};
}