<!--
  CG微米 - 弹窗帖子浏览
  点击帖子后弹窗展示：左侧作品，右侧详情+评论
-->
<template>
<teleport to="body">
<Transition name="popup-fade">
<div v-if="visible" :class="$style.overlay" @click.self="close">
	<div :class="$style.popup" @keydown.esc="close" @keydown.left="prevImage" @keydown.right="nextImage" tabindex="0" ref="popupEl">
		<!-- 关闭按钮 -->
		<button :class="$style.closeBtn" class="_button" @click="close">
			<i class="ti ti-x"></i>
		</button>

		<!-- 左侧：作品展示 -->
		<div :class="$style.left"
			@touchstart="onTouchStart"
			@touchmove="onTouchMove"
			@touchend="onTouchEnd"
			@click.self="close"
		>
			<!-- 左侧导航按钮 -->
			<button v-if="allMedia.length > 1" :class="[$style.navBtn, $style.navBtnLeft]" class="_button" :disabled="currentImage <= 0" @click.stop="prevImage">
				<i class="ti ti-chevron-left"></i>
			</button>

			<!-- 右侧导航按钮 -->
			<button v-if="allMedia.length > 1" :class="[$style.navBtn, $style.navBtnRight]" class="_button" :disabled="currentImage >= allMedia.length - 1" @click.stop="nextImage">
				<i class="ti ti-chevron-right"></i>
			</button>

			<!-- 媒体内容 -->
			<div :class="$style.mediaArea">
				<Transition name="img-fade" mode="out-in">
					<!-- 视频 -->
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
					<!-- 图片 -->
					<img
						v-else-if="currentMedia?.type.startsWith('image/')"
						:key="currentMedia.url"
						:src="currentMedia.url"
						:class="$style.galleryImg"
					/>
				</Transition>
			</div>

			<!-- 底部指示点 -->
			<div v-if="allMedia.length > 1" :class="$style.dots">
				<span
					v-for="(_, i) in allMedia"
					:key="i"
					:class="[$style.dot, { [$style.dotActive]: i === currentImage }]"
					@click="currentImage = i"
				></span>
			</div>
		</div>

		<!-- 右侧：详情+评论 -->
		<div :class="$style.right">
			<!-- 作者信息 -->
			<div :class="$style.author">
				<MkAvatar :user="appearNote.user" :class="$style.avatar"/>
				<div :class="$style.authorInfo">
					<MkUserName :user="appearNote.user" :nowrap="true"/>
					<div :class="$style.authorAcct"><MkAcct :user="appearNote.user"/></div>
				</div>
			</div>

			<!-- 可滚动内容区 -->
			<div :class="$style.scrollArea">
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

				<!-- 标签 -->
				<div v-if="hashtags.length > 0" :class="$style.hashtags">
					<span v-for="tag in hashtags" :key="tag" :class="$style.hashtag">#{{ tag }}</span>
				</div>

				<!-- 反应 -->
				<MkReactionsViewer
					v-if="appearNote.reactionAcceptance !== 'likeOnly' && Object.keys(appearNote.reactions || {}).length > 0"
					:reactions="appearNote.reactions"
					:reactionEmojis="appearNote.reactionEmojis"
					:myReaction="appearNote.myReaction"
					:noteId="appearNote.id"
				/>

				<!-- 时间 -->
				<div :class="$style.time">
					<MkTime :time="appearNote.createdAt" mode="detail"/>
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

			<!-- 底部互动栏 -->
			<div :class="$style.bottomBar">
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
				<!-- 操作按钮 -->
				<div :class="$style.actions">
					<button v-if="isPopupActionVisible('reply')" class="_button" :class="$style.actionBtn" @click="doReply()">
						<i class="ti ti-message-circle"></i>
						<span :class="$style.actionCount">{{ appearNote.repliesCount || '' }}</span>
					</button>
					<button v-if="isPopupActionVisible('react')" class="_button" :class="[$style.actionBtn, { [$style.liked]: !!appearNote.myReaction }]" @click="toggleReact()">
						<i :class="[appearNote.myReaction ? 'ti ti-heart-filled' : 'ti ti-heart', { [$style.bounce]: isBouncing }]" @animationend="isBouncing = false"></i>
						<span :class="$style.actionCount">{{ appearNote.reactionCount || '' }}</span>
					</button>
					<button v-if="isPopupActionVisible('renote')" class="_button" :class="$style.actionBtn" @click="doRenote()">
						<i class="ti ti-repeat"></i>
						<span :class="$style.actionCount">{{ appearNote.renoteCount || '' }}</span>
					</button>
					<button v-if="isPopupActionVisible('bookmark')" class="_button" :class="[$style.actionBtn, { [$style.favorited]: isFavorited }]" @click="toggleFavorite()">
						<i :class="isFavorited ? 'ti ti-star-filled' : 'ti ti-star'"></i>
					</button>
					<button class="_button" :class="$style.actionBtn" @click="showMenu()">
						<i class="ti ti-dots"></i>
					</button>
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
const isFavorited = ref(false);
const isBouncing = ref(false);

