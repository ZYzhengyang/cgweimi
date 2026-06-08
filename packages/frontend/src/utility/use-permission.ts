import { computed } from 'vue';
import { $i, iAmAdmin } from '@/i.js';
import { instance } from '@/instance.js';

/**
 * 用户功能权限控制
 * 管理员始终返回 true，普通用户根据 meta.clientOptions.userPermissions 判断
 *
 * 用法：
 *   import { usePermission } from '@/utility/use-permission.js';
 *   const { hasPermission } = usePermission();
 *   // 在模板中：v-if="hasPermission('theme.installTheme')"
 */

// 所有可用的权限 key 定义（用于管理界面展示）
export const PERMISSION_DEFINITIONS = [
	// 个人资料
	{ key: 'profile.avatarEdit', label: '修改头像/封面', group: '个人资料', icon: 'ti ti-photo' },
	{ key: 'profile.metadataEdit', label: '自定义字段', group: '个人资料', icon: 'ti ti-list' },
	{ key: 'profile.language', label: '语言选择', group: '个人资料', icon: 'ti ti-language' },

	// 偏好设置
	{ key: 'preferences.language', label: 'UI 语言', group: '偏好设置', icon: 'ti ti-language' },
	{ key: 'preferences.deviceKind', label: '设备类型覆盖', group: '偏好设置', icon: 'ti ti-device-mobile' },
	{ key: 'preferences.realtimeMode', label: '实时模式', group: '偏好设置', icon: 'ti ti-bolt' },
	{ key: 'preferences.pollingInterval', label: '轮询频率', group: '偏好设置', icon: 'ti ti-refresh' },
	{ key: 'preferences.showTitlebar', label: '显示标题栏', group: '偏好设置', icon: 'ti ti-layout-navbar' },
	{ key: 'preferences.avatarDecorations', label: '头像装饰显示', group: '偏好设置', icon: 'ti ti-sparkles' },
	{ key: 'preferences.alwaysConfirmFollow', label: '关注确认', group: '偏好设置', icon: 'ti ti-user-plus' },
	{ key: 'preferences.highlightSensitive', label: '敏感内容高亮', group: '偏好设置', icon: 'ti ti-eye' },
	{ key: 'preferences.reactionsCount', label: '反应数量显示', group: '偏好设置', icon: 'ti ti-heart' },
	{ key: 'preferences.noteFontSize', label: '帖子字号', group: '偏好设置', icon: 'ti ti-typography' },
	{ key: 'preferences.noteLayout', label: '帖子布局', group: '偏好设置', icon: 'ti ti-layout' },

	// 主题
	{ key: 'theme.darkMode', label: '明暗模式切换', group: '主题', icon: 'ti ti-moon' },
	{ key: 'theme.syncDevice', label: '同步设备暗黑模式', group: '主题', icon: 'ti ti-device-desktop' },
	{ key: 'theme.installTheme', label: '安装主题', group: '主题', icon: 'ti ti-download' },
	{ key: 'theme.manageThemes', label: '管理主题', group: '主题', icon: 'ti ti-palette' },
	{ key: 'theme.customCss', label: '自定义 CSS', group: '主题', icon: 'ti ti-code' },

	// 安全设置
	{ key: 'security.changePassword', label: '修改密码', group: '安全设置', icon: 'ti ti-key' },
	{ key: 'security.twoFactor', label: '两步验证 (2FA)', group: '安全设置', icon: 'ti ti-shield-lock' },
	{ key: 'security.signinHistory', label: '登录历史', group: '安全设置', icon: 'ti ti-history' },
	{ key: 'security.regenerateToken', label: '重新生成登录令牌', group: '安全设置', icon: 'ti ti-refresh-alert' },

	// 隐私
	{ key: 'privacy.lockFollow', label: '锁定关注', group: '隐私', icon: 'ti ti-lock' },
	{ key: 'privacy.autoAccept', label: '自动接受关注', group: '隐私', icon: 'ti ti-check' },
	{ key: 'privacy.publicReactions', label: '公开反应', group: '隐私', icon: 'ti ti-heart' },
	{ key: 'privacy.followVisibility', label: '关注可见性', group: '隐私', icon: 'ti ti-eye' },
	{ key: 'privacy.followerVisibility', label: '粉丝可见性', group: '隐私', icon: 'ti ti-eye' },
	{ key: 'privacy.hideOnlineStatus', label: '隐藏在线状态', group: '隐私', icon: 'ti ti-eye-off' },
	{ key: 'privacy.noCrawle', label: '禁止爬取', group: '隐私', icon: 'ti ti-spider' },

	// 通知设置
	{ key: 'notifications.sound', label: '通知音效', group: '通知设置', icon: 'ti ti-bell' },
	{ key: 'notifications.popup', label: '通知弹窗', group: '通知设置', icon: 'ti ti-bell-ringing' },

	// 其他设置
	{ key: 'other.accountInfo', label: '账户详情', group: '其他设置', icon: 'ti ti-info-circle' },
	{ key: 'other.policies', label: '策略详情', group: '其他设置', icon: 'ti ti-badges' },
	{ key: 'other.roles', label: '角色列表', group: '其他设置', icon: 'ti ti-medal' },
	{ key: 'other.exportImport', label: '数据导出/导入', group: '其他设置', icon: 'ti ti-package' },
] as const;

export type PermissionKey = typeof PERMISSION_DEFINITIONS[number]['key'];

/**
 * 检查当前用户是否有某个权限
 * 管理员始终返回 true
 */
export function hasPermission(key: string): boolean {
	if (iAmAdmin) return true;
	const perms = instance.clientOptions?.userPermissions;
	if (!perms) return true; // 未配置时默认全部可见
	return perms[key] !== false; // 未设置的默认可见，只有显式 false 才隐藏
}

/**
 * composable 版本，在 setup 中使用
 */
export function usePermission() {
	return { hasPermission };
}
