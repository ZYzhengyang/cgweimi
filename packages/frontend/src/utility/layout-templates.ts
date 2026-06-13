/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface LayoutTemplate {
	name: string;
	label: string;
	icon: string;
	layouts: Record<string, { x: number; y: number; w: number; h: number }>;
}

export const layoutTemplates: LayoutTemplate[] = [
	{
		name: 'classic',
		label: '经典双栏',
		icon: 'ti ti-layout-columns',
		layouts: {
			notifications: { x: 0, y: 0, w: 4, h: 4 },
			timeline: { x: 4, y: 0, w: 8, h: 8 },
			calendar: { x: 0, y: 4, w: 4, h: 4 },
			activity: { x: 0, y: 8, w: 4, h: 4 },
		},
	},
	{
		name: 'dashboard',
		label: '仪表盘',
		icon: 'ti ti-layout-dashboard',
		layouts: {
			notifications: { x: 0, y: 0, w: 3, h: 4 },
			timeline: { x: 3, y: 0, w: 6, h: 6 },
			calendar: { x: 9, y: 0, w: 3, h: 4 },
			activity: { x: 0, y: 4, w: 3, h: 4 },
			federation: { x: 9, y: 4, w: 3, h: 4 },
		},
	},
	{
		name: 'focus',
		label: '单栏聚焦',
		icon: 'ti ti-layout-list',
		layouts: {
			timeline: { x: 0, y: 0, w: 12, h: 10 },
			notifications: { x: 0, y: 10, w: 6, h: 4 },
			calendar: { x: 6, y: 10, w: 6, h: 4 },
		},
	},
	{
		name: 'custom',
		label: '自定义',
		icon: 'ti ti-adjustments',
		layouts: {},
	},
];
