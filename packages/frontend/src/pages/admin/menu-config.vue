<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="currentTab" :tabs="headerTabs">
	<div class="_spacer" :style="{ '--MI_SPACER-w': '1000px', '--MI_SPACER-min': '16px', '--MI_SPACER-max': '32px' }">
		<div class="_gaps_m">

			<!-- 菜单管理 -->
			<template v-if="currentTab === 'menu'">
				<MkInfo>勾选显示/取消隐藏，点击编辑重命名。</MkInfo>
				<UniversalConfigPanel :items="menuConfigItems" category="menu" />
			</template>

			<!-- 登录页 -->
			<template v-if="currentTab === 'entrance'">
				<MkFolder>
					<template #label><i class="ti ti-login-2"></i> 登录页设置</template>
					<div class="_gaps_m">
						<MkSwitch v-model="entranceVideoShow">
							<template #label>显示视频区域</template>
							<template #caption>右侧视频小窗，关闭后登录页只显示品牌区域</template>
						</MkSwitch>

						<MkRadios v-if="entranceVideoShow" v-model="entranceVideoSize" :options="videoSizeOptions">
							<template #label>视频窗口大小</template>
						</MkRadios>

						<div v-if="entranceVideoShow">
							<MkRange v-model="entranceBrandRatio" :min="30" :max="70" :step="5">
								<template #label>左侧品牌区占比</template>
								<template #caption>当前: {{ entranceBrandRatio }}% 品牌 / {{ 100 - entranceBrandRatio }}% 视频</template>
							</MkRange>
						</div>

						<MkSwitch v-model="entranceShowFederation">
							<template #label>显示联邦实例跑马灯</template>
							<template #caption>页面底部滚动展示关联实例</template>
						</MkSwitch>
					</div>
				</MkFolder>
			</template>

			<!-- 用户权限 -->
			<template v-if="currentTab === 'permissions'">
				<UniversalConfigPanel :items="permissionConfigItems" category="permissions" />
			</template>

			<!-- 设置页控制 -->
			<template v-if="currentTab === 'settingsPage'">
				<MkInfo>控制普通用户在设置页面能看到哪些选项。</MkInfo>
				<UniversalConfigPanel
					:items="settingsPageConfigItems"
					category="settingsPage"
					v-model="settingsPageModelValue"
				/>
			</template>

			<!-- 首页模块 -->
			<template v-if="currentTab === 'modules'">
				<UniversalConfigPanel :items="moduleConfigItems" category="modules" />
			</template>

			<!-- 导航功能 -->
			<template v-if="currentTab === 'navbar'">
				<UniversalConfigPanel :items="navbarConfigItems" category="navbar" />
			</template>

			<!-- 帖子操作 -->
			<template v-if="currentTab === 'post'">
				<UniversalConfigPanel :items="postConfigItems" category="post" />
			</template>

			<!-- 小工具 -->
			<template v-if="currentTab === 'widgets'">
				<UniversalConfigPanel
					:items="widgetConfigItems"
					category="widgets"
					v-model="widgetModelValue"
				/>
			</template>

			<!-- 自定义标签 -->
			<template v-if="currentTab === 'labels'">
				<MkFolder>
					<template #label><i class="ti ti-tag"></i> 自定义标签</template>
					<div class="_gaps_s">
						<MkInfo>自定义界面上显示的文字。留空则使用默认值。修改后刷新页面生效。</MkInfo>
						<div style="display: flex; justify-content: flex-end;">
							<MkButton :small="true" @click="resetLabels"><i class="ti ti-refresh"></i> 恢复默认</MkButton>
						</div>
						<div v-for="group in labelGroups" :key="group.name" :class="$style.permGroup">
							<div :class="$style.permGroupHeader">
								<span :class="$style.permGroupName">{{ group.name }}</span>
							</div>
							<div :class="$style.permList">
								<div v-for="item in group.items" :key="item.key" :class="$style.permItem">
									<div :class="$style.permInfo">
										<span :class="$style.labelKey">{{ item.key }}</span>
										<span :class="$style.labelDefault">默认: {{ item.defaultLabel }}</span>
									</div>
									<input
										type="text"
										:class="$style.labelInput"
										:value="customLabels[item.key] || ''"
										:placeholder="item.defaultLabel"
										@input="setLabel(item.key, ($event.target as HTMLInputElement).value)"
									/>
								</div>
							</div>
						</div>
					</div>
				</MkFolder>
			</template>

		</div>
	</div>
	<template #footer>
		<div :class="$style.footer">
			<div class="_spacer" :style="{ '--MI_SPACER-w': '1000px', '--MI_SPACER-min': '16px', '--MI_SPACER-max': '16px' }">
				<MkButton primary rounded @click="saveAll"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
			</div>
		</div>
	</template>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed, watch, defineAsyncComponent } from 'vue';
