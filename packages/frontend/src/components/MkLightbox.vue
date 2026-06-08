<!--
  CG微米 - 统一弹窗组件
  模式1（发现页）：传 note → 显示媒体 + 右侧评论区
  模式2（时间线）：只传 mediaList → 纯媒体查看
-->
<template>
<teleport to="body">
<div v-if="visible" :class="$style.overlay" @click.self="close">
	<!-- 关闭按钮 -->
	<button :class="$style.closeBtn" class="_button" @click="close">
		<i class="ti ti-x"></i>
	</button>

	<!-- 整体布局 -->
	<div :class="$style.container">
		<!-- 左侧：媒体展示 -->
		<div :class="$style.left" @click.self="close">
			<!-- 左导航 -->
			<button v-if="mediaList.length > 1" :class="[$style.navBtn, $style.navBtnLeft]" class="_button" :disabled="currentIndex <= 0" @click.stop="prev">
				<i class="ti ti-chevron-left"></i>
			</button>

			<!-- 媒体内容 -->
			<div :class="$style.mediaArea">
				<Transition name="fade" mode="out-in">
					<video
						v-if="currentMedia?.type.startsWith('video')"
						:key="currentMedia.url"
						:src="currentMedia.url"
						:poster="currentMedia.thumbnailUrl || undefined"
						:class="$style.media"
						controls
						autoplay
					/>
					<img
						v-else-if="currentMedia?.type.startsWith('image')"
						:key="currentMedia.url"
						:src="currentMedia.url"
						:class="$style.media"
					/>
				</Transition>
			</div>

			<!-- 右导航 -->
			<button v-if="mediaList.length > 1" :class="[$style.navBtn, $style.navBtnRight]" class="_button" :disabled="currentIndex >= mediaList.length - 1" @click.stop="next">
				<i class="ti ti-chevron-right"></i>
			</button>

			<!-- 底部指示点 -->
			<div v-if="mediaList.length > 1" :class="$style.dots">
				<span
					v-for="(_, i) in mediaList"
					:key="i"
					:class="[$style.dot, { [$style.dotActive]: i === currentIndex }]"
					@click="currentIndex = i"
				></span>
			</div>
		</div>

		<!-- 右侧：评论区（仅发现页） -->
		<div v-if="note" :class="$style.right">
			<!-- 作者信息 -->
			<div :class="$style.author">
				<img v-if="note.user?.avatarUrl" :src="note.user.avatarUrl" :class="$style.authorAvatar"/>
				<div :class="$style.authorInfo">
					<div :class="$style.authorName">{{ note.user?.name || note.user?.username }}</div>
					<div :class="$style.authorTime">{{ formatTime(note.createdAt) }}</div>
				</div>
			</div>

			<!-- 文字内容 -->
			<div v-if="note.text" :class="$style.textContent">
				{{ note.text }}
			</div>

			<!-- 评论列表 -->
			<div :class="$style.comments">
				<div v-if="loadingComments" :class="$style.commentsLoading">
					<MkLoading mini/>
				</div>
				<div v-else-if="replies.length === 0" :class="$style.commentsEmpty">
					暂无评论
				</div>
				<div v-else :class="$style.commentsList">
					<div v-for="reply in replies" :key="reply.id" :class="$style.comment">
						<img v-if="reply.user?.avatarUrl" :src="reply.user.avatarUrl" :class="$style.commentAvatar"/>
						<div :class="$style.commentBody">
							<span :class="$style.commentName">{{ reply.user?.name || reply.user?.username }}</span>
							<span :class="$style.commentText">{{ reply.text }}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- 评论输入 -->
			<div :class="$style.commentInput">
				<input
					v-model="commentText"
					:class="$style.input"
					placeholder="写评论..."
					@keydown.enter="submitComment"
				/>
				<button class="_button" :class="$style.sendBtn" @click="submitComment" :disabled="!commentText.trim()">
					<i class="ti ti-send"></i>
				</button>
			</div>
		</div>
	</div>
</div>
</teleport>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import * as Misskey from 'misskey-js';
import { misskeyApi } from '@/utility/misskey-api.js';
import MkLoading from '@/components/global/MkLoading.vue';

const props = defineProps<{
	mediaList: Array<{
		url: string;
		type: string;
		thumbnailUrl?: string;
		comment?: string;
	}>;
	initialIndex?: number;
	note?: Misskey.entities.Note; // 有此属性则显示评论区
}>();

const emit = defineEmits<{
	closed: [];
}>();

const visible = ref(true);
const currentIndex = ref(props.initialIndex ?? 0);
const replies = ref<Misskey.entities.Note[]>([]);
const loadingComments = ref(false);
const commentText = ref('');

