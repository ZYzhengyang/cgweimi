<!--
  CG微米 (CGVMI) - 刷视频组件
  居中播放+侧边评论布局，Swiper 鼠标滚轮切换、键盘控制、嵌入式评论面板
-->

<template>
<div :class="$style.root" :style="rootStyle">
	<!-- 尺寸预设（右上角） -->
	<div v-if="!props.preview" :class="$style.topControls">
		<div :class="$style.sizePresets">
			<button
				v-for="s in sizeOptions"
				:key="s.key"
				class="_button"
				:class="[$style.sizeBtn, { [$style.sizeBtnActive]: videoSize === s.key }]"
				:title="s.label"
				@click="setVideoSize(s.key)"
			>{{ s.label }}</button>
		</div>
	</div>

	<!-- 左右切换按钮 -->
	<button v-if="!props.preview" class="_button" :class="[$style.navBtn, $style.navPrev]" @click="goPrev">
		<i class="ti ti-chevron-up"></i>
	</button>
	<button v-if="!props.preview" class="_button" :class="[$style.navBtn, $style.navNext]" @click="goNext">
		<i class="ti ti-chevron-down"></i>
	</button>

	<!-- Swiper 视频流 -->
	<Swiper
		direction="vertical"
		:slides-per-view="1"
		:space-between="0"
		:speed="350"
		:keyboard="{ enabled: true }"
		:mousewheel="{ sensitivity: 1, forceToAxis: true }"
		:touch-ratio="1"
		:resistance-ratio="0.15"
		:long-swipes-ratio="0.3"
		:modules="[Mousewheel, Keyboard, Virtual]"
		:virtual="{ slides: videoNotes, addSlidesBefore: 1, addSlidesAfter: 1 }"
		@swiper="onSwiper"
		@slideChange="onSlideChange"
		@reachEnd="onReachEnd"
	>
		<SwiperSlide v-for="(note, index) in videoNotes" :key="note.id">
			<div :class="$style.slide">
				<div :class="$style.videoWrapper">
					<!-- 外链视频 iframe -->
					<iframe
						v-if="getExternalVideo(note)"
						:src="getExternalVideo(note)!.embedUrl"
						:class="$style.videoIframe"
						frameborder="0"
						allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
						allowfullscreen
						@mouseenter="onIframeInteract(index, true)"
						@mouseleave="onIframeInteract(index, false)"
					></iframe>

					<!-- 本地视频 -->
					<template v-else>
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
						></video>

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
					</template>

					<!-- 底部信息（叠加在视频内） -->
					<div :class="$style.videoOverlay">
						<div :class="$style.userInfo">
							<MkAvatar :user="note.user" :class="$style.avatar"/>
							<span :class="$style.username">@{{ note.user.username }}</span>
							<!-- 外链平台图标 -->
							<span v-if="getExternalVideo(note)" :class="$style.platformBadge" :title="getPlatformName(getExternalVideo(note)!.platform)">
								<i :class="getExternalVideo(note)!.icon"></i>
							</span>
							<!-- 视频时长 -->
							<span v-if="videoDurations[index]" :class="$style.durationBadge">
								{{ formatDuration(videoDurations[index]) }}
							</span>
						</div>
						<div v-if="note.text" :class="$style.caption" @click.stop="openNote(note)">
							{{ truncateText(note.text, 120) }}
						</div>
					</div>

					<!-- 右侧操作按钮 -->
					<div :class="$style.actions">
						<button class="_button" :class="$style.actionButton" @click.stop="toggleLike(note)">
							<i :class="note.myReaction ? 'ti ti-heart-filled' : 'ti ti-heart'" :style="note.myReaction ? 'color: var(--MI_THEME-love)' : ''"></i>
							<span>{{ note.reactionCount || 0 }}</span>
						</button>
						<button class="_button" :class="[$style.actionButton, { [$style.actionActive]: currentIndex === index }]" @click.stop="toggleComments(note, index)">
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

	<!-- 评论面板（右侧常驻） -->
	<div v-if="!props.preview && currentNote" :class="$style.commentPanel">
		<div :class="$style.commentHeader">
			<span :class="$style.commentTitle">{{ currentNote.repliesCount || 0 }} 条评论</span>
		</div>
		<div :class="$style.commentList" ref="commentListEl">
			<div v-if="loadingComments" :class="$style.commentLoading"><MkLoading mini/></div>
			<div v-else-if="comments.length === 0" :class="$style.commentEmpty">
				<i class="ti ti-message-circle-off" :class="$style.commentEmptyIcon"></i>
				<span>暂无评论，来抢沙发~</span>
			</div>
			<div v-else v-for="r in comments" :key="r.id" :class="$style.commentItem">
				<MkAvatar :user="r.user" :class="$style.commentAvatar"/>
				<div :class="$style.commentBody">
					<div :class="$style.commentMeta">
						<span :class="$style.commentName">@{{ r.user?.username }}</span>
						<span :class="$style.commentTime"><MkTime :time="r.createdAt"/></span>
					</div>
					<Mfm v-if="r.text" :text="r.text" :author="r.user" :emojiUrls="r.emojis" class="_selectable" :class="$style.commentText"/>
				</div>
			</div>
		</div>
		<div :class="$style.commentInput">
			<div :class="$style.commentInputWrap">
				<button class="_button" :class="$style.commentEmoji" @click="insertEmoji" title="表情">
					<i class="ti ti-mood-smile"></i>
				</button>
				<textarea
					ref="commentInputEl"
					v-model="commentText"
					:class="$style.commentTextarea"
					placeholder="写评论..."
					rows="1"
					@keydown.enter.exact.prevent="submitComment"
					@input="autoResizeTextarea"
				></textarea>
				<button class="_button" :class="$style.commentSend" :disabled="!commentText.trim() || sendingComment" @click="submitComment">
					<i v-if="sendingComment" class="ti ti-loader-2" :class="$style.spinIcon"></i>
					<i v-else class="ti ti-send"></i>
				</button>
			</div>
		</div>
	</div>

	<div v-if="loading" :class="$style.loading"><MkLoading/></div>

	<!-- 访客视频限制遮罩 -->
	<div v-if="guestLimitReached" :class="$style.guestOverlay">
		<div :class="$style.guestOverlayContent">
			<i class="ti ti-lock" :class="$style.guestOverlayIcon"></i>
			<div :class="$style.guestOverlayTitle">登录后继续观看</div>
			<div :class="$style.guestOverlayDesc">注册即可无限刷视频、点赞、评论</div>
			<div :class="$style.guestOverlayActions">
				<button :class="[$style.guestBtn, $style.guestBtnPrimary]" @click="guestSignup">注册账号</button>
				<button :class="[$style.guestBtn, $style.guestBtnSecondary]" @click="guestSignin">登录</button>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, nextTick, onMounted, onUnmounted, watch } from 'vue';