import * as Misskey from 'misskey-js';
import { instance } from '@/instance.js';
import MkButton from '@/components/MkButton.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkRadios from '@/components/MkRadios.vue';
import MkRange from '@/components/MkRange.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInfo from '@/components/MkInfo.vue';
import { PERMISSION_DEFINITIONS } from '@/utility/use-permission.js';
import { CUSTOM_LABEL_DEFINITIONS } from '@/utility/use-custom-label.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';

const UniversalConfigPanel = defineAsyncComponent(() => import('@/components/UniversalConfigPanel.vue'));

const meta = await misskeyApi('admin/meta');

// ========== 配置数据定义 ==========

interface ConfigItem {
	key: string;
	label: string;
	icon: string;
	group?: string;
}

interface ModuleConfigItem {
	id: string;
	name: string;
	icon: string;
	group?: string;
}

// 菜单项配置
const menuConfigItems = computed<ConfigItem[]>(() => [
	{ key: '/admin/overview', label: i18n.ts.dashboard, icon: 'ti ti-dashboard', group: '仪表盘' },
	{ key: '/admin/users', label: i18n.ts.users, icon: 'ti ti-users', group: '用户与内容' },
	{ key: '/admin/files', label: i18n.ts.files, icon: 'ti ti-cloud', group: '用户与内容' },
	{ key: '/admin/featured', label: '精选推荐', icon: 'ti ti-star', group: '用户与内容' },
	{ key: '/admin/categories', label: '分类管理', icon: 'ti ti-folder', group: '用户与内容' },
	{ key: '/admin/banners', label: 'Banner 管理', icon: 'ti ti-photo', group: '用户与内容' },
	{ key: '/admin/scraper', label: '搬运管理', icon: 'ti ti-robot', group: '用户与内容' },
	{ key: '/admin/announcements', label: i18n.ts.announcements, icon: 'ti ti-speakerphone', group: '用户与内容' },
	{ key: '/admin/ads', label: i18n.ts.ads, icon: 'ti ti-ad', group: '用户与内容' },
	{ key: '/admin/abuses', label: i18n.ts.abuseReports, icon: 'ti ti-exclamation-circle', group: '用户与内容' },
	{ key: '/admin/modlog', label: i18n.ts.moderationLogs, icon: 'ti ti-list-search', group: '用户与内容' },
	{ key: '/admin/branding', label: i18n.ts.branding, icon: 'ti ti-paint', group: '站点外观' },
	{ key: '/admin/page-layout', label: '页面布局', icon: 'ti ti-layout', group: '站点外观' },
	{ key: '/admin/emojis', label: i18n.ts.customEmojis, icon: 'ti ti-icons', group: '站点外观' },
	{ key: '/admin/avatar-decorations', label: '头像装饰', icon: 'ti ti-sparkles', group: '站点外观' },
	{ key: '/admin/settings', label: i18n.ts.general, icon: 'ti ti-settings', group: '系统设置' },
	{ key: '/admin/moderation', label: i18n.ts.moderation, icon: 'ti ti-shield', group: '系统设置' },
	{ key: '/admin/email-settings', label: i18n.ts.emailServer, icon: 'ti ti-mail', group: '系统设置' },
	{ key: '/admin/object-storage', label: i18n.ts.objectStorage, icon: 'ti ti-cloud', group: '系统设置' },
	{ key: '/admin/security', label: i18n.ts.security, icon: 'ti ti-lock', group: '系统设置' },
	{ key: '/admin/roles', label: i18n.ts.roles, icon: 'ti ti-badges', group: '系统设置' },
	{ key: '/admin/invites', label: i18n.ts.invite, icon: 'ti ti-user-plus', group: '系统设置' },
	{ key: '/admin/hotkeys', label: '快捷键管理', icon: 'ti ti-keyboard', group: '系统设置' },
	{ key: '/admin/menu-config', label: '菜单管理', icon: 'ti ti-list-check', group: '系统设置' },
	{ key: '/admin/federation', label: '联邦管理', icon: 'ti ti-whirl', group: '高级/开发者' },
	{ key: '/admin/job-queue', label: '任务队列', icon: 'ti ti-clock', group: '高级/开发者' },
	{ key: '/admin/federation-job-queue', label: '联邦队列', icon: 'ti ti-clock-exclamation', group: '高级/开发者' },
	{ key: '/admin/performance', label: '性能设置', icon: 'ti ti-gauge', group: '高级/开发者' },
	{ key: '/admin/database', label: '数据库', icon: 'ti ti-database', group: '高级/开发者' },
	{ key: '/admin/relays', label: '中继管理', icon: 'ti ti-repeat', group: '高级/开发者' },
	{ key: '/admin/external-services', label: '外部服务', icon: 'ti ti-plug', group: '高级/开发者' },
	{ key: '/admin/system-webhook', label: '系统 Webhook', icon: 'ti ti-webhook', group: '高级/开发者' },
]);

