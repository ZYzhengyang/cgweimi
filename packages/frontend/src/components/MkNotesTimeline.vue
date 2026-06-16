<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkPagination :paginator="paginator" :direction="direction" :autoLoad="autoLoad" :pullToRefresh="pullToRefresh" :withControl="withControl" :forceDisableInfiniteScroll="forceDisableInfiniteScroll">
	<template #empty><MkResult type="empty" :text="i18n.ts.noNotes"/></template>

	<template #default="{ items: notes }">
		<div :class="[$style.root, { [$style.noGap]: noGap }]">
			<DynamicScroller
				:items="displayItems(notes)"
				:min-item-size="120"
				key-field="id"
				page-mode
			>
				<template #default="{ item, index, active }">
					<DynamicScrollerItem
						:item="item"
						:active="active"
						:data-index="index"
						:size-dependencies="[item.id]"
					>
						<div
							v-if="item.type === 'fold'"
							:key="item.id"
							:data-scroll-anchor="item.id"
							:class="[$style.foldedNote, { '_gaps': !noGap }]"
						>
							<button class="_button" :class="$style.foldedBtn" @click="expandUser(item.userId)">
								<MkAvatar :user="item.avatarUser" :class="$style.foldedAvatar"/>
								<span :class="$style.foldedText">@{{ item.username }} 还有更多动态</span>
							</button>
						</div>

						<div
							v-else-if="item.type === 'separator'"
							:key="item.id"
							:data-scroll-anchor="item.id"
							:class="{ '_gaps': !noGap }"
						>
							<div :class="[$style.date, { [$style.noGap]: noGap }]">
								<span><i class="ti ti-chevron-up"></i> {{ item.prevText }}</span>
								<span style="height: 1em; width: 1px; background: var(--MI_THEME-divider);"></span>
								<span>{{ item.nextText }} <i class="ti ti-chevron-down"></i></span>
							</div>
							<MkNote :class="$style.note" :note="item.note" :withHardMute="true"/>
							<div v-if="item.note._shouldInsertAd_" :class="$style.ad">
								<MkAd :preferForms="['horizontal', 'horizontal-big']"/>
							</div>
						</div>

						<div
							v-else-if="item.type === 'noteAd'"
							:key="item.id"
							:data-scroll-anchor="item.id"
							:class="{ '_gaps': !noGap }"
						>
							<MkNote :class="$style.note" :note="item.note" :withHardMute="true"/>
							<div :class="$style.ad">
								<MkAd :preferForms="['horizontal', 'horizontal-big']"/>
							</div>
						</div>

						<MkNote
							v-else
							:key="item.id"
							:class="$style.note"
							:note="item.note"
							:withHardMute="true"
							:data-scroll-anchor="item.id"
						/>
					</DynamicScrollerItem>
				</template>
			</DynamicScroller>
		</div>
	</template>
</MkPagination>
</template>

<script lang="ts" setup generic="T extends IPaginator<Misskey.entities.Note>">
import * as Misskey from 'misskey-js';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import type { MkPaginationOptions } from '@/components/MkPagination.vue';
import type { IPaginator, MisskeyEntity } from '@/utility/paginator.js';
import MkNote from '@/components/MkNote.vue';
import MkPagination from '@/components/MkPagination.vue';
import { i18n } from '@/i18n.js';
import { useGlobalEvent } from '@/events.js';
import { isSeparatorNeeded, getSeparatorInfo } from '@/utility/timeline-date-separate.js';

type Note = Misskey.entities.Note & MisskeyEntity;

type FoldItem = {
	id: string;
	type: 'fold';
	userId: string;
	username: string;
	avatarUser: Note['user'];
};

type SeparatorItem = {
	id: string;
	type: 'separator';
	note: Note;
	prevText: string;
	nextText: string;
};

type NoteAdItem = {
	id: string;
	type: 'noteAd';
	note: Note;
};

type NoteItem = {
	id: string;
	type: 'note';
	note: Note;
};

type TimelineItem = FoldItem | SeparatorItem | NoteAdItem | NoteItem;

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

function isDuplicateUser(notes: Note[], index: number): boolean {
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

/**
 * 把 paginator.items 拍平为虚拟滚动可消费的 items 数组。
 * 预先处理折叠 / 日期分隔 / 广告插入，避免在 v-for 内做条件分支。
 */
function displayItems(notes: Note[]): TimelineItem[] {
	if (notes.length === 0) return [];
	const items: TimelineItem[] = [];
	for (let i = 0; i < notes.length; i++) {
		const note = notes[i];
		if (isDuplicateUser(notes, i)) {
			items.push({
				id: `fold-${note.id}`,
				type: 'fold',
				userId: note.userId,
				username: note.user?.username ?? '',
				avatarUser: note.user,
			});
			continue;
		}
		if (i > 0 && isSeparatorNeeded(notes[i - 1].createdAt, note.createdAt)) {
			const info = getSeparatorInfo(notes[i - 1].createdAt, note.createdAt);
			items.push({
				id: `sep-${note.id}`,
				type: 'separator',
				note,
				prevText: info?.prevText ?? '',
				nextText: info?.nextText ?? '',
			});
		} else if (note._shouldInsertAd_) {
			items.push({
				id: `ad-${note.id}`,
				type: 'noteAd',
				note,
			});
		} else {
			items.push({
				id: note.id,
				type: 'note',
				note,
			});
		}
	}
	return items;
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
