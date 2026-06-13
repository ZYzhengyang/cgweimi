<!--
  CG微米 - 底部评论抽屉（抖音风格）
  底部滑出，可下滑关闭，拖拽手柄 + 圆角
-->
<template>
<Transition name="drawer">
<div v-if="visible" :class="$style.overlay" @click.self="close" @touchmove.prevent>
	<div
		:class="$style.drawer"
		:style="{ transform: `translateY(${dragOffset}px)` }"
		@touchstart.passive="onTouchStart"
		@touchmove="onTouchMove"
		@touchend="onTouchEnd"
	>
		<!-- 拖拽手柄 -->
		<div :class="$style.handle">
			<div :class="$style.handleBar"></div>
		</div>

		<!-- 头部：标题 + 关闭 -->
		<div :class="$style.header">
			<span :class="$style.title">{{ replyCount }} 条评论</span>
			<button class="_button" :class="$style.closeBtn" @click="close">
				<i class="ti ti-x"></i>
			</button>
		</div>

		<!-- 评论列表 -->
		<div :class="$style.list" ref="listEl">
			<div v-if="loading" :class="$style.loading"><MkLoading mini/></div>
			<div v-else-if="replies.length === 0" :class="$style.empty">暂无评论</div>
			<div v-else v-for="reply in sortedReplies" :key="reply.id" :class="$style.comment">
				<MkAvatar :user="reply.user" :class="$style.avatar"/>
				<div :class="$style.body">
					<span :class="$style.name">{{ reply.user?.name || reply.user?.username }}</span>
					<Mfm v-if="reply.text" :text="reply.text" :author="reply.user" :emojiUrls="reply.emojis" class="_selectable" :class="$style.text"/>
					<div :class="$style.commentMeta">
						<span :class="$style.time"><MkTime :time="reply.createdAt"/></span>
						<span v-if="totalReactions(reply) > 0" :class="$style.commentReactions">
							<i class="ti ti-heart" style="font-size:11px"></i> {{ totalReactions(reply) }}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- 输入框（sticky 底部） -->
		<div :class="$style.inputArea">
			<div :class="$style.inputWrap">
				<textarea
					v-model="commentText"
					:class="$style.textarea"
					placeholder="写评论..."
					rows="1"
					@keydown.enter.exact.prevent="submit"
				></textarea>
				<button
					class="_button"
					:class="$style.emojiBtn"
					@click="insertEmoji"
				>
					<i class="ti ti-mood-happy"></i>
				</button>
				<button class="_button" :class="$style.sendBtn" :disabled="!commentText.trim()" @click="submit">
					<i class="ti ti-send"></i>
				</button>
			</div>
		</div>
	</div>
</div>
</Transition>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import * as Misskey from 'misskey-js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import MkLoading from '@/components/global/MkLoading.vue';
import MkTime from '@/components/global/MkTime.vue';
import { $i } from '@/i.js';
import { emojiPicker } from '@/utility/emoji-picker.js';

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
const visible = ref(false);
const replyCount = computed(() => props.note.repliesCount || 0);

// 拖拽关闭手势
const dragOffset = ref(0);
let startY = 0;
let isDragging = false;

const sortedReplies = computed(() => {
	return [...replies.value].sort((a, b) => {
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});
});

function totalReactions(note: Misskey.entities.Note): number {
	if (!note.reactions) return 0;
	return Object.values(note.reactions).reduce((sum, v) => sum + v, 0);
}

function close() {
	visible.value = false;
	setTimeout(() => emit('closed'), 300);
}

function onTouchStart(e: TouchEvent) {
	startY = e.touches[0].clientY;
	isDragging = true;
}

function onTouchMove(e: TouchEvent) {
	if (!isDragging) return;
	const currentY = e.touches[0].clientY;
	const diff = currentY - startY;
	// 只允许下拉，不允许上拉超出
	dragOffset.value = Math.max(0, diff);
}

function onTouchEnd() {
	if (!isDragging) return;
	isDragging = false;
	// 下拉超过 150px 或速度足够快 → 关闭
	if (dragOffset.value > 150) {
		close();
	} else {
		dragOffset.value = 0;
	}
}

function insertEmoji(ev: MouseEvent) {
	const target = ev.currentTarget ?? ev.target;
	if (target == null) return;
	emojiPicker.show(target as HTMLElement, emoji => {
		commentText.value += emoji;
	});
}

