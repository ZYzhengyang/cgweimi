/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { PageMetadata } from '@/page.js';
import { i18n } from '@/i18n.js';

export interface AdminMenuItemDef {
	key: string;
	icon: string;
	text: string;
	to: string;
	activeFor: string[];
}

export interface AdminMenuGroupDef {
	title: string;
	items: AdminMenuItemDef[];
}

/**
 * Admin 后台侧边栏菜单项的单一数据源。
 *
 * - `admin/index.vue` 用它生成 SuperMenuDef 渲染侧栏（消费 `instance.adminMenu.hidden/labels`）
 * - `admin/settings.vue` 的"布局与外观"tab 用它生成"admin 后台菜单"配置项
 *
 * `activeFor` 是路由名数组，用于高亮当前页。`to` 是路径，保存时也会作为 `hidden` 数组里的 key。
 */
export const ADMIN_MENU_ITEMS: AdminMenuGroupDef[] = [
	{
		title: '仪表盘',
		items: [
			{ key: '/admin/overview', icon: 'ti ti-dashboard', text: i18n.ts.dashboard, to: '/admin/overview', activeFor: ['overview'] },
		],
	},
	{
		title: '用户与内容',
		items: [
			{ key: '/admin/users', icon: 'ti ti-users', text: i18n.ts.users, to: '/admin/users', activeFor: ['users'] },
			{ key: '/admin/files', icon: 'ti ti-cloud', text: i18n.ts.files, to: '/admin/files', activeFor: ['files'] },
			{ key: '/admin/featured', icon: 'ti ti-star', text: '精选推荐', to: '/admin/featured', activeFor: ['featured'] },
			{ key: '/admin/categories', icon: 'ti ti-folder', text: '分类管理', to: '/admin/categories', activeFor: ['categories'] },
			{ key: '/admin/banners', icon: 'ti ti-photo', text: 'Banner 管理', to: '/admin/banners', activeFor: ['banners'] },
			{ key: '/admin/scraper', icon: 'ti ti-cloud-download', text: '内容采集', to: '/admin/scraper', activeFor: ['scraper'] },
			{ key: '/admin/moderation-queue', icon: 'ti ti-shield-check', text: '内容审核', to: '/admin/moderation-queue', activeFor: ['moderation-queue'] },
			{ key: '/admin/announcements', icon: 'ti ti-speakerphone', text: i18n.ts.announcements, to: '/admin/announcements', activeFor: ['announcements'] },
			{ key: '/admin/ads', icon: 'ti ti-ad', text: i18n.ts.ads, to: '/admin/ads', activeFor: ['ads'] },
			{ key: '/admin/abuses', icon: 'ti ti-exclamation-circle', text: i18n.ts.abuseReports, to: '/admin/abuses', activeFor: ['abuses'] },
			{ key: '/admin/modlog', icon: 'ti ti-list-search', text: i18n.ts.moderationLogs, to: '/admin/modlog', activeFor: ['modlog'] },
		],
	},
	{
		title: '站点外观',
		items: [
			{ key: '/admin/branding', icon: 'ti ti-paint', text: i18n.ts.branding, to: '/admin/branding', activeFor: ['branding'] },
			{ key: '/admin/emojis', icon: 'ti ti-icons', text: i18n.ts.customEmojis, to: '/admin/emojis', activeFor: ['emojis'] },
			{ key: '/admin/avatar-decorations', icon: 'ti ti-sparkles', text: '头像装饰', to: '/admin/avatar-decorations', activeFor: ['avatar-decorations'] },
		],
	},
	{
		title: '系统设置',
		items: [
			{ key: '/admin/settings', icon: 'ti ti-settings', text: i18n.ts.general, to: '/admin/settings', activeFor: ['settings'] },
			{ key: '/admin/moderation', icon: 'ti ti-shield', text: i18n.ts.moderation, to: '/admin/moderation', activeFor: ['moderation'] },
			{ key: '/admin/email-settings', icon: 'ti ti-mail', text: i18n.ts.emailServer, to: '/admin/email-settings', activeFor: ['email-settings'] },
			{ key: '/admin/object-storage', icon: 'ti ti-cloud', text: i18n.ts.objectStorage, to: '/admin/object-storage', activeFor: ['object-storage'] },
			{ key: '/admin/security', icon: 'ti ti-lock', text: i18n.ts.security, to: '/admin/security', activeFor: ['security'] },
			{ key: '/admin/roles', icon: 'ti ti-badges', text: i18n.ts.roles, to: '/admin/roles', activeFor: ['roles'] },
			{ key: '/admin/invites', icon: 'ti ti-user-plus', text: i18n.ts.invite, to: '/admin/invites', activeFor: ['invites'] },
			{ key: '/admin/hotkeys', icon: 'ti ti-keyboard', text: i18n.ts._hotkeyAdmin?.title ?? '快捷键管理', to: '/admin/hotkeys', activeFor: ['hotkeys'] },
			{ key: '/admin/widget-layout', icon: 'ti ti-layout-grid', text: 'Widget 布局', to: '/admin/widget-layout', activeFor: ['widget-layout'] },
		],
	},
	{
		title: '高级/开发者',
		items: [
			{ key: '/admin/federation', icon: 'ti ti-whirl', text: '联邦管理', to: '/admin/federation', activeFor: ['federation'] },
			{ key: '/admin/job-queue', icon: 'ti ti-clock', text: '任务队列', to: '/admin/job-queue', activeFor: ['job-queue'] },
			{ key: '/admin/federation-job-queue', icon: 'ti ti-clock-exclamation', text: '联邦队列', to: '/admin/federation-job-queue', activeFor: ['federation-job-queue'] },
			{ key: '/admin/performance', icon: 'ti ti-gauge', text: '性能设置', to: '/admin/performance', activeFor: ['performance'] },
			{ key: '/admin/database', icon: 'ti ti-database', text: '数据库', to: '/admin/database', activeFor: ['database'] },
			{ key: '/admin/relays', icon: 'ti ti-repeat', text: '中继管理', to: '/admin/relays', activeFor: ['relays'] },
			{ key: '/admin/external-services', icon: 'ti ti-plug', text: '外部服务', to: '/admin/external-services', activeFor: ['external-services'] },
			{ key: '/admin/system-webhook', icon: 'ti ti-webhook', text: '系统 Webhook', to: '/admin/system-webhook', activeFor: ['system-webhook'] },
			{ key: '/admin/ops-dashboard', icon: 'ti ti-server-cog', text: '运维监控', to: '/admin/ops-dashboard', activeFor: ['ops-dashboard'] },
		],
	},
];
