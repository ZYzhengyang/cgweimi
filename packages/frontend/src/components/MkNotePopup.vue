<!--
  CG微米 - 弹窗帖子浏览
  点击帖子后弹窗展示：左侧作品，右侧详情+评论
-->
<template>
<MkModal ref="modal" :preferType="'dialog'" @close="emit('closed')" @click="emit('closed')">
	<template #default="{ maxHeight }">
		<div :class="$style.root" :style="{ maxHeight: maxHeight + 'px' }">
			<!-- 关闭按钮 -->
			<button :class="$style.closeBtn" class="_button" @click="emit('closed')">
				<i class="ti ti-x"></i>
			</button>

			<!-- 左侧：作品展示 -->
			<div :class="$style.left">
				<!-- 视频 -->
				<div v-if="hasVideo" :class="$style.mediaArea">
					<MkMediaVideo :video="videoFile" :isSensitive="videoFile.isSensitive"/>
				</div>
				<!-- 图片画廊 -->
				<div v-else-if="imageFiles.length > 0" :class="$style.mediaArea">
					<MkMediaList ref="galleryEl" :mediaList="appearNote.files"/>
				</div>
				<!-- 无媒体 -->
				<div v-else :class="$style.noMedia">
					<i class="ti ti-photo-off" style="font-size: 48px; opacity: 0.3;"></i>
				</div>
			</div>

			<!-- 右侧：详情+评论 -->
			<div :class="$style.right">
				<!-- 作者信息 -->
				<div :class="$style.author">
					<MkAvatar :user="appearNote.user" :class="$style.avatar" link preview/>
					<div :class="$style.authorInfo">
						<MkUserName :user="appearNote.user" :nowrap="true"/>
						<div :class="$style.authorAcct"><MkAcct :user="appearNote.user"/></div>
					</div>
				</div>

				<!-- 描述文字 -->
				<div v-if="appearNote.text" :class="$style.text">
					<Mfm
						:text="appearNote.text"
						:author="appearNote.user"
						:emojiUrls="appearNote.emojis"
						:enableEmojiMenu="true"
						class="_selectable"
					/>
				</div>

				<!-- 反应 -->
				<MkReactionsViewer
					v-if="appearNote.reactionAcceptance !== 'likeOnly' && Object.keys(appearNote.reactions || {}).length > 0"
					:reactions="appearNote.reactions"
					:reactionEmojis="appearNote.reactionEmojis"
					:myReaction="appearNote.myReaction"
					:noteId="appearNote.id"
				/>

				<!-- 操作按钮 -->
				<div :class="$style.actions">
					<button class="_button" :class="$style.actionBtn" @click="reply()">
						<i class="ti ti-arrow-back-up"></i>
						<span v-if="appearNote.repliesCount > 0">{{ appearNote.repliesCount }}</span>
					</button>
					<button class="_button" :class="$style.actionBtn" @click="toggleReact()">
						<i :class="appearNote.myReaction ? 'ti ti-heart-filled' : 'ti ti-heart'" :style="appearNote.myReaction ? 'color: var(--MI_THEME-love)' : ''"></i>
						<span v-if="appearNote.reactionCount > 0">{{ appearNote.reactionCount }}</span>
					</button>
					<button class="_button" :class="$style.actionBtn" @click="renote()">
						<i class="ti ti-repeat"></i>
						<span v-if="appearNote.renoteCount > 0">{{ appearNote.renoteCount }}</span>
					</button>
					<button class="_button" :class="$style.actionBtn" @click="showMenu()">
						<i class="ti ti-dots"></i>
					</button>
				</div>

				<!-- 时间 -->
				<div :class="$style.time">
					<MkTime :time="appearNote.createdAt" mode="detail"/>
				</div>

				<!-- 分隔线 -->
				<div :class="$style.divider"></div>

				<!-- 评论输入框 -->
				<div :class="$style.commentInput">
					<div :class="$style.commentInputWrap">
						<textarea
							v-model="commentText"
							:class="$style.commentTextarea"
							placeholder="写评论..."
							rows="1"
							@keydown.enter.exact.prevent="submitComment"
						></textarea>
						<button
							class="_button"
							:class="$style.commentSubmitBtn"
							:disabled="!commentText.trim()"
							@click="submitComment"
						>
							<i class="ti ti-send"></i>
						</button>
					</div>
				</div>

				<!-- 评论区 -->
				<div :class="$style.comments">
					<div v-if="loadingComments" :class="$style.loadingComments">
						<MkLoading mini/>
					</div>
					<div v-else-if="replies.length === 0" :class="$style.noComments">
						暂无评论
					</div>
					<div v-else>
						<div v-for="reply in replies" :key="reply.id" :class="$style.comment">
							<MkAvatar :user="reply.user" :class="$style.commentAvatar" link preview/>
							<div :class="$style.commentBody">
								<MkUserName :user="reply.user" :nowrap="true" :class="$style.commentName"/>
								<Mfm
									v-if="reply.text"
									:text="reply.text"
									:author="reply.user"
									:emojiUrls="reply.emojis"
									class="_selectable"
									:class="$style.commentText"
								/>
								<MkMediaList v-if="reply.files && reply.files.length > 0" :mediaList="reply.files" :class="$style.commentMedia"/>
								<div :class="$style.commentTime"><MkTime :time="reply.createdAt"/></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</template>