async function submit() {
	if (!commentText.value.trim()) return;
	const text = commentText.value.trim();
	commentText.value = '';

	// 乐观更新
	if ($i) {
		const optimisticNote = {
			id: `_optimistic_${Date.now()}`,
			text,
			createdAt: new Date().toISOString(),
			user: {
				id: $i.id,
				name: $i.name,
				username: $i.username,
				host: $i.host,
				avatarUrl: $i.avatarUrl,
				avatarBlurhash: $i.avatarBlurhash,
				avatarDecorations: $i.avatarDecorations ?? [],
				emojis: {},
			},
			reactions: {},
			emojis: {},
		} as Misskey.entities.Note;
		replies.value.unshift(optimisticNote);
		await nextTick();
		if (listEl.value) listEl.value.scrollTop = 0;
	}

	try {
		const result = await misskeyApi('notes/create', {
			text,
			replyId: props.note.id,
		});
		// 替换乐观数据
		if ($i) {
			const idx = replies.value.findIndex(r => r.id.startsWith('_optimistic_'));
			if (idx !== -1) replies.value.splice(idx, 1, result.createdNote);
			else replies.value.unshift(result.createdNote);
		} else {
			replies.value.unshift(result.createdNote);
		}
		props.note.repliesCount = (props.note.repliesCount || 0) + 1;
		os.toast('已发送');
	} catch (e) {
		// 回滚乐观数据
		replies.value = replies.value.filter(r => !r.id.startsWith('_optimistic_'));
		commentText.value = text;
		os.toast('发送失败');
	}
}

onMounted(async () => {
	// 触发入场动画
	await nextTick();
	visible.value = true;

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
</script>

<style module lang="scss">
.overlay {
	position: fixed;
	inset: 0;
	z-index: 9999;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: flex-end;
	justify-content: center;
}

.drawer {
	width: 100%;
	max-width: 500px;
	height: 65vh;
	max-height: 65vh;
	background: var(--MI_THEME-panel);
	border-radius: 16px 16px 0 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.2);
	transition: transform 0.15s ease-out;
}

.handle {
	display: flex;
	justify-content: center;
	padding: 8px 0 4px;
	flex-shrink: 0;
	cursor: grab;

	&:active {
		cursor: grabbing;
	}
}

.handleBar {
	width: 36px;
	height: 4px;
	border-radius: 2px;
	background: var(--MI_THEME-fgTransparentWeak);
	opacity: 0.4;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 4px 16px 10px;
	border-bottom: 1px solid var(--MI_THEME-divider);
	flex-shrink: 0;
}

.title {
	font-size: 15px;
	font-weight: 600;
}

.closeBtn {
	font-size: 18px;
	color: var(--MI_THEME-fgTransparentWeak);
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.list {
	flex: 1;
	overflow-y: auto;
	padding: 12px 16px;
	min-height: 150px;
	-webkit-overflow-scrolling: touch;
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
	margin-bottom: 14px;
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
	font-size: 13px;
	font-weight: 600;
	color: var(--MI_THEME-fgTransparentWeak);
}

.text {
	font-size: 13px;
	margin-top: 4px;
	line-height: 1.5;
}

.commentMeta {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 4px;
}

.time {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.commentReactions {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	display: flex;
	align-items: center;
	gap: 2px;
}

.inputArea {
	padding: 8px 16px 12px;
	border-top: 1px solid var(--MI_THEME-divider);
	flex-shrink: 0;
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

.emojiBtn {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 16px;
	flex-shrink: 0;
	transition: background 0.2s, color 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
		color: var(--MI_THEME-fg);
	}
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

<style>
/* 底部抽屉：遮罩淡入 + 抽屉滑入 */
.drawer-enter-active {
	transition: opacity 0.3s ease;
}
.drawer-enter-active .drawer,
.drawer-enter-active > div:last-child {
	transition: transform 0.3s ease !important;
}
.drawer-leave-active {
	transition: opacity 0.25s ease;
}
.drawer-leave-active .drawer,
.drawer-leave-active > div:last-child {
	transition: transform 0.25s ease !important;
}
.drawer-enter-from {
	opacity: 0;
}
.drawer-enter-from > div:last-child {
	transform: translateY(100%) !important;
}
.drawer-leave-to {
	opacity: 0;
}
.drawer-leave-to > div:last-child {
	transform: translateY(100%) !important;
}
</style>
