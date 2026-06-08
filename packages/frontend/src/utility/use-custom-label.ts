import { computed } from 'vue';
import { instance } from '@/instance.js';

/**
 * 自定义标签系统
 * 管理员可以在后台自定义界面上显示的文本
 *
 * 用法：
 *   import { useCustomLabel } from '@/utility/use-custom-label.js';
 *   const label = useCustomLabel('profile.name', '名称');
 *   // 在模板中：{{ label }}
 */

/**
 * 获取自定义标签
 * @param key 标签的唯一 key
 * @param defaultLabel 默认标签文本
 * @returns 自定义标签或默认标签
 */
export function getCustomLabel(key: string, defaultLabel: string): string {
	const customLabels = instance.clientOptions?.customLabels;
	if (!customLabels) return defaultLabel;
	return customLabels[key] || defaultLabel;
}

/**
 * composable 版本，在 setup 中使用
 * @param key 标签的唯一 key
 * @param defaultLabel 默认标签文本
 * @returns computed ref
 */
export function useCustomLabel(key: string, defaultLabel: string) {
	return computed(() => getCustomLabel(key, defaultLabel));
}

/**
 * 所有可用的自定义标签 key 定义（用于管理界面展示）
 * 按页面分组
 */
export const CUSTOM_LABEL_DEFINITIONS = [
	// 个人资料页面
	{ key: 'profile.name', label: '名称', group: '个人资料', defaultLabel: '名称' },
	{ key: 'profile.description', label: '简介', group: '个人资料', defaultLabel: '简介' },
	{ key: 'profile.location', label: '位置', group: '个人资料', defaultLabel: '位置' },
	{ key: 'profile.birthday', label: '生日', group: '个人资料', defaultLabel: '生日' },
	{ key: 'profile.changeAvatar', label: '修改头像', group: '个人资料', defaultLabel: '修改头像' },
	{ key: 'profile.changeBanner', label: '修改封面', group: '个人资料', defaultLabel: '修改封面' },

	// 时间线
	{ key: 'timeline.home', label: '首页标签', group: '时间线', defaultLabel: '首页' },
	{ key: 'timeline.local', label: '本地标签', group: '时间线', defaultLabel: '本地' },
	{ key: 'timeline.social', label: '社交标签', group: '时间线', defaultLabel: '社交' },
	{ key: 'timeline.global', label: '全局标签', group: '时间线', defaultLabel: '全局' },

	// 侧边栏
	{ key: 'nav.notifications', label: '通知', group: '侧边栏', defaultLabel: '通知' },
	{ key: 'nav.explore', label: '发现', group: '侧边栏', defaultLabel: '发现' },
	{ key: 'nav.videoFeed', label: '刷视频', group: '侧边栏', defaultLabel: '刷视频' },
	{ key: 'nav.search', label: '搜索', group: '侧边栏', defaultLabel: '搜索' },
	{ key: 'nav.drive', label: '云盘', group: '侧边栏', defaultLabel: '云盘' },
	{ key: 'nav.lists', label: '列表', group: '侧边栏', defaultLabel: '列表' },
	{ key: 'nav.antennas', label: '天线', group: '侧边栏', defaultLabel: '天线' },
	{ key: 'nav.channels', label: '频道', group: '侧边栏', defaultLabel: '频道' },

	// 帖子操作
	{ key: 'post.reply', label: '回复按钮', group: '帖子操作', defaultLabel: '回复' },
	{ key: 'post.renote', label: '转发按钮', group: '帖子操作', defaultLabel: '转发' },
	{ key: 'post.react', label: '反应按钮', group: '帖子操作', defaultLabel: '反应' },

	// 设置页面
	{ key: 'settings.profile', label: '个人资料', group: '设置菜单', defaultLabel: '个人资料' },
	{ key: 'settings.privacy', label: '隐私', group: '设置菜单', defaultLabel: '隐私' },
	{ key: 'settings.notifications', label: '通知', group: '设置菜单', defaultLabel: '通知' },
	{ key: 'settings.theme', label: '主题', group: '设置菜单', defaultLabel: '主题' },
	{ key: 'settings.sounds', label: '音效', group: '设置菜单', defaultLabel: '音效' },
	{ key: 'settings.security', label: '安全', group: '设置菜单', defaultLabel: '安全' },
	{ key: 'settings.email', label: '邮箱', group: '设置菜单', defaultLabel: '邮箱' },
	{ key: 'settings.other', label: '其他', group: '设置菜单', defaultLabel: '其他' },

	// 站点
	{ key: 'site.name', label: '站点名称', group: '站点', defaultLabel: 'CG微米' },
	{ key: 'site.description', label: '站点描述', group: '站点', defaultLabel: 'CG 创作者社区平台' },
] as const;

export type CustomLabelKey = typeof CUSTOM_LABEL_DEFINITIONS[number]['key'];
