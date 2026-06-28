<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="src" :actions="headerActions" :tabs="$i ? headerTabs : headerTabsWhenNotLogin" :swipable="true" :displayMyAvatar="true" :canOmitTitle="true">
	<div class="_spacer" style="--MI_SPACER-w: 600px;">
		<WidgetGrid :source="widgets" @update="onUpdate" />
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, watch, ref, onMounted, onActivated } from 'vue';
import type { Tab } from '@/components/global/MkPageHeader.tabs.vue';
import type { MenuItem } from '@/types/menu.js';
import type { BasicTimelineType } from '@/timelines.js';
import type { PageHeaderItem } from '@/types/page-header.js';
import WidgetGrid from '@/components/WidgetGrid.vue';
import { genId } from '@/utility/id.js';
import * as os from '@/os.js';
import { store } from '@/store.js';
import { i18n } from '@/i18n.js';
import { $i, iAmAdmin } from '@/i.js';
import { instance } from '@/instance.js';
import { definePage } from '@/page.js';
import { antennasCache, userListsCache, favoritedChannelsCache } from '@/cache.js';
import { deviceKind } from '@/utility/device-kind.js';
import { deepMerge } from '@/utility/merge.js';
import { miLocalStorage } from '@/local-storage.js';
import { availableBasicTimelines, hasWithReplies, isAvailableBasicTimeline, isBasicTimeline, basicTimelineIconClass } from '@/timelines.js';
import { prefer } from '@/preferences.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import type { StoredWidget } from '@/composables/use-widget-grid.js';

// 主页面 = WidgetGrid。首页 timeline 是其中一个 widget（默认 12×12 占满）。
// 用户可在 WidgetGrid 工具栏添加 / 编辑 / 重置布局。
const widgets = ref<StoredWidget[]>([...(prefer.r.widgets.value ?? [])]);

function onUpdate(value: StoredWidget[]) {
	widgets.value = value;
	prefer.commit('widgets', value);
}

// 首次访问：若 admin 设置了默认布局且用户尚未初始化，则采用 admin 默认
async function applyAdminDefaultIfFresh() {
	if (prefer.r.widgetsInitialized.value) return;
	try {
		const res = await misskeyApi('widget-layout/default' as any, {} as any) as { layout: StoredWidget[] | null } | null;
		if (res?.layout != null) {
			widgets.value = res.layout;
			prefer.commit('widgets', res.layout);
		}
	} catch (e) {
		console.error('Failed to apply admin default widget layout:', e);
	} finally {
		prefer.commit('widgetsInitialized', true);
	}
}

// 兜底：若 widgets 列表里没有 homeTimeline，则插入一个 12×12 占满首屏。
// 这样保证首页至少能看到时间线。
function ensureHomeTimeline() {
	const hasHome = widgets.value.some(w => w.name === 'homeTimeline' || w.name === 'timeline');
	if (hasHome) return;
	const newItem: StoredWidget = {
		id: genId(),
		name: 'homeTimeline',
		place: null,
		data: {},
		layout: { x: 0, y: 0, w: 12, h: 12 },
		pinned: false,
	};
	const next = [...widgets.value, newItem];
	widgets.value = next;
	prefer.commit('widgets', next);
}

onMounted(() => {
	switchTlIfNeeded();
	ensureHomeTimeline();
	applyAdminDefaultIfFresh().then(() => ensureHomeTimeline());
});
onActivated(() => {
	switchTlIfNeeded();
});

type TimelinePageSrc = BasicTimelineType | `list:${string}`;

const srcWhenNotSignin = ref<'local' | 'global'>(isAvailableBasicTimeline('local') ? 'local' : 'global');
const src = computed<TimelinePageSrc>({
	get: () => ($i ? store.r.tl.value.src : srcWhenNotSignin.value),
	set: (x) => saveSrc(x),
});
const withRenotes = computed<boolean>({
	get: () => store.r.tl.value.filter.withRenotes,
	set: (x) => saveTlFilter('withRenotes', x),
});

// computed内での無限ループを防ぐためのフラグ
const localSocialTLFilterSwitchStore = ref<'withReplies' | 'onlyFiles' | false>(
	store.r.tl.value.filter.withReplies ? 'withReplies' :
	store.r.tl.value.filter.onlyFiles ? 'onlyFiles' :
	false,
);