import * as Misskey from 'misskey-js';
import * as mfm from 'mfm-js';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { Mousewheel, Keyboard, Virtual } from 'swiper/modules';
import type SwiperClass from 'swiper';
import 'swiper/css';
import 'swiper/css/mousewheel';
import 'swiper/css/virtual';
import MkAvatar from '@/components/global/MkAvatar.vue';
import MkTime from '@/components/global/MkTime.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import { misskeyApiGet, misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { toast } from '@/os.js';
import { pleaseLogin } from '@/utility/please-login.js';
import MkWorkPopup from '@/components/MkWorkPopup.vue';
import { popup } from '@/os.js';
import { extractUrlFromMfm } from '@/utility/extract-url-from-mfm.js';
import { emojiPicker } from '@/utility/emoji-picker.js';
import XSigninDialog from '@/components/MkSigninDialog.vue';
import XSignupDialog from '@/components/MkSignupDialog.vue';

// 外链视频平台检测
interface ExternalVideoInfo {
	platform: 'bilibili' | 'youtube' | 'nicovideo' | 'unknown';
	icon: string;
	embedUrl: string;
	originalUrl: string;
}

function detectExternalVideo(note: Misskey.entities.Note): ExternalVideoInfo | null {
	// 优先检查 note.url 或 note.uri
	const noteUrl = note.url || note.uri;
	if (noteUrl) {
		const info = parseVideoUrl(noteUrl);
		if (info) return info;
	}

	// 从 note.text 提取 URL
	if (!note.text) return null;
	const parsed = mfm.parse(note.text);
	const urls = extractUrlFromMfm(parsed);
	for (const url of urls) {
		const info = parseVideoUrl(url);
		if (info) return info;
	}
	return null;
}

