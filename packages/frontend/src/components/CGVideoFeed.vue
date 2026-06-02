<!--
  CG微米 (CGVMI) - 刷视频组件
  Swiper 全屏沉浸式抖音风格播放器
  鼠标滚轮切换、左右箭头、嵌入式评论面板
-->

<template>
<div :class="$style.root">
	<!-- 左右切换按钮 -->
	<button class="_button" :class="[$style.navBtn, $style.navPrev]" @click="goPrev">
		<i class="ti ti-chevron-up"></i>
	</button>
	<button class="_button" :class="[$style.navBtn, $style.navNext]" @click="goNext">
		<i class="ti ti-chevron-down"></i>
	</button>

	<!-- Swiper 视频流 -->
	<Swiper
		direction="vertical"
		:slides-per-view="1"
		:space-between="0"
		:speed="300"
		:keyboard="{ enabled: true }"
		:mousewheel="{ sensitivity: 1 }"
		:modules="[Mousewheel]"
		@swiper="onSwiper"
		@slideChange="onSlideChange"
		@reachEnd="onReachEnd"
	>
		<SwiperSlide v-for="(note, index) in videoNotes" :key="note.id">
			<div :class="$style.slide">
				<div :class="$style.videoWrapper">
					<video
						:ref="(el: any) => setVideoRef(index, el)"
						:src="getVideoUrl(note)"
						:poster="getVideoThumb(note)"
						:class="$style.video"
						playsinline
						loop
						preload="metadata"
						@click="onVideoClick(index)"
						@dblclick.prevent="onDoubleTap(note, index)"
						@timeupdate="onTimeUpdate(index)"
						@loadedmetadata="onMetadataLoaded(index)"
					/>

					<!-- 播放/暂停动画 -->
					<div v-if="showPlayIcon[index]" :class="$style.playPauseIcon">
						<i :class="isPlaying[index] ? 'ti ti-player-pause-filled' : 'ti ti-player-play-filled'"></i>
					</div>

					<!-- 双击爱心 -->
					<div v-if="showHeart[index]" :class="$style.heartAnim">
						<i class="ti ti-heart-filled"></i>
					</div>

					<!-- 底部进度条 -->
					<div :class="$style.progressBar" @click.stop="seekTo(index, $event)">
						<div :class="$style.progressTrack">
							<div :class="$style.progressFill" :style="{ width: (progress[index] || 0) + '%' }"></div>
						</div>
					</div>

					<!-- 底部信息（叠加在视频内） -->
					<div :class="$style.videoOverlay">
						<div :class="$style.userInfo">
							<MkAvatar :user="note.user" :class="$style.avatar"/>
							<span :class="$style.username">@{{ note.user.username }}</span>
						</div>
						<div v-if="note.text" :class="$style.caption" @click.stop="openNote(note)">
							{{ truncateText(note.text, 80) }}
						</div>
					</div>

					<!-- 右侧操作按钮 -->
					<div :class="$style.actions">
						<button class="_button" :class="$style.actionButton" @click.stop="toggleLike(note)">
							<i :class="note.myReaction ? 'ti ti-heart-filled' : 'ti ti-heart'" :style="note.myReaction ? 'color: #ff2d55' : ''"></i>
							<span>{{ note.reactionCount || 0 }}</span>
						</button>
						<button class="_button" :class="[$style.actionButton, { [$style.actionActive]: showComments && currentIndex === index }]" @click.stop="toggleComments(note, index)">
							<i class="ti ti-message-circle"></i>
							<span>{{ note.repliesCount || 0 }}</span>
						</button>
						<button class="_button" :class="$style.actionButton" @click.stop="shareNote(note)">
							<i class="ti ti-share"></i>
						</button>
					</div>
				</div>
			</div>
		</SwiperSlide>
	</Swiper>

	<!-- 嵌入式评论面板（右侧） -->
	<div v-if="showComments && currentNote" :class="$style.commentPanel">
		<div :class="$style.commentHeader">
			<span :class="$style.commentTitle">{{ currentNote.repliesCount || 0 }} 条评论</span>
			<button class="_button" :class="$style.commentClose" @click="showComments = false">
				<i class="ti ti-x"></i>
			</button>
		</div>
		<div :class="$style.commentList" ref="commentListEl">
			<div v-if="loadingComments" :class="$style.commentLoading"><MkLoading mini/></div>
			<div v-else-if="comments.length === 0" :class="$style.commentEmpty">暂无评论</div>
			<div v-else v-for="r in comments" :key="r.id" :class="$style.commentItem">
				<MkAvatar :user="r.user" :class="$style.commentAvatar"/>
				<div :class="$style.commentBody">
					<span :class="$style.commentName">@{{ r.user?.username }}</span>
					<Mfm v-if="r.text" :text="r.text" :author="r.user" :emojiUrls="r.emojis" class="_selectable" :class="$style.commentText"/>
					<div :class="$style.commentTime"><MkTime :time="r.createdAt"/></div>
				</div>
			</div>
		</div>
		<div :class="$style.commentInput">
			<div :class="$style.commentInputWrap">
				<textarea v-model="commentText" :class="$style.commentTextarea" placeholder="写评论..." rows="1" @keydown.enter.exact.prevent="submitComment"></textarea>
				<button class="_button" :class="$style.commentSend" :disabled="!commentText.trim()" @click="submitComment">
					<i class="ti ti-send"></i>
				</button>
			</div>
		</div>
	</div>

	<div v-if="loading" :class="$style.loading"><MkLoading/></div>
