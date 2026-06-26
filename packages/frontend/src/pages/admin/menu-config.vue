<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_spacer" :style="{ '--MI_SPACER-w': '1000px', '--MI_SPACER-min': '16px', '--MI_SPACER-max': '32px' }">
	<div class="_gaps_l">

		<!-- 顶部：角色预览切换 + 当前角色提示 -->
		<div :class="$style.topBar">
			<div :class="$style.topBarLeft">
				<div :class="$style.title">界面控制</div>
				<div :class="$style.subtitle">
					当前视角:
					<span :class="[$style.roleChip, $style[previewMode.asUser ? 'roleUser' : 'roleAdmin']]">
						<i :class="previewMode.asUser ? 'ti ti-user' : 'ti ti-shield'"></i>
						{{ previewMode.asUser ? '👤 普通用户' : '🛠 admin 后台' }}
					</span>
				</div>
			</div>
			<div :class="$style.topBarRight">
				<MkButton
					:primary="!previewMode.asUser"
					:rounded="true"
					@click="togglePreviewMode"
				>
					<i :class="previewMode.asUser ? 'ti ti-eye-off' : 'ti ti-eye'"></i>
					{{ previewMode.asUser ? '退出预览' : '👁 预览普通用户视角' }}
				</MkButton>
			</div>
		</div>

		<MkInfo v-if="previewMode.asUser" warn>
			当前为<strong>预览普通用户视角</strong>,所见为普通用户渲染效果。改动需点底部「保存」才能写入后端。
		</MkInfo>

		<!-- ========== 🛠 admin 后台 ========== -->
		<MkFolder :defaultOpen="true">
			<template #label>
				<span :class="[$style.roleChip, $style.roleAdmin]"><i class="ti ti-shield"></i> admin 后台</span>
				<span :class="$style.sectionMeta">1 个 tab</span>
			</template>
			<div class="_gaps_m">
				<!-- 菜单管理（admin 后台侧栏） -->
				<template>
					<MkInfo>勾选显示 / 取消隐藏，点击编辑重命名。影响<strong>下方示意图</strong>中标记的 admin 后台侧边栏菜单项。</MkInfo>
					<AdminSidebarPreview
						:hidden="hiddenAdminMenu"
						:labels="adminMenuLabels"
					/>
					<UniversalConfigPanel
						:items="menuConfigItems"
						category="menu"
						:modelValue="adminMenuModelValue"
						@update="onAdminMenuUpdate"
					/>
				</template>
			</div>
		</MkFolder>

		<!-- ========== 👤 普通用户 ========== -->
		<MkFolder :defaultOpen="true">
			<template #label>
				<span :class="[$style.roleChip, $style.roleUser]"><i class="ti ti-user"></i> 普通用户</span>
				<span :class="$style.sectionMeta">5 个 tab</span>
			</template>
			<div class="_gaps_m">
				<!-- 用户权限 (分组UI) -->
				<MkFolder>
					<template #label><i class="ti ti-shield-lock"></i> 用户功能权限</template>
					<div class="_gaps_s">
						<MkInfo>控制普通用户可见的功能，管理员始终可见全部。未设置的默认显示，关闭后对普通用户隐藏。</MkInfo>
						<div :class="$style.permActions">
							<MkButton :small="true" @click="toggleAllPermissions(false)"><i class="ti ti-eye"></i> 全部显示</MkButton>
							<MkButton :small="true" @click="toggleAllPermissions(true)"><i class="ti ti-eye-off"></i> 全部隐藏</MkButton>
							<MkButton :small="true" danger @click="resetPermissions"><i class="ti ti-refresh"></i> 重置默认</MkButton>
						</div>
						<div :class="$style.permGroups">
							<div v-for="group in permissionGroups" :key="group.name" :class="$style.permGroupCard">
								<div :class="$style.permGroupHeader2">
									<div :class="$style.permGroupTitle">
										<div :class="$style.permGroupIconWrap">
											<i :class="[getGroupIcon(group.name), $style.permGroupIcon]"></i>
										</div>
										<span>{{ group.name }}</span>
										<span :class="$style.permCount">({{ group.items.length }})</span>
									</div>
									<div :class="$style.permGroupActions">
										<button class="_button" :class="$style.permGroupBtn" @click="toggleGroup(group.name, false)" :title="'全部显示'">
											<i class="ti ti-eye"></i>
										</button>
										<button class="_button" :class="$style.permGroupBtn" @click="toggleGroup(group.name, true)" :title="'全部隐藏'">
											<i class="ti ti-eye-off"></i>
										</button>
									</div>
								</div>
								<div :class="$style.permListInner">
									<div v-for="perm in group.items" :key="perm.key" :class="$style.permItemInner">
										<div :class="$style.permInfoInner">
											<i :class="[perm.icon, $style.permIcon]"></i>
											<div :class="$style.permText">
												<span :class="$style.permLabel">{{ perm.label }}</span>
												<span :class="$style.permKeyText">{{ perm.key }}</span>
											</div>
										</div>
										<MkSwitch :modelValue="getPermValue(perm.key)" @update:modelValue="setPerm(perm.key, $event)" />
									</div>
								</div>
							</div>
						</div>
					</div>
				</MkFolder>

				<!-- 设置页控制 -->
				<MkFolder>
					<template #label><i class="ti ti-settings"></i> 设置页</template>
					<div class="_gaps_s">
						<MkInfo>控制普通用户在设置页面能看到哪些选项。</MkInfo>
						<UniversalConfigPanel
							:items="settingsPageConfigItems"
							category="settingsPage"
							:modelValue="{ hidden: hiddenSettingsForUsers.value, labels: settingsPageLabels.value }"
							@update="onSettingsPageUpdate"
						/>
					</div>
				</MkFolder>

				<!-- 首页模块 (带排序) -->
				<MkFolder>
					<template #label><i class="ti ti-layout-list"></i> 首页模块</template>
					<div class="_gaps_s">
						<MkInfo>控制首页显示哪些模块及排序，上下箭头调整顺序。</MkInfo>
						<div :class="$style.sectionList">
							<div v-for="(section, index) in layoutSections" :key="section.id" :class="$style.sectionItem">
								<div :class="$style.sectionLeft">
									<span :class="$style.sectionIcon">{{ section.icon }}</span>
									<div>
										<div :class="$style.sectionName">{{ section.name }}</div>
										<div :class="$style.sectionDesc">{{ section.type }}</div>
									</div>
								</div>
								<div :class="$style.sectionActions">
									<button class="_button" :class="$style.arrowBtn" @click="moveSectionUp(index)" :disabled="index === 0">
										<i class="ti ti-chevron-up"></i>
									</button>
									<button class="_button" :class="$style.arrowBtn" @click="moveSectionDown(index)" :disabled="index === layoutSections.length - 1">
										<i class="ti ti-chevron-down"></i>
									</button>
									<MkSwitch v-model="section.enabled" />
								</div>
							</div>
						</div>
					</div>
				</MkFolder>

				<!-- 帖子操作 (含弹窗/个人主页/发帖表单) -->
				<MkFolder>
					<template #label><i class="ti ti-message-circle"></i> 帖子操作</template>
					<div class="_gaps_s">
						<MkInfo>控制帖子页操作按钮、帖子弹窗菜单、发帖表单组件。影响普通用户。</MkInfo>
						<UniversalConfigPanel
							:items="postConfigItems"
							category="post"
							:modelValue="postModelValue"
							@update="onPostUpdate"
						/>
					</div>
				</MkFolder>

				<!-- 时间线标签页 -->
				<MkFolder>
					<template #label><i class="ti ti-clock"></i> 时间线</template>
					<div class="_gaps_s">
						<MkInfo>控制普通用户在首页时间线顶部能看到哪些标签页，管理员始终可见全部。</MkInfo>
						<div :class="$style.sectionActions">
							<MkButton :small="true" @click="resetTimelineTabs"><i class="ti ti-refresh"></i> 恢复默认</MkButton>
						</div>
						<div :class="$style.sectionList">
							<div v-for="tab in timelineTabs" :key="tab.key" :class="$style.sectionItem">
								<div :class="$style.sectionLeft">
									<i :class="tab.icon" style="font-size: 18px; width: 24px; text-align: center;"></i>
									<span :class="$style.sectionName">{{ tab.label }}</span>
								</div>
								<MkSwitch :modelValue="isTabVisible(tab.key)" @update:modelValue="setTabVisible(tab.key, $event)" />
							</div>
						</div>
					</div>
				</MkFolder>

				<MkFolder>
					<template #label><i class="ti ti-user-circle"></i> 个人主页标签</template>
					<div class="_gaps_s">
						<MkInfo>控制普通用户在个人主页能看到的标签页。</MkInfo>
						<div :class="$style.sectionList">
							<div v-for="item in profileTabs" :key="item.key" :class="$style.sectionItem">
								<div :class="$style.sectionLeft">
									<i :class="item.icon" style="font-size: 18px; width: 24px; text-align: center;"></i>
									<span :class="$style.sectionName">{{ item.label }}</span>
								</div>
								<MkSwitch :modelValue="isUIVisible('profileTabs', item.key)" @update:modelValue="setUIVisible('profileTabs', item.key, $event)" />
							</div>
						</div>
					</div>
				</MkFolder>
			</div>
		</MkFolder>

		<!-- ========== 🌐 所有人 ========== -->
		<MkFolder :defaultOpen="true">
			<template #label>
				<span :class="[$style.roleChip, $style.roleAll]"><i class="ti ti-world"></i> 所有人</span>
				<span :class="$style.sectionMeta">3 个 tab</span>
			</template>
			<div class="_gaps_m">
				<!-- 导航功能 -->
				<MkFolder>
					<template #label><i class="ti ti-navigation"></i> 导航功能</template>
					<div class="_gaps_s">
						<MkInfo>控制顶部导航栏的功能按钮，admin 和普通用户都受影响。</MkInfo>
						<UniversalConfigPanel
							:items="navbarConfigItems"
							category="navbar"
							:modelValue="{ hidden: navbarHiddenItems.value, labels: navbarCustomLabels.value }"
							@update="onNavbarUpdate"
						/>
					</div>
				</MkFolder>

				<!-- 自定义标签 -->
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
			</div>
		</MkFolder>

		<div :class="$style.footer">
			<MkButton primary rounded @click="saveAll"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, defineAsyncComponent } from 'vue';
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
import { ADMIN_MENU_ITEMS } from '@/utility/admin-menu-items.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { usePreviewModeStore, togglePreviewMode } from '@/stores/preview-mode.js';
import AdminSidebarPreview from '@/components/AdminSidebarPreview.vue';

