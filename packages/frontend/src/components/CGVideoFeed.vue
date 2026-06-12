<!--
  CG微米 (CGVMI) - 刷视频组件
  居中播放布局，Swiper 鼠标滚轮切换、键盘控制
-->

<template>
<div ref="rootEl" :class="$style.root" :style="rootStyle">
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
			<div :class="[$style.slide, { [$style.slideFullscreen]: videoSize === 'full' }]">
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
							controls
							playsinline
							loop
							preload="metadata"
							@dblclick.prevent="onDoubleTap(note, index)"
							@loadedmetadata="onMetadataLoaded(index)"
						></video>

						<!-- 双击爱心 -->
						<div v-if="showHeart[index]" :class="$style.heartAnim">
							<i class="ti ti-heart-filled"></i>
						</div>

						<!-- 自定义进度条（支持拖拽 seek） -->
						<div
							:class="$style.progressBar"
							@mousedown.stop.prevent="onProgressDragStart($event, index)"
							@touchstart.stop.prevent="onProgressDragStart($event, index)"
						>
							<div :class="[$style.progressTrack, { [$style.progressTrackActive]: isDragging && dragIndex === index }]">
								<div :class="$style.progressFill" :style="{ width: getProgressPercent(index) + '%' }"></div>
								<div
									v-if="isDragging && dragIndex === index"
									:class="$style.progressThumb"
									:style="{ left: dragProgress * 100 + '%' }"
								></div>
							</div>
							<div
								v-if="isDragging && dragIndex === index"
								:class="$style.progressTooltip"
								:style="{ left: getTooltipLeft() + '%' }"
							>{{ formatDuration(dragTime) }}</div>
						</div>
					</template>

				</div>

				<!-- 视频下方信息区域 -->
				<div :class="$style.infoArea">
					<MkA :to="userPage(note.user)" :class="$style.infoAvatarLink"><MkAvatar :user="note.user" :class="$style.infoAvatar"/></MkA>
					<div :class="$style.infoContent">
						<div :class="$style.infoNameRow">
							<MkA :to="userPage(note.user)" :class="$style.infoUsername">@{{ note.user.username }}</MkA>
							<span v-if="getExternalVideo(note)" :class="$style.infoPlatformBadge" :title="getPlatformName(getExternalVideo(note)!.platform)">
								<i :class="getExternalVideo(note)!.icon"></i>
							</span>
							<span v-if="videoDurations[index]" :class="$style.infoDurationBadge">
								{{ formatDuration(videoDurations[index]) }}
							</span>
						</div>
						<div v-if="note.text" :class="$style.infoCaptionWrap">
							<div
								:ref="(el: any) => checkCaptionOverflow(note.id, el as HTMLElement)"
								:class="[$style.infoCaption, { [$style.infoCaptionExpanded]: expandedNotes[note.id] }]"
								@click.stop="openNote(note)"
							>{{ note.text }}</div>
							<button
								v-if="isTextOverflow(note.id)"
								class="_button"
								:class="$style.infoCaptionToggle"
								@click.stop="toggleExpand(note.id)"
							>{{ expandedNotes[note.id] ? '收起' : '展开' }}</button>
						</div>
					</div>
				</div>

				<!-- X 风格横排操作栏 -->
				<div :class="$style.actions">
					<button class="_button" :class="$style.actionButton" @click.stop="openCommentPopup(note)">
						<i class="ti ti-message-circle"></i>
						<span>{{ note.repliesCount || 0 }}</span>
					</button>
					<button class="_button" :class="$style.actionButton" @click.stop="renoteNote(note)">
						<i class="ti ti-repeat"></i>
						<span>{{ note.renoteCount || 0 }}</span>
					</button>
					<button class="_button" :class="$style.actionButton" :style="note.myReaction ? 'color: var(--MI_THEME-love)' : ''" @click.stop="toggleLike(note)">
						<i :class="note.myReaction ? 'ti ti-heart-filled' : 'ti ti-heart'"></i>
						<span>{{ note.reactionCount || 0 }}</span>
					</button>
					<button class="_button" :class="$style.actionButton" @click.stop="shareNote(note)">
						<i class="ti ti-share"></i>
						<span></span>
					</button>
					<button v-if="isLocalVideoNote(note)" class="_button" :class="$style.actionButton" @click.stop="enterMiniPlayer(index)">
						<i class="ti ti-picture-in-picture"></i>
						<span></span>
					</button>
				</div>
			</div>
		</SwiperSlide>
	</Swiper>

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

	<!-- 悬浮小窗播放器 -->
	<MkMiniPlayer
		:visible="miniPlayer.active"
		:src="miniPlayer.src"
		:poster="miniPlayer.poster"
		:username="miniPlayer.username"
		:startTime="miniPlayer.startTime"
		:startPaused="miniPlayer.startPaused"
		@close="closeMiniPlayer"
		@restore="restoreFromMiniPlayer"
	/>