</div>
</template>

<script lang="ts" setup>
import { ref, reactive, nextTick, onMounted, onUnmounted } from 'vue';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { Mousewheel } from 'swiper/modules';
import type SwiperClass from 'swiper';
import 'swiper/css';
import 'swiper/css/mousewheel';
import * as Misskey from 'misskey-js';
import MkAvatar from '@/components/global/MkAvatar.vue';
import MkTime from '@/components/global/MkTime.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import { misskeyApiGet, misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { toast } from '@/os.js';
import MkNotePopup from '@/components/MkNotePopup.vue';
import { popup } from '@/os.js';

const props = withDefaults(defineProps<{
	startNote?: Misskey.entities.Note | null;
	notes?: Misskey.entities.Note[];
}>(), {
	startNote: null,
	notes: () => [],
});

const videoNotes = ref<Misskey.entities.Note[]>([]);
const loading = ref(false);
const hasMore = ref(true);
const videoRefs = new Map<number, HTMLVideoElement>();
const isPlaying = reactive<Record<number, boolean>>({});
const showPlayIcon = reactive<Record<number, boolean>>({});
const showHeart = reactive<Record<number, boolean>>({});
const progress = reactive<Record<number, number>>({});
let swiperInstance: SwiperClass | null = null;
const currentIndex = ref(0);
let clickTimer: ReturnType<typeof setTimeout> | null = null;

// 评论面板状态
const showComments = ref(false);
const comments = ref<Misskey.entities.Note[]>([]);
const loadingComments = ref(false);
const commentText = ref('');
const commentListEl = ref<HTMLElement>();
const currentNote = ref<Misskey.entities.Note | null>(null);

function setVideoRef(index: number, el: any) {
	if (el) videoRefs.set(index, el as HTMLVideoElement);
}

function getVideoUrl(note: Misskey.entities.Note): string {
	return note.files?.find(f => f.type.startsWith('video/'))?.url || '';
}

function getVideoThumb(note: Misskey.entities.Note): string {
	return note.files?.find(f => f.type.startsWith('video/'))?.thumbnailUrl || '';
}

function truncateText(text: string, max: number): string {
	return text.length > max ? text.substring(0, max) + '...' : text;
}

// Swiper
function onSwiper(swiper: SwiperClass) {
	swiperInstance = swiper;
	setTimeout(() => playVideo(0), 300);
}

function onSlideChange() {
	if (!swiperInstance) return;
	const newIndex = swiperInstance.activeIndex;
	pauseVideo(currentIndex.value);
	playVideo(newIndex);
	currentIndex.value = newIndex;

	// 自动打开评论面板
	const note = videoNotes.value[newIndex];
	if (note) {
		currentNote.value = note;
		loadComments(note);
	}

	// 快到底了就加载更多
	if (newIndex >= videoNotes.value.length - 3) {
		const lastNote = videoNotes.value[videoNotes.value.length - 1];
		if (lastNote) fetchVideoNotes(lastNote.id);
	}
}

function onReachEnd() {
	const lastNote = videoNotes.value[videoNotes.value.length - 1];
	if (lastNote) fetchVideoNotes(lastNote.id);
}

function goPrev() {
	if (swiperInstance) swiperInstance.slidePrev();
}

function goNext() {
	if (swiperInstance) swiperInstance.slideNext();
}

function playVideo(index: number) {
	const video = videoRefs.get(index);
	if (video) {
		video.currentTime = 0;
		video.play().catch(() => {});
		isPlaying[index] = true;
	}
}

function pauseVideo(index: number) {
	const video = videoRefs.get(index);
	if (video) {
		video.pause();
		isPlaying[index] = false;
	}
}

function onVideoClick(index: number) {
	if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
	clickTimer = setTimeout(() => togglePlay(index), 250);
}

