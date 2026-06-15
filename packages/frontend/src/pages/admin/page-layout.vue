<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="currentTab" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">

			<!-- 登录页配置 -->
			<template v-if="currentTab === 'entrance'">
			<MkFolder>
				<template #label><i class="ti ti-login-2"></i> 登录页（Classic 风格）</template>
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

					<!-- 预览 -->
					<div :class="$style.preview">
						<div :class="$style.previewLabel">预览效果</div>
						<div :class="$style.previewBox">
							<div :class="$style.previewBrand" :style="{ flex: entranceBrandRatio }">
								<div :class="$style.previewContent">
									<div :class="$style.previewLogo">CGVMI</div>
									<div :class="$style.previewForm">登录表单</div>
								</div>
							</div>
							<div v-if="entranceVideoShow" :class="$style.previewVideo" :style="{ flex: 100 - entranceBrandRatio }">
								<div :class="[$style.previewVideoBox, $style[`size_${entranceVideoSize}`]]">
									视频区域
								</div>
							</div>
						</div>
						<div v-if="entranceShowFederation" :class="$style.previewFed">联邦实例跑马灯...</div>
					</div>
				</div>
			</MkFolder>
			</template>

			<!-- 用户权限 -->
			<template v-if="currentTab === 'permissions'">
			<!-- 普通用户设置项隐藏 -->
			<MkFolder>
				<template #label><i class="ti ti-eye-off"></i> 普通用户设置页隐藏项</template>
				<div class="_gaps_s">
					<MkInfo>勾选的设置项将对普通用户隐藏，管理员始终可见全部</MkInfo>
					<div :class="$style.settingsList">
						<label v-for="item in settingsItems" :key="item.key" :class="$style.settingsItem">
							<input type="checkbox" :value="item.key" v-model="hiddenSettingsForUsers" />
							<i :class="item.icon"></i>
							<span>{{ item.label }}</span>
						</label>
					</div>
				</div>
			</MkFolder>
			</template>

			<!-- 首页模块排序 -->
			<template v-if="currentTab === 'modules'">
			<MkFolder>
				<template #label><i class="ti ti-layout-list"></i> 首页模块排序</template>
				<div class="_gaps_s">
					<MkInfo>控制首页显示哪些模块及排序，拖拽或上下箭头调整</MkInfo>
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

			<!-- 时间线标签页控制 -->
			<MkFolder>
				<template #label><i class="ti ti-layout-navbar"></i> 时间线标签页</template>
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

			<!-- 导航功能控制 -->
			<MkFolder>
				<template #label><i class="ti ti-navigation"></i> 导航功能</template>
				<div class="_gaps_s">
					<MkInfo>控制普通用户能看到的导航功能入口。</MkInfo>
					<div :class="$style.sectionList">
						<div v-for="item in navItems" :key="item.key" :class="$style.sectionItem">
							<div :class="$style.sectionLeft">
								<i :class="item.icon" style="font-size: 18px; width: 24px; text-align: center;"></i>
								<span :class="$style.sectionName">{{ item.label }}</span>
							</div>
							<MkSwitch :modelValue="isNavVisible(item.key)" @update:modelValue="setNavVisible(item.key, $event)" />
						</div>
					</div>
				</div>
			</MkFolder>

			<!-- 帖子操作控制 -->
			<MkFolder>
				<template #label><i class="ti ti-message-circle"></i> 帖子操作按钮</template>
				<div class="_gaps_s">
					<MkInfo>控制普通用户在帖子上能看到的操作按钮。</MkInfo>
					<div :class="$style.sectionList">
						<div v-for="item in postActions" :key="item.key" :class="$style.sectionItem">
							<div :class="$style.sectionLeft">
								<i :class="item.icon" style="font-size: 18px; width: 24px; text-align: center;"></i>
								<span :class="$style.sectionName">{{ item.label }}</span>
							</div>
							<MkSwitch :modelValue="isPostActionVisible(item.key)" @update:modelValue="setPostActionVisible(item.key, $event)" />
						</div>
					</div>
				</div>
			</MkFolder>

			<!-- 帖子弹窗控制 -->
			<MkFolder>
				<template #label><i class="ti ti-popup"></i> 帖子弹窗操作</template>
				<div class="_gaps_s">
					<MkInfo>控制普通用户在帖子弹窗（详情页）中能看到的操作。</MkInfo>
					<div :class="$style.sectionList">
						<div v-for="item in popupActions" :key="item.key" :class="$style.sectionItem">
							<div :class="$style.sectionLeft">
								<i :class="item.icon" style="font-size: 18px; width: 24px; text-align: center;"></i>
								<span :class="$style.sectionName">{{ item.label }}</span>
							</div>
							<MkSwitch :modelValue="isPopupActionVisible(item.key)" @update:modelValue="setPopupActionVisible(item.key, $event)" />
						</div>
					</div>
				</div>
			</MkFolder>

			<!-- 个人主页控制 -->
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
							<MkSwitch :modelValue="isProfileTabVisible(item.key)" @update:modelValue="setProfileTabVisible(item.key, $event)" />
						</div>
					</div>
				</div>
			</MkFolder>

			<!-- 发帖表单控制 -->
			<MkFolder>
				<template #label><i class="ti ti-pencil"></i> 发帖表单选项</template>
				<div class="_gaps_s">
					<MkInfo>控制普通用户发帖时能看到的选项。</MkInfo>
					<div :class="$style.sectionList">
						<div v-for="item in postFormOptions" :key="item.key" :class="$style.sectionItem">
							<div :class="$style.sectionLeft">
								<i :class="item.icon" style="font-size: 18px; width: 24px; text-align: center;"></i>
								<span :class="$style.sectionName">{{ item.label }}</span>
							</div>
							<MkSwitch :modelValue="isPostFormOptionVisible(item.key)" @update:modelValue="setPostFormOptionVisible(item.key, $event)" />
						</div>
					</div>
				</div>
			</MkFolder>

			<!-- 用户功能权限 -->
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
						<div v-for="group in permissionGroups" :key="group.name" :class="$style.permGroup">
							<div :class="$style.permGroupHeader">
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
							<div :class="$style.permList">
								<div v-for="perm in group.items" :key="perm.key" :class="$style.permItem">
									<div :class="$style.permInfo">
										<i :class="[perm.icon, $style.permIcon]"></i>
										<div :class="$style.permText">
											<span :class="$style.permLabel">{{ perm.label }}</span>
											<span :class="$style.permKey">{{ perm.key }}</span>
										</div>
									</div>
									<MkSwitch :modelValue="getPermValue(perm.key)" @update:modelValue="setPerm(perm.key, $event)" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</MkFolder>
			</template>

			<!-- 自定义标签 -->
			<template v-if="currentTab === 'labels'">
			<MkFolder>
				<template #label><i class="ti ti-tag"></i> 自定义标签</template>
				<div class="_gaps_s">
					<MkInfo>自定义界面上显示的文字。留空则使用默认值。修改后刷新页面生效。</MkInfo>
					<div :class="$style.sectionActions">
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
			<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 16px;">
				<MkButton primary rounded @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
			</div>
		</div>
	</template>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import * as Misskey from 'misskey-js';
