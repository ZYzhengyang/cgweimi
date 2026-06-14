<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">
			<MkInfo>设置后所有管理员/用户都会看到调整后的菜单。隐藏的项仍可通过 URL 直接访问。</MkInfo>

			<div v-for="group in menuGroups" :key="group.title" class="_panel">
				<div class="_title">{{ group.title }}</div>
				<div class="_content">
					<div v-for="item in group.items" :key="item.path" :class="$style.row">
						<div :class="$style.info">
							<i v-if="item.icon" :class="[item.icon, $style.icon]"></i>
							<div>
								<div :class="$style.text">{{ item.label }}</div>
								<div :class="$style.path">{{ item.path }}</div>
							</div>
						</div>
						<div :class="$style.controls">
							<MkInput
								v-model="labels[item.path]"
								placeholder="留空使用默认"
								:style="{ width: '200px' }"
							/>
							<MkSwitch v-model="hidden[item.path]">
								<template #label>隐藏</template>
							</MkSwitch>
						</div>
					</div>
				</div>
			</div>

			<div :class="$style.actions">
				<MkButton primary @click="save"><i class="ti ti-check"></i> 保存</MkButton>
				<MkButton @click="reset"><i class="ti ti-reload"></i> 重置</MkButton>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { instance } from '@/instance.js';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInfo from '@/components/MkInfo.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import * as os from '@/os.js';

const router = useRouter();

const initial = (instance as any).adminMenu as { hidden: string[]; labels: Record<string, string> } | undefined;
const hidden = ref<Record<string, boolean>>({});
const labels = ref<Record<string, string>>({});

function loadFromInstance() {
	hidden.value = {};
	labels.value = {};
	const init = (instance as any).adminMenu as { hidden: string[]; labels: Record<string, string> } | undefined;
	for (const item of allMenuItems) {
		hidden.value[item.path] = init?.hidden?.includes(item.path) ?? false;
		labels.value[item.path] = init?.labels?.[item.path] ?? '';
	}
}

interface MenuItem { path: string; label: string; icon: string; group: string; }
const allMenuItems: MenuItem[] = [
	{ path: '/admin/overview', label: i18n.ts.dashboard, icon: 'ti ti-dashboard', group: '仪表盘' },
	{ path: '/admin/users', label: i18n.ts.users, icon: 'ti ti-users', group: '用户与内容' },
	{ path: '/admin/files', label: i18n.ts.files, icon: 'ti ti-cloud', group: '用户与内容' },
	{ path: '/admin/featured', label: '精选推荐', icon: 'ti ti-star', group: '用户与内容' },
	{ path: '/admin/categories', label: '分类管理', icon: 'ti ti-folder', group: '用户与内容' },
	{ path: '/admin/banners', label: 'Banner 管理', icon: 'ti ti-photo', group: '用户与内容' },
	{ path: '/admin/scraper', label: '搬运管理', icon: 'ti ti-robot', group: '用户与内容' },
	{ path: '/admin/announcements', label: i18n.ts.announcements, icon: 'ti ti-speakerphone', group: '用户与内容' },
	{ path: '/admin/ads', label: i18n.ts.ads, icon: 'ti ti-ad', group: '用户与内容' },
	{ path: '/admin/abuses', label: i18n.ts.abuseReports, icon: 'ti ti-exclamation-circle', group: '用户与内容' },
	{ path: '/admin/modlog', label: i18n.ts.moderationLogs, icon: 'ti ti-list-search', group: '用户与内容' },
	{ path: '/admin/branding', label: i18n.ts.branding, icon: 'ti ti-paint', group: '站点外观' },
	{ path: '/admin/page-layout', label: '页面布局', icon: 'ti ti-layout', group: '站点外观' },
	{ path: '/admin/emojis', label: i18n.ts.customEmojis, icon: 'ti ti-icons', group: '站点外观' },
	{ path: '/admin/avatar-decorations', label: '头像装饰', icon: 'ti ti-sparkles', group: '站点外观' },
	{ path: '/admin/settings', label: i18n.ts.general, icon: 'ti ti-settings', group: '系统设置' },
	{ path: '/admin/moderation', label: i18n.ts.moderation, icon: 'ti ti-shield', group: '系统设置' },
	{ path: '/admin/email-settings', label: i18n.ts.emailServer, icon: 'ti ti-mail', group: '系统设置' },
	{ path: '/admin/object-storage', label: i18n.ts.objectStorage, icon: 'ti ti-cloud', group: '系统设置' },
	{ path: '/admin/security', label: i18n.ts.security, icon: 'ti ti-lock', group: '系统设置' },
	{ path: '/admin/roles', label: i18n.ts.roles, icon: 'ti ti-badges', group: '系统设置' },
	{ path: '/admin/invites', label: i18n.ts.invite, icon: 'ti ti-user-plus', group: '系统设置' },
	{ path: '/admin/hotkeys', label: '快捷键管理', icon: 'ti ti-keyboard', group: '系统设置' },
	{ path: '/admin/menu-config', label: '菜单管理', icon: 'ti ti-list-check', group: '系统设置' },
	{ path: '/admin/federation', label: '联邦管理', icon: 'ti ti-whirl', group: '高级/开发者' },
	{ path: '/admin/job-queue', label: '任务队列', icon: 'ti ti-clock', group: '高级/开发者' },
	{ path: '/admin/federation-job-queue', label: '联邦队列', icon: 'ti ti-clock-exclamation', group: '高级/开发者' },
	{ path: '/admin/performance', label: '性能设置', icon: 'ti ti-gauge', group: '高级/开发者' },
	{ path: '/admin/database', label: '数据库', icon: 'ti ti-database', group: '高级/开发者' },
	{ path: '/admin/relays', label: '中继管理', icon: 'ti ti-repeat', group: '高级/开发者' },
	{ path: '/admin/external-services', label: '外部服务', icon: 'ti ti-plug', group: '高级/开发者' },
	{ path: '/admin/system-webhook', label: '系统 Webhook', icon: 'ti ti-webhook', group: '高级/开发者' },
];