const currentMedia = computed(() => props.mediaList[currentIndex.value]);

function close() {
	visible.value = false;
	emit('closed');
}

function prev() {
	if (currentIndex.value > 0) currentIndex.value--;
}

function next() {
	if (currentIndex.value < props.mediaList.length - 1) currentIndex.value++;
}

function formatTime(time: string) {
	const d = new Date(time);
	const now = new Date();
	const diff = now.getTime() - d.getTime();
	if (diff < 60000) return '刚刚';
	if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
	if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
	return d.toLocaleDateString('zh-CN');
}

async function loadComments() {
	if (!props.note) return;
	loadingComments.value = true;
	try {
		replies.value = await misskeyApi('notes/replies', { noteId: props.note.id, limit: 20 });
	} catch (e) {
		console.error('Failed to load comments:', e);
	}
	loadingComments.value = false;
}

async function submitComment() {
	if (!commentText.value.trim() || !props.note) return;
	try {
		await misskeyApi('notes/replies/create', {
			replyId: props.note.id,
			text: commentText.value.trim(),
		});
		commentText.value = '';
		loadComments();
	} catch (e) {
		console.error('Failed to submit comment:', e);
	}
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') close();
	if (e.key === 'ArrowLeft') prev();
	if (e.key === 'ArrowRight') next();
}

onMounted(() => {
	document.addEventListener('keydown', onKeydown);
	if (props.note) loadComments();
});

onUnmounted(() => {
	document.removeEventListener('keydown', onKeydown);
});
</script>

<style module lang="scss">
.overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: rgba(0, 0, 0, 0.9);
	z-index: 10000;
}

.closeBtn {
	position: absolute;
	top: 16px;
	right: 16px;
	z-index: 20;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.1);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	cursor: pointer;
	transition: background 0.2s;

	&:hover {
		background: rgba(255, 255, 255, 0.2);
	}
}

.container {
	display: flex;
	width: 100%;
	height: 100%;
}

// 左侧媒体区
.left {
	flex: 0 0 85%;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	padding: 20px;
}

.mediaArea {
	display: flex;
	align-items: center;
	justify-content: center;
}

.media {
	max-width: 90vw;
	max-height: 90vh;
	object-fit: contain;

	.container:has(.right) & {
		max-width: 80vw;
	}
}

// 导航按钮
.navBtn {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	z-index: 10;
	width: 50px;
	height: 80px;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.1);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24px;
	cursor: pointer;
	transition: all 0.2s;
	opacity: 0;

	&:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	&:disabled {
		opacity: 0 !important;
		cursor: default;
	}
}

.left:hover .navBtn {
	opacity: 1;
}

.navBtnLeft {
	left: 20px;
}

.navBtnRight {
	right: 20px;
}

// 底部指示点
.dots {
	position: absolute;
	bottom: 20px;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	gap: 6px;
}

.dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.3);
	cursor: pointer;
	transition: all 0.2s;

	&:hover {
		background: rgba(255, 255, 255, 0.5);
	}
}

.dotActive {
	background: #fff;
	width: 10px;
	height: 10px;
}

// 右侧评论区
.right {
	flex: 0 0 15%;
	width: 15%;
	height: 100%;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	flex-direction: column;
	border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.author {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 16px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.authorAvatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
}

.authorInfo {
	flex: 1;
}

.authorName {
	font-size: 14px;
	font-weight: 600;
	color: #fff;
}

.authorTime {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.5);
}

.textContent {
	padding: 12px 16px;
	font-size: 14px;
	color: rgba(255, 255, 255, 0.8);
	line-height: 1.5;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.comments {
	flex: 1;
	overflow-y: auto;
	padding: 12px;
}

.commentsLoading,
.commentsEmpty {
	text-align: center;
	color: rgba(255, 255, 255, 0.4);
	font-size: 13px;
	padding: 20px;
}

.commentsList {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.comment {
	display: flex;
	gap: 8px;
}

.commentAvatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	flex-shrink: 0;
}

.commentBody {
	flex: 1;
}

.commentName {
	font-size: 12px;
	font-weight: 600;
	color: rgba(255, 255, 255, 0.8);
	margin-right: 6px;
}

.commentText {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.7);
}

.commentInput {
	display: flex;
	gap: 8px;
	padding: 12px;
	border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.input {
	flex: 1;
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 20px;
	padding: 8px 16px;
	color: #fff;
	font-size: 13px;
	outline: none;

	&::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}
}

.sendBtn {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: var(--MI_THEME-accent);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
	cursor: pointer;
	transition: opacity 0.2s;

	&:disabled {
		opacity: 0.3;
		cursor: default;
	}
}

// 动画
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