const withReplies = computed<boolean>({
	get: () => {
		if (!$i) return false;
		if (['local', 'social'].includes(src.value) && localSocialTLFilterSwitchStore.value === 'onlyFiles') {
			return false;
		} else {
			return store.r.tl.value.filter.withReplies;
		}
	},
	set: (x) => saveTlFilter('withReplies', x),
});
const onlyFiles = computed<boolean>({
	get: () => {
		if (['local', 'social'].includes(src.value) && localSocialTLFilterSwitchStore.value === 'withReplies') {
			return false;
		} else {
			return store.r.tl.value.filter.onlyFiles;
		}
	},
	set: (x) => saveTlFilter('onlyFiles', x),
});

watch([withReplies, onlyFiles], ([withRepliesTo, onlyFilesTo]) => {
	if (withRepliesTo) {
		localSocialTLFilterSwitchStore.value = 'withReplies';
	} else if (onlyFilesTo) {
		localSocialTLFilterSwitchStore.value = 'onlyFiles';
	} else {
		localSocialTLFilterSwitchStore.value = false;
	}
});

const withSensitive = computed<boolean>({
	get: () => store.r.tl.value.filter.withSensitive,
	set: (x) => saveTlFilter('withSensitive', x),
});

const showFixedPostForm = prefer.model('showFixedPostForm');

async function chooseList(ev: PointerEvent): Promise<void> {
	const lists = await userListsCache.fetch();
	const items: (MenuItem | undefined)[] = [
		...lists.map(list => ({
			type: 'link' as const,
			text: list.name,
			to: `/timeline/list/${list.id}`,
		})),
		(lists.length === 0 ? undefined : { type: 'divider' }),
		{
			type: 'link' as const,
			icon: 'ti ti-plus',
			text: i18n.ts.createNew,
			to: '/my/lists',
		},
	];
	os.popupMenu(items.filter(i => i != null), ev.currentTarget ?? ev.target);
}

async function chooseAntenna(ev: PointerEvent): Promise<void> {
	const antennas = await antennasCache.fetch();
	const items: (MenuItem | undefined)[] = [
		...antennas.map(antenna => ({
			type: 'link' as const,
			text: antenna.name,
			indicate: antenna.hasUnreadNote,
			to: `/timeline/antenna/${antenna.id}`,
		})),
		(antennas.length === 0 ? undefined : { type: 'divider' }),
		{
			type: 'link' as const,
			icon: 'ti ti-plus',
			text: i18n.ts.createNew,
			to: '/my/antennas',
		},
	];
	os.popupMenu(items.filter(i => i != null), ev.currentTarget ?? ev.target);
}

async function chooseChannel(ev: PointerEvent): Promise<void> {
	const channels = await favoritedChannelsCache.fetch();
	const items: (MenuItem | undefined)[] = [
		...channels.map(channel => {
			const lastReadedAt = miLocalStorage.getItemAsJson(`channelLastReadedAt:${channel.id}`) ?? null;
			const hasUnreadNote = (lastReadedAt && channel.lastNotedAt) ? Date.parse(channel.lastNotedAt) > lastReadedAt : !!(!lastReadedAt && channel.lastNotedAt);

			return {
				type: 'link' as const,
				text: channel.name,
				indicate: hasUnreadNote,
				to: `/channels/${channel.id}`,
			};
		}),
		(channels.length === 0 ? undefined : { type: 'divider' }),
		{
			type: 'link',
			icon: 'ti ti-plus',
			text: i18n.ts.createNew,
			to: '/channels/new',
		},
	];
	os.popupMenu(items.filter(i => i != null), ev.currentTarget ?? ev.target);
}

function saveSrc(newSrc: TimelinePageSrc): void {
	const out = deepMerge({ src: newSrc }, store.s.tl);

	if (newSrc.startsWith('userList:')) {
		const id = newSrc.substring('userList:'.length);
		out.userList = prefer.r.pinnedUserLists.value.find(l => l.id === id) ?? null;
	}

	store.set('tl', out);
	if (['local', 'global'].includes(newSrc)) {
		srcWhenNotSignin.value = newSrc as 'local' | 'global';
	}
}

function saveTlFilter(key: keyof typeof store.s.tl.filter, newValue: boolean) {
	if (key !== 'withReplies' || $i) {
		const out = deepMerge({ filter: { [key]: newValue } }, store.s.tl);
		store.set('tl', out);
	}
}

function switchTlIfNeeded() {
	if (isBasicTimeline(src.value) && !isAvailableBasicTimeline(src.value)) {
		src.value = availableBasicTimelines()[0];
	}
}

