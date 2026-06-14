<!--
  CG微米 - 帖子/作品详情弹窗（统一）
  主页帖子 + 作品栏共用：大弹窗，左图右信息，右侧 420px 固定面板
-->
<template>
<teleport to="body">
<Transition name="popup-fade">
<div v-if="visible" :class="$style.overlay" :style="{ zIndex }" @click.self="close">
	<div :class="[$style.popup, { [$style.popupNoMedia]: !hasMedia }]" @keydown.esc="close" tabindex="0" ref="popupEl">
		<!-- 关闭按钮 -->
		<button class="_button" :class="$style.closeBtn" @click="close">
			<i class="ti ti-x"></i>
		</button>

		<!-- 左侧：媒体展示（纯文字帖子隐藏） -->
		<div v-if="hasMedia" :class="$style.left">
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
					playsinline
					:class="$style.media"
				/>
				<img
					v-else-if="currentMedia?.type.startsWith('image/')"
					:key="currentMedia.url"
					:src="currentMedia.url"
					:class="[$style.media, $style.mediaClickable]"
					@click="openPhotoSwipe"
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
			<!-- 转发者信息 -->
			<div v-if="props.renoteNote" :class="$style.renoteBy">
				<i class="ti ti-repeat" style="margin-right: 4px; font-size: 13px;"></i>
				<MkAvatar :user="props.renoteNote.user" :class="$style.renoteByAvatar"/>
				<MkUserName :user="props.renoteNote.user" :nowrap="true"/>
				<span :class="$style.renoteByText"> 转发了</span>
			</div>
			<!-- 顶部：头像+昵称 -->
			<div :class="$style.header">
				<MkAvatar :user="appearNote.user" :class="$style.avatar"/>
				<div :class="$style.headerInfo">
					<MkUserName :user="appearNote.user" :nowrap="true"/>
					<div :class="$style.headerMeta">
						<MkA :to="userPage(appearNote.user)" :class="$style.handle"><MkAcct :user="appearNote.user"/></MkA>
						<span :class="$style.headerDot">·</span>
						<span :class="$style.headerTime"><MkTime :time="appearNote.createdAt" mode="detail"/></span>
					</div>
				</div>
			</div>

			<!-- 可滚动内容区 -->
			<div ref="scrollAreaEl" :class="$style.scrollArea">
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
					v-if="appearNote.reactionAcceptance !== 'likeOnly' && Object.keys(noteData.reactions).length > 0"
					:reactions="noteData.reactions"
					:reactionEmojis="appearNote.reactionEmojis"
					:myReaction="noteData.myReaction"
					:noteId="appearNote.id"
				/>

				<!-- 互动统计 -->
				<div :class="$style.stats">
					<span v-if="noteData.renoteCount > 0" :class="$style.stat">
						<strong :class="$style.statCount">{{ noteData.renoteCount }}</strong> 转发
					</span>
					<span v-if="appearNote.repliesCount > 0" :class="$style.stat">
						<strong :class="$style.statCount">{{ appearNote.repliesCount }}</strong> 评论
					</span>
					<span v-if="noteData.reactionCount > 0" :class="$style.stat">
						<strong :class="$style.statCount">{{ noteData.reactionCount }}</strong> 点赞
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
					<button class="_button" :class="[$style.actionBtn, { [$style.liked]: !!noteData.myReaction }]" @click="toggleReact()">
						<i :class="[noteData.myReaction ? 'ti ti-heart-filled' : 'ti ti-heart', { [$style.bounce]: isBouncing }]" @animationend="isBouncing = false"></i>
					</button>
					<button class="_button" :class="$style.actionBtn" @click="showMenu()">
						<i class="ti ti-share-3"></i>
					</button>
				</div>

				<!-- 分隔线 -->
				<div :class="$style.divider"></div>

				<!-- 评论区 -->
				<div :class="$style.comments">
					<Transition name="comment-fade" mode="out-in">
						<div v-if="loadingComments" key="skeleton" :class="$style.skeletonComments">
							<div v-for="i in 3" :key="i" :class="$style.skeletonComment">
								<div :class="$style.skeletonAvatar"></div>
								<div :class="$style.skeletonBody">
									<div :class="[$style.skeletonLine, $style.skeletonLineShort]"></div>
									<div :class="[$style.skeletonLine, $style.skeletonLineLong]"></div>
								</div>
							</div>
						</div>
						<div v-else-if="sortedReplies.length === 0" key="empty" :class="$style.noComments">
							暂无评论
						</div>
						<div v-else key="list">
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
											<button class="_button" :class="$style.commentActionBtn" @click="replyToComment(r)" title="回复">
												<i class="ti ti-message-circle" style="font-size:12px"></i>
											</button>
											<button class="_button" :class="$style.commentActionBtn" @click="reactToComment(r)" title="点赞">
												<i class="ti ti-heart" style="font-size:12px"></i>
											</button>
										</div>
									</div>
								</div>
							</template>
						</div>
					</Transition>
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
							:class="$style.commentEmojiBtn"
							@click="insertEmoji"
						>
							<i class="ti ti-mood-happy"></i>
						</button>
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
import { ref, reactive, computed, onMounted, nextTick, onUnmounted, watch } from 'vue';
import * as Misskey from 'misskey-js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { noteEvents } from '@/composables/use-note-capture.js';
import { globalEvents } from '@/events.js';
import MkTime from '@/components/global/MkTime.vue';
import MkUserName from '@/components/global/MkUserName.vue';
import { focusParent } from '@/utility/focus.js';
import { $i } from '@/i.js';
import { userPage } from '@/filters/user.js';
import { lockBodyScroll, unlockBodyScroll } from '@/utility/body-scroll-lock.js';
import { emojiPicker } from '@/utility/emoji-picker.js';

