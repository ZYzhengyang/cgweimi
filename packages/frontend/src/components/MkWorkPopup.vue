<!--
  CG微米 - 帖子/作品详情弹窗（统一）
  主页帖子 + 作品栏共用：大弹窗，左图右信息，右侧 420px 固定面板
-->
<template>
<teleport to="body">
<Transition name="popup-fade">
<div v-if="visible" :class="$style.overlay" @click.self="close">
	<div :class="$style.popup" @keydown.esc="close" tabindex="0" ref="popupEl">
		<!-- 关闭按钮 -->
		<button class="_button" :class="$style.closeBtn" @click="close">
			<i class="ti ti-x"></i>
		</button>

		<!-- 左侧：媒体展示 -->
		<div :class="$style.left">
			<!-- 多图导航 -->
			<button v-if="allMedia.length > 1" :class="[$style.navBtn, $style.navBtnLeft]" class="_button" :disabled="currentImage <= 0" @click.stop="prevImage">
				<i class="ti ti-chevron-left"></i>
			</button>
			<button v-if="allMedia.length > 1" :class="[$style.navBtn, $style.navBtnRight]" class="_button" :disabled="currentImage >= allMedia.length - 1" @click.stop="nextImage">
				<i class="ti ti-chevron-right"></i>
			</button>

			<Transition name="img-fade" mode="out-in">
				<video
					v-if="currentMedia?.type.startsWith('video/')"
					:key="currentMedia.url"
					:src="currentMedia.url"
					:poster="currentMedia.thumbnailUrl || undefined"
					controls
					autoplay
					muted
					loop
					:class="$style.media"
				/>
				<img
					v-else-if="currentMedia?.type.startsWith('image/')"
					:key="currentMedia.url"
					:src="currentMedia.url"
					:class="$style.media"
				/>
			</Transition>

			<!-- 多图指示器 -->
			<div v-if="allMedia.length > 1" :class="$style.dots">
				<span
					v-for="(_, i) in allMedia"
					:key="i"
					:class="[$style.dot, { [$style.dotActive]: i === currentImage }]"
					@click="currentImage = i"
				></span>
			</div>
		</div>

		<!-- 右侧：信息+评论 -->
		<div :class="$style.right">
			<!-- 顶部：头像+昵称 -->
			<div :class="$style.header">
				<MkAvatar :user="appearNote.user" :class="$style.avatar"/>
				<div :class="$style.headerInfo">
					<MkUserName :user="appearNote.user" :nowrap="true"/>
					<div :class="$style.headerMeta">
						<span :class="$style.handle"><MkAcct :user="appearNote.user"/></span>
						<span :class="$style.headerDot">·</span>
						<span :class="$style.headerTime"><MkTime :time="appearNote.createdAt" mode="detail"/></span>
					</div>
				</div>
			</div>

			<!-- 可滚动内容区 -->
			<div :class="$style.scrollArea">
				<!-- 正文 -->
				<div v-if="appearNote.text" :class="$style.text">
					<Mfm
						:text="appearNote.text"
						:author="appearNote.user"
						:emojiUrls="appearNote.emojis"
						:enableEmojiMenu="true"
						class="_selectable"
					/>
				</div>

				<!-- 标签 -->
				<div v-if="hashtags.length > 0" :class="$style.hashtags">
					<span v-for="tag in hashtags" :key="tag" :class="$style.hashtag">#{{ tag }}</span>
				</div>

				<!-- 元数据 -->
				<div :class="$style.metaLine">
					<span :class="$style.metaTime"><MkTime :time="appearNote.createdAt" mode="detail"/></span>
					<span v-if="appearNote.views > 0" :class="$style.metaViews">{{ formatCount(appearNote.views) }} 浏览</span>
				</div>

				<!-- 反应 -->
				<MkReactionsViewer
					v-if="appearNote.reactionAcceptance !== 'likeOnly' && Object.keys(appearNote.reactions || {}).length > 0"
					:reactions="appearNote.reactions"
					:reactionEmojis="appearNote.reactionEmojis"
					:myReaction="appearNote.myReaction"
					:noteId="appearNote.id"
				/>

				<!-- 互动统计 -->
				<div :class="$style.stats">
					<span v-if="appearNote.renoteCount > 0" :class="$style.stat">
						<strong :class="$style.statCount">{{ appearNote.renoteCount }}</strong> 转发
					</span>
					<span v-if="appearNote.repliesCount > 0" :class="$style.stat">
						<strong :class="$style.statCount">{{ appearNote.repliesCount }}</strong> 评论
					</span>
					<span v-if="appearNote.reactionCount > 0" :class="$style.stat">
						<strong :class="$style.statCount">{{ appearNote.reactionCount }}</strong> 点赞
					</span>
				</div>

				<!-- 操作栏 -->
				<div :class="$style.actions">
					<button class="_button" :class="$style.actionBtn" @click="doReply()">
						<i class="ti ti-message-circle"></i>
					</button>
					<button class="_button" :class="$style.actionBtn" @click="doRenote()">
						<i class="ti ti-repeat"></i>
					</button>
					<button class="_button" :class="[$style.actionBtn, { [$style.liked]: !!appearNote.myReaction }]" @click="toggleReact()">
						<i :class="[appearNote.myReaction ? 'ti ti-heart-filled' : 'ti ti-heart', { [$style.bounce]: isBouncing }]" @animationend="isBouncing = false"></i>
					</button>
					<button class="_button" :class="$style.actionBtn" @click="showMenu()">
						<i class="ti ti-share-3"></i>
					</button>
				</div>

				<!-- 分隔线 -->
				<div :class="$style.divider"></div>

				<!-- 评论区 -->
				<div :class="$style.comments">
					<div v-if="loadingComments" :class="$style.loadingComments">
						<MkLoading mini/>
					</div>
					<div v-else-if="sortedReplies.length === 0" :class="$style.noComments">
						暂无评论
					</div>
					<div v-else>
						<template v-for="r in sortedReplies" :key="r.id">
							<div :class="$style.comment">
								<MkAvatar :user="r.user" :class="$style.commentAvatar"/>
								<div :class="$style.commentBody">
									<MkUserName :user="r.user" :nowrap="true" :class="$style.commentName"/>
									<Mfm
										v-if="r.text"
										:text="r.text"
										:author="r.user"
										:emojiUrls="r.emojis"
										class="_selectable"
										:class="$style.commentText"
									/>
									<div :class="$style.commentMeta">
										<span :class="$style.commentTime"><MkTime :time="r.createdAt"/></span>
										<span v-if="totalReactions(r) > 0" :class="$style.commentReactions">
											<i class="ti ti-heart" style="font-size:11px"></i> {{ totalReactions(r) }}
										</span>
									</div>
								</div>
							</div>
						</template>
					</div>
				</div>
			</div>

			<!-- 底部评论输入框 -->
			<div :class="$style.bottomBar">
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
			</div>
		</div>
	</div>
