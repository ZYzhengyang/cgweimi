<!--
  CG微米 (CGVMI) - 刷视频组件
  居中播放布局，Swiper 鼠标滚轮切换、键盘控制
-->

<template>
<div ref="rootEl" :class="$style.root">

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
							@loadedmetadata="onMetadataLoaded(index)"
						></video>

						<!-- 点击/双击捕获层 -->
						<div
							:class="$style.clickOverlay"
							@click.stop="onTap($event, note, index)"
							@dblclick.prevent.stop="onDoubleTap($event, note, index)"
						></div>

						<!-- 暂停图标 -->
						<div v-if="isPlaying[index] === false" :class="$style.pauseIcon">
							<i class="ti ti-player-play-filled"></i>
						</div>

						<!-- 双击爱心粒子 -->
						<template v-if="heartParticles[index]?.length">
							<div
								v-for="p in heartParticles[index]"
								:key="p.id"
								:class="$style.heartParticle"
								:style="{
									left: p.x + '%',
									top: p.y + '%',
									'--tx': p.targetX + 'px',
									'--ty': p.targetY + 'px',
									fontSize: p.size + 'px',
									animationDelay: p.delay + 'ms',
								}"
							>❤️</div>
						</template>

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

				<!-- 顶部细进度条（2px 粉色） -->
				<div :class="$style.topProgress">
					<div :class="$style.topProgressFill" :style="{ width: getProgressPercent(index) + '%' }"></div>
				</div>

				<!-- 底部信息叠加层（半透明渐变遮罩） -->
				<div :class="$style.bottomOverlay">
					<MkA :to="userPage(note.user)" :class="$style.bottomAuthor">@{{ note.user.username }}</MkA>
					<div v-if="note.text" :class="$style.bottomCaption" @click.stop="openNote(note)">{{ note.text }}</div>
				</div>

				<!-- 右侧竖排操作按钮 -->
				<div :class="$style.sideActions">
					<!-- 头像 + 关注 -->
					<div :class="$style.sideAvatarWrap">
						<MkAvatar :user="note.user" :class="$style.sideAvatar"/>
						<button class="_button" :class="$style.sideFollowBtn">
							<i class="ti ti-plus"></i>
						</button>
					</div>
					<!-- 点赞 -->
					<button class="_button" :class="$style.sideActionBtn" @click.stop="toggleLike(note)">
						<i :class="note.myReaction ? 'ti ti-heart-filled' : 'ti ti-heart'" :style="note.myReaction ? 'color: var(--MI_THEME-love)' : ''"></i>
						<span>{{ note.reactionCount || 0 }}</span>
					</button>
					<!-- 评论 -->
					<button class="_button" :class="$style.sideActionBtn" @click.stop="openCommentDrawer(note)">
						<i class="ti ti-message-circle"></i>
						<span>{{ note.repliesCount || 0 }}</span>
					</button>
					<!-- 转发 -->
					<button class="_button" :class="$style.sideActionBtn" @click.stop="renoteNote(note)">
						<i class="ti ti-repeat"></i>
						<span>{{ note.renoteCount || 0 }}</span>
					</button>
					<!-- 分享 -->
					<button class="_button" :class="$style.sideActionBtn" @click.stop="shareNote(note)">
						<i class="ti ti-share"></i>
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

	<!-- 底部评论抽屉 -->
	<MkCommentDrawer
		v-if="commentDrawerNote"
		:note="commentDrawerNote"
		@closed="closeCommentDrawer"
	/>

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
import { ref, reactive, onMounted, onUnmounted, onActivated, onDeactivated, watch } from 'vue';
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
import MkCommentDrawer from '@/components/MkCommentDrawer.vue';
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


