<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div ref="el" class="hiyeyicy" :class="{ wide: !narrow }">
	<div v-if="!narrow || currentPage?.route.name == null" class="nav">
		<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px;">
			<div class="lxpfedzu _gaps">
				<div class="banner">
					<img :src="instance.iconUrl || '/favicon.ico'" alt="" class="icon"/>
				</div>

				<div class="_gaps_s">
					<MkInfo v-if="thereIsUnresolvedAbuseReport" warn>{{ i18n.ts.thereIsUnresolvedAbuseReportWarning }} <MkA to="/admin/abuses" class="_link">{{ i18n.ts.check }}</MkA></MkInfo>
					<MkInfo v-if="noMaintainerInformation" warn>{{ i18n.ts.noMaintainerInformationWarning }} <MkA to="/admin/settings" class="_link">{{ i18n.ts.configure }}</MkA></MkInfo>
					<MkInfo v-if="noInquiryUrl" warn>{{ i18n.ts.noInquiryUrlWarning }} <MkA to="/admin/settings" class="_link">{{ i18n.ts.configure }}</MkA></MkInfo>
					<MkInfo v-if="noBotProtection" warn>{{ i18n.ts.noBotProtectionWarning }} <MkA to="/admin/security" class="_link">{{ i18n.ts.configure }}</MkA></MkInfo>
					<MkInfo v-if="noEmailServer" warn>{{ i18n.ts.noEmailServerWarning }} <MkA to="/admin/email-settings" class="_link">{{ i18n.ts.configure }}</MkA></MkInfo>
				</div>

				<MkSuperMenu :def="menuDef" :searchIndex="searchIndex" :grid="narrow"></MkSuperMenu>
			</div>
		</div>
	</div>
	<div v-if="!(narrow && currentPage?.route.name == null)" class="main _pageContainer" style="height: 100%;">
		<NestedRouterView/>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onActivated, onMounted, onUnmounted, provide, watch, ref, computed } from 'vue';
import type { SuperMenuDef } from '@/components/MkSuperMenu.vue';
import type { PageMetadata } from '@/page.js';
import { i18n } from '@/i18n.js';
import MkSuperMenu from '@/components/MkSuperMenu.vue';
import MkInfo from '@/components/MkInfo.vue';
import { instance } from '@/instance.js';
import { lookup } from '@/utility/lookup.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { lookupUser, lookupUserByEmail, lookupFile } from '@/utility/admin-lookup.js';
import { definePage, provideMetadataReceiver, provideReactiveMetadata } from '@/page.js';
import { useRouter } from '@/router.js';
import { genSearchIndexes } from '@/utility/inapp-search.js';
import { iAmAdmin } from '@/i.js';
import { ADMIN_MENU_ITEMS } from '@/utility/admin-menu-items.js';

const searchIndex = await import('search-index:admin').then(({ searchIndexes }) => genSearchIndexes(searchIndexes));

const isEmpty = (x: string | null) => x == null || x === '';

const router = useRouter();

// Admin 看到普通界面，不停留在管理面板（但仍可通过 URL 访问 /admin）
// 注意：只有当没有子路由时才重定向，否则 /admin/* 子页面会无法渲染
onMounted(() => {
	if (iAmAdmin.value && router.currentRoute.value.name === 'admin' && !router.currentRef.value.child) {
		router.replace('/');
	}
});

const indexInfo = {
	title: i18n.ts.controlPanel,
	icon: 'ti ti-settings',
	hideHeader: true,
};

provide('shouldOmitHeaderTitle', false);

const INFO = ref<PageMetadata>(indexInfo);
const childInfo = ref<null | PageMetadata>(null);
const narrow = ref(false);
const view = ref(null);
const el = ref<HTMLDivElement | null>(null);
const pageProps = ref({});
const noMaintainerInformation = computed(() => isEmpty(instance.maintainerName) || isEmpty(instance.maintainerEmail));
const noBotProtection = computed(() => !instance.disableRegistration && !instance.enableHcaptcha && !instance.enableRecaptcha && !instance.enableTurnstile && !instance.enableMcaptcha);
const noEmailServer = computed(() => !instance.enableEmail);
const noInquiryUrl = computed(() => isEmpty(instance.inquiryUrl));
const thereIsUnresolvedAbuseReport = ref(false);
const currentPage = computed(() => router.currentRef.value.child);

misskeyApi('admin/abuse-user-reports', {
	state: 'unresolved',
	limit: 1,
}).then(reports => {
	if (reports.length > 0) thereIsUnresolvedAbuseReport.value = true;
});