// 权限项配置
const permissionConfigItems = computed<ConfigItem[]>(() => PERMISSION_DEFINITIONS.map(p => ({
	key: p.key,
	label: p.label,
	icon: p.icon || 'ti ti-settings',
	group: p.group,
})));

// 设置页隐藏项配置
const settingsPageConfigItems = computed<ConfigItem[]>(() => [
	{ key: 'profile', label: i18n.ts.profile, icon: 'ti ti-user', group: '账号' },
	{ key: 'privacy', label: i18n.ts.privacy, icon: 'ti ti-lock-open', group: '账号' },
	{ key: 'notifications', label: i18n.ts.notifications, icon: 'ti ti-bell', group: '账号' },
	{ key: 'email', label: i18n.ts.email, icon: 'ti ti-mail', group: '账号' },
	{ key: 'security', label: i18n.ts.security, icon: 'ti ti-lock', group: '账号' },
	{ key: 'preferences', label: i18n.ts.preferences, icon: 'ti ti-adjustments', group: '偏好' },
	{ key: 'theme', label: i18n.ts.theme, icon: 'ti ti-palette', group: '偏好' },
	{ key: 'emoji-palette', label: i18n.ts.emojiPalette, icon: 'ti ti-mood-happy', group: '偏好' },
	{ key: 'sounds', label: i18n.ts.sounds, icon: 'ti ti-music', group: '偏好' },
	{ key: 'plugin', label: i18n.ts.plugins, icon: 'ti ti-plug', group: '偏好' },
	{ key: 'drive', label: i18n.ts.drive, icon: 'ti ti-cloud', group: '数据' },
	{ key: 'mute-block', label: i18n.ts.muteAndBlock, icon: 'ti ti-ban', group: '数据' },
	{ key: 'connect', label: '服务连接', icon: 'ti ti-link', group: '数据' },
	{ key: 'account-data', label: '账户数据', icon: 'ti ti-package', group: '数据' },
]);

// 模块项配置
const moduleConfigItems = computed<ModuleConfigItem[]>(() => [
	{ id: 'banner', name: 'Banner 轮播', icon: '🖼️', group: '首页模块' },
	{ id: 'featured', name: '精选推荐', icon: '⭐', group: '首页模块' },
	{ id: 'categories', name: '分类入口', icon: '📂', group: '首页模块' },
	{ id: 'timeline', name: '时间线', icon: '📰', group: '首页模块' },
	{ id: 'hot-tags', name: '热门标签', icon: '🏷️', group: '首页模块' },
	{ id: 'creators', name: '创作者推荐', icon: '👥', group: '首页模块' },
]);