import MkSwitch from '@/components/MkSwitch.vue';
import MkRadios from '@/components/MkRadios.vue';
import MkRange from '@/components/MkRange.vue';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInfo from '@/components/MkInfo.vue';
import { PERMISSION_DEFINITIONS } from '@/utility/use-permission.js';
import { CUSTOM_LABEL_DEFINITIONS } from '@/utility/use-custom-label.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';

const meta = await misskeyApi('admin/meta');

const videoSizeOptions = [
	{ value: 'small', label: '小（320px）' },
	{ value: 'medium', label: '中（400px）' },
	{ value: 'large', label: '大（500px）' },
	{ value: 'full', label: '全屏（占满右侧）' },
];

const settingsItems = [
	{ key: 'drive', label: '云盘 (Drive)', icon: 'ti ti-cloud' },
	{ key: 'emoji-palette', label: '表情调色板', icon: 'ti ti-mood-happy' },
	{ key: 'plugin', label: '插件', icon: 'ti ti-plug' },
	{ key: 'connect', label: '服务连接', icon: 'ti ti-link' },
	{ key: 'account-data', label: '账户数据', icon: 'ti ti-package' },
	{ key: 'preferences', label: '偏好设置', icon: 'ti ti-adjustments' },
	{ key: 'theme', label: '主题', icon: 'ti ti-palette' },
	{ key: 'sounds', label: '音效', icon: 'ti ti-music' },
	{ key: 'security', label: '安全设置', icon: 'ti ti-lock' },
	{ key: 'email', label: '邮箱设置', icon: 'ti ti-mail' },
	{ key: 'notifications', label: '通知设置', icon: 'ti ti-bell' },
	{ key: 'privacy', label: '隐私', icon: 'ti ti-lock-open' },
	{ key: 'mute-block', label: '屏蔽与拉黑', icon: 'ti ti-ban' },
	{ key: 'profile', label: '个人资料', icon: 'ti ti-user' },
];

