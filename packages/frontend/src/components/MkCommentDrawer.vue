<!--
  CG微米 - 评论抽屉（底部弹出，类似抖音）
  视频继续播放，评论从底部滑上来
-->
<template>
<MkModal ref="modal" :preferType="'drawer'" @close="emit('closed')">
	<template #default="{ maxHeight }">
		<div :class="$style.root" :style="{ maxHeight: maxHeight + 'px' }">
			<!-- 拖拽条 -->
			<div :class="$style.handle"><div :class="$style.handleBar"></div></div>

			<!-- 标题 -->
			<div :class="$style.header">
				<span :class="$style.title">评论 {{ replyCount }}</span>
				<button class="_button" :class="$style.closeBtn" @click="emit('closed')">
					<i class="ti ti-x"></i>
				</button>
			</div>

			<!-- 评论列表 -->
			<div :class="$style.list" ref="listEl">
				<div v-if="loading" :class="$style.loading"><MkLoading mini/></div>
				<div v-else-if="replies.length === 0" :class="$style.empty">暂无评论，快来抢沙发~</div>
				<div v-else>
					<div v-for="reply in replies" :key="reply.id" :class="$style.comment">
						<MkAvatar :user="reply.user" :class="$style.avatar" link preview/>
						<div :class="$style.body">
							<div :class="$style.name">@{{ reply.user?.username }}</div>
							<Mfm
								v-if="reply.text"
								:text="reply.text"
								:author="reply.user"
								:emojiUrls="reply.emojis"
								class="_selectable"
								:class="$style.text"
							/>
							<MkMediaList v-if="reply.files?.length > 0" :mediaList="reply.files" :class="$style.media"/>
							<div :class="$style.time"><MkTime :time="reply.createdAt"/></div>
						</div>
					</div>
				</div>
			</div>

			<!-- 输入框 -->
			<div :class="$style.inputArea">
				<div :class="$style.inputWrap">
					<textarea
						v-model="commentText"
						:class="$style.textarea"
						placeholder="写评论..."
						rows="1"
						@keydown.enter.exact.prevent="submit"
					></textarea>
					<button class="_button" :class="$style.sendBtn" :disabled="!commentText.trim()" @click="submit">
						<i class="ti ti-send"></i>
					</button>
				</div>
			</div>
		</div>
	</template>
</MkModal>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import * as Misskey from 'misskey-js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import MkModal from '@/components/MkModal.vue';
import MkMediaList from '@/components/MkMediaList.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import MkTime from '@/components/global/MkTime.vue';

const props = defineProps<{
	note: Misskey.entities.Note;
}>();

const emit = defineEmits<{
	closed: [];
}>();

const replies = ref<Misskey.entities.Note[]>([]);
const loading = ref(true);
const commentText = ref('');
const listEl = ref<HTMLElement>();

const replyCount = computed(() => props.note.repliesCount || 0);

import { computed } from 'vue';

onMounted(async () => {
	try {
		replies.value = await misskeyApi('notes/replies', {
			noteId: props.note.id,
			limit: 50,
		});
	} catch (e) {
		console.error('Failed to load replies:', e);
	}
	loading.value = false;
});

async function submit() {
	if (!commentText.value.trim()) return;
	try {
		const result = await misskeyApi('notes/create', {
			text: commentText.value.trim(),
			replyId: props.note.id,
		});
		replies.value.push(result.createdNote);
		commentText.value = '';
		props.note.repliesCount = (props.note.repliesCount || 0) + 1;
		os.toast('评论已发送');
		// 滚动到底部
		setTimeout(() => {
			if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
		}, 100);
	} catch (e) {
		console.error('Failed to post comment:', e);
		os.toast('发送失败');
	}
}
</script>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	background: var(--MI_THEME-panel);
	border-radius: 16px 16px 0 0;
	overflow: hidden;
}

.handle {
	display: flex;
	justify-content: center;
	padding: 8px 0 4px;
}

.handleBar {
	width: 36px;
	height: 4px;
	border-radius: 2px;
	background: var(--MI_THEME-divider);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 16px 12px;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.title {
	font-size: 15px;
	font-weight: 600;
}

.closeBtn {
	font-size: 18px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.list {
	flex: 1;
	overflow-y: auto;
	padding: 12px 16px;
	min-height: 200px;
	max-height: 50vh;
}

.loading, .empty {
	display: flex;
	justify-content: center;
	padding: 32px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 13px;
}

.comment {
	display: flex;
	gap: 10px;
	margin-bottom: 16px;
}

.avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	flex-shrink: 0;
}

.body {
	flex: 1;
	min-width: 0;
}

.name {
	font-size: 12px;
	font-weight: 600;
	color: var(--MI_THEME-fg);
}

.text {
	font-size: 13px;
	margin-top: 2px;
	line-height: 1.5;
}

.media {
	margin-top: 6px;
}

.time {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-top: 4px;
}

.inputArea {
	padding: 8px 16px 12px;
	border-top: 1px solid var(--MI_THEME-divider);
	background: var(--MI_THEME-panel);
}

.inputWrap {
	display: flex;
	align-items: flex-end;
	gap: 6px;
	background: var(--MI_THEME-bg);
	border-radius: 20px;
	padding: 6px 6px 6px 14px;
}

.textarea {
	flex: 1;
	border: none;
	background: transparent;
	resize: none;
	font-size: 13px;
	line-height: 1.5;
	color: var(--MI_THEME-fg);
	outline: none;
	font-family: inherit;
	max-height: 80px;
}

.sendBtn {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-accent);
	font-size: 16px;
	flex-shrink: 0;

	&:hover:not(:disabled) {
		background: var(--MI_THEME-buttonHoverBg);
	}
	&:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
}
</style>