</div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch } from 'vue';
import * as Misskey from 'misskey-js';
import * as mfm from 'mfm-js';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { Mousewheel, Keyboard, Virtual } from 'swiper/modules';
import type SwiperClass from 'swiper';
import 'swiper/css';
import 'swiper/css/mousewheel';
import 'swiper/css/virtual';
import MkA from '@/components/global/MkA.vue';
import MkAvatar from '@/components/global/MkAvatar.vue';
import { userPage } from '@/filters/user.js';
import MkLoading from '@/components/global/MkLoading.vue';
import MkMiniPlayer from '@/components/MkMiniPlayer.vue';
import MkNotePopup from '@/components/MkNotePopup.vue';
import { misskeyApiGet, misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { toast } from '@/os.js';
import { pleaseLogin } from '@/utility/please-login.js';
import MkWorkPopup from '@/components/MkWorkPopup.vue';
import { popup } from '@/os.js';
import { mainRouter } from '@/router.js';
import { extractUrlFromMfm } from '@/utility/extract-url-from-mfm.js';

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
type VideoSize = 'large' | 'full';

const videoSize = ref<VideoSize>((localStorage.getItem('cgvmi-video-size') as VideoSize) || 'large');

const rootStyle = computed(() => {
	const widths: Record<VideoSize, string> = { large: '70%', full: '100%' };
	const maxs: Record<VideoSize, string> = { large: '800px', full: 'none' };
	return { '--video-width': widths[videoSize.value], '--video-max-w': maxs[videoSize.value] };
});

function setVideoSize(size: VideoSize) {
	videoSize.value = size;
	localStorage.setItem('cgvmi-video-size', size);
}

const sizeOptions: { key: VideoSize; label: string }[] = [
	{ key: 'large', label: '大' },
	{ key: 'full', label: '全屏' },
];

const rootEl = ref<HTMLElement | null>(null);
const videoNotes = ref<Misskey.entities.Note[]>([]);
const loading = ref(false);
const hasMore = ref(true);
const videoRefs = new Map<number, HTMLVideoElement>();
const isPlaying = reactive<Record<number, boolean>>({});
const showHeart = reactive<Record<number, boolean>>({});
const videoDurations = reactive<Record<number, number>>({});
let swiperInstance: SwiperClass | null = null;

// 进度条拖拽状态
const videoProgress = reactive<Record<number, number>>({});
const isDragging = ref(false);
const dragIndex = ref(0);
const dragProgress = ref(0);
const dragTime = ref(0);
let wasPlayingBeforeDrag = false;
let dragRect: DOMRect | null = null;
const currentIndex = ref(0);
// 音量记忆 — 从 localStorage 恢复
const savedVolume = parseFloat(localStorage.getItem('cgvmi-video-volume') || '1');
const savedMuted = localStorage.getItem('cgvmi-video-muted') !== 'false'; // 默认静音（自动播放策略）
const isMuted = ref(savedMuted);
const volume = ref(savedVolume);

// 用户手动暂停追踪 — 不被自动播放覆盖
const userPaused = new Set<number>();
let intersectionObserver: IntersectionObserver | null = null;

// 悬浮小窗播放器
const miniPlayer = reactive({
	active: false,
	src: '',
	poster: '',
	username: '',
	startTime: 0,
	startPaused: false,
	videoIndex: -1,
});

function isLocalVideoNote(note: Misskey.entities.Note): boolean {
	return hasLocalVideo(note) && !getExternalVideo(note);
}

function enterMiniPlayer(index: number) {
	// 如果已在自定义小窗，不重复触发
	if (miniPlayer.active) return;

	// 先尝试浏览器原生 PiP
	const video = videoRefs.get(index);
	if (video && window.document.pictureInPictureEnabled) {
		video.requestPictureInPicture().catch(() => {
			// PiP 不可用时使用自定义悬浮窗
			startCustomMiniPlayer(index);
		});
		return;
	}
	startCustomMiniPlayer(index);
}

function startCustomMiniPlayer(index: number) {
	const note = videoNotes.value[index];
	if (!note) return;

	const video = videoRefs.get(index);
	const startTime = video?.currentTime ?? 0;
	const startPaused = video?.paused ?? true;

	miniPlayer.src = getVideoUrl(note);
	miniPlayer.poster = getVideoThumb(note);
	miniPlayer.username = note.user.username;
	miniPlayer.startTime = startTime;
	miniPlayer.startPaused = startPaused;
	miniPlayer.videoIndex = index;
	miniPlayer.active = true;

	// 暂停原视频
	if (video && !video.paused) {
		video.dataset.autoPauseing = '1';
		video.pause();
		delete video.dataset.autoPauseing;
	}
}

function closeMiniPlayer() {
	miniPlayer.active = false;
	miniPlayer.videoIndex = -1;
	// 退出原生 PiP
	if (window.document.pictureInPictureElement) {
		window.document.exitPictureInPicture().catch(() => {});
	}
}

function restoreFromMiniPlayer() {
	// 关闭小窗
	closeMiniPlayer();
	// 导航回刷视频页面
	mainRouter.push('/video-feed');
}

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

function setVideoRef(index: number, el: any) {
	if (el) {
		const video = el as HTMLVideoElement;
		video.muted = isMuted.value;
		video.volume = volume.value;
		videoRefs.set(index, video);

		// 追踪用户手动暂停 — 通过 pause 事件判断是否由用户触发
		video.addEventListener('pause', () => {
			// 如果不是自动播放逻辑触发的暂停，标记为用户手动暂停
			if (!video.dataset.autoPauseing) {
				userPaused.add(index);
			}
		});
		// 用户手动播放时清除暂停标记
		video.addEventListener('play', () => {
			userPaused.delete(index);
		});

		// 音量变化时保存记忆
		video.addEventListener('volumechange', () => {
			isMuted.value = video.muted;
			volume.value = video.volume;
			localStorage.setItem('cgvmi-video-muted', String(video.muted));
			localStorage.setItem('cgvmi-video-volume', String(video.volume));
			// 同步更新所有已挂载视频的音量
			videoRefs.forEach((v, i) => {
				if (i !== index) {
					v.muted = video.muted;
					v.volume = video.volume;
				}
			});
		});

		// 更新播放进度
		video.addEventListener('timeupdate', () => {
			if (!isDragging.value && video.duration && isFinite(video.duration)) {
				videoProgress[index] = video.currentTime / video.duration;
			}
		});

		// IntersectionObserver 监测可见性
		if (intersectionObserver) {
			intersectionObserver.observe(video);
		}
	}
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

// 文字截断展开状态
const expandedNotes = reactive<Record<string, boolean>>({});
const overflowNotes = reactive<Record<string, boolean>>({});

function toggleExpand(noteId: string) {
	expandedNotes[noteId] = !expandedNotes[noteId];
}

function isTextOverflow(noteId: string): boolean {
	return overflowNotes[noteId] ?? false;
}

// 检测文字是否超出3行
function checkCaptionOverflow(noteId: string, el: HTMLElement | null) {
	if (!el) return;
	requestAnimationFrame(() => {
		overflowNotes[noteId] = el.scrollHeight > el.clientHeight + 1;
	});
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
	// IntersectionObserver 会自动触发首个视频的播放，无需手动调用
}

function onSlideChange() {
	if (!swiperInstance) return;
	const newIndex = swiperInstance.activeIndex;
	// 用户手动切换时清除目标视频的暂停标记，允许自动播放
	userPaused.delete(newIndex);
	currentIndex.value = newIndex;
	// IntersectionObserver 自动处理旧视频暂停和新视频播放

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

// 键盘快捷键：Space 播放/暂停、M 静音、F 全屏
function toggleMute() {
	const video = videoRefs.get(currentIndex.value);
	if (!video) return;
	isMuted.value = !isMuted.value;
	video.muted = isMuted.value;
}

function toggleFullscreen() {
	if (!rootEl.value) return;
	const doc = window.document;
	if (doc.fullscreenElement || (doc as any).webkitFullscreenElement) {
		if (doc.exitFullscreen) {
			doc.exitFullscreen();
		} else if ((doc as any).webkitExitFullscreen) {
			(doc as any).webkitExitFullscreen();
		}
	} else {
		if (rootEl.value.requestFullscreen) {
			rootEl.value.requestFullscreen();
		} else if ((rootEl.value as any).webkitRequestFullScreen) {
			(rootEl.value as any).webkitRequestFullScreen();
		}
	}
}

function onKeydown(ev: KeyboardEvent) {
	// 快捷键只在刷视频页面生效 — 跳过输入框、文本区域、可编辑元素
	const tag = (ev.target as HTMLElement).tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || (ev.target as HTMLElement).isContentEditable) return;

	// 快捷键只在当前组件根元素（或其子元素）内触发
	if (!rootEl.value || !rootEl.value.contains(ev.target as Node)) return;

	if (ev.code === 'Space') {
		ev.preventDefault();
		const video = videoRefs.get(currentIndex.value);
		if (!video) return;
		if (video.paused) {
			userPaused.delete(currentIndex.value);
			video.play().catch(() => {});
			isPlaying[currentIndex.value] = true;
		} else {
			video.pause();
			isPlaying[currentIndex.value] = false;
		}
	} else if (ev.code === 'KeyM') {
		toggleMute();
	} else if (ev.code === 'KeyF') {
		toggleFullscreen();
	}
}

function playVideo(index: number) {
	// 用户手动暂停过的不自动播放
	if (userPaused.has(index)) return;

	// 外链视频由 iframe 控制，不干预
	const note = videoNotes.value[index];
	if (note && getExternalVideo(note)) {
		isPlaying[index] = true;
		return;
	}

	const video = videoRefs.get(index);
	if (video) {
		video.muted = isMuted.value;
		video.volume = volume.value;
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
		// 标记为自动暂停，避免被 pause 事件监听误判为用户手动暂停
		video.dataset.autoPauseing = '1';
		video.pause();
		delete video.dataset.autoPauseing;
		isPlaying[index] = false;
	}
}

function onDoubleTap(note: Misskey.entities.Note, index: number) {
	showHeart[index] = true;
	setTimeout(() => { showHeart[index] = false; }, 800);
	if (!note.myReaction) toggleLike(note);
}

function onMetadataLoaded(index: number) {
	const video = videoRefs.get(index);
	if (video?.duration && isFinite(video.duration)) {
		videoDurations[index] = video.duration;
	}
}

function openNote(note: Misskey.entities.Note) {
	const { dispose } = popup(MkWorkPopup, { note }, { closed: () => dispose() });
}

const commentPopupOpen = ref(false);

function focusCommentInput() {
	setTimeout(() => {
		const textarea = document.querySelector('.note-panel textarea') as HTMLTextAreaElement;
		if (textarea) textarea.focus();
	}, 350);
}

function openCommentPopup(note: Misskey.entities.Note) {
	if (!$i) {
		pleaseLogin({ message: '登录后即可评论' });
		return;
	}
	if (commentPopupOpen.value) {
		focusCommentInput();
		return;
	}
	commentPopupOpen.value = true;
	const { dispose } = popup(MkNotePopup, { note }, {
		closed: () => {
			commentPopupOpen.value = false;
			dispose();
		},
	});
	focusCommentInput();
}

async function renoteNote(note: Misskey.entities.Note) {
	if (!$i) {
		pleaseLogin({ message: '登录后即可转发' });
		return;
	}
	try {
		await misskeyApi('notes/renote', { noteId: note.id });
		toast('已转发');
	} catch {
		toast('转发失败');
	}
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

// === 进度条拖拽 ===

function getProgressPercent(index: number): number {
	if (isDragging.value && dragIndex.value === index) return dragProgress.value * 100;
	return (videoProgress[index] || 0) * 100;
}

function getTooltipLeft(): number {
	// 防止 tooltip 溢出边界
	return Math.max(6, Math.min(94, dragProgress.value * 100));
}

function getClientX(e: MouseEvent | TouchEvent): number {
	if ('touches' in e && e.touches.length > 0) return e.touches[0].clientX;
	if ('changedTouches' in e && e.changedTouches.length > 0) return e.changedTouches[0].clientX;
	return (e as MouseEvent).clientX;
}

function onProgressDragStart(e: MouseEvent | TouchEvent, index: number) {
	isDragging.value = true;
	dragIndex.value = index;

	const video = videoRefs.get(index);
	if (!video) return;

	wasPlayingBeforeDrag = !video.paused;
	if (wasPlayingBeforeDrag) {
		video.dataset.autoPauseing = '1';
		video.pause();
	}

	dragRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
	const clientX = getClientX(e);
	dragProgress.value = Math.max(0, Math.min(1, (clientX - dragRect.left) / dragRect.width));
	dragTime.value = dragProgress.value * (video.duration || 0);

	// 暂停 Swiper 防止拖拽时切换 slide
	if (swiperInstance) swiperInstance.disable();

	document.addEventListener('mousemove', onProgressDragMove);
	document.addEventListener('mouseup', onProgressDragEnd);
	document.addEventListener('touchmove', onProgressDragMove, { passive: false });
	document.addEventListener('touchend', onProgressDragEnd);
}

function onProgressDragMove(e: MouseEvent | TouchEvent) {
	if (!isDragging.value || !dragRect) return;
	e.preventDefault();

	const clientX = getClientX(e);
	dragProgress.value = Math.max(0, Math.min(1, (clientX - dragRect.left) / dragRect.width));

	const video = videoRefs.get(dragIndex.value);
	if (video && video.duration && isFinite(video.duration)) {
		dragTime.value = dragProgress.value * video.duration;
	}
}

function onProgressDragEnd() {
	if (!isDragging.value) return;

	const idx = dragIndex.value;
	const video = videoRefs.get(idx);
	if (video && video.duration && isFinite(video.duration)) {
		video.currentTime = dragProgress.value * video.duration;
		videoProgress[idx] = dragProgress.value;
	}

	const shouldResume = wasPlayingBeforeDrag;
	isDragging.value = false;
	dragRect = null;

	if (shouldResume && video) {
		delete video.dataset.autoPauseing;
		video.play().catch(() => {});
	}

	// 恢复 Swiper
	if (swiperInstance) swiperInstance.enable();

	document.removeEventListener('mousemove', onProgressDragMove);
	document.removeEventListener('mouseup', onProgressDragEnd);
	document.removeEventListener('touchmove', onProgressDragMove);
	document.removeEventListener('touchend', onProgressDragEnd);
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

onMounted(() => {
	// IntersectionObserver：视口内自动播放，离开自动暂停
	intersectionObserver = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			const video = entry.target as HTMLVideoElement;
			// 通过 videoRefs 反查 index
			let idx = -1;
			for (const [i, v] of videoRefs) {
				if (v === video) { idx = i; break; }
			}
			if (idx < 0) continue;

			if (entry.isIntersecting) {
				playVideo(idx);
			} else {
				pauseVideo(idx);
			}
		}
	}, { threshold: 0.5 });

	window.document.addEventListener('keydown', onKeydown);

	if (props.notes.length > 0) {
		videoNotes.value = props.notes;
	} else {
		fetchVideoNotes();
	}
});

// 离开刷视频页面时自动触发小窗（KeepAlive 场景）
onDeactivated(() => {
	// 已有小窗或已在原生 PiP 则跳过
	if (miniPlayer.active || window.document.pictureInPictureElement) return;

	const idx = currentIndex.value;
	const video = videoRefs.get(idx);
	if (!video || video.paused) return;

	startCustomMiniPlayer(idx);
});

// 回到刷视频页面时恢复大窗
onActivated(() => {
	// 退出原生 PiP
	if (window.document.pictureInPictureElement) {
		window.document.exitPictureInPicture().catch(() => {});
	}

	if (!miniPlayer.active) return;

	// 恢复主视频播放（使用小窗当前时间）
	const savedTime = miniPlayer.startTime;
	miniPlayer.active = false;
	miniPlayer.videoIndex = -1;

	const idx = currentIndex.value;
	const video = videoRefs.get(idx);
	if (video) {
		video.currentTime = savedTime;
		userPaused.delete(idx);
		video.play().catch(() => {});
		isPlaying[idx] = true;
	}
});

onUnmounted(() => {
	window.document.removeEventListener('keydown', onKeydown);
	document.removeEventListener('mousemove', onProgressDragMove);
	document.removeEventListener('mouseup', onProgressDragEnd);
	document.removeEventListener('touchmove', onProgressDragMove);
	document.removeEventListener('touchend', onProgressDragEnd);
	if (intersectionObserver) {
		intersectionObserver.disconnect();
		intersectionObserver = null;
	}
	// 清理小窗
	closeMiniPlayer();
	videoRefs.forEach(v => {
		v.pause();
		v.removeAttribute('src');
		v.load();
	});
	videoRefs.clear();
	userPaused.clear();
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
	justify-content: center;
	touch-action: pan-x pan-y;
	-webkit-overflow-scrolling: touch;
	overscroll-behavior: contain;

	:global(.swiper) {
		flex: none;
		width: var(--video-width, 70%);
		max-width: var(--video-max-w, 800px);
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
	will-change: transform;
	display: flex;
	flex-direction: column;
}

.slideFullscreen {
	.videoWrapper {
		position: absolute;
		inset: 0;
	}

	.infoArea {
		margin-top: auto;
		position: relative;
		z-index: 12;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
	}

	.actions {
		position: absolute;
		bottom: 60px;
		right: 8px;
		z-index: 16;
		flex-direction: column;
		padding: 0;
		gap: 6px;
		background: transparent;
		width: auto;

		.actionButton {
			background: rgba(0, 0, 0, 0.45);
			backdrop-filter: blur(8px);
			-webkit-backdrop-filter: blur(8px);
			border-radius: 12px;
			padding: 10px 12px;
			flex-direction: column;
			min-width: 50px;
		}
	}
}

.videoWrapper {
	width: 100%;
	flex: 1;
	min-height: 0;
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

/* 自定义进度条 */
.progressBar {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 15;
	padding: 10px 0 6px;
	cursor: pointer;
	touch-action: none;
	-webkit-tap-highlight-color: transparent;
}

.progressTrack {
	position: relative;
	height: 3px;
	margin: 0 8px;
	background: rgba(255, 255, 255, 0.25);
	border-radius: 2px;
	transition: height 0.15s ease;
}

.progressTrackActive {
	height: 5px;
}

.progressBar:hover .progressTrack {
	height: 5px;
}

.progressFill {
	height: 100%;
	background: rgba(255, 255, 255, 0.85);
	border-radius: 2px;
	pointer-events: none;
}

.progressThumb {
	position: absolute;
	top: 50%;
	width: 14px;
	height: 14px;
	background: #fff;
	border-radius: 50%;
	transform: translate(-50%, -50%);
	pointer-events: none;
	box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
}

.progressTooltip {
	position: absolute;
	bottom: 100%;
	transform: translateX(-50%);
	padding: 3px 8px;
	background: rgba(0, 0, 0, 0.8);
	color: #fff;
	font-size: 12px;
	font-weight: 500;
	border-radius: 4px;
	white-space: nowrap;
	pointer-events: none;
	margin-bottom: 6px;
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

@keyframes heartPop {
	0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
	15% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
	30% { transform: translate(-50%, -50%) scale(0.95); }
	45% { transform: translate(-50%, -50%) scale(1); }
	80% { opacity: 1; }
	100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
}

/* 视频下方信息区域 */
.infoArea {
	flex-shrink: 0;
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 10px 16px;
	background: var(--MI_THEME-bg, #111);
}

.infoAvatarLink {
	flex-shrink: 0;
	cursor: pointer;
	transition: opacity 0.2s;
	&:hover { opacity: 0.8; }
}

.infoAvatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	flex-shrink: 0;
}

.infoContent {
	flex: 1;
	min-width: 0;
}

.infoNameRow {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 2px;
}

.infoUsername {
	font-weight: 600;
	font-size: 13px;
	color: var(--MI_THEME-fg);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	&:hover { text-decoration: underline; }
}

.infoPlatformBadge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	border-radius: 4px;
	background: var(--MI_THEME-bgTransparent);
	font-size: 13px;
	color: var(--MI_THEME-fgTransparentWeak);
	cursor: help;
}

.infoDurationBadge {
	display: inline-flex;
	align-items: center;
	padding: 1px 5px;
	border-radius: 3px;
	background: var(--MI_THEME-bgTransparent);
	font-size: 11px;
	font-weight: 500;
	color: var(--MI_THEME-fgTransparentWeak);
	letter-spacing: 0.3px;
}

.infoCaptionWrap {
	position: relative;
}

.infoCaption {
	font-size: 13px;
	color: var(--MI_THEME-fgTransparentWeak);
	line-height: 1.4;
	cursor: pointer;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
	&:hover {
		color: var(--MI_THEME-fg);
	}
}

.infoCaptionExpanded {
	-webkit-line-clamp: unset;
	display: block;
}

.infoCaptionToggle {
	display: inline-block;
	margin-top: 2px;
	font-size: 12px;
	color: var(--MI_THEME-accent);
	cursor: pointer;
	padding: 0;
	&:hover {
		text-decoration: underline;
	}
}

.actions {
	flex-shrink: 0;
	display: flex;
	justify-content: space-around;
	align-items: center;
	padding: 8px 16px 12px;
	background: var(--MI_THEME-bg, #111);
}

.actionButton {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	min-width: 44px;
	padding: 6px 8px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 20px;
	border-radius: 8px;
	transition: all 0.2s;
	span { font-size: 11px; font-weight: 500; color: var(--MI_THEME-fgTransparentWeak); }
	&:hover { background: var(--MI_THEME-bgTransparent); }
	&:active { transform: scale(0.9); }
	&:nth-child(1):hover { color: #1d9bf0; }
	&:nth-child(2):hover { color: #00ba7c; }
	&:nth-child(3):hover { color: #f91880; }
	&:nth-child(4):hover { color: #1d9bf0; }
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

.loading {
	position: absolute;
	bottom: 60px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 20;
}

@media (max-width: 768px) {
	.root {
		:global(.swiper) {
			width: 100% !important;
			max-width: none !important;
		}
	}
	.actions { padding: 6px 12px 10px; }
	.infoArea { padding: 8px 12px; }
	.infoAvatar { width: 28px; height: 28px; }
	.infoAvatarLink { display: flex; }
	.infoUsername { font-size: 12px; }
	.infoCaption { font-size: 12px; }
	.infoCaptionToggle { font-size: 11px; }
	.navBtn { display: none; }
	.actionButton { font-size: 18px; padding: 4px 6px; min-width: 40px; }
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