</MkModal>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import * as Misskey from 'misskey-js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import MkModal from '@/components/MkModal.vue';
import MkMediaList from '@/components/MkMediaList.vue';
import MkMediaVideo from '@/components/MkMediaVideo.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import MkTime from '@/components/global/MkTime.vue';
import MkUserName from '@/components/global/MkUserName.vue';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	note: Misskey.entities.Note;
}>();

const emit = defineEmits<{
	closed: [];
}>();

const modal = ref();
const galleryEl = ref();
const replies = ref<Misskey.entities.Note[]>([]);
const repliesLoaded = ref(false);
const loadingComments = ref(false);
const commentText = ref('');

const appearNote = computed(() => props.note.renote && !props.note.text ? props.note.renote : props.note);

const hasVideo = computed(() => appearNote.value.files?.some(f => f.type.startsWith('video/')));
const videoFile = computed(() => appearNote.value.files?.find(f => f.type.startsWith('video/')));
const imageFiles = computed(() => appearNote.value.files?.filter(f => f.type.startsWith('image/')) || []);

// 自动加载评论
onMounted(async () => {
	loadingComments.value = true;
	try {
		const result = await misskeyApi('notes/replies', {
			noteId: appearNote.value.id,
			limit: 20,
		});
		replies.value = result;
		repliesLoaded.value = true;
	} catch (e) {
		console.error('Failed to load replies:', e);
	}
	loadingComments.value = false;
});

async function loadReplies() {
	if (repliesLoaded.value) return;
	loadingComments.value = true;
	const result = await misskeyApi('notes/replies', {
		noteId: appearNote.value.id,
		limit: 20,
	});
	replies.value = result;
	repliesLoaded.value = true;
	loadingComments.value = false;
}

function reply() {
	os.post({
		reply: appearNote.value,
	});
}

function toggleReact() {
	if (appearNote.value.myReaction) {
		misskeyApi('notes/reactions/delete', { noteId: appearNote.value.id });
	} else {
		os.pickEmoji(undefined as any, {}).then(emoji => {
			misskeyApi('notes/reactions/create', {
				noteId: appearNote.value.id,
				reaction: emoji,
			});
		});
	}
}

function renote() {
	os.post({
		renote: appearNote.value,
	});
}

function showMenu() {
	os.popupMenu([
		{
			text: '复制链接',
			icon: 'ti ti-link',
			action: () => {
				navigator.clipboard.writeText(`https://www.cgvmi.com/notes/${appearNote.value.id}`);
				os.toast('已复制');
			},
		},
		{
			text: '在新页面打开',
			icon: 'ti ti-external-link',
			action: () => {
				window.open(`/notes/${appearNote.value.id}`, '_blank');
			},
		},
	]);
}