// 导航项配置
const navbarConfigItems = computed<ConfigItem[]>(() => [
	{ key: 'post', label: '发帖按钮', icon: 'ti ti-pencil', group: '导航' },
	{ key: 'notifications', label: '通知', icon: 'ti ti-bell', group: '导航' },
	{ key: 'drive', label: '云盘', icon: 'ti ti-cloud', group: '导航' },
	{ key: 'followRequests', label: '关注请求', icon: 'ti ti-user-plus', group: '导航' },
	{ key: 'explore', label: '发现页', icon: 'ti ti-hash', group: '导航' },
	{ key: 'videoFeed', label: '刷视频', icon: 'ti ti-movie', group: '导航' },
	{ key: 'announcements', label: '公告', icon: 'ti ti-speakerphone', group: '导航' },
	{ key: 'search', label: '搜索', icon: 'ti ti-search', group: '导航' },
	{ key: 'lookup', label: '查找', icon: 'ti ti-world-search', group: '导航' },
	{ key: 'lists', label: '列表', icon: 'ti ti-list', group: '导航' },
	{ key: 'antennas', label: '天线', icon: 'ti ti-antenna', group: '导航' },
	{ key: 'favorites', label: '收藏', icon: 'ti ti-star', group: '导航' },
	{ key: 'pages', label: '页面', icon: 'ti ti-news', group: '导航' },
	{ key: 'play', label: 'Play', icon: 'ti ti-player-play', group: '导航' },
	{ key: 'gallery', label: '画廊', icon: 'ti ti-icons', group: '导航' },
	{ key: 'clips', label: 'Clips', icon: 'ti ti-paperclip', group: '导航' },
	{ key: 'channels', label: '频道', icon: 'ti ti-device-tv', group: '导航' },
	{ key: 'achievements', label: '成就', icon: 'ti ti-medal', group: '导航' },
	{ key: 'ui', label: '切换UI', icon: 'ti ti-devices', group: '导航' },
]);

// 帖子操作配置
const postConfigItems = computed<ConfigItem[]>(() => [
	{ key: 'reply', label: '回复', icon: 'ti ti-arrow-back-up', group: '帖子操作' },
	{ key: 'renote', label: '转发', icon: 'ti ti-repeat', group: '帖子操作' },
	{ key: 'react', label: '反应/点赞', icon: 'ti ti-heart', group: '帖子操作' },
	{ key: 'share', label: '分享', icon: 'ti ti-share', group: '帖子弹窗' },
	{ key: 'bookmark', label: '收藏', icon: 'ti ti-bookmark', group: '帖子弹窗' },
	{ key: 'report', label: '举报', icon: 'ti ti-exclamation-circle', group: '帖子弹窗' },
	{ key: 'copyLink', label: '复制链接', icon: 'ti ti-link', group: '帖子弹窗' },
	{ key: 'delete', label: '删除', icon: 'ti ti-trash', group: '帖子弹窗' },
	{ key: 'poll', label: '投票', icon: 'ti ti-chart-bar', group: '发帖表单' },
	{ key: 'cw', label: '内容警告 (CW)', icon: 'ti ti-eye-off', group: '发帖表单' },
	{ key: 'geo', label: '地理位置', icon: 'ti ti-map-pin', group: '发帖表单' },
	{ key: 'visibility', label: '可见范围', icon: 'ti ti-world', group: '发帖表单' },
	{ key: 'reactionAcceptance', label: '反应类型', icon: 'ti ti-settings', group: '发帖表单' },
]);