function togglePlay(index: number) {
	const video = videoRefs.get(index);
	if (!video) return;
	if (video.paused) {
		video.play().catch(() => {});
		isPlaying[index] = true;
	} else {
		video.pause();
		isPlaying[index] = false;
	}
	showPlayIcon[index] = true;
	setTimeout(() => { showPlayIcon[index] = false; }, 500);
}

function onDoubleTap(note: Misskey.entities.Note, index: number) {
	if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
	showHeart[index] = true;
	setTimeout(() => { showHeart[index] = false; }, 800);
	if (!note.myReaction) toggleLike(note);
}

function onTimeUpdate(index: number) {
	const video = videoRefs.get(index);
	if (!video?.duration) return;
	progress[index] = (video.currentTime / video.duration) * 100;
}

function onMetadataLoaded(index: number) {
	progress[index] = 0;
}

function seekTo(index: number, ev: MouseEvent) {
	const video = videoRefs.get(index);
	if (!video?.duration) return;
	const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
	video.currentTime = ((ev.clientX - rect.left) / rect.width) * video.duration;
}

function openNote(note: Misskey.entities.Note) {
	const { dispose } = popup(MkNotePopup, { note }, { closed: () => dispose() });
}

// 评论面板
async function loadComments(note: Misskey.entities.Note) {
	loadingComments.value = true;
	comments.value = [];
	try {
		comments.value = await misskeyApi('notes/replies', { noteId: note.id, limit: 50 });
	} catch (e) {
		console.error('Failed to load comments:', e);
	}
	loadingComments.value = false;
}

function toggleComments(note: Misskey.entities.Note, index: number) {
	if (showComments.value && currentIndex.value === index) {
		showComments.value = false;
	} else {
		showComments.value = true;
		currentNote.value = note;
		loadComments(note);
	}
}

async function submitComment() {
	if (!commentText.value.trim() || !currentNote.value) return;
	try {
		const res = await misskeyApi('notes/create', {
			text: commentText.value.trim(),
			replyId: currentNote.value.id,
		});
		comments.value.push(res.createdNote);
		commentText.value = '';
		currentNote.value.repliesCount = (currentNote.value.repliesCount || 0) + 1;
		toast('已发送');
		nextTick(() => {
			if (commentListEl.value) commentListEl.value.scrollTop = commentListEl.value.scrollHeight;
		});
	} catch (e) {
		toast('发送失败');
	}
}

function shareNote(note: Misskey.entities.Note) {
	navigator.clipboard.writeText(`https://www.cgvmi.com/notes/${note.id}`);
	toast('链接已复制');
}

async function toggleLike(note: Misskey.entities.Note) {
	if (!$i) return;
	try {
		if (note.myReaction) {
			await misskeyApi('notes/reactions/delete', { noteId: note.id });
			note.myReaction = null;
			note.reactionCount = (note.reactionCount || 1) - 1;
		} else {
			await misskeyApi('notes/reactions/create', { noteId: note.id, reaction: '❤️' });
			note.myReaction = '❤️';
			note.reactionCount = (note.reactionCount || 0) + 1;
		}
	} catch (err) { console.error('Failed to toggle reaction:', err); }
}

async function fetchVideoNotes(untilId?: string) {
	if (loading.value || !hasMore.value) return;
	loading.value = true;
	try {
		const [featured, recent] = await Promise.all([
			misskeyApiGet('notes/featured', { limit: 20, fileType: 'video/', untilId }).catch(() => []),
			misskeyApiGet('notes/local-timeline', { limit: 30, withFiles: true, untilId }).catch(() => []),
		]);
		const seen = new Set(videoNotes.value.map(n => n.id));
		const all = [...featured, ...recent].filter(n => {
			if (seen.has(n.id)) return false;
			if (!n.files?.some((f: any) => f.type.startsWith('video/'))) return false;
			seen.add(n.id);
			return true;
		});
		if (all.length === 0) hasMore.value = false;
		else videoNotes.value.push(...all);
	} catch (err) { console.error('Failed to fetch video notes:', err); }
	loading.value = false;
}

onMounted(() => {
	if (props.notes.length > 0) videoNotes.value = props.notes;
	else fetchVideoNotes();
});

onUnmounted(() => {
	videoRefs.forEach(v => v.pause());
});
</script>

<style lang="scss" module>
.root {
	width: 100%;
	height: 100%;
	position: relative;
	background: #000;
	display: flex;

	:global(.swiper) {
		flex: 1;
		height: 100%;
	}

	:global(.swiper-slide) {
		width: 100%;
		height: 100%;
	}
}