const props = defineProps<{
	note: Misskey.entities.Note;
	startIndex?: number;
	renoteNote?: Misskey.entities.Note;
}>();

const emit = defineEmits<{
	closed: [];
}>();

const popupEl = ref<HTMLElement>();
const scrollAreaEl = ref<HTMLElement>();
const replies = ref<Misskey.entities.Note[]>([]);
const loadingComments = ref(false);
const commentText = ref('');
const currentImage = ref(props.startIndex ?? 0);
const visible = ref(false);
const isBouncing = ref(false);
const zIndex = os.claimZIndex('high');

const appearNote = computed(() => props.note.renote && !props.note.text ? props.note.renote : props.note);

// 响应式状态（appearNote 返回的可能是非 reactive 对象，直接赋值不触发更新）
const noteData = reactive({
	myReaction: appearNote.value.myReaction ?? null as string | null,
	reactions: { ...(appearNote.value.reactions ?? {}) } as Record<string, number>,
	reactionCount: appearNote.value.reactionCount ?? 0,
	renoteCount: appearNote.value.renoteCount ?? 0,
	isFavorited: appearNote.value.isFavorited ?? false,
});

watch(appearNote, (n) => {
	noteData.myReaction = n.myReaction ?? null;
	noteData.reactions = { ...(n.reactions ?? {}) };
	noteData.reactionCount = n.reactionCount ?? 0;
	noteData.renoteCount = n.renoteCount ?? 0;
	noteData.isFavorited = n.isFavorited ?? false;
});

const allMedia = computed(() => appearNote.value.files?.filter(f => f.type.startsWith('video/') || f.type.startsWith('image/')) || []);
const currentMedia = computed(() => allMedia.value[currentImage.value]);
const hasMedia = computed(() => allMedia.value.length > 0);

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
	// BUG-07 fix: 关闭弹窗时立即销毁 PhotoSwipe 实例，防止内存泄漏
	if (lightbox) {
		lightbox.destroy();
		lightbox = null;
	}
	setTimeout(() => emit('closed'), 300);
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') close();
	else if (e.key === 'ArrowLeft') prevImage();
	else if (e.key === 'ArrowRight') nextImage();
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

async function loadReplies() {
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
}