const headerActions = computed<PageHeaderItem[]>(() => {
	const items: PageHeaderItem[] = [{
		icon: 'ti ti-dots',
		text: i18n.ts.options,
		handler: (ev) => {
			const menuItems: MenuItem[] = [];

			menuItems.push({
				type: 'switch',
				icon: 'ti ti-repeat',
				text: i18n.ts.showRenotes,
				ref: withRenotes,
			});

			if (isBasicTimeline(src.value) && hasWithReplies(src.value)) {
				menuItems.push({
					type: 'switch',
					icon: 'ti ti-messages',
					text: i18n.ts.showRepliesToOthersInTimeline,
					ref: withReplies,
					disabled: onlyFiles,
				});
			}

			menuItems.push({
				type: 'switch',
				icon: 'ti ti-eye-exclamation',
				text: i18n.ts.withSensitive,
				ref: withSensitive,
			}, {
				type: 'switch',
				icon: 'ti ti-photo',
				text: i18n.ts.fileAttachedOnly,
				ref: onlyFiles,
				disabled: isBasicTimeline(src.value) && hasWithReplies(src.value) ? withReplies : false,
			}, {
				type: 'divider',
			}, {
				type: 'switch',
				text: i18n.ts.showFixedPostForm,
				ref: showFixedPostForm,
			});

			os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
		},
	}];

	if (deviceKind === 'desktop') {
		items.unshift({
			icon: 'ti ti-refresh',
			text: i18n.ts.reload,
			handler: () => {
				// WidgetHomeTimeline 通过 store 同步，刷新靠 widget 内部的 tlComponent
				// 此处简化：触发 store 同值写入以触发 reactive 重算（无操作）
			},
		});
	}

	return items;
});

// 时间线标签页权限控制
function isTimelineTabVisible(tabKey: string): boolean {
	if (iAmAdmin.value) return true;
	const hidden = instance.clientOptions?.hiddenUIElements?.timeline ?? [];
	return !hidden.includes(tabKey);
}

const headerTabs = computed(() => {
	const tabs: Tab[] = [];

	// 置顶列表
	if (isTimelineTabVisible('lists')) {
		tabs.push(...(prefer.r.pinnedUserLists.value.map(l => ({
			key: 'list:' + l.id,
			title: l.name,
			icon: 'ti ti-star',
			iconOnly: true,
		}))));
	}

	// 基础时间线
	tabs.push(...availableBasicTimelines()
		.filter(tl => isTimelineTabVisible(tl))
		.map(tl => ({
			key: tl,
			title: i18n.ts._timelines[tl],
			icon: basicTimelineIconClass(tl),
			iconOnly: true,
		})));

	// 列表
	if (isTimelineTabVisible('lists')) {
		tabs.push({
			icon: 'ti ti-list',
			title: i18n.ts.lists,
			iconOnly: true,
			onClick: chooseList,
		});
	}

	// 天线
	if (isTimelineTabVisible('antennas')) {
		tabs.push({
			icon: 'ti ti-antenna',
			title: i18n.ts.antennas,
			iconOnly: true,
			onClick: chooseAntenna,
		});
	}

	// 频道
	if (isTimelineTabVisible('channels')) {
		tabs.push({
			icon: 'ti ti-device-tv',
			title: i18n.ts.channel,
			iconOnly: true,
			onClick: chooseChannel,
		});
	}

	return tabs;
});

const headerTabsWhenNotLogin = computed(() => [...availableBasicTimelines().map(tl => ({
	key: tl,
	title: i18n.ts._timelines[tl],
	icon: basicTimelineIconClass(tl),
	iconOnly: true,
}))] as Tab[]);

definePage(() => ({
	title: i18n.ts.timeline,
	icon: isBasicTimeline(src.value) ? basicTimelineIconClass(src.value) : 'ti ti-home',
}));
</script>

<style lang="scss" module>
.new {
	position: sticky;
	top: calc(var(--MI-stickyTop, 0px) + 16px);
	z-index: 1000;
	width: 100%;
	margin: calc(-0.675em - 8px) 0;

	&:first-child {
		margin-top: calc(-0.675em - 8px - var(--MI-margin));
	}
}

.newButton {
	display: block;
	margin: var(--MI-margin) auto 0 auto;
	padding: 8px 16px;
	border-radius: 32px;
}
</style>