function parseVideoUrl(url: string): ExternalVideoInfo | null {
	try {
		const u = new URL(url);
		const host = u.hostname.replace(/^www\./, '');

		// Bilibili
		if (host === 'bilibili.com' || host === 'b23.tv' || host.endsWith('.bilibili.com')) {
			// BV号格式: /video/BVxxxxxx
			const bvMatch = u.pathname.match(/\/video\/(BV[a-zA-Z0-9]+)/);
			if (bvMatch) {
				return {
					platform: 'bilibili',
					icon: 'ti ti-brand-bilibili',
					embedUrl: `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&high_quality=1&autoplay=0`,
					originalUrl: url,
				};
			}
			// av号格式: /video/avxxxxxx
			const avMatch = u.pathname.match(/\/video\/(av\d+)/);
			if (avMatch) {
				return {
					platform: 'bilibili',
					icon: 'ti ti-brand-bilibili',
					embedUrl: `https://player.bilibili.com/player.html?aid=${avMatch[1].substring(2)}&high_quality=1&autoplay=0`,
					originalUrl: url,
				};
			}
		}

		// YouTube
		if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com' || host.endsWith('.youtube.com')) {
			let videoId: string | null = null;
			if (host === 'youtu.be') {
				videoId = u.pathname.substring(1);
			} else {
				videoId = u.searchParams.get('v');
			}
			if (videoId) {
				return {
					platform: 'youtube',
					icon: 'ti ti-brand-youtube',
					embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`,
					originalUrl: url,
				};
			}
		}

		// NicoNico
		if (host === 'nicovideo.jp' || host === 'nico.ms') {
			const smMatch = u.pathname.match(/\/(sm\d+)/) || u.pathname.match(/^(sm\d+)$/);
			if (smMatch) {
				return {
					platform: 'nicovideo',
					icon: 'ti ti-video',
					embedUrl: `https://embed.nicovideo.jp/watch/${smMatch[1]}?jsapi=1&autoplay=0`,
					originalUrl: url,
				};
			}
		}
	} catch {
		// URL解析失敗は無視
	}
	return null;
}

function hasExternalVideo(note: Misskey.entities.Note): boolean {
	return detectExternalVideo(note) !== null;
}

function hasLocalVideo(note: Misskey.entities.Note): boolean {
	return note.files?.some(f => f.type.startsWith('video/')) ?? false;
}

function isVideoNote(note: Misskey.entities.Note): boolean {
	return hasLocalVideo(note) || hasExternalVideo(note);
}

const props = withDefaults(defineProps<{
	startNote?: Misskey.entities.Note | null;
	notes?: Misskey.entities.Note[];
	preview?: boolean;
}>(), {
	startNote: null,
	notes: () => [],
	preview: false,
});

// 窗口尺寸
type VideoSize = 'small' | 'medium' | 'large' | 'full';

const videoSize = ref<VideoSize>((localStorage.getItem('cgvmi-video-size') as VideoSize) || 'medium');

const rootStyle = computed(() => {
	const widths: Record<VideoSize, string> = { small: '50%', medium: '70%', large: '85%', full: '100%' };
	return { '--video-width': widths[videoSize.value] };
});

function setVideoSize(size: VideoSize) {
	videoSize.value = size;
	localStorage.setItem('cgvmi-video-size', size);
}