// --- PhotoSwipe 集成 ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lightbox: any = null;
let activeEl: HTMLElement | null = null;
const pswpZIndex = os.claimZIndex('middle');
window.document.documentElement.style.setProperty('--mk-pswp-root-z-index', pswpZIndex.toString());

const popstateHandler = (): void => {
	if (lightbox?.pswp && lightbox.pswp.isOpen === true) {
		lightbox.pswp.close();
	}
};

function buildPhotoSwipeDataSource() {
	return allMedia.value
		.filter(f => f.type.startsWith('image/'))
		.map(f => ({
			src: f.url,
			w: f.properties?.width ?? 0,
			h: f.properties?.height ?? 0,
			alt: f.comment ?? f.name,
			comment: f.comment ?? f.name,
		}));
}

async function openPhotoSwipe() {
	if (lightbox) {
		lightbox.destroy();
		lightbox = null;
	}

	const [
		{ default: PhotoSwipeLightbox },
		{ default: PhotoSwipe },
	] = await Promise.all([
		import('photoswipe/lightbox'),
		import('photoswipe'),
		import('photoswipe/style.css'),
	]);

	lightbox = new PhotoSwipeLightbox({
		dataSource: buildPhotoSwipeDataSource(),
		mainClass: 'pswp',
		loop: false,
		padding: window.innerWidth > 500
			? { top: 32, bottom: 90, left: 32, right: 32 }
			: { top: 0, bottom: 78, left: 0, right: 0 },
		imageClickAction: 'close',
		tapAction: 'close',
		bgOpacity: 1,
		showAnimationDuration: 100,
		hideAnimationDuration: 100,
		returnFocus: false,
		pswpModule: PhotoSwipe,
	});

	lightbox.on('uiRegister', () => {
		lightbox?.pswp?.ui?.registerElement({
			name: 'altText',
			className: 'pswp__alt-text-container',
			appendTo: 'wrapper',
			onInit: (el, pswp) => {
				const textBox = window.document.createElement('p');
				textBox.className = 'pswp__alt-text _acrylic';
				el.appendChild(textBox);
				pswp.on('change', () => {
					textBox.textContent = pswp.currSlide?.data.comment;
				});
			},
		});
	});

	lightbox.on('afterInit', () => {
		activeEl = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
		focusParent(activeEl, true, true);
		lightbox?.pswp?.element?.focus({ preventScroll: true });
		window.history.pushState(null, '', '#pswp');
	});

	lightbox.on('destroy', () => {
		focusParent(activeEl, true, false);
		activeEl = null;
		if (window.location.hash === '#pswp') {
			window.history.back();
		}
	});

	lightbox.init();

	// 用当前图片索引在 dataSource 中对应的位置打开
	const imageFiles = allMedia.value.filter(f => f.type.startsWith('image/'));
	const openIndex = imageFiles.findIndex(f => f.url === currentMedia.value?.url);
	lightbox.loadAndOpen(openIndex >= 0 ? openIndex : 0);
}

watch(currentImage, (val) => {
	prefetchAdjacent(val);
});

onMounted(async () => {
	document.addEventListener('keydown', onKeydown);
	lockBodyScroll();
	window.addEventListener('popstate', popstateHandler);
	await nextTick();
	visible.value = true;
	await nextTick();
	popupEl.value?.focus();

	await loadReplies();
	await nextTick();
	scrollAreaEl.value?.scrollTo({ top: 0 });
});

onUnmounted(() => {
	document.removeEventListener('keydown', onKeydown);
	unlockBodyScroll();
	window.removeEventListener('popstate', popstateHandler);
	lightbox?.destroy();
	lightbox = null;
	activeEl = null;
	globalEvents.off('notePosted', onNotePosted);
	globalEvents.off('noteDeleted', onNoteDeleted);
});

function doReply() {
	os.post({ reply: appearNote.value }).then(() => {
		// 发送评论后刷新评论区
		loadReplies();
	});
}