// Touch swipe state
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

const appearNote = computed(() => props.note.renote && !props.note.text ? props.note.renote : props.note);

// 统一媒体列表：视频+图片都能切换
const allMedia = computed(() => appearNote.value.files?.filter(f => f.type.startsWith('video/') || f.type.startsWith('image/')) || []);
const currentMedia = computed(() => allMedia.value[currentImage.value]);
const hasVideo = computed(() => allMedia.value.some(f => f.type.startsWith('video/')));
const imageFiles = computed(() => allMedia.value.filter(f => f.type.startsWith('image/')) || []);

// Extract hashtags from text
const hashtags = computed(() => {
	const text = appearNote.value.text || '';
	const matches = text.match(/(?:^|\s)#([^\s#]+)/g);
	if (!matches) return [];
	return [...new Set(matches.map(m => m.trim().replace(/^#/, '')))];
});

// Sort replies by total reactions (desc), then by date
const sortedReplies = computed(() => {
	return [...replies.value].sort((a, b) => {
		const aCount = totalReactions(a);
		const bCount = totalReactions(b);
		if (bCount !== aCount) return bCount - aCount;
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

// Touch swipe handlers
function onTouchStart(e: TouchEvent) {
	touchStartX = e.touches[0].clientX;
	touchStartY = e.touches[0].clientY;
	touchStartTime = Date.now();
}

function onTouchMove(_e: TouchEvent) {
	// Intentionally empty — could add visual feedback later
}

function onTouchEnd(e: TouchEvent) {
	const dx = e.changedTouches[0].clientX - touchStartX;
	const dy = e.changedTouches[0].clientY - touchStartY;
	const dt = Date.now() - touchStartTime;
	// Only trigger swipe if horizontal distance > 50px, ratio > 1.5, and fast enough
	if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 500) {
		if (dx < 0) nextImage();
		else prevImage();
	}
}

onMounted(async () => {
	document.addEventListener('keydown', onKeydown);
	document.body.style.overflow = 'hidden';
	// Trigger enter animation
	await nextTick();
	visible.value = true;
	await nextTick();
	popupEl.value?.focus();

	// Prefetch first adjacent image
	if (imageFiles.value.length > 1) {
		prefetchAdjacent(0);
	}

	// Check if already favorited via notes/state API
	try {
		const state = await misskeyApi('notes/state', { noteId: appearNote.value.id });
		isFavorited.value = state.isFavorited;
	} catch (_e) {
		// ignore
	}

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

function toggleFavorite() {
	if (isFavorited.value) {
		misskeyApi('notes/favorites/delete', { noteId: appearNote.value.id }).then(() => {
			isFavorited.value = false;
			os.toast('已取消收藏');
		});
	} else {
		misskeyApi('notes/favorites/create', { noteId: appearNote.value.id }).then(() => {
			isFavorited.value = true;
			os.toast('已收藏');
		});
	}
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
	background: rgba(0, 0, 0, 0.9);
	z-index: 10000;
	display: flex;
}

.popup {
	display: flex;
	flex-direction: row;
	width: 100%;
	height: 100%;
	overflow: hidden;
	position: relative;
	outline: none;

	// 移动端恢复竖排
	@media (max-width: 768px) {
		flex-direction: column;
	}
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

// 左右导航按钮
.navBtn {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	z-index: 10;
	width: 50px;
	height: 80px;
	border-radius: 8px;
	background: rgba(0, 0, 0, 0.3);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24px;
	cursor: pointer;
	transition: all 0.2s;
	opacity: 0;

	&:hover {
		background: rgba(0, 0, 0, 0.6);
	}

	&:disabled {
		opacity: 0 !important;
		cursor: default;
	}
}

// 悬停时显示导航按钮
.left:hover .navBtn {
	opacity: 1;
}

.navBtnLeft {
	left: 20px;
}

.navBtnRight {
	right: 20px;
}

.left {
	flex: 1;
	min-width: 0;
	height: 100%;
	background: transparent;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	overflow: hidden;
	padding: 20px;

	@media (max-width: 768px) {
		flex: 0 0 auto;
		width: 100%;
		height: 50vh;
	}
}

.mediaArea {
	display: flex;
	align-items: center;
	justify-content: center;
}

.video {
	max-width: 100%;
	max-height: 100%;
	object-fit: contain;
	background: #000;
}

.gallery {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.galleryImg {
	max-width: 100%;
	max-height: 100%;
	object-fit: contain;
}

.galleryNav {
	position: absolute;
	bottom: 16px;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	gap: 12px;
	background: rgba(0, 0, 0, 0.6);
	border-radius: 20px;
	padding: 6px 16px;
}

.galleryBtn {
	color: #fff;
	font-size: 18px;
	padding: 4px;
	opacity: 0.8;
	&:hover { opacity: 1; }
	&:disabled { opacity: 0.3; cursor: default; }
}

.galleryCount {
	color: #fff;
	font-size: 13px;
}

/* 底部指示点 */
.dots {
	position: absolute;
	bottom: 60px;
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

.noMedia {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
}

.right {
	flex: 0 0 15%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background: rgba(0, 0, 0, 0.3);

	@media (max-width: 768px) {
		flex: 1;
		width: 100%;
	}
}

.author {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 16px;
	border-bottom: 1px solid var(--MI_THEME-divider);
	flex-shrink: 0;
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

.scrollArea {
	flex: 1;
	overflow-y: auto;
	min-height: 0;
}

.text {
	padding: 16px;
	font-size: 14px;
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
	padding: 10px 16px 0;
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

.actions {
	display: flex;
	gap: 4px;
	padding: 8px 16px 12px;
}

.actionBtn {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 8px 12px;
	border-radius: 8px;
	font-size: 16px;
	color: var(--MI_THEME-fgTransparentWeak);
	transition: background 0.2s, color 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.actionCount {
	font-size: 13px;
}

.liked {
	color: var(--MI_THEME-love);
}

.favorited {
	color: var(--MI_THEME-orange);
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
	.popup {
		width: 100vw;
		height: auto;
		max-height: 90vh;
		max-width: 100%;
		border-radius: 16px 16px 0 0;
		align-self: flex-end;
	}

	.overlay {
		align-items: flex-end;
	}

	.left {
		width: 100%;
		flex: 1;
	}

	.right {
		width: 100%;
		flex: 1;
		border-left: none;
		border-top: 1px solid var(--MI_THEME-divider);
	}

	.galleryNav {
		bottom: 12px;
	}

	.dots {
		bottom: 48px;
	}
}
</style>

<style>
/* 弹窗进入/退出动画 */
.popup-fade-enter-active {
	transition: opacity 0.3s ease, transform 0.3s ease;
}
.popup-fade-leave-active {
	transition: opacity 0.25s ease, transform 0.25s ease;
}
.popup-fade-enter-from {
	opacity: 0;
	transform: translateY(20px);
}
.popup-fade-leave-to {
	opacity: 0;
	transform: translateY(20px);
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
