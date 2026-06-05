<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<component :is="prefer.s.enablePullToRefresh ? MkPullToRefresh : 'div'" :refresher="() => reload()">
	<div class="_spacer" :style="{ '--MI_SPACER-w': narrow ? '800px' : '1100px' }">
		<div ref="rootEl" class="ftskorzw" :class="{ wide: !narrow }" style="container-type: inline-size;">
			<div class="main _gaps">
				<!-- 置顶笔记 -->
				<div class="contents _gaps">
					<div v-if="user.pinnedNotes.length > 0" class="_gaps">
						<MkNote v-for="note in user.pinnedNotes" :key="note.id" class="note _panel" :note="note" :pinned="true"/>
					</div>
					<MkInfo v-else-if="$i && $i.id === user.id">{{ i18n.ts.userPagePinTip }}</MkInfo>
					<template v-if="narrow">
						<MkLazy>
							<XFiles :key="user.id" :user="user" @showMore="emit('showMoreFiles')"/>
						</MkLazy>
						<MkLazy>
							<XActivity :key="user.id" :user="user"/>
						</MkLazy>
					</template>
					<div v-if="!disableNotes">
						<MkLazy>
							<XTimeline :user="user"/>
						</MkLazy>
					</div>
				</div>
			</div>
			<div v-if="!narrow" class="sub _gaps" style="container-type: inline-size;">
				<XFiles :key="user.id" :user="user" @showMore="emit('showMoreFiles')"/>
				<XActivity :key="user.id" :user="user"/>
			</div>
		</div>
	</div>
</component>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, onMounted, onUnmounted, onActivated, onDeactivated, nextTick, ref, useTemplateRef } from 'vue';
import * as Misskey from 'misskey-js';
import MkNote from '@/components/MkNote.vue';
import MkInfo from '@/components/MkInfo.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { confetti } from '@/utility/confetti.js';
import { prefer } from '@/preferences.js';
import MkPullToRefresh from '@/components/MkPullToRefresh.vue';
import { isBirthday } from '@/utility/is-birthday.js';

const XFiles = defineAsyncComponent(() => import('./index.files.vue'));
const XActivity = defineAsyncComponent(() => import('./index.activity.vue'));
const XTimeline = defineAsyncComponent(() => import('./index.timeline.vue'));

const props = withDefaults(defineProps<{
	user: Misskey.entities.UserDetailed;
	/** Test only; MkNotesTimeline currently causes problems in vitest */
	disableNotes?: boolean;
}>(), {
	disableNotes: false,
});

const emit = defineEmits<{
	(ev: 'showMoreFiles'): void;
}>();

const narrow = ref<null | boolean>(null);
const rootEl = useTemplateRef('rootEl');

async function reload() {
	// TODO
}

onMounted(() => {
	narrow.value = rootEl.value!.clientWidth < 1000;

	if (isBirthday(props.user)) {
		confetti({
			duration: 1000 * 4,
		});
	}
});
</script>

<style lang="scss" scoped>
.ftskorzw {

	> .main {

		> .contents {
			> .content {
				margin-bottom: var(--MI-margin);
			}
		}
	}

	&.wide {
		display: flex;
		width: 100%;

		> .main {
			width: 100%;
			min-width: 0;
		}

		> .sub {
			max-width: 350px;
			min-width: 350px;
			margin-left: var(--MI-margin);
		}
	}
}
</style>
