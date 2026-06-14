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

const searchIndex = await import('search-index:admin').then(({ searchIndexes }) => genSearchIndexes(searchIndexes));

const isEmpty = (x: string | null) => x == null || x === '';

const router = useRouter();

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
	const adminMenu = (instance as any).adminMenu as { hidden: string[]; labels: Record<string, string> } | undefined;
	const hidden = new Set(adminMenu?.hidden ?? []);
	const labels = adminMenu?.labels ?? {};
	const labelFor = (path: string, fallback: string) => labels[path] || fallback;
	const hide = (item: any, path: string) => ({ ...item, hidden: hidden.has(path) || item.hidden });
	return [{
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
	}, {
		title: '仪表盘',
		items: [{
			icon: 'ti ti-dashboard',
			text: labelFor('/admin/overview', i18n.ts.dashboard),
			to: '/admin/overview',
			active: currentPage.value?.route.name === 'overview',
		}],
	}, {
		title: '用户与内容',
		items: [{
			icon: 'ti ti-users',
			text: labelFor('/admin/users', i18n.ts.users),
			to: '/admin/users',
			active: currentPage.value?.route.name === 'users',
		}, {
			icon: 'ti ti-cloud',
			text: labelFor('/admin/files', i18n.ts.files),
			to: '/admin/files',
			active: currentPage.value?.route.name === 'files',
		}, {
			icon: 'ti ti-star',
			text: labelFor('/admin/featured', '精选推荐'),
			to: '/admin/featured',
			active: currentPage.value?.route.name === 'featured',
		}, {
			icon: 'ti ti-folder',
			text: labelFor('/admin/categories', '分类管理'),
			to: '/admin/categories',
			active: currentPage.value?.route.name === 'categories',
		}, {
			icon: 'ti ti-photo',
			text: labelFor('/admin/banners', 'Banner 管理'),
			to: '/admin/banners',
			active: currentPage.value?.route.name === 'banners',
		}, {
			icon: 'ti ti-robot',
			text: labelFor('/admin/scraper', '搬运管理'),
			to: '/admin/scraper',
			active: currentPage.value?.route.name === 'scraper',
		}, {
			icon: 'ti ti-speakerphone',
			text: labelFor('/admin/announcements', i18n.ts.announcements),
			to: '/admin/announcements',
			active: currentPage.value?.route.name === 'announcements',
		}, {
			icon: 'ti ti-ad',
			text: labelFor('/admin/ads', i18n.ts.ads),
			to: '/admin/ads',
			active: currentPage.value?.route.name === 'ads',
		}, {
			icon: 'ti ti-exclamation-circle',
			text: labelFor('/admin/abuses', i18n.ts.abuseReports),
			to: '/admin/abuses',
			active: currentPage.value?.route.name === 'abuses',
		}, {
			icon: 'ti ti-list-search',
			text: labelFor('/admin/modlog', i18n.ts.moderationLogs),
			to: '/admin/modlog',
			active: currentPage.value?.route.name === 'modlog',
		}].map((item: any) => hide(item, item.to)),
	}, {
		title: '站点外观',
		items: [{
			icon: 'ti ti-paint',
			text: labelFor('/admin/branding', i18n.ts.branding),
			to: '/admin/branding',
			active: currentPage.value?.route.name === 'branding',
		}, {
			icon: 'ti ti-layout',
			text: labelFor('/admin/page-layout', '页面布局'),
			to: '/admin/page-layout',
			active: currentPage.value?.route.name === 'page-layout',
		}, {
			icon: 'ti ti-icons',
			text: labelFor('/admin/emojis', i18n.ts.customEmojis),
			to: '/admin/emojis',
			active: currentPage.value?.route.name === 'emojis',
		}, {
			icon: 'ti ti-sparkles',
			text: labelFor('/admin/avatar-decorations', '头像装饰'),
			to: '/admin/avatar-decorations',
			active: currentPage.value?.route.name === 'avatar-decorations',
		}].map((item: any) => hide(item, item.to)),
	}, {
		title: '系统设置',
		items: [{
			icon: 'ti ti-settings',
			text: labelFor('/admin/settings', i18n.ts.general),
			to: '/admin/settings',
			active: currentPage.value?.route.name === 'settings',
		}, {
			icon: 'ti ti-shield',
			text: labelFor('/admin/moderation', i18n.ts.moderation),
			to: '/admin/moderation',
			active: currentPage.value?.route.name === 'moderation',
		}, {
			icon: 'ti ti-mail',
			text: labelFor('/admin/email-settings', i18n.ts.emailServer),
			to: '/admin/email-settings',
			active: currentPage.value?.route.name === 'email-settings',
		}, {
			icon: 'ti ti-cloud',
			text: labelFor('/admin/object-storage', i18n.ts.objectStorage),
			to: '/admin/object-storage',
			active: currentPage.value?.route.name === 'object-storage',
		}, {
			icon: 'ti ti-lock',
			text: labelFor('/admin/security', i18n.ts.security),
			to: '/admin/security',
			active: currentPage.value?.route.name === 'security',
		}, {
			icon: 'ti ti-badges',
			text: labelFor('/admin/roles', i18n.ts.roles),
			to: '/admin/roles',
			active: currentPage.value?.route.name === 'roles',
		}, {
			icon: 'ti ti-user-plus',
			text: labelFor('/admin/invites', i18n.ts.invite),
			to: '/admin/invites',
			active: currentPage.value?.route.name === 'invites',
		}, {
			icon: 'ti ti-keyboard',
			text: labelFor('/admin/hotkeys', i18n.ts._hotkeyAdmin?.title ?? '快捷键管理'),
			to: '/admin/hotkeys',
			active: currentPage.value?.route.name === 'hotkeys',
		}, {
			icon: 'ti ti-list-check',
			text: labelFor('/admin/menu-config', '菜单管理'),
			to: '/admin/menu-config',
			active: currentPage.value?.route.name === 'admin-menu-config',
		}].map((item: any) => hide(item, item.to)),
	}, {
		title: '高级/开发者',
		items: [{
			icon: 'ti ti-whirl',
			text: labelFor('/admin/federation', '联邦管理'),
			to: '/admin/federation',
			active: currentPage.value?.route.name === 'federation',
		}, {
			icon: 'ti ti-clock',
			text: labelFor('/admin/job-queue', '任务队列'),
			to: '/admin/job-queue',
			active: currentPage.value?.route.name === 'job-queue',
		}, {
			icon: 'ti ti-clock-exclamation',
			text: labelFor('/admin/federation-job-queue', '联邦队列'),
			to: '/admin/federation-job-queue',
			active: currentPage.value?.route.name === 'federation-job-queue',
		}, {
			icon: 'ti ti-gauge',
			text: labelFor('/admin/performance', '性能设置'),
			to: '/admin/performance',
			active: currentPage.value?.route.name === 'performance',
		}, {
			icon: 'ti ti-database',
			text: labelFor('/admin/database', '数据库'),
			to: '/admin/database',
			active: currentPage.value?.route.name === 'database',
		}, {
			icon: 'ti ti-repeat',
			text: labelFor('/admin/relays', '中继管理'),
			to: '/admin/relays',
			active: currentPage.value?.route.name === 'relays',
		}, {
			icon: 'ti ti-plug',
			text: labelFor('/admin/external-services', '外部服务'),
			to: '/admin/external-services',
			active: currentPage.value?.route.name === 'external-services',
		}, {
			icon: 'ti ti-webhook',
			text: labelFor('/admin/system-webhook', '系统 Webhook'),
			to: '/admin/system-webhook',
			active: currentPage.value?.route.name === 'system-webhook',
		}].map((item: any) => hide(item, item.to)),
	}];
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
