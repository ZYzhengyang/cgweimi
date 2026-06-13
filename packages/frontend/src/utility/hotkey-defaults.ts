/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface HotkeyDef {
	enabled: boolean;
	key: string;
	category: string;
	description: string;
}

export const DEFAULT_HOTKEY_CONFIG: Record<string, HotkeyDef> = {
	// Global
	'global.newPost': { enabled: true, key: 'p|n', category: 'global', description: '打开发帖框' },
	'global.darkMode': { enabled: true, key: 'd', category: 'global', description: '切换暗色模式' },
	'global.search': { enabled: true, key: 's', category: 'global', description: '搜索' },

	// Note
	'note.reply': { enabled: true, key: 'r', category: 'note', description: '回复' },
	'note.react': { enabled: true, key: 'e|a|+', category: 'note', description: '表情反应' },
	'note.renote': { enabled: true, key: 'q', category: 'note', description: '转发' },
	'note.menu': { enabled: true, key: 'm', category: 'note', description: '菜单' },
	'note.clip': { enabled: true, key: 'c', category: 'note', description: '收藏' },
	'note.gallery': { enabled: true, key: 'o', category: 'note', description: '媒体画廊' },
	'note.toggleCw': { enabled: true, key: 'v|enter', category: 'note', description: '展开/折叠' },
	'note.prev': { enabled: true, key: 'up|k|shift+tab', category: 'note', description: '上一条' },
	'note.next': { enabled: true, key: 'down|j|tab', category: 'note', description: '下一条' },

	// Media player (video/audio)
	'media.playPause': { enabled: true, key: 'space', category: 'media', description: '播放/暂停' },
	'media.volumeUp': { enabled: true, key: 'up', category: 'media', description: '音量+' },
	'media.volumeDown': { enabled: true, key: 'down', category: 'media', description: '音量-' },
	'media.seekBack': { enabled: true, key: 'left', category: 'media', description: '快退5秒' },
	'media.seekForward': { enabled: true, key: 'right', category: 'media', description: '快进5秒' },

	// Post form
	'post.submit': { enabled: true, key: 'ctrl+enter', category: 'post', description: '发送帖子' },

	// Chat
	'chat.send': { enabled: true, key: 'enter', category: 'chat', description: '发送消息' },
};

export const HOTKEY_CATEGORIES: Record<string, string> = {
	'global': '全局',
	'note': '帖子',
	'media': '媒体播放器',
	'post': '发帖',
	'chat': '聊天',
};

/**
 * Get the merged hotkey config (admin overrides + defaults).
 * Admin config takes priority; disabled entries are respected.
 */
export function getMergedHotkeyConfig(
	adminConfig?: Record<string, { enabled: boolean; key: string; description?: string }> | null,
): Record<string, HotkeyDef> {
	if (adminConfig == null || Object.keys(adminConfig).length === 0) {
		return { ...DEFAULT_HOTKEY_CONFIG };
	}

	const merged: Record<string, HotkeyDef> = {};
	for (const [id, def] of Object.entries(DEFAULT_HOTKEY_CONFIG)) {
		const override = Object.hasOwn(adminConfig, id) ? adminConfig[id] : undefined;
		if (override != null) {
			merged[id] = {
				enabled: override.enabled,
				key: override.key || def.key,
				category: def.category,
				description: override.description ?? def.description,
			};
		} else {
			merged[id] = { ...def };
		}
	}
	return merged;
}

/**
 * Check if a specific hotkey ID is enabled in the merged config.
 */
export function isHotkeyEnabled(
	hotkeyId: string,
	adminConfig?: Record<string, { enabled: boolean; key: string; description?: string }> | null,
): boolean {
	if (adminConfig == null) return true;
	const entry = Object.hasOwn(adminConfig, hotkeyId) ? adminConfig[hotkeyId] : undefined;
	if (entry == null) return true; // not overridden => use default (enabled)
	return entry.enabled;
}

/**
 * Get the key binding for a hotkey ID from the merged config.
 */
export function getHotkeyKey(
	hotkeyId: string,
	adminConfig?: Record<string, { enabled: boolean; key: string; description?: string }> | null,
): string | null {
	const def = DEFAULT_HOTKEY_CONFIG[hotkeyId];
	if (def == null) return null;
	if (adminConfig == null) return def.key;
	const entry = Object.hasOwn(adminConfig, hotkeyId) ? adminConfig[hotkeyId] : undefined;
	if (entry == null) return def.key;
	if (!entry.enabled) return null;
	return entry.key || def.key;
}