// 小工具配置
const widgetConfigItems = computed<ConfigItem[]>(() => [
	{ key: 'profile', label: '个人资料', icon: 'ti ti-user', group: '小工具' },
	{ key: 'instanceInfo', label: '实例信息', icon: 'ti ti-info-circle', group: '小工具' },
	{ key: 'memo', label: '便签', icon: 'ti ti-sticky-note', group: '小工具' },
	{ key: 'notifications', label: '通知', icon: 'ti ti-bell', group: '小工具' },
	{ key: 'timeline', label: '时间线', icon: 'ti ti-clock', group: '小工具' },
	{ key: 'calendar', label: '日历', icon: 'ti ti-calendar', group: '小工具' },
	{ key: 'rss', label: 'RSS', icon: 'ti ti-rss', group: '小工具' },
	{ key: 'rssTicker', label: 'RSS滚动', icon: 'ti ti-rss', group: '小工具' },
	{ key: 'trends', label: '趋势', icon: 'ti ti-trending-up', group: '小工具' },
	{ key: 'clock', label: '时钟', icon: 'ti ti-clock', group: '小工具' },
	{ key: 'activity', label: '活动', icon: 'ti ti-activity', group: '小工具' },
	{ key: 'photos', label: '照片', icon: 'ti ti-photo', group: '小工具' },
	{ key: 'digitalClock', label: '数字时钟', icon: 'ti ti-clock', group: '小工具' },
	{ key: 'unixClock', label: 'Unix时钟', icon: 'ti ti-clock', group: '小工具' },
	{ key: 'postForm', label: '发帖表单', icon: 'ti ti-pencil', group: '小工具' },
	{ key: 'slideshow', label: '幻灯片', icon: 'ti ti-photo', group: '小工具' },
	{ key: 'serverMetric', label: '服务器状态', icon: 'ti ti-server', group: '小工具' },
	{ key: 'onlineUsers', label: '在线用户', icon: 'ti ti-users', group: '小工具' },
	{ key: 'jobQueue', label: '任务队列', icon: 'ti ti-list', group: '小工具' },
	{ key: 'button', label: '按钮', icon: 'ti ti-button', group: '小工具' },
	{ key: 'aiscript', label: 'AIScript', icon: 'ti ti-code', group: '小工具' },
	{ key: 'aiscriptApp', label: 'AIScript应用', icon: 'ti ti-code', group: '小工具' },
	{ key: 'aichan', label: 'AI频道', icon: 'ti ti-message', group: '小工具' },
	{ key: 'userList', label: '用户列表', icon: 'ti ti-users', group: '小工具' },
	{ key: 'clicker', label: '点击游戏', icon: 'ti ti-click', group: '小工具' },
	{ key: 'birthdayFollowings', label: '生日关注', icon: 'ti ti-cake', group: '小工具' },
	{ key: 'chat', label: '聊天', icon: 'ti ti-message-circle', group: '小工具' },
]);

// ========== 小工具配置 ==========
const hiddenWidgets = ref<string[]>(meta.hiddenWidgets ?? []);
const widgetLabels = ref<Record<string, string>>({});

const widgetModelValue = computed(() => ({
	hidden: hiddenWidgets.value,
	labels: widgetLabels.value,
}));

// ========== 设置页配置 ==========
const hiddenSettingsForUsers = ref<Record<string, string>>(
	typeof meta.hiddenSettingsForUsers?.hidden === 'object'
		? meta.hiddenSettingsForUsers.hidden ?? []
		: []
);
const settingsPageLabels = ref<Record<string, string>>(
	typeof meta.hiddenSettingsForUsers?.labels === 'object'
		? meta.hiddenSettingsForUsers.labels ?? {}
		: {}
);

const settingsPageModelValue = computed(() => ({
	hidden: hiddenSettingsForUsers.value,
	labels: settingsPageLabels.value,
}));

// ========== 登录页设置 ==========
const videoSizeOptions = [
	{ value: 'small', label: '小（320px）' },
	{ value: 'medium', label: '中（400px）' },
	{ value: 'large', label: '大（500px）' },
	{ value: 'full', label: '全屏（占满右侧）' },
];

const entranceVideoShow = ref(meta.clientOptions.entranceVideoShow ?? true);
const entranceVideoSize = ref<Misskey.entities.MetaClientOptions['entranceVideoSize']>(meta.clientOptions.entranceVideoSize ?? 'medium');
const entranceBrandRatio = ref(meta.clientOptions.entranceBrandRatio ?? 50);
const entranceShowFederation = ref(meta.clientOptions.entranceShowFederation ?? true);

// ========== 自定义标签 ==========
const customLabels = ref<Record<string, string>>(meta.clientOptions?.customLabels ?? {});

const labelGroups = computed(() => {
	const groups: { name: string; items: typeof CUSTOM_LABEL_DEFINITIONS[number][] }[] = [];
	const groupMap = new Map<string, typeof CUSTOM_LABEL_DEFINITIONS[number][]>();
	for (const def of CUSTOM_LABEL_DEFINITIONS) {
		if (!groupMap.has(def.group)) groupMap.set(def.group, []);
		groupMap.get(def.group)!.push(def);
	}
	for (const [name, items] of groupMap) {
		groups.push({ name, items });
	}
	return groups;
});

const labelDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function setLabel(key: string, value: string) {
	if (labelDebounceTimers.has(key)) {
		clearTimeout(labelDebounceTimers.get(key)!);
	}
	labelDebounceTimers.set(key, setTimeout(() => {
		if (value.trim()) {
			customLabels.value[key] = value.trim();
		} else {
			delete customLabels.value[key];
		}
		customLabels.value = { ...customLabels.value };
		labelDebounceTimers.delete(key);
	}, 300));
}

function resetLabels() {
	customLabels.value = {};
}

// ========== 保存 ==========
function saveAll() {
	os.apiWithDialog('admin/update-meta', {
		clientOptions: {
			entranceVideoShow: entranceVideoShow.value,
			entranceVideoSize: entranceVideoSize.value,
			entranceBrandRatio: entranceBrandRatio.value,
			entranceShowFederation: entranceShowFederation.value,
			customLabels: customLabels.value,
		},
		hiddenWidgets: hiddenWidgets.value,
		hiddenSettingsForUsers: {
			hidden: hiddenSettingsForUsers.value,
			labels: settingsPageLabels.value,
		},
	}).then(() => {
		fetchInstance(true);
	});
}

// 监听设置页配置变化
watch(settingsPageModelValue, (val) => {
	hiddenSettingsForUsers.value = val.hidden;
	settingsPageLabels.value = val.labels;
}, { deep: true });

// 监听小工具配置变化
watch(widgetModelValue, (val) => {
	hiddenWidgets.value = val.hidden;
	widgetLabels.value = val.labels;
}, { deep: true });

// ========== Tabs ==========
const currentTab = ref('menu');

const headerTabs = computed(() => [{
	key: 'menu',
	title: '菜单管理',
	icon: 'ti ti-list-check',
}, {
	key: 'permissions',
	title: '用户权限',
	icon: 'ti ti-shield-lock',
}, {
	key: 'settingsPage',
	title: '设置页',
	icon: 'ti ti-settings',
}, {
	key: 'modules',
	title: '首页模块',
	icon: 'ti ti-layout-list',
}, {
	key: 'navbar',
	title: '导航功能',
	icon: 'ti ti-navigation',
}, {
	key: 'post',
	title: '帖子操作',
	icon: 'ti ti-message-circle',
}, {
	key: 'widgets',
	title: '小工具',
	icon: 'ti ti-layout-sidebar',
}, {
	key: 'entrance',
	title: '登录页',
	icon: 'ti ti-login-2',
}, {
	key: 'labels',
	title: '自定义标签',
	icon: 'ti ti-tag',
}]);

definePage(() => ({
	title: '菜单管理',
	icon: 'ti ti-list-check',
}));
</script>

<style lang="scss" module>
.footer {
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
}

.permGroup {
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	overflow: hidden;
	border-left: 3px solid var(--MI_THEME-accent);
}

.permGroupHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: color-mix(in srgb, var(--MI_THEME-accent) 6%, var(--MI_THEME-bg));
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.permGroupName {
	font-weight: 600;
	font-size: 14px;
}

.permList {
	padding: 4px 0;
}

.permItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 16px;
	transition: background 0.15s;
	gap: 12px;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
	}
}

.permInfo {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 13px;
	min-width: 0;
	flex: 1;

	i {
		width: 18px;
		text-align: center;
		color: var(--MI_THEME-fgTransparentWeak);
		font-size: 14px;
		flex-shrink: 0;
	}
}

.labelKey {
	font-family: monospace;
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	background: var(--MI_THEME-bg);
	padding: 2px 6px;
	border-radius: 4px;
}

.labelDefault {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.labelInput {
	flex: 1;
	max-width: 200px;
	padding: 6px 10px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 6px;
	font-size: 13px;
	background: var(--MI_THEME-bg);
	color: var(--MI_THEME-fg);
	outline: none;
	transition: border-color 0.15s;

	&:focus {
		border-color: var(--MI_THEME-accent);
	}

	&::placeholder {
		color: var(--MI_THEME-fgTransparentWeak);
	}
}
</style>