const UniversalConfigPanel = defineAsyncComponent(() => import('@/components/UniversalConfigPanel.vue'));
const previewMode = usePreviewModeStore();

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

// 菜单项配置 - 单一数据源来自 utility/admin-menu-items.ts（与 admin/index.vue 侧栏共享）
const menuConfigItems = computed<ConfigItem[]>(() => {
	const items: ConfigItem[] = [];
	for (const group of ADMIN_MENU_ITEMS) {
		for (const item of group.items) {
			items.push({ key: item.key, label: item.text, icon: item.icon, group: group.title });
		}
	}
	return items;
});

// ========== 用户权限 (分组UI) ==========
const userPermissions = ref<Record<string, boolean>>(meta.clientOptions?.userPermissions ?? {});

const permissionGroups = computed(() => {
	const groups: { name: string; items: typeof PERMISSION_DEFINITIONS[number][] }[] = [];
	const groupMap = new Map<string, typeof PERMISSION_DEFINITIONS[number][]>();
	for (const def of PERMISSION_DEFINITIONS) {
		if (!groupMap.has(def.group)) groupMap.set(def.group, []);
		groupMap.get(def.group)!.push(def);
	}
	for (const [name, items] of groupMap) {
		groups.push({ name, items });
	}
	return groups;
});