const rootEl = ref<HTMLElement | null>(null);
const videoNotes = ref<Misskey.entities.Note[]>([]);
const loading = ref(false);
const hasMore = ref(true);
const videoRefs = new Map<number, HTMLVideoElement>();
const isPlaying = reactive<Record<number, boolean>>({});
// 双击点赞粒子
interface HeartParticle {
	id: number;
	x: number; // 容器内百分比位置
	y: number;
	targetX: number; // 动画终点偏移 (px)
	targetY: number;
	size: number;
	delay: number;
}
const heartParticles = reactive<Record<number, HeartParticle[]>>({});
let particleIdCounter = 0;
// 单击/双击区分定时器
const clickTimers = reactive<Record<number, ReturnType<typeof setTimeout> | null>>({});
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

/** 清理 Swiper 虚拟模式销毁 slide 后的僵尸引用 */
function cleanupStaleRefs() {
	for (const [idx, video] of videoRefs) {
		if (!video.isConnected) {
			if (intersectionObserver) intersectionObserver.unobserve(video);
			video.pause();
			videoRefs.delete(idx);
			userPaused.delete(idx);
			delete videoProgress[idx];
			delete isPlaying[idx];
			delete videoDurations[idx];
			delete heartParticles[idx];
			if (clickTimers[idx]) { clearTimeout(clickTimers[idx]!); clickTimers[idx] = null; }
		}
	}
}

