<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<!--
  注意：不在这里写死 height，让 MkContainer 默认撑开父容器高度。
  在 widget-grid 里父容器 (WidgetGridItem.body) 是 flex:1；在 deck/侧栏里
  Widget 组件自身有 fixed height 上下文，MkContainer 仍会按内容撑开。
  旧的 height props 保留以兼容历史配置；UI 不再使用，但不要删，否则老数据
  (widgetProps.data.height) 读不到会回退到默认值。
-->
<MkContainer :showHeader="widgetProps.showHeader" :scrollable="true" data-cy-mkw-timeline class="mkw-timeline" :class="$style.root">
	<template #icon>
		<i v-if="isBasicTimeline(widgetProps.src)" :class="basicTimelineIconClass(widgetProps.src)"></i>
		<i v-else-if="widgetProps.src === 'list'" class="ti ti-list"></i>
		<i v-else-if="widgetProps.src === 'antenna'" class="ti ti-antenna"></i>
	</template>
	<template #header>
		<button class="_button" @click="choose">
			<span>{{ headerTitle }}</span>
			<i :class="menuOpened ? 'ti ti-chevron-up' : 'ti ti-chevron-down'" style="margin-left: 8px;"></i>
		</button>
	</template>

	<div v-if="isBasicTimeline(widgetProps.src) && !isAvailableBasicTimeline(widgetProps.src)" :class="$style.disabled">
		<p :class="$style.disabledTitle">
			<i class="ti ti-minus"></i>
			{{ i18n.ts._disabledTimeline.title }}
		</p>
		<p :class="$style.disabledDescription">{{ i18n.ts._disabledTimeline.description }}</p>
	</div>
	<div v-else>
		<MkStreamingNotesTimeline
			:key="widgetProps.src === 'list' ? `list:${widgetProps.list?.id}` : widgetProps.src === 'antenna' ? `antenna:${widgetProps.antenna?.id}` : widgetProps.src"
			:src="widgetProps.src"
			:list="widgetProps.list ? widgetProps.list.id : undefined"
			:antenna="widgetProps.antenna ? widgetProps.antenna.id : undefined"
		/>
	</div>
</MkContainer>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import * as Misskey from 'misskey-js';
import { useWidgetPropsManager } from './widget.js';
import type { WidgetComponentEmits, WidgetComponentExpose, WidgetComponentProps } from './widget.js';
import type { FormWithDefault, GetFormResultType } from '@/utility/form.js';
import type { MenuItem } from '@/types/menu.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import MkContainer from '@/components/MkContainer.vue';
import MkStreamingNotesTimeline from '@/components/MkStreamingNotesTimeline.vue';
import { i18n } from '@/i18n.js';
import { availableBasicTimelines, isAvailableBasicTimeline, isBasicTimeline, basicTimelineIconClass, basicTimelineTypes } from '@/timelines.js';

const name = 'timeline';

type TlSrc = typeof basicTimelineTypes[number] | 'list' | 'antenna';

const widgetPropsDef = {
	showHeader: {
		type: 'boolean',
		default: true,
	},
	height: {
		type: 'number',
		default: 300,
	},
	src: {
		type: 'string',
		default: 'home' as TlSrc,
		hidden: true,
	},
	antenna: {
		type: 'object',
		default: null as Misskey.entities.Antenna | null,
		hidden: true,
	},
	list: {
		type: 'object',
		default: null as Misskey.entities.UserList | null,
		hidden: true,
	},
} satisfies FormWithDefault;

type WidgetProps = GetFormResultType<typeof widgetPropsDef>;

const props = defineProps<WidgetComponentProps<WidgetProps>>();
const emit = defineEmits<WidgetComponentEmits<WidgetProps>>();

const { widgetProps, configure, save } = useWidgetPropsManager(name,
	widgetPropsDef,
	props,
	emit,
);

const menuOpened = ref(false);

const headerTitle = computed<string>(() => {
	if (widgetProps.src === 'list') {
		return widgetProps.list != null ? widgetProps.list.name : '?';
	} else if (widgetProps.src === 'antenna') {
		return widgetProps.antenna != null ? widgetProps.antenna.name : '?';
	} else {
		return i18n.ts._timelines[widgetProps.src] ?? '?';
	}
});

const setSrc = (src: TlSrc) => {
	widgetProps.src = src;
	save();
};

const choose = async (ev: PointerEvent) => {
	menuOpened.value = true;
	const [antennas, lists] = await Promise.all([
		misskeyApi('antennas/list'),
		misskeyApi('users/lists/list'),
	]);
	const antennaItems = antennas.map(antenna => ({
		text: antenna.name,
		icon: 'ti ti-antenna',
		action: () => {
			widgetProps.antenna = antenna;
			setSrc('antenna');
		},
	}));
	const listItems = lists.map(list => ({
		text: list.name,
		icon: 'ti ti-list',
		action: () => {
			widgetProps.list = list;
			setSrc('list');
		},
	}));

	const menuItems: MenuItem[] = [];

	menuItems.push(...availableBasicTimelines().map(tl => ({
		text: i18n.ts._timelines[tl],
		icon: basicTimelineIconClass(tl),
		action: () => { setSrc(tl); },
	})));

	if (antennaItems.length > 0) {
		menuItems.push({ type: 'divider' });
		menuItems.push(...antennaItems);
	}

	if (listItems.length > 0) {
		menuItems.push({ type: 'divider' });
		menuItems.push(...listItems);
	}

	os.popupMenu(menuItems, ev.currentTarget ?? ev.target).then(() => {
		menuOpened.value = false;
	});
};

defineExpose<WidgetComponentExpose>({
	name,
	configure,
	id: props.widget ? props.widget.id : null,
});
</script>

<style lang="scss" module>
.root {
	// 在 widget-grid 容器 (WidgetGridItem.body 是 flex:1 1 auto; min-height:0)
	// 下撑满整个 grid item；其他场景（侧栏/deck）走 MkContainer 默认高度。
	height: 100%;
	display: flex;
	flex-direction: column;
}

.disabled {
	text-align: center;
}

.disabledTitle {
	margin: 16px;
}

.disabledDescription {
	font-size: 90%;
}
</style>