function getPermValue(key: string): boolean {
	return userPermissions.value[key] !== false;
}

function setPerm(key: string, value: boolean) {
	if (value) {
		delete userPermissions.value[key];
	} else {
		userPermissions.value[key] = false;
	}
	userPermissions.value = { ...userPermissions.value };
}

function toggleGroup(groupName: string, hide: boolean) {
	const group = permissionGroups.value.find(g => g.name === groupName);
	if (!group) return;
	for (const item of group.items) {
		if (hide) {
			userPermissions.value[item.key] = false;
		} else {
			delete userPermissions.value[item.key];
		}
	}
	userPermissions.value = { ...userPermissions.value };
}

function resetPermissions() {
	userPermissions.value = {};
}

function toggleAllPermissions(hide: boolean) {
	for (const group of permissionGroups.value) {
		for (const item of group.items) {
			if (hide) {
				userPermissions.value[item.key] = false;
			} else {
				delete userPermissions.value[item.key];
			}
		}
	}
	userPermissions.value = { ...userPermissions.value };
}

const groupIcons: Record<string, string> = {
	'个人资料': 'ti ti-user-circle',
	'偏好设置': 'ti ti-adjustments',
	'主题': 'ti ti-palette',
	'安全设置': 'ti ti-shield-lock',
	'隐私': 'ti ti-lock-open',
	'通知设置': 'ti ti-bell',
	'其他设置': 'ti ti-settings',
	'帖子': 'ti ti-message-circle',
	'时间线': 'ti ti-clock',
	'搜索': 'ti ti-search',
	'导航': 'ti ti-navigation',
	'互动': 'ti ti-heart',
	'创作': 'ti ti-pencil',
};