function onSlideChange() {
	if (!swiperInstance) return;
	cleanupStaleRefs();
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
		togglePlayPause(currentIndex.value);
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
		// 预加载相邻视频（延迟执行，不阻塞当前播放；用 setTimeout 兼容 Safari/iOS）
		setTimeout(() => preloadAdjacent(index), 100);
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

function onTap(e: MouseEvent, note: Misskey.entities.Note, index: number) {
	if (clickTimers[index]) {
		// 第二次点击 — 交给 dblclick 处理
		clearTimeout(clickTimers[index]!);
		clickTimers[index] = null;
		return;
	}
	// 300ms 内无第二次点击 → 单击 → 切换播放/暂停
	clickTimers[index] = setTimeout(() => {
		clickTimers[index] = null;
		togglePlayPause(index);
	}, 300);
}

function onDoubleTap(e: MouseEvent, note: Misskey.entities.Note, index: number) {
	if (clickTimers[index]) {
		clearTimeout(clickTimers[index]!);
		clickTimers[index] = null;
	}
	// 在点击位置生成爱心粒子
	const overlay = e.currentTarget as HTMLElement;
	const container = overlay.parentElement;
	if (container) {
		const rect = container.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 100;
		const y = ((e.clientY - rect.top) / rect.height) * 100;
		spawnHeartParticles(index, x, y);
	}
	if (!note.myReaction) toggleLike(note);
}

function spawnHeartParticles(index: number, x: number, y: number) {
	const count = 8;
	const particles: HeartParticle[] = [];
	for (let i = 0; i < count; i++) {
		const angle = ((360 / count) * i + (Math.random() - 0.5) * 30) * (Math.PI / 180);
		const distance = 60 + Math.random() * 80;
		particles.push({
			id: ++particleIdCounter,
			x,
			y,
			targetX: Math.cos(angle) * distance,
			targetY: Math.sin(angle) * distance,
			size: 20 + Math.random() * 20,
			delay: Math.random() * 100,
		});
	}
	heartParticles[index] = particles;
	setTimeout(() => { delete heartParticles[index]; }, 1200);
}

function togglePlayPause(index: number) {
	const note = videoNotes.value[index];
	if (note && getExternalVideo(note)) return;
	const video = videoRefs.get(index);
	if (!video) return;
	if (video.paused) {
		video.play().catch(() => {});
		isPlaying[index] = true;
	} else {
		video.pause();
		isPlaying[index] = false;
	}
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

// 底部评论抽屉状态
const commentDrawerNote = ref<Misskey.entities.Note | null>(null);

function openCommentDrawer(note: Misskey.entities.Note) {
	if (!$i) {
		pleaseLogin({ message: '登录后即可评论' });
		return;
	}
	commentDrawerNote.value = note;
}

function closeCommentDrawer() {
	commentDrawerNote.value = null;
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
	height: 100svh;
	position: relative;
	background: #000;
	overflow: hidden;
	touch-action: pan-x pan-y;
	-webkit-overflow-scrolling: touch;
	overscroll-behavior: contain;

	:global(.swiper) {
		width: 100%;
		height: 100%;
		margin: 0;
	}

	:global(.swiper-slide) {
		width: 100%;
		height: 100%;
	}
}

.slide {
	width: 100%;
	height: 100%;
	position: relative;
	overflow: hidden;
}

.videoWrapper {
	position: absolute;
	inset: 0;
	background: #000;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
}

.video {
	width: 100%;
	height: 100%;
	object-fit: cover;
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

/* 点击/双击捕获层 */
.clickOverlay {
	position: absolute;
	inset: 0;
	z-index: 10;
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;
}

/* 暂停图标 */
.pauseIcon {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 11;
	pointer-events: none;
	font-size: 64px;
	color: rgba(255, 255, 255, 0.6);
	filter: drop-shadow(0 0 12px rgba(0, 0, 0, 0.3));
	animation: pauseIconFadeIn 0.2s ease;
}

@keyframes pauseIconFadeIn {
	from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
	to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

/* 双击爱心粒子 */
.heartParticle {
	position: absolute;
	pointer-events: none;
	z-index: 11;
	animation: heartParticleFly 1s ease-out forwards;
}

@keyframes heartParticleFly {
	0% {
		opacity: 1;
		transform: translate(-50%, -50%) scale(0.3);
	}
	20% {
		opacity: 1;
		transform: translate(calc(-50% + var(--tx) * 0.3), calc(-50% + var(--ty) * 0.3)) scale(1.2);
	}
	100% {
		opacity: 0;
		transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.6);
	}
}

/* 顶部 2px 细进度条 */
.topProgress {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	z-index: 20;
	height: 2px;
	background: rgba(255, 255, 255, 0.2);
}

.topProgressFill {
	height: 100%;
	background: #fe2c55;
	transition: width 0.15s linear;
}

/* 底部信息叠加层 */
.bottomOverlay {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 80px;
	z-index: 12;
	padding: 60px 16px 24px;
	background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
}

.bottomAuthor {
	display: block;
	font-weight: 700;
	font-size: 15px;
	color: #fff;
	text-decoration: none;
	margin-bottom: 6px;
	&:hover { text-decoration: underline; }
}

.bottomCaption {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.9);
	line-height: 1.4;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	cursor: pointer;
}

/* 右侧竖排操作按钮 */
.sideActions {
	position: absolute;
	right: 8px;
	bottom: 100px;
	z-index: 16;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
}

.sideAvatarWrap {
	position: relative;
	margin-bottom: 4px;
}

.sideAvatar {
	width: 44px;
	height: 44px;
	border-radius: 50%;
	border: 2px solid #fff;
}

.sideFollowBtn {
	position: absolute;
	bottom: -6px;
	left: 50%;
	transform: translateX(-50%);
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: #fe2c55;
	color: #fff;
	font-size: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.sideActionBtn {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	padding: 4px;
	color: #fff;
	font-size: 26px;
	background: transparent;
	transition: all 0.2s;
	span { font-size: 11px; font-weight: 500; color: rgba(255, 255, 255, 0.85); }
	&:active { transform: scale(0.85); }
}

.loading {
	position: absolute;
	bottom: 60px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 20;
}

@media (max-width: 768px) {
	.sideActions {
		right: 6px;
		bottom: 80px;
		gap: 12px;
	}
	.sideActionBtn { font-size: 22px; }
	.sideAvatar { width: 38px; height: 38px; }
	.bottomOverlay {
		right: 70px;
		padding-bottom: 16px;
	}
	.bottomAuthor { font-size: 14px; }
	.bottomCaption { font-size: 12px; }
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