const sizeOptions: { key: VideoSize; label: string }[] = [
	{ key: 'small', label: '小' },
	{ key: 'medium', label: '中' },
	{ key: 'large', label: '大' },
	{ key: 'full', label: '全屏' },
];

const videoNotes = ref<Misskey.entities.Note[]>([]);
const loading = ref(false);
const hasMore = ref(true);
const videoRefs = new Map<number, HTMLVideoElement>();
const isPlaying = reactive<Record<number, boolean>>({});
const showPlayIcon = reactive<Record<number, boolean>>({});
const showHeart = reactive<Record<number, boolean>>({});
const progress = reactive<Record<number, number>>({});
const videoDurations = reactive<Record<number, number>>({});
let swiperInstance: SwiperClass | null = null;
const currentIndex = ref(0);
let clickTimer: ReturnType<typeof setTimeout> | null = null;

// 访客视频限制
const GUEST_VIDEO_LIMIT = 5;
const watchedCount = ref(0);
const guestLimitReached = ref(false);

function guestSignin() {
	popup(XSigninDialog, {}, {
		done: () => {
			guestLimitReached.value = false;
			if (swiperInstance) swiperInstance.enable();
		},
		closed: () => {},
	});
}

function guestSignup() {
	popup(XSignupDialog, {}, {
		done: () => {
			guestLimitReached.value = false;
			if (swiperInstance) swiperInstance.enable();
		},
		closed: () => {},
	});
}

// 登录后自动解除限制
watch(() => $i, (newVal) => {
	if (newVal && guestLimitReached.value) {
		guestLimitReached.value = false;
		if (swiperInstance) swiperInstance.enable();
	}
});

// 评论面板状态
const comments = ref<Misskey.entities.Note[]>([]);
const loadingComments = ref(false);
const commentText = ref('');
const commentListEl = ref<HTMLElement>();
const commentInputEl = ref<HTMLTextAreaElement>();
const currentNote = ref<Misskey.entities.Note | null>(null);
const sendingComment = ref(false);

function setVideoRef(index: number, el: any) {
	if (el) videoRefs.set(index, el as HTMLVideoElement);
}

function getVideoUrl(note: Misskey.entities.Note): string {
	const url = note.files?.find(f => f.type.startsWith('video/'))?.url || '';
	// COS files: use nginx proxy path
	if (url.includes('cos.ap-shanghai.myqcloud.com')) {
		return url.replace('https://cgvmi-1314814344.cos.ap-shanghai.myqcloud.com/', `${location.origin}/cos-files/`);
	}
	return url;
}

function getVideoThumb(note: Misskey.entities.Note): string {
	const url = note.files?.find(f => f.type.startsWith('video/'))?.thumbnailUrl || '';
	if (url.includes('cos.ap-shanghai.myqcloud.com')) {
		return url.replace('https://cgvmi-1314814344.cos.ap-shanghai.myqcloud.com/', `${location.origin}/cos-files/`);
	}
	return url;
}

function truncateText(text: string, max: number): string {
	return text.length > max ? text.substring(0, max) + '...' : text;
}

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

// 外链视频辅助函数
function getExternalVideo(note: Misskey.entities.Note): ExternalVideoInfo | null {
	// 只有当没有本地视频时才检测外链
	if (hasLocalVideo(note)) return null;
	return detectExternalVideo(note);
}

function getPlatformName(platform: ExternalVideoInfo['platform']): string {
	const names: Record<ExternalVideoInfo['platform'], string> = {
		bilibili: 'Bilibili',
		youtube: 'YouTube',
		nicovideo: 'Niconico',
		unknown: '外部视频',
	};
	return names[platform];
}

// iframe 交互状态（外链视频不能用本地播放控制）
const iframeHovering = reactive<Record<number, boolean>>({});