const NARROW_THRESHOLD = 600;
const ro = new ResizeObserver((entries, observer) => {
	if (entries.length === 0) return;
	narrow.value = entries[0].borderBoxSize[0].inlineSize < NARROW_THRESHOLD;
});

const menuDef = computed<SuperMenuDef[]>(() => {
	// 管理员在 /admin/menu-config 设置的:hidden=隐藏的菜单 to 列表;labels=重命名映射
	const adminMenu = (instance as { adminMenu?: { hidden: string[]; labels: Record<string, string> } }).adminMenu;
	const hidden = new Set(adminMenu?.hidden ?? []);
	const labels = adminMenu?.labels ?? {};
	const labelFor = (path: string, fallback: string) => labels[path] || fallback;
	const isActive = (activeFor: string[]) => activeFor.includes(currentPage.value?.route.name ?? '');
	const groups: SuperMenuDef[] = [{
		title: i18n.ts.quickAction,
		items: [{
			type: 'button',
			icon: 'ti ti-search',
			text: i18n.ts.lookup,
			action: adminLookup,
		}, ...(instance.disableRegistration ? [{
			type: 'button' as const,
			icon: 'ti ti-user-plus',
			text: i18n.ts.createInviteCode,
			action: invite,
		}] : [])],
	}];
	for (const group of ADMIN_MENU_ITEMS) {
		groups.push({
			title: group.title,
			items: group.items.map((item) => ({
				icon: item.icon,
				text: labelFor(item.key, item.text),
				to: item.to,
				active: isActive(item.activeFor),
				hidden: hidden.has(item.key),
			})),
		});
	}
	return groups;
});

onMounted(() => {
	if (el.value != null) {
		ro.observe(el.value);
		narrow.value = el.value.offsetWidth < NARROW_THRESHOLD;
	}
	if (currentPage.value?.route.name == null && !narrow.value) {
		router.replace('/admin/overview');
	}
});

onActivated(() => {
	if (el.value != null) {
		narrow.value = el.value.offsetWidth < NARROW_THRESHOLD;
	}
	if (currentPage.value?.route.name == null && !narrow.value) {
		router.replace('/admin/overview');
	}
});

onUnmounted(() => {
	ro.disconnect();
});

watch(router.currentRef, (to) => {
	if (to.route.path === '/admin' && to.child?.route.name == null && !narrow.value) {
		router.replace('/admin/overview');
	}
});

provideMetadataReceiver((metadataGetter) => {
	const info = metadataGetter();
	if (info == null) {
		childInfo.value = null;
	} else {
		childInfo.value = info;
		INFO.value.needWideArea = info.needWideArea ?? undefined;
	}
});
provideReactiveMetadata(INFO);

function invite() {
	misskeyApi('admin/invite/create').then(x => {
		os.alert({
			type: 'info',
			text: x[0].code,
		});
	}).catch(err => {
		os.alert({
			type: 'error',
			text: err,
		});
	});
}

function adminLookup(ev: PointerEvent) {
	os.popupMenu([{
		text: i18n.ts.user,
		icon: 'ti ti-user',
		action: () => {
			lookupUser();
		},
	}, {
		text: `${i18n.ts.user} (${i18n.ts.email})`,
		icon: 'ti ti-user',
		action: () => {
			lookupUserByEmail();
		},
	}, {
		text: i18n.ts.file,
		icon: 'ti ti-cloud',
		action: () => {
			lookupFile();
		},
	}, {
		text: i18n.ts.lookup,
		icon: 'ti ti-world-search',
		action: () => {
			lookup();
		},
	}], ev.currentTarget ?? ev.target);
}

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePage(() => INFO.value);
</script>

<style lang="scss" scoped>
.hiyeyicy {
	height: 100%;

	&.wide {
		display: flex;
		margin: 0 auto;

		> .nav {
			position: sticky;
			top: 0;
			width: 32%;
			max-width: 280px;
			box-sizing: border-box;
			border-right: solid 0.5px var(--MI_THEME-divider);
			overflow: auto;
			height: 100cqh;
		}

		> .main {
			flex: 1;
			min-width: 0;
		}
	}

	> .nav {
		.lxpfedzu {
			> .banner {
				margin: 16px;

				> .icon {
					display: block;
					margin: auto;
					height: 42px;
					border-radius: 8px;
				}
			}
		}
	}
}
</style>
