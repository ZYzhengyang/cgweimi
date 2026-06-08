import { instance } from '@/instance.js';
import { $i, iAmAdmin } from '@/i.js';

/**
 * 检查 UI 元素是否对当前用户可见
 * @param pageKey - 页面标识，如 'settings/profile'
 * @param elementKey - 元素标识，如 'changeAvatar'
 * @returns true 表示可见
 */
export function isUIVisible(pageKey: string, elementKey?: string): boolean {
	if (iAmAdmin) return true;

	const hidden = instance.clientOptions?.hiddenUIElements;
	if (!hidden) return true;

	// 检查整个页面是否隐藏
	if (hidden[pageKey]?.includes('*')) return false;

	// 检查特定元素是否隐藏
	if (elementKey && hidden[pageKey]?.includes(elementKey)) return false;

	return true;
}

/**
 * 检查整个页面是否可见（简化版）
 */
export function isPageVisible(pageKey: string): boolean {
	return isUIVisible(pageKey);
}
