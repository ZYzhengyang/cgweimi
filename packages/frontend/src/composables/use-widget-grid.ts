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

	// 新加 widget 默认尺寸 — 用户希望"小一点，自己再调大"。
	// 4 列宽 + 6 行高，rowHeight=80 时 ≈ 352×528px，刚好够看一个折叠的 timeline 列表
	// + 个位数滚动条，鼓励用户主动 resize 到合适的尺寸。
	// 旧版 6×20 太大、6×12 仍偏大，4×4 又太小。
	const DEFAULT_NEW_W = 4;
	const DEFAULT_NEW_H = 6;
	// 找当前布局的最低边，新 widget 摆在它下面 — 不再用 y=1000 触发 grid-layout-plus
	// 放到"虚拟无限画布的最底部"（那是 Bug #5 的根源：用户看不见、画布无限延伸）。
	function findFirstFreeY(): number {
		if (items.value.length === 0) return 0;
		let maxY = 0;
		for (const item of items.value) {
			const bottom = item.y + item.h;
			if (bottom > maxY) maxY = bottom;
		}
		return maxY;
	}
	function addItem(name: string, data: Record<string, any> = {}) {
		const id = genId();
		const newItem: GridItem = {
			id,
			name,
			place: null,
			data,
			x: 0,
			y: findFirstFreeY(),
			w: DEFAULT_NEW_W,
			h: DEFAULT_NEW_H,
			i: id,
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