function onIframeInteract(index: number, isHovering: boolean) {
	iframeHovering[index] = isHovering;
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

	// 访客视频计数
	if (!$i) {
		watchedCount.value++;
		if (watchedCount.value >= GUEST_VIDEO_LIMIT && !guestLimitReached.value) {
			guestLimitReached.value = true;
			pleaseLogin({ message: '登录后继续观看更多精彩视频' });
			if (swiperInstance) {
				swiperInstance.disable();
			}
		}
	}

	// 切换视频时加载新评论
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
	// 外链视频由 iframe 控制，不干预
	const note = videoNotes.value[index];
	if (note && getExternalVideo(note)) {
		isPlaying[index] = true;
		return;
	}

	const video = videoRefs.get(index);
	if (video) {
		video.preload = 'auto';
		video.play().catch(() => {});
		isPlaying[index] = true;
		// 预加载相邻视频（延迟执行，不阻塞当前播放）
		requestIdleCallback(() => preloadAdjacent(index), { timeout: 1000 });
	}
}

function preloadAdjacent(index: number) {
	for (let offset = 1; offset <= 2; offset++) {
		for (const dir of [-1, 1]) {
			const i = index + offset * dir;
			if (i < 0 || i >= videoNotes.value.length) continue;
			const v = videoRefs.get(i);
			if (v && v.preload !== 'auto') {
				v.preload = offset === 1 ? 'auto' : 'metadata';
			}
		}
	}
}

function pauseVideo(index: number) {
	// 外链视频由 iframe 控制，不干预
	const note = videoNotes.value[index];
	if (note && getExternalVideo(note)) {
		isPlaying[index] = false;
		return;
	}

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
	const video = videoRefs.get(index);
	if (video?.duration && isFinite(video.duration)) {
		videoDurations[index] = video.duration;
	}
}

function seekTo(index: number, ev: MouseEvent) {
	const video = videoRefs.get(index);
	if (!video?.duration) return;
	const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
	video.currentTime = ((ev.clientX - rect.left) / rect.width) * video.duration;
}

function openNote(note: Misskey.entities.Note) {
	const { dispose } = popup(MkWorkPopup, { note }, { closed: () => dispose() });
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
	if (!$i) {
		pleaseLogin({ message: '登录后即可评论' });
		return;
	}
	currentNote.value = note;
	loadComments(note);
}

function insertEmoji(ev: MouseEvent) {
	const target = ev.currentTarget as HTMLElement;
	if (!target) return;

	emojiPicker.show(target, (emoji) => {
		const textarea = commentInputEl.value;
		if (textarea) {
			const pos = textarea.selectionStart ?? commentText.value.length;
			commentText.value = commentText.value.substring(0, pos) + emoji + commentText.value.substring(pos);
			nextTick(() => {
				textarea.selectionStart = textarea.selectionEnd = pos + emoji.length;
				textarea.focus();
			});
		} else {
			commentText.value += emoji;
		}
	});
}

function autoResizeTextarea(ev: Event) {
	const el = ev.target as HTMLTextAreaElement;
	el.style.height = 'auto';
	el.style.height = Math.min(el.scrollHeight, 80) + 'px';
}

async function submitComment() {
	if (!commentText.value.trim() || !currentNote.value || sendingComment.value) return;
	sendingComment.value = true;
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
			// 重置 textarea 高度
			if (commentInputEl.value) commentInputEl.value.style.height = 'auto';
		});
	} catch (e) {
		toast('发送失败');
	}
	sendingComment.value = false;
}

function shareNote(note: Misskey.entities.Note) {
	if (!$i) {
		pleaseLogin({ message: '登录后即可分享' });
		return;
	}
	try {
		navigator.clipboard.writeText(`${window.location.origin}/notes/${note.id}`);
		toast('链接已复制');
	} catch {
		toast('复制失败');
	}
}

