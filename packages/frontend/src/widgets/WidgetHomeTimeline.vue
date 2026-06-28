<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.root, { [$style.headerless]: !widgetProps.showHeader }]">
	<MkPostForm v-if="widgetProps.showFixedPostForm" :class="$style.postForm" class="_panel" fixed style="margin-bottom: var(--MI-margin);"/>
	<MkStreamingNotesTimeline
		ref="tlComponent"
		:key="tlKey"
		:class="$style.tl"
		:src="(currentSrc.split(':')[0] as (BasicTimelineType | 'list'))"
		:list="currentSrc.split(':')[1]"
		:withRenotes="withRenotes"
		:withReplies="withReplies"
		:withSensitive="withSensitive"
		:onlyFiles="onlyFiles"
		:sound="true"
	/>
</div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useWidgetPropsManager } from './widget.js';
import type { WidgetComponentEmits, WidgetComponentExpose, WidgetComponentProps } from './widget.js';
import type { FormWithDefault, GetFormResultType } from '@/utility/form.js';
import type { BasicTimelineType } from '@/timelines.js';
import MkStreamingNotesTimeline from '@/components/MkStreamingNotesTimeline.vue';
import MkPostForm from '@/components/MkPostForm.vue';
import { store } from '@/store.js';

const name = 'homeTimeline';

type TimelinePageSrc = BasicTimelineType | `list:${string}`;

const widgetPropsDef = {
	showHeader: {
		type: 'boolean',
		default: true,
	},
	height: {
		type: 'number',
		default: 0,
		hidden: true,
	},
	showFixedPostForm: {
		type: 'boolean',
		default: true,
	},
} satisfies FormWithDefault;

type WidgetProps = GetFormResultType<typeof widgetPropsDef>;

const props = defineProps<WidgetComponentProps<WidgetProps>>();
const emit = defineEmits<WidgetComponentEmits<WidgetProps>>();

const { widgetProps, configure } = useWidgetPropsManager(
	name,
	widgetPropsDef,
	props,
	emit,
);

// 与全局 store 双向同步 —— 保留 timeline 页原本的"用户在哪个时间线 / 哪些 filter"行为
const currentSrc = computed<TimelinePageSrc>(() => store.r.tl.value.src);
const withRenotes = computed<boolean>(() => store.r.tl.value.filter.withRenotes);
const withReplies = computed<boolean>(() => store.r.tl.value.filter.withReplies);
const withSensitive = computed<boolean>(() => store.r.tl.value.filter.withSensitive);
const onlyFiles = computed<boolean>(() => store.r.tl.value.filter.onlyFiles);

const tlKey = computed(() =>
	`${currentSrc.value}+${withRenotes.value}+${withReplies.value}+${onlyFiles.value}+${withSensitive.value}`,
);

defineExpose<WidgetComponentExpose>({
	name,
	configure,
	id: props.widget ? props.widget.id : null,
});
</script>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.headerless {
	// header 收起时去掉 padding
	padding: 0;
}

.postForm {
	border-radius: var(--MI-radius);
}

.tl {
	background: var(--MI_THEME-bg);
	border-radius: var(--MI-radius);
	overflow: clip;
	flex: 1;
	min-height: 0;
}
</style>