function toggleReact() {
	if (noteData.myReaction) {
		const oldReaction = noteData.myReaction;
		misskeyApi('notes/reactions/delete', { noteId: appearNote.value.id }).then(() => {
			if (oldReaction && noteData.reactions[oldReaction]) {
				noteData.reactions[oldReaction] = Math.max(0, noteData.reactions[oldReaction] - 1);
				if (noteData.reactions[oldReaction] === 0) delete noteData.reactions[oldReaction];
			}
			noteData.myReaction = null;
			noteData.reactionCount = Math.max(0, noteData.reactionCount - 1);
			noteEvents.emit(`unreacted:${appearNote.value.id}`, {
				userId: $i!.id,
				reaction: oldReaction,
			});
		});
	} else {
		os.pickEmoji(undefined as any, {}).then(emoji => {
			misskeyApi('notes/reactions/create', { noteId: appearNote.value.id, reaction: emoji }).then(() => {
				noteData.reactions[emoji] = (noteData.reactions[emoji] || 0) + 1;
				noteData.myReaction = emoji;
				noteData.reactionCount = noteData.reactionCount + 1;
				noteEvents.emit(`reacted:${appearNote.value.id}`, {
					userId: $i!.id,
					reaction: emoji,
				});
			});
		});
	}
	isBouncing.value = false;
	void nextTick(() => {
		isBouncing.value = true;
	});
}

function doRenote() {
	os.post({ renote: appearNote.value }).then(() => {
		noteEvents.emit(`renoted:${appearNote.value.id}`, {
			userId: $i!.id,
		});
	});
}

// 转发计数：API成功后 +1（notePosted 事件由 get-note-menu.ts 发出）
function onNotePosted(createdNote: Misskey.entities.Note) {
	if (createdNote.renoteId === appearNote.value.id) {
		noteData.renoteCount++;
	}
}

// 取消转发计数回滚：当转发的笔记被删除时 -1
function onNoteDeleted(deletedNoteId: string) {
	if (deletedNoteId === appearNote.value.id && $i && appearNote.value.userId === $i.id) {
		noteData.renoteCount = Math.max(0, noteData.renoteCount - 1);
	}
}

globalEvents.on('notePosted', onNotePosted);
globalEvents.on('noteDeleted', onNoteDeleted);