/* 左右切换按钮 */
.navBtn {
	position: absolute;
	left: 50%;
	transform: translateX(-50%);
	z-index: 20;
	width: 44px;
	height: 44px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.15);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 22px;
	backdrop-filter: blur(8px);
	transition: all 0.2s;
	opacity: 0.6;
	&:hover { opacity: 1; background: rgba(255, 255, 255, 0.25); }
}

.navPrev { top: 16px; }
.navNext { bottom: 16px; }

.slide {
	width: 100%;
	height: 100%;
	position: relative;
}

.videoWrapper {
	width: 100%;
	height: 100%;
	position: relative;
	background: #000;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
}

.video {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.playPauseIcon {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	font-size: 64px;
	color: rgba(255, 255, 255, 0.8);
	pointer-events: none;
	animation: fadeOut 0.5s ease forwards;
}

.heartAnim {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	font-size: 80px;
	color: #ff2d55;
	pointer-events: none;
	animation: heartPop 0.8s ease forwards;
}

@keyframes fadeOut {
	0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
	100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }
}

@keyframes heartPop {
	0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
	15% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
	30% { transform: translate(-50%, -50%) scale(0.95); }
	45% { transform: translate(-50%, -50%) scale(1); }
	80% { opacity: 1; }
	100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
}

.progressBar {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 380px;
	z-index: 15;
	padding: 12px 16px 8px;
	cursor: pointer;
}

.progressTrack {
	width: 100%;
	height: 3px;
	background: rgba(255, 255, 255, 0.3);
	border-radius: 2px;
	overflow: hidden;
}

.progressFill {
	height: 100%;
	background: #fff;
	border-radius: 2px;
	transition: width 0.1s linear;
}

.videoOverlay {
	position: absolute;
	bottom: 32px;
	left: 16px;
	right: 80px;
	z-index: 10;
	pointer-events: none;
	& > * { pointer-events: auto; }
}

.userInfo {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 8px;
}

.avatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	border: 2px solid #fff;
}

.username {
	font-weight: 600;
	font-size: 14px;
	color: #fff;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.caption {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.9);
	line-height: 1.4;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	cursor: pointer;
}

.actions {
	position: absolute;
	right: 392px;
	bottom: 120px;
	z-index: 10;
	display: flex;
	flex-direction: column;
	gap: 20px;
	align-items: center;
}

.actionButton {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	color: #fff;
	font-size: 26px;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	transition: transform 0.2s;
	span { font-size: 11px; font-weight: 500; }
	&:active { transform: scale(0.85); }
}

.actionActive {
	color: var(--MI_THEME-accent);
}

/* 嵌入式评论面板 */
.commentPanel {
	width: 380px;
	height: 100%;
	background: var(--MI_THEME-panel);
	display: flex;
	flex-direction: column;
	border-left: 1px solid var(--MI_THEME-divider);
	flex-shrink: 0;
}

.commentHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 16px;
	border-bottom: 1px solid var(--MI_THEME-divider);
	flex-shrink: 0;
}

.commentTitle {
	font-size: 15px;
	font-weight: 600;
}

.commentClose {
	font-size: 18px;
	color: var(--MI_THEME-fgTransparentWeak);
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	&:hover { background: var(--MI_THEME-buttonHoverBg); }
}

.commentList {
	flex: 1;
	overflow-y: auto;
	padding: 12px 16px;
}

.commentLoading, .commentEmpty {
	display: flex;
	justify-content: center;
	padding: 32px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 13px;
}

.commentItem {
	display: flex;
	gap: 10px;
	margin-bottom: 14px;
}

.commentAvatar {
	width: 30px;
	height: 30px;
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
	color: var(--MI_THEME-accent);
}

.commentText {
	font-size: 13px;
	margin-top: 2px;
	line-height: 1.5;
}

.commentTime {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-top: 4px;
}

.commentInput {
	padding: 8px 16px 12px;
	border-top: 1px solid var(--MI_THEME-divider);
	flex-shrink: 0;
}

.commentInputWrap {
	display: flex;
	align-items: flex-end;
	gap: 6px;
	background: var(--MI_THEME-bg);
	border-radius: 20px;
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

.commentSend {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-accent);
	font-size: 16px;
	flex-shrink: 0;
	&:hover:not(:disabled) { background: var(--MI_THEME-buttonHoverBg); }
	&:disabled { opacity: 0.3; cursor: not-allowed; }
}

.loading {
	position: absolute;
	bottom: 60px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 20;
}

@media (max-width: 768px) {
	.commentPanel { display: none; }
	.progressBar { right: 0; }
	.actions { right: 8px; bottom: 100px; gap: 16px; }
	.videoOverlay { right: 60px; bottom: 24px; }
	.navBtn { display: none; }
	.actionButton { font-size: 22px; }
}
</style>