</div>
</Transition>
</teleport>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue';
import * as Misskey from 'misskey-js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import MkLoading from '@/components/global/MkLoading.vue';
import MkTime from '@/components/global/MkTime.vue';
import MkUserName from '@/components/global/MkUserName.vue';
import { $i } from '@/i.js';

const props = defineProps<{
	note: Misskey.entities.Note;
}>();

const emit = defineEmits<{
	closed: [];
}>();

const popupEl = ref<HTMLElement>();
const replies = ref<Misskey.entities.Note[]>([]);
const loadingComments = ref(false);
const commentText = ref('');
const currentImage = ref(0);
const visible = ref(false);
const isBouncing = ref(false);

const appearNote = computed(() => props.note.renote && !props.note.text ? props.note.renote : props.note);

const allMedia = computed(() => appearNote.value.files?.filter(f => f.type.startsWith('video/') || f.type.startsWith('image/')) || []);
const currentMedia = computed(() => allMedia.value[currentImage.value]);

const hashtags = computed(() => {
	const text = appearNote.value.text || '';
	const matches = text.match(/(?:^|\s)#([^\s#]+)/g);
	if (!matches) return [];
	return [...new Set(matches.map(m => m.trim().replace(/^#/, '')))];
});

const sortedReplies = computed(() => {
	return [...replies.value].sort((a, b) => {
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});
});

function formatCount(count: number): string {
	if (!count || count <= 0) return '0';
	if (count >= 10000) return (count / 10000).toFixed(1) + 'w';
	if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
	return String(count);
}

function totalReactions(note: Misskey.entities.Note): number {
	if (!note.reactions) return 0;
	return Object.values(note.reactions).reduce((sum, v) => sum + v, 0);
}

function close() {
	visible.value = false;
	setTimeout(() => emit('closed'), 300);
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') close();
}

function prevImage() {
	if (currentImage.value > 0) currentImage.value--;
}

function nextImage() {
	if (currentImage.value < allMedia.value.length - 1) currentImage.value++;
}

function prefetchAdjacent(index: number) {
	const files = allMedia.value;
	for (const offset of [-1, 1]) {
		const target = index + offset;
		if (target >= 0 && target < files.length) {
			const img = new Image();
			img.src = files[target].url;
		}
	}
}

watch(currentImage, (val) => {
	prefetchAdjacent(val);
});

onMounted(async () => {
	document.addEventListener('keydown', onKeydown);
	document.body.style.overflow = 'hidden';
	await nextTick();
	visible.value = true;
	await nextTick();
	popupEl.value?.focus();

	loadingComments.value = true;
	try {
		const result = await misskeyApi('notes/replies', {
			noteId: appearNote.value.id,
			limit: 20,
		});
		replies.value = result;
	} catch (e) {
		console.error('Failed to load replies:', e);
	}
	loadingComments.value = false;
});

onUnmounted(() => {
	document.removeEventListener('keydown', onKeydown);
	document.body.style.overflow = '';
});

function doReply() {
	os.post({ reply: appearNote.value });
}

function toggleReact() {
	if (appearNote.value.myReaction) {
		misskeyApi('notes/reactions/delete', { noteId: appearNote.value.id });
	} else {
		os.pickEmoji(undefined as any, {}).then(emoji => {
			misskeyApi('notes/reactions/create', { noteId: appearNote.value.id, reaction: emoji });
		});
	}
	isBouncing.value = false;
	void nextTick(() => {
		isBouncing.value = true;
	});
}

function doRenote() {
	os.post({ renote: appearNote.value });
}

function showMenu() {
	const menu: any[] = [
		{
			text: '复制链接',
			icon: 'ti ti-link',
			action: () => {
				navigator.clipboard.writeText(`${window.location.origin}/notes/${appearNote.value.id}`);
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
	];

	if ($i && appearNote.value.userId === $i.id) {
		menu.push({ type: 'divider' });
		menu.push({
			text: '删除作品',
			icon: 'ti ti-trash',
			danger: true,
			action: async () => {
				const { canceled } = await os.confirm({
					type: 'warning',
					title: '确定删除这个作品吗？',
				});
				if (canceled) return;
				try {
					await misskeyApi('notes/delete', { noteId: appearNote.value.id });
					os.toast('已删除');
					close();
				} catch (e) {
					console.error('Failed to delete note:', e);
					os.toast('删除失败');
				}
			},
		});
	}

	os.popupMenu(menu);
}

async function submitComment() {
	if (!commentText.value.trim()) return;
	try {
		const res = await misskeyApi('notes/create', {
			text: commentText.value.trim(),
			replyId: appearNote.value.id,
		});
		replies.value.unshift(res.createdNote);
		commentText.value = '';
		os.toast('评论已发送');
	} catch (e) {
		console.error('Failed to post comment:', e);
		os.toast('评论发送失败');
	}
}
</script>

<style module lang="scss">
.overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: rgba(0, 0, 0, 0.7);
	z-index: 10000;
	display: flex;
	align-items: center;
	justify-content: center;
}

.popup {
	display: flex;
	width: 95vw;
	max-width: 1500px;
	height: 92vh;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	overflow: hidden;
	position: relative;
	outline: none;
	box-shadow: 0 8px 48px rgba(0, 0, 0, 0.3);
}

.closeBtn {
	position: absolute;
	top: 12px;
	right: 12px;
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
	z-index: 10;
	transition: background 0.2s;

	&:hover {
		background: rgba(0, 0, 0, 0.7);
	}
}

.left {
	flex: 1;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #000;
	min-width: 0;
}

.media {
	max-width: 100%;
	max-height: 100%;
	object-fit: contain;
}

.navBtn {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	z-index: 10;
	width: 40px;
	height: 64px;
	border-radius: 8px;
	background: rgba(0, 0, 0, 0.4);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	cursor: pointer;
	transition: all 0.2s;

	&:hover {
		background: rgba(0, 0, 0, 0.7);
	}

	&:disabled {
		opacity: 0.3;
		cursor: default;
	}
}

.navBtnLeft {
	left: 8px;
}

.navBtnRight {
	right: 8px;
}

.dots {
	position: absolute;
	bottom: 12px;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	gap: 6px;
}

.dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.4);
	cursor: pointer;
	transition: background 0.2s;
}

.dotActive {
	background: #fff;
}

.right {
	width: 420px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border-left: 1px solid var(--MI_THEME-divider);
}

.header {
	display: flex;
	align-items: center;
	padding: 16px;
	gap: 10px;
	flex-shrink: 0;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.avatar {
	width: 40px;
	height: 40px;
	border-radius: 50%;
}

.headerInfo {
	flex: 1;
	min-width: 0;
}

.headerMeta {
	display: flex;
	align-items: center;
	gap: 4px;
	margin-top: 2px;
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.headerDot {
	opacity: 0.5;
}

.scrollArea {
	flex: 1;
	overflow-y: auto;
	padding: 16px;
}

.text {
	font-size: 15px;
	line-height: 1.6;
	margin-bottom: 12px;
}

.hashtags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-bottom: 12px;
}

.hashtag {
	font-size: 13px;
	color: var(--MI_THEME-link);
	cursor: pointer;

	&:hover {
		text-decoration: underline;
	}
}

.metaLine {
	display: flex;
	align-items: center;
	gap: 12px;
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-bottom: 12px;
}

.stats {
	display: flex;
	gap: 16px;
	margin: 12px 0;
	font-size: 13px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.statCount {
	color: var(--MI_THEME-fg);
	font-weight: 600;
	margin-right: 4px;
}

.actions {
	display: flex;
	gap: 8px;
	padding: 8px 0;
}

.actionBtn {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 18px;
	color: var(--MI_THEME-fgTransparentWeak);
	transition: all 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
		color: var(--MI_THEME-fg);
	}
}

.liked {
	color: var(--MI_THEME-love);
}

.bounce {
	animation: bounce 0.3s ease;
}

@keyframes bounce {
	0%, 100% { transform: scale(1); }
	50% { transform: scale(1.3); }
}

.divider {
	height: 1px;
	background: var(--MI_THEME-divider);
	margin: 8px 0;
}

.comments {
	flex: 1;
}

.loadingComments {
	display: flex;
	justify-content: center;
	padding: 16px;
}

.noComments {
	text-align: center;
	padding: 16px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 13px;
}

.comment {
	display: flex;
	gap: 8px;
	padding: 8px 0;
}

.commentAvatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	flex-shrink: 0;
}

.commentBody {
	flex: 1;
	min-width: 0;
}

.commentName {
	font-size: 12px;
	font-weight: 600;
}

.commentText {
	font-size: 13px;
	margin-top: 2px;
}

.commentMeta {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 4px;
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.commentReactions {
	display: flex;
	align-items: center;
	gap: 2px;
}

.bottomBar {
	flex-shrink: 0;
	border-top: 1px solid var(--MI_THEME-divider);
	padding: 12px 16px;
}

.commentInput {
	display: flex;
	gap: 8px;
}

.commentInputWrap {
	flex: 1;
	display: flex;
	align-items: center;
	background: var(--MI_THEME-inputBg);
	border-radius: 20px;
	padding: 4px 4px 4px 12px;
}

.commentTextarea {
	flex: 1;
	border: none;
	background: transparent;
	resize: none;
	font-size: 13px;
	padding: 6px 0;
	outline: none;
	color: var(--MI_THEME-fg);
	min-height: 20px;
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
	transition: all 0.2s;

	&:disabled {
		opacity: 0.3;
	}

	&:hover:not(:disabled) {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

@media (max-width: 768px) {
	.overlay {
		background: rgba(0, 0, 0, 0.9);
	}

	.popup {
		width: 100vw;
		height: 100vh;
		border-radius: 0;
		flex-direction: column;
	}

	.left {
		flex: none;
		height: 50vh;
	}

	.right {
		width: 100%;
		flex: 1;
		border-left: none;
		border-top: 1px solid var(--MI_THEME-divider);
	}

	.closeBtn {
		top: 8px;
		right: 8px;
		background: rgba(0, 0, 0, 0.6);
	}
}
</style>

<style>
/* 弹窗淡入淡出 */
.popup-fade-enter-active {
	transition: opacity 0.25s ease;
}
.popup-fade-leave-active {
	transition: opacity 0.2s ease;
}
.popup-fade-enter-from,
.popup-fade-leave-to {
	opacity: 0;
}

/* 图片切换淡入淡出 */
.img-fade-enter-active {
	transition: opacity 0.2s ease;
}
.img-fade-leave-active {
	transition: opacity 0.15s ease;
}
.img-fade-enter-from,
.img-fade-leave-to {
	opacity: 0;
}
</style>
