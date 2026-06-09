<!--
  CG微米 - 帖子详情右侧面板
  点击帖子后从右侧滑入面板：X/Twitter风格
-->
<template>
<teleport to="body">
<Transition name="panel-slide">
<div v-if="visible" :class="$style.overlay" @click.self="close">
	<div :class="[$style.popup, 'note-panel']" @keydown.esc="close" @keydown.left="prevImage" @keydown.right="nextImage" tabindex="0" ref="popupEl">
		<!-- 右侧：详情+评论 -->
		<div :class="$style.right">
			<!-- 顶部：关闭按钮 + 头像40px + 昵称 + @handle + 时间 -->
			<div :class="$style.header">
				<button class="_button" :class="$style.closeBtn" @click="close">
					<i class="ti ti-x"></i>
				</button>
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
				<!-- 媒体展示（图片优先，大图铺满） -->
				<div v-if="allMedia.length > 0" :class="$style.mediaArea">
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
							:class="$style.video"
						/>
						<img
							v-else-if="currentMedia?.type.startsWith('image/')"
							:key="currentMedia.url"
							:src="currentMedia.url"
							:class="$style.galleryImg"
						/>
					</Transition>
					<div v-if="allMedia.length > 1" :class="$style.dots">
						<span
							v-for="(_, i) in allMedia"
							:key="i"
							:class="[$style.dot, { [$style.dotActive]: i === currentImage }]"
							@click="currentImage = i"
						></span>
					</div>
				</div>

				<!-- 正文 16px -->
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

				<!-- 元数据：时间 + 浏览数 -->
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

				<!-- 互动统计：转发 / 评论 / 点赞 -->
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

				<!-- 操作栏：回复/转发/点赞/分享 -->
				<div :class="$style.actions">
					<button v-if="isPopupActionVisible('reply')" class="_button" :class="$style.actionBtn" @click="doReply()">
						<i class="ti ti-message-circle"></i>
					</button>
					<button v-if="isPopupActionVisible('renote')" class="_button" :class="$style.actionBtn" @click="doRenote()">
						<i class="ti ti-repeat"></i>
					</button>
					<button v-if="isPopupActionVisible('react')" class="_button" :class="[$style.actionBtn, { [$style.liked]: !!appearNote.myReaction }]" @click="toggleReact()">
						<i :class="[appearNote.myReaction ? 'ti ti-heart-filled' : 'ti ti-heart', { [$style.bounce]: isBouncing }]" @animationend="isBouncing = false"></i>
					</button>
					<button class="_button" :class="$style.actionBtn" @click="showMenu()">
						<i class="ti ti-share-3"></i>
					</button>
				</div>

				<!-- 分隔线 -->
				<div :class="$style.divider"></div>

				<!-- 评论区（时间倒序） -->
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

			<!-- 底部评论输入框（sticky） -->
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
import { $i, iAmAdmin } from '@/i.js';
import { instance } from '@/instance.js';

// 帖子弹窗操作权限
function isPopupActionVisible(action: string): boolean {
	if (iAmAdmin) return true;
	const hidden = instance.clientOptions?.hiddenUIElements?.notePopup ?? [];
	return !hidden.includes(action);
}

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

// 统一媒体列表：视频+图片都能切换
const allMedia = computed(() => appearNote.value.files?.filter(f => f.type.startsWith('video/') || f.type.startsWith('image/')) || []);
const currentMedia = computed(() => allMedia.value[currentImage.value]);

