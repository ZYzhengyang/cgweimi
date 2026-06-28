/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// 小工具中文标签 + 分类：让添加弹窗与 widget header 对用户更友好。
// 共享给 WidgetGrid（添加弹窗） 和 WidgetGridItem（header 标题）。
export const WIDGET_LABELS: Record<string, { label: string; category: string }> = {
	profile: { label: '个人资料', category: '我' },
	instanceInfo: { label: '实例信息', category: '实例' },
	memo: { label: '便笺', category: '工具' },
	notifications: { label: '通知', category: '我' },
	timeline: { label: '时间线', category: '浏览' },
	homeTimeline: { label: '首页时间线', category: '浏览' },
	calendar: { label: '日历', category: '工具' },
	rss: { label: 'RSS 阅读器', category: '浏览' },
	rssTicker: { label: 'RSS 滚动', category: '浏览' },
	trends: { label: '热门标签', category: '浏览' },
	clock: { label: '时钟', category: '工具' },
	activity: { label: '本站活动', category: '实例' },
	photos: { label: '相册', category: '我' },
	digitalClock: { label: '数字时钟', category: '工具' },
	unixClock: { label: 'Unix 时间', category: '工具' },
	postForm: { label: '快速发帖', category: '我' },
	slideshow: { label: '轮播', category: '我' },
	serverMetric: { label: '服务器指标', category: '实例' },
	onlineUsers: { label: '在线用户', category: '实例' },
	jobQueue: { label: '任务队列', category: '实例' },
	button: { label: '链接按钮', category: '工具' },
	aiscript: { label: 'AiScript 控制台', category: '工具' },
	aiscriptApp: { label: 'AiScript 应用', category: '工具' },
	aichan: { label: '小助手', category: '工具' },
	userList: { label: '用户列表', category: '浏览' },
	birthdayFollowings: { label: '关注者生日', category: '我' },
	federation: { label: '联邦实例', category: '联邦' },
	instanceCloud: { label: '实例标签云', category: '联邦' },
	clicker: { label: '点击计数', category: '工具' },
	chat: { label: '聊天', category: '我' },
};