const menuGroups = computed(() => {
	const groups: Record<string, MenuItem[]> = {};
	for (const item of allMenuItems) {
		groups[item.group] = groups[item.group] ?? [];
		groups[item.group].push(item);
	}
	return Object.entries(groups).map(([title, items]) => ({ title, items }));
});

loadFromInstance();

async function save() {
	const hiddenArr = Object.entries(hidden.value).filter(([, v]) => v).map(([k]) => k);
	const labelsObj: Record<string, string> = {};
	for (const [k, v] of Object.entries(labels.value)) {
		if (v && v.trim() !== '') labelsObj[k] = v.trim();
	}
	await misskeyApi('admin/update-meta', {
		adminMenu: { hidden: hiddenArr, labels: labelsObj },
	});
	// 更新本地 instance
	(instance as any).adminMenu = { hidden: hiddenArr, labels: labelsObj };
	os.toast('已保存');
	router.replace('/admin/overview');
}

async function reset() {
	const confirmed = await os.confirm({ type: 'warning', text: '恢复所有菜单为默认显示和名称?' });
	if (!confirmed) return;
	await misskeyApi('admin/update-meta', { adminMenu: { hidden: [], labels: {} } });
	(instance as any).adminMenu = { hidden: [], labels: {} };
	loadFromInstance();
	os.toast('已重置');
}

definePage(() => ({ title: '菜单管理', icon: 'ti ti-list-check' }));
</script>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 14px;
	gap: 16px;
	border-bottom: solid 0.5px var(--MI_THEME-divider);

	&:last-child { border-bottom: none; }
}

.info {
	display: flex;
	align-items: center;
	gap: 12px;
	flex: 1;
	min-width: 0;
}

.icon {
	font-size: 1.1em;
	opacity: 0.7;
}

.text {
	font-weight: 500;
}

.path {
	font-size: 0.85em;
	opacity: 0.6;
	font-family: var(--MI-font-mono);
}

.controls {
	display: flex;
	align-items: center;
	gap: 12px;
}

.actions {
	display: flex;
	gap: 8px;
	justify-content: flex-end;
}
</style>