async function toggleLike(note: Misskey.entities.Note) {
	if (!$i) {
		pleaseLogin({ message: '登录后即可点赞' });
		return;
	}
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

let featuredFetched = false;

async function fetchVideoNotes(untilId?: string) {
	if (loading.value || !hasMore.value) return;
	loading.value = true;
	try {
		const seen = new Set(videoNotes.value.map(n => n.id));
		const tasks: Promise<Misskey.entities.Note[]>[] = [];

		// featured 只在第一页请求，不传 untilId
		if (!featuredFetched) {
			featuredFetched = true;
			tasks.push(misskeyApiGet('notes/featured', { limit: 30, fileType: 'video/' }).catch(() => []));
		}

		// local-timeline 带分页
		tasks.push(misskeyApiGet('notes/local-timeline', { limit: 30, withFiles: true, untilId }).catch(() => []));

		const results = await Promise.all(tasks);
		const all = results.flat().filter(n => {
			if (seen.has(n.id)) return false;
			// 包含本地视频或外链视频的 note 都保留
			if (!isVideoNote(n)) return false;
			seen.add(n.id);
			return true;
		});
		if (all.length === 0) hasMore.value = false;
		else videoNotes.value.push(...all);
	} catch (err) { console.error('Failed to fetch video notes:', err); }
	loading.value = false;
}

// 当 videoNotes 有数据但 currentNote 仍为 null 时，初始化为第一项
watch(videoNotes, (newNotes) => {
	if (currentNote.value === null && newNotes.length > 0) {
		currentNote.value = newNotes[0];
	}
});

onMounted(() => {
	if (props.notes.length > 0) {
		videoNotes.value = props.notes;
		if (currentNote.value === null && props.notes.length > 0) {
			currentNote.value = props.notes[0];
		}
	} else {
		fetchVideoNotes();
	}
});

onUnmounted(() => {
	if (clickTimer) clearTimeout(clickTimer);
	videoRefs.forEach(v => {
		v.pause();
		v.removeAttribute('src');
		v.load();
	});
	videoRefs.clear();
	swiperInstance = null;
});
</script>

<style lang="scss" module>
.root {
	width: 100%;
	height: 100%;
	position: relative;
	background: var(--MI_THEME-bg, #111);
	display: flex;
	touch-action: pan-x pan-y;
	-webkit-overflow-scrolling: touch;
	overscroll-behavior: contain;

	:global(.swiper) {
		flex: none;
		width: var(--video-width, 70%);
		height: 100%;
		margin: 0;
		transition: width 0.3s ease;
	}

	:global(.swiper-slide) {
		width: 100%;
		height: 100%;
	}

	.video {
		object-fit: contain;
	}
}

/* 左右切换按钮 */
.navBtn {
	position: absolute;
	left: calc(var(--video-width, 70%) / 2);
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
	will-change: transform;
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
	transform: translateZ(0);
}

.video {
	width: 100%;
	height: 100%;
	object-fit: contain;
	backface-visibility: hidden;
}

.videoIframe {
	width: 100%;
	height: 100%;
	border: none;
	background: #000;
}

.platformBadge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 6px;
	background: rgba(0, 0, 0, 0.6);
	backdrop-filter: blur(4px);
	font-size: 16px;
	color: #fff;
	cursor: help;
	transition: background 0.2s;
	&:hover {
		background: rgba(0, 0, 0, 0.8);
	}
}

.durationBadge {
	display: inline-flex;
	align-items: center;
	padding: 2px 6px;
	border-radius: 4px;
	background: rgba(0, 0, 0, 0.6);
	font-size: 11px;
	font-weight: 500;
	color: #fff;
	margin-left: 4px;
	letter-spacing: 0.3px;
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
	color: var(--MI_THEME-love);
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
	right: 0;
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
	right: 60px;
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
	right: 12px;
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
	justify-content: center;
	gap: 4px;
	min-width: 44px;
	min-height: 44px;
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

/* 尺寸预设 */
.topControls {
	position: absolute;
	top: 12px;
	right: 12px;
	z-index: 50;
	display: flex;
	align-items: center;
	gap: 8px;
}

.sizePresets {
	display: flex;
	background: rgba(0, 0, 0, 0.45);
	border-radius: 8px;
	overflow: hidden;
	backdrop-filter: blur(8px);
}

.sizeBtn {
	padding: 0 10px;
	height: 36px;
	font-size: 12px;
	color: rgba(255, 255, 255, 0.7);
	transition: all 0.2s;
	white-space: nowrap;
	&:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
}

.sizeBtnActive {
	color: #fff;
	background: rgba(255, 255, 255, 0.2);
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

.commentList {
	flex: 1;
	overflow-y: auto;
	padding: 12px 16px;
}

.commentLoading {
	display: flex;
	justify-content: center;
	padding: 32px;
}

.commentEmpty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 16px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 13px;
	gap: 8px;
}

.commentEmptyIcon {
	font-size: 32px;
	opacity: 0.5;
}

.commentItem {
	display: flex;
	gap: 10px;
	padding: 10px;
	margin-bottom: 4px;
	border-radius: 8px;
	transition: background 0.15s ease;
	&:hover {
		background: var(--MI_THEME-bgTransparent);
	}
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

.commentMeta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.commentName {
	font-size: 12px;
	font-weight: 600;
	color: var(--MI_THEME-accent);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.commentText {
	font-size: 13px;
	margin-top: 2px;
	line-height: 1.5;
	word-break: break-word;
}

.commentTime {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	flex-shrink: 0;
}

.commentInput {
	padding: 8px 16px 12px;
	border-top: 1px solid var(--MI_THEME-divider);
	flex-shrink: 0;
}

.commentInputWrap {
	display: flex;
	align-items: flex-end;
	gap: 4px;
	background: var(--MI_THEME-bg);
	border-radius: 20px;
	padding: 4px 4px 4px 8px;
	border: 1px solid transparent;
	transition: border-color 0.2s ease;
	&:focus-within {
		border-color: var(--MI_THEME-accentTransparent);
	}
}

.commentEmoji {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 18px;
	flex-shrink: 0;
	transition: all 0.15s ease;
	&:hover {
		color: var(--MI_THEME-accent);
		background: var(--MI_THEME-buttonHoverBg);
	}
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
	padding: 6px 0;
	&::placeholder {
		color: var(--MI_THEME-fgTransparentWeak);
	}
}

.commentSend {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-accent);
	font-size: 16px;
	flex-shrink: 0;
	transition: all 0.15s ease;
	&:hover:not(:disabled) {
		background: var(--MI_THEME-accent);
		color: #fff;
	}
	&:active:not(:disabled) {
		transform: scale(0.9);
	}
	&:disabled { opacity: 0.3; cursor: not-allowed; }
}

.spinIcon {
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
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
	.sizePresets { display: none; }
}

/* 访客视频限制遮罩 */
.guestOverlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 50;
	background: rgba(0, 0, 0, 0.7);
	backdrop-filter: blur(8px);
	-webkit-backdrop-filter: blur(8px);
	display: flex;
	align-items: center;
	justify-content: center;
}

.guestOverlayContent {
	text-align: center;
	padding: 32px;
	max-width: 320px;
}

.guestOverlayIcon {
	font-size: 48px;
	color: var(--MI_THEME-accent);
	margin-bottom: 16px;
}

.guestOverlayTitle {
	font-size: 20px;
	font-weight: 700;
	color: #fff;
	margin-bottom: 8px;
}

.guestOverlayDesc {
	font-size: 14px;
	color: rgba(255, 255, 255, 0.7);
	margin-bottom: 24px;
}

.guestOverlayActions {
	display: flex;
	gap: 12px;
	justify-content: center;
}

.guestBtn {
	border: none;
	border-radius: 8px;
	padding: 10px 24px;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: opacity 0.2s;

	&:hover {
		opacity: 0.85;
	}
}

.guestBtnPrimary {
	background: var(--MI_THEME-accent);
	color: #fff;
}

.guestBtnSecondary {
	background: rgba(255, 255, 255, 0.15);
	color: #fff;
}
</style>