// Extract hashtags from text
const hashtags = computed(() => {
	const text = appearNote.value.text || '';
	const matches = text.match(/(?:^|\s)#([^\s#]+)/g);
	if (!matches) return [];
	return [...new Set(matches.map(m => m.trim().replace(/^#/, '')))];
});

// Sort replies by time (newest first)
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

// Prefetch adjacent images
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
	// Trigger enter animation
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
	// Trigger bounce animation
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

	// 如果是自己的帖子，显示删除选项
	if ($i && appearNote.value.userId === $i.id) {
		menu.push({ type: 'divider' });
		menu.push({
			text: '删除帖子',
			icon: 'ti ti-trash',
			danger: true,
			action: async () => {
				const { canceled } = await os.confirm({
					type: 'warning',
					title: '确定删除这条帖子吗？',
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
	background: rgba(0, 0, 0, 0.5);
	z-index: 10000;
	display: flex;
}

.popup {
	display: flex;
	flex-direction: column;
	width: 420px;
	height: 100vh;
	overflow: hidden;
	position: fixed;
	right: 0;
	top: 0;
	outline: none;
	background: var(--MI_THEME-panel);
	box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
}

.closeBtn {
	width: 34px;
	height: 34px;
	border-radius: 50%;
	background: transparent;
	color: var(--MI_THEME-fg);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 18px;
	cursor: pointer;
	transition: background 0.2s;
	flex-shrink: 0;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

// 左右导航按钮
.navBtn {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	z-index: 10;
	width: 36px;
	height: 60px;
	border-radius: 8px;
	background: rgba(0, 0, 0, 0.4);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 18px;
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

.mediaArea {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #000;
	flex-shrink: 0;
	max-height: 50vh;
	overflow: hidden;
	margin: 0;
}

.video {
	width: 100%;
	max-height: 50vh;
	object-fit: contain;
	background: #000;
}

.galleryImg {
	width: 100%;
	max-height: 50vh;
	object-fit: contain;
}

/* 底部指示点 */
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
	transition: all 0.2s ease;

	&:hover {
		background: rgba(255, 255, 255, 0.7);
	}
}

.dotActive {
	background: #fff;
	width: 10px;
	height: 10px;
}

.right {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	flex-shrink: 0;
	position: relative;
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
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.handle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.headerDot {
	flex-shrink: 0;
}

.headerTime {
	flex-shrink: 0;
}

.scrollArea {
	flex: 1;
	overflow-y: auto;
	min-height: 0;
}

.text {
	padding: 16px;
	font-size: 16px;
	line-height: 1.6;
}

/* 标签 */
.hashtags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding: 0 16px 12px;
}

.hashtag {
	display: inline-block;
	padding: 3px 10px;
	border-radius: 12px;
	font-size: 12px;
	background: var(--MI_THEME-bg);
	color: var(--MI_THEME-fgTransparentWeak);
	cursor: pointer;
	transition: all 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
		color: var(--MI_THEME-accent);
	}
}

/* 元数据：时间 + 浏览数 */
.metaLine {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 16px;
	font-size: 13px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.metaTime {
	flex-shrink: 0;
}

.metaViews {
	flex-shrink: 0;
}

/* 互动统计：转发 / 评论 / 点赞 */
.stats {
	display: flex;
	gap: 16px;
	padding: 12px 16px;
	font-size: 13px;
	color: var(--MI_THEME-fgTransparentWeak);
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.stat {
	display: flex;
	align-items: center;
	gap: 4px;
}

.statCount {
	color: var(--MI_THEME-fg);
}

.divider {
	height: 1px;
	background: var(--MI_THEME-divider);
	margin: 0 16px;
}

.comments {
	flex: 1;
	overflow-y: auto;
	padding: 12px 16px;
	min-height: 0;
}

.loadingComments, .noComments {
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

.commentMeta {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 4px;
}

.commentTime {
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

/* 底部互动栏 */
.bottomBar {
	flex-shrink: 0;
	position: sticky;
	bottom: 0;
	border-top: 1px solid var(--MI_THEME-divider);
	background: color-mix(in srgb, var(--MI_THEME-panel) 80%, transparent);
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
}

.commentInput {
	display: flex;
	align-items: flex-end;
	gap: 8px;
	padding: 10px 16px 12px;
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

	&::placeholder {
		color: var(--MI_THEME-fgTransparent);
	}
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

.actions {
	display: flex;
	justify-content: space-around;
	padding: 8px 16px;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.actionBtn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	font-size: 18px;
	color: var(--MI_THEME-fgTransparentWeak);
	transition: background 0.2s, color 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.liked {
	color: var(--MI_THEME-love);
}

/* 点赞弹跳动画 */
@keyframes bounce {
	0% { transform: scale(1); }
	30% { transform: scale(1.3); }
	60% { transform: scale(0.95); }
	100% { transform: scale(1); }
}

.bounce {
	animation: bounce 0.4s ease;
}

@media (max-width: 768px) {
	.overlay {
		background: transparent;
	}

	.popup {
		width: 100vw;
		height: 100vh;
		border-radius: 0;
		box-shadow: none;
	}
}
</style>

<style>
/* 右侧面板：遮罩淡入淡出 + 面板滑入滑出 */
.panel-slide-enter-active {
	transition: opacity 0.3s ease;
}
.panel-slide-leave-active {
	transition: opacity 0.25s ease;
}
.panel-slide-enter-from {
	opacity: 0;
}
.panel-slide-leave-to {
	opacity: 0;
}
/* 面板滑入动画 */
.panel-slide-enter-active .note-panel {
	transition: transform 0.3s ease;
}
.panel-slide-leave-active .note-panel {
	transition: transform 0.25s ease;
}
.panel-slide-enter-from .note-panel {
	transform: translateX(100%);
}
.panel-slide-leave-to .note-panel {
	transform: translateX(100%);
}

/* 图片切换淡入淡出 */
.img-fade-enter-active {
	transition: opacity 0.2s ease;
}
.img-fade-leave-active {
	transition: opacity 0.15s ease;
}
.img-fade-enter-from {
	opacity: 0;
}
.img-fade-leave-to {
	opacity: 0;
}
</style>
