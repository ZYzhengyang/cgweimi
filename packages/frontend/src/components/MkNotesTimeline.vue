<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkPagination :paginator="paginator" :direction="direction" :autoLoad="autoLoad" :pullToRefresh="pullToRefresh" :withControl="withControl" :forceDisableInfiniteScroll="forceDisableInfiniteScroll">
	<template #empty><MkResult type="empty" :text="i18n.ts.noNotes"/></template>

	<template #default="{ items: notes }">
		<div :class="[$style.root, { [$style.noGap]: noGap, '_gaps': !noGap }]">
			<template v-for="(note, i) in notes" :key="note.id">
				<!-- 同一用户折叠：只显示最新一条 -->
				<div v-if="isDuplicateUser(notes, i)" :class="$style.foldedNote">
					<button class="_button" :class="$style.foldedBtn" @click="expandUser(note.userId)">
						<MkAvatar :user="note.user" :class="$style.foldedAvatar"/>
						<span :class="$style.foldedText">@{{ note.user?.username }} 还有更多动态</span>
					</button>
				</div>

				<div
					v-else-if="i > 0 && isSeparatorNeeded(paginator.items.value[i - 1].createdAt, note.createdAt)"
					:data-scroll-anchor="note.id"
					:class="{ '_gaps': !noGap }"
				>
					<div :class="[$style.date, { [$style.noGap]: noGap }]">
						<span><i class="ti ti-chevron-up"></i> {{ getSeparatorInfo(paginator.items.value[i - 1].createdAt, note.createdAt)?.prevText }}</span>
						<span style="height: 1em; width: 1px; background: var(--MI_THEME-divider);"></span>
						<span>{{ getSeparatorInfo(paginator.items.value[i - 1].createdAt, note.createdAt)?.nextText }} <i class="ti ti-chevron-down"></i></span>
					</div>
					<MkNote :class="$style.note" :note="note" :withHardMute="true"/>
					<div v-if="note._shouldInsertAd_" :class="$style.ad">
						<MkAd :preferForms="['horizontal', 'horizontal-big']"/>
					</div>
				</div>
				<div v-else-if="note._shouldInsertAd_" :class="{ '_gaps': !noGap }" :data-scroll-anchor="note.id">
					<MkNote :class="$style.note" :note="note" :withHardMute="true"/>
					<div :class="$style.ad">
						<MkAd :preferForms="['horizontal', 'horizontal-big']"/>
					</div>
				</div>
				<MkNote v-else :class="$style.note" :note="note" :withHardMute="true" :data-scroll-anchor="note.id"/>
			</template>
		</div>
	</template>
</MkPagination>
</template>

<script lang="ts" setup generic="T extends IPaginator<Misskey.entities.Note>">
import { computed } from 'vue';
import * as Misskey from 'misskey-js';
import type { MkPaginationOptions } from '@/components/MkPagination.vue';
import type { IPaginator } from '@/utility/paginator.js';
import MkNote from '@/components/MkNote.vue';
import MkPagination from '@/components/MkPagination.vue';
import { i18n } from '@/i18n.js';
import { useGlobalEvent } from '@/events.js';
import { isSeparatorNeeded, getSeparatorInfo } from '@/utility/timeline-date-separate.js';

const props = withDefaults(defineProps<MkPaginationOptions & {
	paginator: T;
	noGap?: boolean;
}>(), {
	autoLoad: true,
	direction: 'down',
	pullToRefresh: true,
	withControl: true,
	forceDisableInfiniteScroll: false,
});

// 同一用户只显示最新一条，其余折叠
const DEDUP_WINDOW = 10; // 前10条内去重
const expandedUsers = new Set<string>();

function isDuplicateUser(notes: Misskey.entities.Note[], index: number): boolean {
	if (index === 0) return false;
	const note = notes[index];
	// 如果用户已展开，不折叠
	if (expandedUsers.has(note.userId)) return false;
	// 在前 DEDUP_WINDOW 条内查找同一用户
	const windowStart = Math.max(0, index - DEDUP_WINDOW);
	for (let i = windowStart; i < index; i++) {
		if (notes[i].userId === note.userId) return true;
	}
	return false;
}

function expandUser(userId: string) {
	expandedUsers.add(userId);
	// 强制刷新
	props.paginator.reload();
}

useGlobalEvent('noteDeleted', (noteId) => {
	props.paginator.removeItem(noteId);
});

function reload() {
	return props.paginator.reload();
}

defineExpose({
	reload,
});
</script>

<style lang="scss" module>
.root {
	container-type: inline-size;

	&.noGap {
		background: var(--MI_THEME-panel);

		.note {
			border-bottom: solid 0.5px var(--MI_THEME-divider);
		}

		.ad {
			padding: 8px;
			background-size: auto auto;
			background-image: repeating-linear-gradient(45deg, transparent, transparent 8px, var(--MI_THEME-bg) 8px, var(--MI_THEME-bg) 14px);
			border-bottom: solid 0.5px var(--MI_THEME-divider);
		}
	}

	&:not(.noGap) {
		background: var(--MI_THEME-bg);

		.note {
			background: var(--MI_THEME-panel);
			border-radius: var(--MI-radius);
		}
	}
}

.date {
	display: flex;
	font-size: 85%;
	align-items: center;
	justify-content: center;
	gap: 1em;
	opacity: 0.75;
	padding: 8px 8px;
	margin: 0 auto;

	&.noGap {
		border-bottom: solid 0.5px var(--MI_THEME-divider);
	}
}

.ad:empty {
	display: none;
}

.foldedNote {
	padding: 4px 12px;
}

.foldedBtn {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 12px;
	border-radius: 8px;
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	transition: background 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.foldedAvatar {
	width: 20px;
	height: 20px;
	border-radius: 50%;
}

.foldedText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