function showMenu() {
	const menu: any[] = [
		{
			text: '收藏',
			icon: 'ti ti-star',
			disabled: noteData.isFavorited,
			action: async () => {
				try {
					await misskeyApi('notes/favorites/create', { noteId: appearNote.value.id });
					noteData.isFavorited = true;
					os.toast('已收藏');
				} catch (e) {
					os.toast('收藏失败');
				}
			},
		},
		{
			text: '复制文本',
			icon: 'ti ti-copy',
			action: () => {
				const text = appearNote.value.text ?? '';
				if (!text) {
					os.toast('没有可复制的文本');
					return;
				}
				navigator.clipboard.writeText(text).then(() => {
					os.toast('已复制文本');
				}).catch(() => {
					os.toast('复制失败');
				});
			},
		},
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
					globalEvents.emit('noteDeleted', appearNote.value.id);
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

function insertEmoji(ev: MouseEvent) {
	const target = ev.currentTarget ?? ev.target;
	if (target == null) return;
	emojiPicker.show(target as HTMLElement, emoji => {
		commentText.value += emoji;
	});
}

function replyToComment(comment: Misskey.entities.Note) {
	commentText.value = `@${comment.user.username} `;
}

function reactToComment(comment: Misskey.entities.Note) {
	if (!$i) return;
	if (comment.myReaction) {
		misskeyApi('notes/reactions/delete', { noteId: comment.id });
	} else {
		os.pickEmoji(undefined as any, {}).then(emoji => {
			misskeyApi('notes/reactions/create', { noteId: comment.id, reaction: emoji });
		});
	}
}

async function submitComment() {
	if (!commentText.value.trim() || !$i) return;
	const text = commentText.value.trim();
	commentText.value = '';

	// 乐观更新：立即显示新评论
	const tempId = `_optimistic_${Date.now()}`;
	const optimisticNote = {
		id: tempId,
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
			onlineStatus: 'online',
		},
		reactions: {},
		emojis: {},
	} as Misskey.entities.Note;
	replies.value.unshift(optimisticNote);
	await nextTick();
	scrollAreaEl.value?.scrollTo({ top: 0, behavior: 'smooth' });

	try {
		const res = await misskeyApi('notes/create', {
			text,
			replyId: appearNote.value.id,
		});
		// 用服务端返回的真实评论替换乐观数据
		const idx = replies.value.findIndex(r => r.id === tempId);
		if (idx !== -1) replies.value.splice(idx, 1, res.createdNote);
	} catch (e) {
		// 失败回滚：移除乐观评论
		replies.value = replies.value.filter(r => r.id !== tempId);
		commentText.value = text;
		console.error('Failed to post comment:', e);
		os.toast('评论发送失败');
	}
}
</script>

<style module lang="scss">
:global(.pswp) {
	--pswp-root-z-index: var(--mk-pswp-root-z-index, 2000700) !important;
	--pswp-bg: var(--MI_THEME-modalBg) !important;
}

.overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: rgba(0, 0, 0, 0.7);
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

// 纯文字帖子：单栏居中，宽度收窄
.popupNoMedia {
	width: 560px;
	max-width: 95vw;

	.right {
		width: 100%;
		border-left: none;
	}
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

.mediaClickable {
	cursor: pointer;
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

.renoteBy {
	display: flex;
	align-items: center;
	padding: 10px 16px;
	gap: 6px;
	font-size: 13px;
	color: var(--MI_THEME-renote);
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.renoteByAvatar {
	width: 20px;
	height: 20px;
	border-radius: 50%;
}

.renoteByText {
	opacity: 0.7;
	font-size: 12px;
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

.handle {
	color: var(--MI_THEME-fgTransparentWeak);
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
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

	a {
		color: var(--MI_THEME-link);
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}
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

.skeletonComments {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.skeletonComment {
	display: flex;
	gap: 8px;
	padding: 8px 0;
}

.skeletonAvatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	flex-shrink: 0;
	background: var(--MI_THEME-divider);
}

.skeletonBody {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding-top: 2px;
}

.skeletonLine {
	height: 12px;
	border-radius: 6px;
	background: linear-gradient(
		90deg,
		var(--MI_THEME-divider) 0%,
		var(--MI_THEME-panel) 40%,
		var(--MI_THEME-divider) 80%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s ease-in-out infinite;
}

.skeletonLineShort {
	width: 35%;
}

.skeletonLineLong {
	width: 75%;
}

@keyframes shimmer {
	0% {
		background-position: -100% 0;
	}
	100% {
		background-position: 100% 0;
	}
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

	a {
		color: var(--MI_THEME-link);
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}
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

.commentActionBtn {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);
	transition: all 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
		color: var(--MI_THEME-fg);
	}
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

.commentEmojiBtn {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 16px;
	transition: all 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
		color: var(--MI_THEME-fg);
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

/* 评论骨架屏 ↔ 真实评论切换 */
.comment-fade-enter-active {
	transition: opacity 0.25s ease;
}
.comment-fade-leave-active {
	transition: opacity 0.15s ease;
}
.comment-fade-enter-from,
.comment-fade-leave-to {
	opacity: 0;
}
</style>

<style lang="scss">
.pswp__bg {
	background: var(--MI_THEME-modalBg);
	backdrop-filter: var(--MI-modalBgFilter);
}

.pswp__alt-text-container {
	display: flex;
	flex-direction: row;
	align-items: center;

	position: absolute;
	bottom: 20px;
	left: 50%;
	transform: translateX(-50%);

	width: 75%;
	max-width: 800px;
}

.pswp__alt-text {
	color: var(--MI_THEME-fg);
	margin: 0 auto;
	text-align: center;
	padding: var(--MI-margin);
	border-radius: var(--MI-radius);
	max-height: 8em;
	overflow-y: auto;
	text-shadow: var(--MI_THEME-bg) 0 0 10px, var(--MI_THEME-bg) 0 0 3px, var(--MI_THEME-bg) 0 0 3px;
	white-space: pre-line;
}
</style>
