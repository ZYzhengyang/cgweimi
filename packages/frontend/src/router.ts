/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { inject } from 'vue';
import { page } from '@/router.definition.js';
import { $i } from '@/i.js';
import { Nirax } from '@/lib/nirax.js';
import { ROUTE_DEF } from '@/router.definition.js';
import { analytics } from '@/analytics.js';
import { DI } from '@/di.js';
import { usePreviewModeStore } from '@/stores/preview-mode.js';

export type Router = Nirax<typeof ROUTE_DEF>;

export function createRouter(fullPath: string): Router {
	return new Nirax(ROUTE_DEF, fullPath, !!$i, page(() => import('@/pages/not-found.vue')));
}

export const mainRouter = createRouter(window.location.pathname + window.location.search + window.location.hash);

window.addEventListener('popstate', (event) => {
	mainRouter.replaceByPath(window.location.pathname + window.location.search + window.location.hash);
});

// 预览模式路由守卫：阻止访问 admin/* 但允许 admin/settings?tab=layout（用户正在操作预览按钮的页面）
mainRouter.navHook = (path): boolean => {
	const preview = usePreviewModeStore();
	if (!preview.asUser) return false;

	// admin/settings?tab=layout 本身是预览开关所在页面,允许访问
	if (path === '/admin/settings?tab=layout' || path.startsWith('/admin/settings?tab=layout&')) {
		return false;
	}

	if (path === '/admin' || path.startsWith('/admin/') || path.startsWith('/admin?')) {
		// 异步提示,不能阻塞 navHook — 但 navHook 必须同步返回 boolean
		// 这里选择不弹窗(避免时序问题),由 settings layout tab 内部的「退出预览」按钮来兜底
		return true; // cancel navigation
	}

	return false;
};

mainRouter.addListener('push', ctx => {
	window.history.pushState({ }, '', ctx.fullPath);
});

mainRouter.addListener('replace', ctx => {
	window.history.replaceState({ }, '', ctx.fullPath);
});

mainRouter.addListener('forceReplace', ctx => {
	window.location.replace(ctx.fullPath);
});

mainRouter.addListener('forcePush', ctx => {
	window.location.href = ctx.fullPath;
});

mainRouter.addListener('change', ctx => {
	// 未登录时只允许访问首页，其他页面强制跳回登录页
	if (!$i && ctx.fullPath !== '/') {
		mainRouter.replace('/');
		return;
	}
	if (_DEV_) console.log('mainRouter: change', ctx.fullPath);
	analytics.page({
		path: ctx.fullPath,
		title: ctx.fullPath,
	});
});

mainRouter.init();

export function useRouter(): Router {
	return inject(DI.router, null) ?? mainRouter;
}
