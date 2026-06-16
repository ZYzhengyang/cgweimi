<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkPagination :paginator="paginator">
	<template #empty><MkResult type="empty" :text="i18n.ts.noUsers"/></template>

	<template #default="{ items }">
		<div :class="$style.root">
			<DynamicScroller
				:items="items"
				:min-item-size="80"
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
						<MkUserInfo :user="extractor(item)"/>
					</DynamicScrollerItem>
				</template>
			</DynamicScroller>
		</div>
	</template>
</MkPagination>
</template>

<script lang="ts" setup generic="P extends IPaginator">
import * as Misskey from 'misskey-js';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import type { IPaginator, ExtractorFunction } from '@/utility/paginator.js';
import MkUserInfo from '@/components/MkUserInfo.vue';
import MkPagination from '@/components/MkPagination.vue';
import { i18n } from '@/i18n.js';

const props = withDefaults(defineProps<{
	paginator: P;
	noGap?: boolean;
	extractor?: ExtractorFunction<P, Misskey.entities.UserDetailed>;
}>(), {
	extractor: (item: any) => item as Misskey.entities.UserDetailed,
});
</script>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	gap: var(--MI-margin);
}
</style>