const hiddenSettingsForUsers = ref<string[]>(meta.clientOptions.hiddenSettingsForUsers ?? ['drive', 'emoji-palette', 'plugin', 'connect', 'account-data']);

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

// 权限控制
const userPermissions = ref<Record<string, boolean>>(meta.clientOptions?.userPermissions ?? {});

// 按 group 分组
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
	// 触发响应式
	userPermissions.value = { ...userPermissions.value };
}

function isGroupAllOff(groupName: string): boolean {
	const group = permissionGroups.value.find(g => g.name === groupName);
	if (!group) return false;
	return group.items.every(item => userPermissions.value[item.key] === false);
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

// 时间线标签页控制
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

// 通用 UI 元素可见性检查和设置
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

// 导航功能（侧边栏所有菜单项）
const navItems = [
	{ key: 'post', label: '发帖按钮', icon: 'ti ti-pencil' },
	{ key: 'notifications', label: '通知', icon: 'ti ti-bell' },
	{ key: 'drive', label: '云盘', icon: 'ti ti-cloud' },
	{ key: 'followRequests', label: '关注请求', icon: 'ti ti-user-plus' },
	{ key: 'explore', label: '发现页', icon: 'ti ti-hash' },
	{ key: 'videoFeed', label: '刷视频', icon: 'ti ti-movie' },
	{ key: 'announcements', label: '公告', icon: 'ti ti-speakerphone' },
	{ key: 'search', label: '搜索', icon: 'ti ti-search' },
	{ key: 'lookup', label: '查找', icon: 'ti ti-world-search' },
	{ key: 'lists', label: '列表', icon: 'ti ti-list' },
	{ key: 'antennas', label: '天线', icon: 'ti ti-antenna' },
	{ key: 'favorites', label: '收藏', icon: 'ti ti-star' },
	{ key: 'pages', label: '页面', icon: 'ti ti-news' },
	{ key: 'play', label: 'Play', icon: 'ti ti-player-play' },
	{ key: 'gallery', label: '画廊', icon: 'ti ti-icons' },
	{ key: 'clips', label: 'Clips', icon: 'ti ti-paperclip' },
	{ key: 'channels', label: '频道', icon: 'ti ti-device-tv' },
	{ key: 'achievements', label: '成就', icon: 'ti ti-medal' },
	{ key: 'ui', label: '切换UI', icon: 'ti ti-devices' },
];
const isNavVisible = (key: string) => isUIVisible('navbar', key);
const setNavVisible = (key: string, v: boolean) => setUIVisible('navbar', key, v);

// 帖子操作按钮
const postActions = [
	{ key: 'reply', label: '回复', icon: 'ti ti-arrow-back-up' },
	{ key: 'renote', label: '转发', icon: 'ti ti-repeat' },
	{ key: 'react', label: '反应/点赞', icon: 'ti ti-heart' },
];
const isPostActionVisible = (key: string) => isUIVisible('postActions', key);
const setPostActionVisible = (key: string, v: boolean) => setUIVisible('postActions', key, v);

// 帖子弹窗操作
const popupActions = [
	{ key: 'share', label: '分享', icon: 'ti ti-share' },
	{ key: 'bookmark', label: '收藏', icon: 'ti ti-bookmark' },
	{ key: 'report', label: '举报', icon: 'ti ti-exclamation-circle' },
	{ key: 'copyLink', label: '复制链接', icon: 'ti ti-link' },
	{ key: 'delete', label: '删除（自己的）', icon: 'ti ti-trash' },
];
const isPopupActionVisible = (key: string) => isUIVisible('notePopup', key);
const setPopupActionVisible = (key: string, v: boolean) => setUIVisible('notePopup', key, v);

// 个人主页标签
const profileTabs = [
	{ key: 'followers', label: '粉丝', icon: 'ti ti-users' },
	{ key: 'following', label: '关注', icon: 'ti ti-user-plus' },
	{ key: 'activity', label: '活动', icon: 'ti ti-clock' },
	{ key: 'clips', label: 'Clips', icon: 'ti ti-paperclip' },
	{ key: 'pages', label: '页面', icon: 'ti ti-news' },
	{ key: 'gallery', label: '画廊', icon: 'ti ti-icons' },
];
const isProfileTabVisible = (key: string) => isUIVisible('profileTabs', key);
const setProfileTabVisible = (key: string, v: boolean) => setUIVisible('profileTabs', key, v);

// 发帖表单选项
const postFormOptions = [
	{ key: 'poll', label: '投票', icon: 'ti ti-chart-bar' },
	{ key: 'cw', label: '内容警告 (CW)', icon: 'ti ti-eye-off' },
	{ key: 'geo', label: '地理位置', icon: 'ti ti-map-pin' },
	{ key: 'visibility', label: '可见范围', icon: 'ti ti-world' },
	{ key: 'reactionAcceptance', label: '反应类型', icon: 'ti ti-settings' },
	{ key: 'schedule', label: '定时发送', icon: 'ti ti-clock' },
];
const isPostFormOptionVisible = (key: string) => isUIVisible('postForm', key);
const setPostFormOptionVisible = (key: string, v: boolean) => setUIVisible('postForm', key, v);

// 自定义标签
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

// 防抖定时器
const labelDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function setLabel(key: string, value: string) {
	// 清除之前的定时器
	if (labelDebounceTimers.has(key)) {
		clearTimeout(labelDebounceTimers.get(key)!);
	}

	// 设置新的定时器（300ms 防抖）
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

function resetTimelineTabs() {
	hiddenUIElements.value = {
		...hiddenUIElements.value,
		timeline: [],
	};
}

const entranceVideoShow = ref(meta.clientOptions.entranceVideoShow ?? true);
const entranceVideoSize = ref<Misskey.entities.MetaClientOptions['entranceVideoSize']>(meta.clientOptions.entranceVideoSize ?? 'medium');
const entranceBrandRatio = ref(meta.clientOptions.entranceBrandRatio ?? 50);
const entranceShowFederation = ref(meta.clientOptions.entranceShowFederation ?? true);

function save() {
	os.apiWithDialog('admin/update-meta', {
		clientOptions: {
			entranceVideoShow: entranceVideoShow.value,
			entranceVideoSize: entranceVideoSize.value,
			entranceBrandRatio: entranceBrandRatio.value,
			entranceShowFederation: entranceShowFederation.value,
			hiddenSettingsForUsers: hiddenSettingsForUsers.value,
			layoutSections: layoutSections.value,
			userPermissions: userPermissions.value,
			hiddenUIElements: hiddenUIElements.value,
			customLabels: customLabels.value,
		},
	}).then(() => {
		fetchInstance(true);
	});
}

const currentTab = ref('entrance');

const headerTabs = computed(() => [{
	key: 'entrance',
	title: '登录页',
	icon: 'ti ti-login-2',
}, {
	key: 'permissions',
	title: '用户权限',
	icon: 'ti ti-shield-lock',
}, {
	key: 'modules',
	title: '首页模块',
	icon: 'ti ti-layout-list',
}, {
	key: 'labels',
	title: '自定义标签',
	icon: 'ti ti-tag',
}]);

definePage(() => ({
	title: '页面布局',
	icon: 'ti ti-layout',
}));
</script>

<style lang="scss" module>
.footer {
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
}

.preview {
	background: var(--MI_THEME-bg);
	border-radius: 12px;
	padding: 16px;
	border: 1px solid var(--MI_THEME-divider);
}

.previewLabel {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-bottom: 12px;
}

.previewBox {
	display: flex;
	height: 200px;
	border-radius: 8px;
	overflow: hidden;
	border: 1px solid var(--MI_THEME-divider);
}

.previewBrand {
	background: linear-gradient(135deg, var(--MI_THEME-accent), color-mix(in srgb, var(--MI_THEME-accent) 70%, #000));
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
}

.previewContent {
	text-align: center;
	color: #fff;
}

.previewLogo {
	font-size: 18px;
	font-weight: 700;
	margin-bottom: 12px;
}

.previewForm {
	background: rgba(255, 255, 255, 0.2);
	border-radius: 8px;
	padding: 12px;
	font-size: 12px;
}

.previewVideo {
	background: var(--MI_THEME-panel);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
}

.previewVideoBox {
	background: #000;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #666;
	font-size: 12px;
	aspect-ratio: 16/9;

	&.size_small {
		width: 120px;
	}

	&.size_medium {
		width: 150px;
	}

	&.size_large {
		width: 180px;
	}

	&.size_full {
		width: 100%;
		border-radius: 0;
	}
}

.previewFed {
	margin-top: 8px;
	background: var(--MI_THEME-panel);
	border-radius: 20px;
	padding: 6px 16px;
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	text-align: center;
}

.settingsList {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.settingsItem {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	border-radius: 8px;
	cursor: pointer;
	transition: background 0.15s;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
	}

	input[type="checkbox"] {
		width: 18px;
		height: 18px;
		accent-color: var(--MI_THEME-accent);
	}

	i {
		width: 20px;
		text-align: center;
		color: var(--MI_THEME-fgTransparentWeak);
	}

	span {
		font-size: 14px;
	}
}

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

.sectionActions {
	display: flex;
	align-items: center;
	gap: 8px;
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

.permGroup {
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

.permGroupHeader {
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

.permList {
	padding: 4px 0;
}

.permItem {
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

.permInfo {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
	flex: 1;
}

.permIcon {
	width: 18px;
	text-align: center;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 15px;
	flex-shrink: 0;
}

.permText {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.permLabel {
	font-size: 13px;
	font-weight: 500;
}

.permKey {
	font-size: 10px;
	font-family: monospace;
	color: var(--MI_THEME-fgTransparentWeak);
	opacity: 0.7;
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

@media (max-width: 600px) {
	.preview {
		display: none;
	}

	.settingsItem {
		padding: 6px 8px;
	}

	.sectionItem {
		padding: 10px 12px;
	}

	.permGroup {
		border-radius: 8px;
	}

	.permGroupHeader {
		padding: 10px 12px;
		flex-wrap: wrap;
		gap: 8px;
	}

	.permGroupTitle {
		font-size: 13px;
	}

	.permGroupActions {
		width: 100%;
		justify-content: flex-end;
	}

	.permItem {
		padding: 8px 12px;
	}

	.permInfo {
		font-size: 12px;
		gap: 8px;
	}

	.permGroupBtn {
		padding: 3px 8px;
		font-size: 11px;
	}

	.labelInput {
		max-width: 140px;
		font-size: 12px;
	}
}
</style>