async function submitComment() {
	if (!commentText.value.trim()) return;
	try {
		const reply = await misskeyApi('notes/create', {
			text: commentText.value.trim(),
			replyId: appearNote.value.id,
		});
		// 把新评论加到列表里
		replies.value.unshift(reply.createdNote);
		commentText.value = '';
		os.toast('评论已发送');
	} catch (e) {
		console.error('Failed to post comment:', e);
		os.toast('评论发送失败');
	}
}
</script>

<style module lang="scss">
.root {
	display: flex;
	width: 90vw;
	max-width: 1200px;
	height: 80vh;
	background: var(--MI_THEME-panel);
	border-radius: 16px;
	overflow: hidden;
	position: relative;
}

.closeBtn {
	position: absolute;
	top: 12px;
	right: 12px;
	z-index: 10;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.5);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 18px;
	cursor: pointer;
	transition: background 0.2s;

	&:hover {
		background: rgba(0, 0, 0, 0.7);
	}
}

.left {
	flex: 1.2;
	min-width: 0;
	background: #000;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.mediaArea {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.noMedia {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
}

.right {
	flex: 0.8;
	min-width: 320px;
	max-width: 400px;
	display: flex;
	flex-direction: column;
	overflow-y: auto;
	border-left: 1px solid var(--MI_THEME-divider);
}

.author {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 16px;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.avatar {
	width: 40px;
	height: 40px;
	border-radius: 50%;
}

.authorInfo {
	flex: 1;
	min-width: 0;
}

.authorAcct {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.text {
	padding: 16px;
	font-size: 14px;
	line-height: 1.6;
}

.actions {
	display: flex;
	gap: 8px;
	padding: 8px 16px;
	border-top: 1px solid var(--MI_THEME-divider);
}

.actionBtn {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 8px 12px;
	border-radius: 8px;
	font-size: 14px;
	color: var(--MI_THEME-fgTransparentWeak);
	transition: background 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.time {
	padding: 0 16px 8px;
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.divider {
	height: 1px;
	background: var(--MI_THEME-divider);
	margin: 0 16px;
}

.commentInput {
	display: flex;
	align-items: flex-end;
	gap: 8px;
	padding: 12px 16px;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.commentInputWrap {
	flex: 1;
	display: flex;
	align-items: flex-end;
	gap: 6px;
	background: var(--MI_THEME-bg);
	border-radius: 18px;
	padding: 6px 6px 6px 14px;
}

.commentTextarea {
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

.commentSubmitBtn {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-accent);
	font-size: 16px;
	flex-shrink: 0;
	transition: background 0.2s;

	&:hover:not(:disabled) {
		background: var(--MI_THEME-buttonHoverBg);
	}

	&:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
}

.comments {
	flex: 1;
	overflow-y: auto;
	padding: 12px 16px;
}

.loadComments, .noComments, .loadingComments {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 13px;
}

.comment {
	display: flex;
	gap: 10px;
	margin-bottom: 16px;
}

.commentAvatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	flex-shrink: 0;
}

.commentBody {
	flex: 1;
	min-width: 0;
}

.commentName {
	font-size: 13px;
	font-weight: 600;
}

.commentText {
	font-size: 13px;
	margin-top: 4px;
	line-height: 1.5;
}

.commentMedia {
	margin-top: 6px;
}

.commentTime {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-top: 4px;
}

/* 响应式：移动端全屏 */
@media (max-width: 768px) {
	.root {
		flex-direction: column;
		width: 100vw;
		height: 100vh;
		max-width: 100%;
		border-radius: 0;
	}

	.left {
		flex: 1;
	}

	.right {
		flex: 1;
		max-width: 100%;
		border-left: none;
		border-top: 1px solid var(--MI_THEME-divider);
	}
}
</style>
