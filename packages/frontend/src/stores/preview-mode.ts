/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { reactive } from 'vue';

/**
 * 预览模式 store
 *
 * 用途：admin 在 admin/settings?tab=layout 页面点「👁 预览普通用户视角」按钮后,
 *       整站按普通用户视角渲染（admin 入口隐藏、userPermissions 生效、
 *       hiddenUIElements 隐藏生效）。再次点击退出预览。
 *
 * 纯前端，不动后端 session / token。
 * 状态只存在内存里，刷新后重置为 admin 真实身份。
 *
 * 实现说明：用 reactive() 替代 Pinia，避免引入额外依赖（cgvmi-server
 * 项目未安装 pinia）。返回的就是 reactive 对象本身 — 模板里
 * `store.asUser` 会自动解包为 boolean，watch 也能追踪变化。
 */

interface PreviewModeState {
	asUser: boolean;
}

function createPreviewModeStore(): PreviewModeState {
	return reactive<PreviewModeState>({
		asUser: false,
	});
}

export type PreviewModeStore = ReturnType<typeof createPreviewModeStore>;

let _instance: PreviewModeStore | null = null;

export function usePreviewModeStore(): PreviewModeStore {
	if (!_instance) {
		_instance = createPreviewModeStore();
	}
	return _instance;
}

// 工具函数：切换预览（常用操作）
export function togglePreviewMode() {
	const store = usePreviewModeStore();
	store.asUser = !store.asUser;
}