function getGroupIcon(name: string): string {
	return groupIcons[name] || 'ti ti-folder';
}

// ========== 设置页隐藏项配置 ==========
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

// ========== 首页模块 (排序) ==========
const defaultSections = [
	{ id: 'banner', type: 'banner', name: 'Banner 轮播', icon: '🖼️', enabled: true, order: 0 },
	{ id: 'featured', type: 'featured', name: '精选推荐', icon: '⭐', enabled: true, order: 1 },
	{ id: 'categories', type: 'categories', name: '分类入口', icon: '📂', enabled: true, order: 2 },
	{ id: 'timeline', type: 'timeline', name: '时间线', icon: '📰', enabled: true, order: 3 },
	{ id: 'hot-tags', type: 'hot-tags', name: '热门标签', icon: '🏷️', enabled: false, order: 4 },
	{ id: 'creators', type: 'creators', name: '创作者推荐', icon: '👥', enabled: false, order: 5 },
];
const layoutSections = ref(meta.clientOptions.layoutSections ?? defaultSections);

function moveSectionUp(index: number) {
	if (index <= 0) return;
	const arr = [...layoutSections.value];
	[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
	layoutSections.value = arr;
}

function moveSectionDown(index: number) {
	if (index >= layoutSections.value.length - 1) return;
	const arr = [...layoutSections.value];
	[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
	layoutSections.value = arr;
}

// ========== 导航项配置 ==========
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

// ========== 帖子操作配置 ==========
const postConfigItems = computed<ConfigItem[]>(() => [
	{ key: 'actions:reply', label: '回复', icon: 'ti ti-arrow-back-up', group: '帖子操作' },
	{ key: 'actions:renote', label: '转发', icon: 'ti ti-repeat', group: '帖子操作' },
	{ key: 'actions:react', label: '反应/点赞', icon: 'ti ti-heart', group: '帖子操作' },
	{ key: 'actions:share', label: '分享', icon: 'ti ti-share', group: '帖子弹窗' },
	{ key: 'actions:bookmark', label: '收藏', icon: 'ti ti-bookmark', group: '帖子弹窗' },
	{ key: 'actions:report', label: '举报', icon: 'ti ti-exclamation-circle', group: '帖子弹窗' },
	{ key: 'actions:copyLink', label: '复制链接', icon: 'ti ti-link', group: '帖子弹窗' },
	{ key: 'actions:delete', label: '删除', icon: 'ti ti-trash', group: '帖子弹窗' },
	{ key: 'form:poll', label: '投票', icon: 'ti ti-chart-bar', group: '发帖表单' },
	{ key: 'form:cw', label: '内容警告 (CW)', icon: 'ti ti-eye-off', group: '发帖表单' },
	{ key: 'form:geo', label: '地理位置', icon: 'ti ti-map-pin', group: '发帖表单' },
	{ key: 'form:visibility', label: '可见范围', icon: 'ti ti-world', group: '发帖表单' },
	{ key: 'form:reactionAcceptance', label: '反应类型', icon: 'ti ti-settings', group: '发帖表单' },
]);

// ========== 设置页配置 ==========
// hiddenSettingsForUsers 实际存储在 clientOptions 内部（与 misskey-js 类型一致）
const hiddenSettingsForUsers = ref<string[]>(
	Array.isArray(meta.clientOptions?.hiddenSettingsForUsers?.hidden)
		? meta.clientOptions!.hiddenSettingsForUsers!.hidden
		: []
);
const settingsPageLabels = ref<Record<string, string>>(
	typeof meta.clientOptions?.hiddenSettingsForUsers?.labels === 'object'
		? meta.clientOptions!.hiddenSettingsForUsers!.labels ?? {}
		: {}
);

// UniversalConfigPanel 通过 v-model 直接读写 ref，不经过只读computed
// settingsPageModelValue 只用做初始化传值，后续靠 ref 自身同步

// ========== 时间线标签页控制 ==========
const timelineTabs = [
	{ key: 'home', label: '首页', icon: 'ti ti-home' },
	{ key: 'local', label: '本地', icon: 'ti ti-planet' },
	{ key: 'social', label: '社交', icon: 'ti ti-universe' },
	{ key: 'global', label: '全局', icon: 'ti ti-whirl' },
	{ key: 'lists', label: '列表', icon: 'ti ti-list' },
	{ key: 'antennas', label: '天线', icon: 'ti ti-antenna' },
	{ key: 'channels', label: '频道', icon: 'ti ti-device-tv' },
];

const hiddenUIElements = ref<Record<string, string[]>>(meta.clientOptions?.hiddenUIElements ?? {});

function isTabVisible(tabKey: string): boolean {
	const hidden = hiddenUIElements.value['timeline'] ?? [];
	return !hidden.includes(tabKey);
}

function setTabVisible(tabKey: string, visible: boolean) {
	const hidden = hiddenUIElements.value['timeline'] ?? [];
	if (visible) {
		hiddenUIElements.value['timeline'] = hidden.filter(k => k !== tabKey);
	} else {
		hiddenUIElements.value['timeline'] = [...hidden, tabKey];
	}
	hiddenUIElements.value = { ...hiddenUIElements.value };
}

function resetTimelineTabs() {
	hiddenUIElements.value = {
		...hiddenUIElements.value,
		timeline: [],
	};
}

// 通用 UI 元素可见性
function isUIVisible(group: string, key: string): boolean {
	const hidden = hiddenUIElements.value[group] ?? [];
	return !hidden.includes(key);
}

function setUIVisible(group: string, key: string, visible: boolean) {
	const hidden = hiddenUIElements.value[group] ?? [];
	if (visible) {
		hiddenUIElements.value[group] = hidden.filter(k => k !== key);
	} else {
		hiddenUIElements.value[group] = [...hidden, key];
	}
	hiddenUIElements.value = { ...hiddenUIElements.value };
}

// 个人主页标签
const profileTabs = [
	{ key: 'followers', label: '粉丝', icon: 'ti ti-users' },
	{ key: 'following', label: '关注', icon: 'ti ti-user-plus' },
	{ key: 'activity', label: '活动', icon: 'ti ti-clock' },
	{ key: 'clips', label: 'Clips', icon: 'ti ti-paperclip' },
	{ key: 'pages', label: '页面', icon: 'ti ti-news' },
	{ key: 'gallery', label: '画廊', icon: 'ti ti-icons' },
];

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

// ========== 菜单管理配置 ==========
const hiddenAdminMenu = ref<string[]>(
	typeof meta.adminMenu?.hidden === 'object'
		? meta.adminMenu.hidden ?? []
		: []
);
const adminMenuLabels = ref<Record<string, string>>(
	typeof meta.adminMenu?.labels === 'object'
		? meta.adminMenu.labels ?? {}
		: {}
);

const adminMenuModelValue = computed(() => ({
	hidden: hiddenAdminMenu.value,
	labels: adminMenuLabels.value,
}));

// ========== Navbar隐藏配置（关联到 hiddenUIElements.navbar） ==========
const navbarHiddenItems = ref<string[]>(
	Array.isArray(hiddenUIElements.value['navbar'])
		? hiddenUIElements.value['navbar']
		: []
);
const navbarCustomLabels = ref<Record<string, string>>({});

function onNavbarUpdate(val: { hidden: string[]; labels: Record<string, string> }) {
	navbarHiddenItems.value = val.hidden;
	navbarCustomLabels.value = val.labels;
	// 同步到 hiddenUIElements
	hiddenUIElements.value = {
		...hiddenUIElements.value,
		navbar: val.hidden,
	};
}

// ========== 帖子操作 / 表单（关联到 hiddenUIElements.postActions / postForm） ==========
const postActionsHiddenItems = ref<string[]>(
	Array.isArray(hiddenUIElements.value['postActions'])
		? hiddenUIElements.value['postActions']
		: []
);
const postFormHiddenItems = ref<string[]>(
	Array.isArray(hiddenUIElements.value['postForm'])
		? hiddenUIElements.value['postForm']
		: []
);

const postActionsLabels = ref<Record<string, string>>({});
const postFormLabels = ref<Record<string, string>>({});

const postModelValue = computed(() => ({
	// UniversalConfigPanel 内部按 group 分组显示，但 hidden/labels 都是单一扁平数组
	// 这里把 postActions 和 postForm 的 hidden 合并为一个数组供 panel 使用
	// Panel 内 toggleHidden 触发 @update 时再分发回去
	hidden: [
		...postActionsHiddenItems.value.map(k => `actions:${k}`),
		...postFormHiddenItems.value.map(k => `form:${k}`),
	],
	labels: {},
}));

function onPostUpdate(val: { hidden: string[]; labels: Record<string, string> }) {
	// 反向拆分：actions:xxx → postActionsHiddenItems, form:xxx → postFormHiddenItems
	const actions: string[] = [];
	const form: string[] = [];
	for (const key of val.hidden) {
		if (key.startsWith('actions:')) actions.push(key.slice('actions:'.length));
		else if (key.startsWith('form:')) form.push(key.slice('form:'.length));
	}
	postActionsHiddenItems.value = actions;
	postFormHiddenItems.value = form;
	hiddenUIElements.value = {
		...hiddenUIElements.value,
		postActions: actions,
		postForm: form,
	};
}

// ========== 设置页更新回调 ==========
function onSettingsPageUpdate(val: { hidden: string[]; labels: Record<string, string> }) {
	hiddenSettingsForUsers.value = val.hidden;
	settingsPageLabels.value = val.labels;
}

// 菜单管理配置更新回调
function onAdminMenuUpdate(val: { hidden: string[]; labels: Record<string, string> }) {
	hiddenAdminMenu.value = val.hidden;
	adminMenuLabels.value = val.labels;
}

// ========== 保存 ==========
function saveAll() {
	os.apiWithDialog('admin/update-meta', {
		clientOptions: {
			customLabels: customLabels.value,
			layoutSections: layoutSections.value,
			userPermissions: userPermissions.value,
			hiddenUIElements: hiddenUIElements.value,
			hiddenSettingsForUsers: {
				hidden: hiddenSettingsForUsers.value,
				labels: settingsPageLabels.value,
			},
		},
		adminMenu: {
			hidden: hiddenAdminMenu.value,
			labels: adminMenuLabels.value,
		},
	}).then(() => {
		fetchInstance(true);
	});
}

// ========== 预览模式 ==========
// 使用 togglePreviewMode() 直接切换,无需 toggle() 方法

// ========== 页面元信息 ==========
definePage(() => ({
	title: '界面控制',
	icon: 'ti ti-layout-dashboard',
}));
</script>

<style lang="scss" module>
// ========== 顶部 bar ==========
.topBar {
	position: sticky;
	top: 0;
	z-index: 10;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	margin-bottom: 16px;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	border: 1px solid var(--MI_THEME-divider);
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
	gap: 16px;
	flex-wrap: wrap;
}

.topBarLeft {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.title {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 18px;
	font-weight: 700;
}

.subtitle {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.topBarRight {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-shrink: 0;
}

// ========== role chip ==========
.roleChip {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 4px 10px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 600;
	letter-spacing: 0.3px;
	white-space: nowrap;
}

.roleAdmin {
	background: color-mix(in srgb, #f59e0b 18%, transparent);
	color: #b45309;
}

.roleUser {
	background: color-mix(in srgb, #3b82f6 18%, transparent);
	color: #1d4ed8;
}

.roleAll {
	background: color-mix(in srgb, #6b7280 18%, transparent);
	color: #374151;
}

.rolePreviewOn {
	background: color-mix(in srgb, #ec4899 22%, transparent);
	color: #be185d;
	animation: pulseChip 2s ease-in-out infinite;
}

@keyframes pulseChip {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.6; }
}

.previewWarn {
	margin-bottom: 16px;
}

// ========== section header ==========
.sectionMeta {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	font-weight: 600;
}

// ========== footer ==========
.footer {
	position: sticky;
	bottom: 0;
	z-index: 10;
	display: flex;
	justify-content: flex-end;
	padding: 12px 20px;
	margin-top: 16px;
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 12px;
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

// ========== 首页模块排序 ==========
.sectionList {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.sectionActions {
	display: flex;
	justify-content: flex-end;
	gap: 6px;
	margin-bottom: 8px;
	align-items: center;
}

.sectionItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 18px;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
	margin-bottom: 4px;

	&:last-child {
		margin-bottom: 0;
	}

	&:hover {
		background: var(--MI_THEME-panelHighlight);
		box-shadow: 0 4px 12px color-mix(in srgb, var(--MI_THEME-accent) 8%, transparent);
		transform: translateX(2px);
	}
}

.sectionLeft {
	display: flex;
	align-items: center;
	gap: 12px;
}

.sectionIcon {
	font-size: 24px;
}

.sectionName {
	font-weight: 600;
	font-size: 14px;
}

.sectionDesc {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.arrowBtn {
	width: 28px;
	height: 28px;
	border-radius: 6px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);

	&:hover {
		background: var(--MI_THEME-accentedBg);
		color: var(--MI_THEME-accent);
	}

	&:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
}

// ========== 用户权限分组 ==========
.permGroups {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.permActions {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
}

.permGroupCard {
	background: var(--MI_THEME-panel);
	border-radius: 16px;
	overflow: hidden;
	border: 1px solid var(--MI_THEME-divider);
	transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;

	&:hover {
		border-color: var(--MI_THEME-accent);
		box-shadow: 0 8px 24px color-mix(in srgb, var(--MI_THEME-accent) 12%, transparent);
		transform: translateY(-1px);
	}
}

.permGroupHeader2 {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 18px;
	background: linear-gradient(135deg, color-mix(in srgb, var(--MI_THEME-accent) 6%, var(--MI_THEME-panel)), var(--MI_THEME-panel));
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.permGroupTitle {
	display: flex;
	align-items: center;
	gap: 12px;
	font-weight: 600;
	font-size: 15px;
	color: var(--MI_THEME-fg);
}

.permGroupIconWrap {
	width: 36px;
	height: 36px;
	border-radius: 10px;
	background: var(--MI_THEME-accentedBg);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2px 8px color-mix(in srgb, var(--MI_THEME-accent) 20%, transparent);
}

.permGroupIcon {
	color: var(--MI_THEME-accent);
	font-size: 18px;
}

.permCount {
	font-size: 11px;
	font-weight: 500;
	color: var(--MI_THEME-fgTransparentWeak);
	background: var(--MI_THEME-bg);
	padding: 3px 10px;
	border-radius: 12px;
	border: 1px solid var(--MI_THEME-divider);
}

.permGroupActions {
	display: flex;
	gap: 4px;
}

.permGroupBtn {
	width: 30px;
	height: 30px;
	border-radius: 6px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);
	transition: all 0.15s;

	&:hover {
		background: var(--MI_THEME-accentedBg);
		color: var(--MI_THEME-accent);
		transform: scale(1.05);
	}

	i {
		font-size: 14px;
	}
}

.permListInner {
	padding: 4px 0;
}

.permItemInner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	margin: 0 8px;
	border-radius: 10px;
	transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
	gap: 12px;

	&:hover {
		background: var(--MI_THEME-accentedBg);
		transform: translateX(4px);
		box-shadow: 0 2px 8px color-mix(in srgb, var(--MI_THEME-accent) 8%, transparent);
	}
}

.permInfoInner {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.permIcon {
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 16px;
	width: 20px;
	text-align: center;
	flex-shrink: 0;
}

.permText {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.permLabel {
	font-weight: 500;
	font-size: 13px;
}

.permKeyText {
	font-size: 10px;
	font-family: monospace;
	color: var(--MI_THEME-fgTransparentWeak);
}
