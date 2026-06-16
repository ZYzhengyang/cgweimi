<!--
  CG微米 (CGVMI) - 刷视频组件
  居中播放布局，Swiper 鼠标滚轮切换、键盘控制
-->

<template>
<div ref="rootEl" :class="$style.root">

	<!-- P4-24: 桌面端双栏布局容器 -->
	<div :class="$style.mainArea">
	<!-- Swiper 视频流 -->
	<Swiper
		direction="vertical"
		:slides-per-view="1"
		:space-between="0"
		:speed="450"
		:threshold="10"
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
						loading="lazy"
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
							:preload="index === 0 ? 'auto' : 'metadata'"
							@loadedmetadata="onMetadataLoaded(index)"
						></video>

						<!-- 点击/双击捕获层 + 左右滑动手势 + P4-15 长按 -->
						<div
							:class="$style.clickOverlay"
							@click.stop="onTap($event, note, index)"
							@dblclick.prevent.stop="onDoubleTap($event, note, index)"
							@touchstart.passive="onSwipeTouchStart; onLongPressStart(index)"
							@touchend.passive="onSwipeTouchEnd($event, note); onLongPressEnd()"
						></div>

						<!-- P4-11: 视频加载失败兜底 -->
						<div v-if="videoErrors[index]" :class="$style.videoError">
							<i class="ti ti-alert-triangle" :class="$style.videoErrorIcon"></i>
							<div :class="$style.videoErrorText">视频加载失败</div>
							<button :class="$style.videoRetryBtn" @click.stop="retryVideo(index)">
								<i class="ti ti-refresh"></i> 重试
							</button>
						</div>

						<!-- 暂停图标（加载失败时不显示） -->
						<div v-if="isPlaying[index] === false && !videoErrors[index]" :class="$style.pauseIcon">
							<i class="ti ti-player-play-filled"></i>
						</div>

					<!-- 双击主心形缩放动画（在粒子下层） -->
					<div
						v-if="mainHeart.visible && mainHeart.index === index"
						:class="$style.mainHeart"
						:style="{ left: mainHeart.x + '%', top: mainHeart.y + '%' }"
					>❤️</div>

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

						<!-- 自定义进度条（支持拖拽 seek + P4-13 hover 时间预览） -->
						<div
							:class="$style.progressBar"
							@mousedown.stop.prevent="onProgressDragStart($event, index)"
							@touchstart.stop.prevent="onProgressDragStart($event, index)"
							@mousemove="onProgressHover($event, index)"
							@mouseleave="onProgressHoverEnd"
						>
							<div :class="[$style.progressTrack, { [$style.progressTrackActive]: isDragging && dragIndex === index }]">
								<!-- P2-2.4: 缓冲进度浅色条 -->
								<div :class="$style.progressBuffer" :style="{ width: (videoBuffered[index] || 0) * 100 + '%' }"></div>
								<div :class="$style.progressFill" :style="{ width: getProgressPercent(index) + '%' }"></div>
								<div
									v-if="isDragging && dragIndex === index"
									:class="$style.progressThumb"
									:style="{ left: dragProgress * 100 + '%' }"
								></div>
							</div>
							<div
								v-if="(isDragging && dragIndex === index) || hoverIndex === index"
								:class="$style.progressTooltip"
								:style="{ left: getTooltipLeft() + '%' }"
							>{{ formatDuration(isDragging && dragIndex === index ? dragTime : hoverTime) }} / {{ formatDuration(videoDurations[index] || 0) }}</div>
						</div>
					</template>

				</div>

				<!-- 顶部细进度条（2px 粉色）+ 缓冲 -->
				<div :class="$style.topProgress">
					<div :class="$style.topProgressBuffer" :style="{ width: (videoBuffered[index] || 0) * 100 + '%' }"></div>
					<div :class="$style.topProgressFill" :style="{ width: getProgressPercent(index) + '%' }"></div>
				</div>

				<!-- 底部信息叠加层（半透明渐变遮罩） -->
				<div :class="$style.bottomOverlay">
					<MkA :to="userPage(note.user)" :class="$style.bottomAuthor">@{{ note.user.username }}</MkA>
					<!-- P3-3.4: 描述文字最多2行，点击展开/收起 -->
					<div
						v-if="note.text"
						:class="[$style.bottomCaption, { [$style.bottomCaptionExpanded]: expandedCaptions[note.id] }]"
						@click.stop="toggleCaption(note.id)"
					>{{ note.text }}</div>
					<div v-if="expandedCaptions[note.id]" :class="$style.captionCollapse" @click.stop="toggleCaption(note.id)">收起</div>
					<!-- 播放次数 -->
					<div v-if="note.views" :class="$style.viewCount">
						<i class="ti ti-eye"></i>
						<span>{{ compactNumber(note.views) }}播放</span>
					</div>
					<!-- P3-3.4: 位置标签 -->
					<div v-if="note.geo" :class="$style.geoTag">
						<i class="ti ti-map-pin"></i>
						<span>{{ note.geo.address || `${note.geo.coordinates?.coordinates?.[1]?.toFixed(2)}, ${note.geo.coordinates?.coordinates?.[0]?.toFixed(2)}` }}</span>
					</div>
					<!-- P2-3.2: 音乐信息 -->
					<div v-if="getAudioFile(note)" :class="$style.musicInfo">
						<div :class="$style.musicDisc"><i class="ti ti-music"></i></div>
						<div :class="$style.musicMarquee">
							<span>{{ getAudioFile(note)!.name }}&nbsp;&nbsp;&nbsp;</span>
							<span>{{ getAudioFile(note)!.name }}&nbsp;&nbsp;&nbsp;</span>
						</div>
					</div>
					<!-- P1-2.2 音量控制：静音切换 -->
					<button class="_button" :class="$style.muteBtn" @click.stop="toggleMute" :title="isMuted ? '取消静音 (M)' : '静音 (M)'">
						<i :class="isMuted ? 'ti ti-volume-off' : 'ti ti-volume'"></i>
					</button>
				</div>

				<!-- 右侧竖排操作按钮 -->
				<div :class="$style.sideActions">
					<!-- 头像 + 关注 -->
					<div :class="$style.sideAvatarWrap">
						<MkAvatar :user="note.user" :class="$style.sideAvatar"/>
						<button
							v-if="note.user.id !== ($i && $i.id)"
							class="_button"
							:class="[$style.sideFollowBtn, { [$style.sideFollowActive]: followStates[note.user.id], [$style.sideFollowLoading]: followLoading[note.user.id] }]"
							@click.stop="toggleFollow(note)"
						>
							<i :class="followStates[note.user.id] ? 'ti ti-check' : 'ti ti-plus'"></i>
						</button>
					</div>
					<!-- 点赞 -->
					<button class="_button" :class="[$style.sideActionBtn, { [$style.likeAnimating]: likeAnimating[note.id] }]" @click.stop="toggleLike(note)">
						<i :class="note.myReaction ? 'ti ti-heart-filled' : 'ti ti-heart'" :style="note.myReaction ? 'color: var(--MI_THEME-love)' : ''"></i>
						<span>{{ note.reactionCount || 0 }}</span>
					</button>
					<!-- 收藏 -->
					<button class="_button" :class="$style.sideActionBtn" @click.stop="toggleFavorite(note)">
						<i :class="favoriteStates[note.id] ? 'ti ti-star-filled' : 'ti ti-star'" :style="favoriteStates[note.id] ? 'color: #ffd700' : ''"></i>
						<span></span>
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

	<!-- P4-12: 空状态 -->
	<div v-if="videoNotes.length === 0 && !loading && !fetchError" :class="$style.emptyState">
		<i class="ti ti-video-off" :class="$style.emptyIcon"></i>
		<div :class="$style.emptyTitle">暂无视频</div>
		<div :class="$style.emptyDesc">发布一条视频试试吧</div>
		<button :class="$style.emptyBtn" @click="retryFetch">
			<i class="ti ti-refresh"></i> 刷新
		</button>
	</div>

	<!-- P4-12: 加载失败 -->
	<div v-if="fetchError" :class="$style.emptyState">
		<i class="ti ti-wifi-off" :class="$style.emptyIcon"></i>
		<div :class="$style.emptyTitle">加载失败</div>
		<div :class="$style.emptyDesc">网络异常，请稍后重试</div>
		<button :class="$style.emptyBtn" @click="retryFetch">
			<i class="ti ti-refresh"></i> 重试
		</button>
	</div>

	<!-- P4-12: 已经到底了 -->
	<div v-if="!hasMore && videoNotes.length > 0 && !loading" :class="$style.endHint">
		<i class="ti ti-player-track-prev"></i>
		<span>已经到底了，往上翻翻看</span>
	</div>

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
	</div><!-- /mainArea -->

	<!-- P4-24: 桌面端右侧面板（≥1024px 显示） -->
	<div v-if="isDesktop && currentNote" :class="$style.rightPanel">
		<!-- 作者信息 -->
		<div :class="$style.panelAuthor">
			<MkAvatar :user="currentNote.user" :class="$style.panelAvatar"/>
			<div :class="$style.panelAuthorInfo">
				<div :class="$style.panelAuthorName">{{ currentNote.user.name || currentNote.user.username }}</div>
				<div :class="$style.panelAuthorHandle">@{{ currentNote.user.username }}</div>
			</div>
			<button
				v-if="currentNote.user.id !== ($i && $i.id)"
				class="_button"
				:class="[$style.panelFollowBtn, { [$style.panelFollowActive]: followStates[currentNote.user.id] }]"
				@click.stop="toggleFollow(currentNote)"
			>{{ followStates[currentNote.user.id] ? '已关注' : '关注' }}</button>
		</div>

		<!-- 描述 -->
		<div v-if="currentNote.text" :class="$style.panelDesc">{{ currentNote.text }}</div>

		<!-- 操作栏 -->
		<div :class="$style.panelActions">
			<button class="_button" :class="$style.panelActionBtn" @click.stop="toggleLike(currentNote)">
				<i :class="currentNote.myReaction ? 'ti ti-heart-filled' : 'ti ti-heart'" :style="currentNote.myReaction ? 'color: var(--MI_THEME-love)' : ''"></i>
				<span>{{ currentNote.reactionCount || 0 }}</span>
			</button>
			<button class="_button" :class="$style.panelActionBtn" @click.stop="toggleFavorite(currentNote)">
				<i :class="favoriteStates[currentNote.id] ? 'ti ti-star-filled' : 'ti ti-star'" :style="favoriteStates[currentNote.id] ? 'color: #ffd700' : ''"></i>
			</button>
			<button class="_button" :class="$style.panelActionBtn">
				<i class="ti ti-message-circle"></i>
				<span>{{ currentNote.repliesCount || 0 }}</span>
			</button>
			<button class="_button" :class="$style.panelActionBtn" @click.stop="renoteNote(currentNote)">
				<i class="ti ti-repeat"></i>
				<span>{{ currentNote.renoteCount || 0 }}</span>
			</button>
			<button class="_button" :class="$style.panelActionBtn" @click.stop="shareNote(currentNote)">
				<i class="ti ti-share"></i>
			</button>
		</div>

		<!-- 评论列表 -->
		<div :class="$style.panelComments" ref="panelCommentsEl">
			<div v-if="panelCommentsLoading" :class="$style.panelCommentsStatus"><MkLoading mini/></div>
			<div v-else-if="panelComments.length === 0" :class="$style.panelCommentsStatus">暂无评论</div>
			<template v-else>
				<div v-for="reply in panelSortedComments" :key="reply.id" :class="$style.panelComment">
					<MkAvatar :user="reply.user" :class="$style.panelCommentAvatar"/>
					<div :class="$style.panelCommentBody">
						<span :class="$style.panelCommentName">{{ reply.user?.name || reply.user?.username }}</span>
						<div v-if="reply.text" :class="$style.panelCommentText">{{ reply.text }}</div>
						<span :class="$style.panelCommentTime"><MkTime :time="reply.createdAt"/></span>
					</div>
				</div>
				<div v-if="panelCommentsLoadingMore" :class="$style.panelCommentsStatus"><MkLoading mini/></div>
				<div v-else-if="panelNoMore" :class="$style.panelCommentsNoMore">没有更多评论了</div>
			</template>
		</div>

		<!-- 评论输入框 -->
		<div :class="$style.panelInputArea">
			<div :class="$style.panelInputWrap">
				<textarea
					v-model="panelCommentText"
					:class="$style.panelTextarea"
					placeholder="写评论..."
					rows="1"
					@keydown.enter.exact.prevent="submitPanelComment"
				></textarea>
				<button class="_button" :class="$style.panelSendBtn" :disabled="!panelCommentText.trim()" @click="submitPanelComment">
					<i class="ti ti-send"></i>
				</button>
			</div>
		</div>
	</div>

	<!-- P3-3.3: 分享面板 -->
	<Teleport to="body">
		<Transition name="sharePanel">
			<div v-if="sharePanelNote" :class="$style.shareOverlay" @click.self="closeSharePanel">
				<div :class="$style.sharePanel">
					<div :class="$style.sharePanelTitle">分享到</div>
					<div :class="$style.sharePanelOptions">
						<button :class="$style.shareOption" @click="shareToWeChat(sharePanelNote!)">
							<div :class="$style.shareIcon" style="background: #07c160;"><i class="ti ti-brand-wechat"></i></div>
							<span>微信</span>
						</button>
						<button :class="$style.shareOption" @click="shareToQQ(sharePanelNote!)">
							<div :class="$style.shareIcon" style="background: #12b7f5;"><i class="ti ti-brand-qq"></i></div>
							<span>QQ</span>
						</button>
						<button :class="$style.shareOption" @click="copyShareLink(sharePanelNote!)">
							<div :class="$style.shareIcon" style="background: rgba(255,255,255,0.2);"><i class="ti ti-link"></i></div>
							<span>复制链接</span>
						</button>
						<button :class="$style.shareOption" @click="saveVideo(sharePanelNote!)">
							<div :class="$style.shareIcon" style="background: rgba(255,255,255,0.2);"><i class="ti ti-download"></i></div>
							<span>保存视频</span>
						</button>
					</div>
					<button :class="$style.shareCancel" @click="closeSharePanel">取消</button>
				</div>
			</div>
		</Transition>
	</Teleport>

	<!-- 底部评论抽屉（仅移动端） -->
	<MkCommentDrawer
		v-if="commentDrawerNote && !isDesktop"
		:note="commentDrawerNote"
		mode="bottom"
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
		:muted="isMuted"
		@close="closeMiniPlayer"
		@restore="restoreFromMiniPlayer"
		@timeUpdate="onMiniPlayerTimeUpdate"
	/>

	<!-- P4-13: 快捷键帮助弹窗 -->
	<Teleport to="body">
		<Transition name="shortcutsPanel">
			<div v-if="showShortcuts" :class="$style.shortcutsOverlay" @click.self="closeShortcuts">
				<div :class="$style.shortcutsPanel">
					<div :class="$style.shortcutsTitle">键盘快捷键</div>
					<div :class="$style.shortcutsList">
						<div :class="$style.shortcutItem"><kbd>Space</kbd><span>播放 / 暂停</span></div>
						<div :class="$style.shortcutItem"><kbd>M</kbd><span>静音 / 取消静音</span></div>
						<div :class="$style.shortcutItem"><kbd>F</kbd><span>全屏 / 退出全屏</span></div>
						<div :class="$style.shortcutItem"><kbd>↑</kbd><span>上一个视频</span></div>
						<div :class="$style.shortcutItem"><kbd>↓</kbd><span>下一个视频</span></div>
						<div :class="$style.shortcutItem"><kbd>?</kbd><span>显示 / 隐藏此帮助</span></div>
					</div>
					<button :class="$style.shortcutsClose" @click="closeShortcuts">知道了</button>
				</div>
			</div>
		</Transition>
	</Teleport>

	<!-- P4-15: 倍速选择浮层 -->
	<Teleport to="body">
		<Transition name="speedPanel">
			<div v-if="showSpeedPanel" :class="$style.speedOverlay" @click.self="closeSpeedPanel">
				<div :class="$style.speedPanel">
					<div :class="$style.speedTitle">播放速度</div>
					<div :class="$style.speedOptions">
						<button
							v-for="s in [0.5, 1, 1.5, 2]"
							:key="s"
							:class="[$style.speedBtn, { [$style.speedBtnActive]: playbackSpeed === s }]"
							@click="setPlaybackSpeed(s)"
						>{{ s }}x</button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>

</div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch, nextTick } from 'vue';
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
import MkTime from '@/components/global/MkTime.vue';
import MkMiniPlayer from '@/components/MkMiniPlayer.vue';
import MkCommentDrawer from '@/components/MkCommentDrawer.vue';
import { misskeyApiGet, misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { toast } from '@/os.js';
import { pleaseLogin } from '@/utility/please-login.js';
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

function hasLocalVideo(note: Misskey.entities.Note): boolean {
	return note.files?.some(f => f.type.startsWith('video/')) ?? false;
}

// P2-3.2: 获取帖子的音频附件
function getAudioFile(note: Misskey.entities.Note) {
	return note.files?.find(f => f.type.startsWith('audio/')) ?? null;
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
// VF-BUG-8: 追踪已绑定事件监听器的元素，防止虚拟模式重建 slide 时重复添加
const boundVideoElements = new WeakSet<HTMLVideoElement>();
// BUG-01 fix: 使用 AbortController 统一管理 video 元素的事件监听器生命周期
const videoAbortControllers = new Map<number, AbortController>();
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
// 双击主心形动画状态（位置 + 可见性）
const mainHeart = reactive<{ index: number; x: number; y: number; visible: boolean }>({ index: -1, x: 0, y: 0, visible: false });
let particleIdCounter = 0;
// 紧凑数字格式化（1.2万播放）
const compactFormat = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
function compactNumber(n: number | undefined | null): string {
	if (n == null || n <= 0) return '0';
	return compactFormat.format(n);
}
// 单击/双击区分定时器
const clickTimers = reactive<Record<number, ReturnType<typeof setTimeout> | null>>({});
const videoDurations = reactive<Record<number, number>>({});
let swiperInstance: SwiperClass | null = null;

// 进度条拖拽状态
const videoProgress = reactive<Record<number, number>>({});
const videoBuffered = reactive<Record<number, number>>({});
const isDragging = ref(false);
const dragIndex = ref(0);
const dragProgress = ref(0);
const dragTime = ref(0);
let wasPlayingBeforeDrag = false;
// P4-13: 进度条 hover 时间预览
const hoverIndex = ref(-1);
const hoverTime = ref(0);
let hoverProgress = 0;
let dragRect: DOMRect | null = null;
const currentIndex = ref(0);
// BUG-02 fix: 安全的 localStorage 读写（防止隐私模式/存储禁用时崩溃）
function safeGetItem(key: string, fallback: string): string {
	try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function safeSetItem(key: string, value: string): void {
	try { localStorage.setItem(key, value); } catch {}
}
// 音量记忆 — 从 localStorage 恢复
const savedVolume = parseFloat(safeGetItem('cgvmi-video-volume', '1'));
const savedMuted = safeGetItem('cgvmi-video-muted', '1') !== 'false'; // 默认静音（自动播放策略）
const isMuted = ref(savedMuted);
const volume = ref(savedVolume);

// P2-3.1: 关注状态追踪（userId → boolean）
const followStates = reactive<Record<string, boolean>>({});
const followLoading = reactive<Record<string, boolean>>({});

// P4-01: 收藏状态追踪（noteId → boolean）
const favoriteStates = reactive<Record<string, boolean>>({});

// P4-04: 点赞按钮弹跳动画状态
const likeAnimating = reactive<Record<string, boolean>>({});

// P4-11: 视频加载失败状态（index → true）
const videoErrors = reactive<Record<number, boolean>>({});

// P4-12: Feed 加载失败状态
const fetchError = ref(false);

// P4-13: 快捷键弹窗
const showShortcuts = ref(false);

// P4-15: 倍速播放（localStorage 记忆）
const savedSpeed = parseFloat(safeGetItem('cgvmi-video-speed', '1'));
const playbackSpeed = ref(savedSpeed);
const showSpeedPanel = ref(false);
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let longPressTriggered = false;

async function toggleFollow(note: Misskey.entities.Note) {
	if (!$i) {
		pleaseLogin({ message: '登录后即可关注' });
		return;
	}
	const user = note.user;
	if (user.id === $i.id) return; // 不能关注自己

	const userId = user.id;
	if (followLoading[userId]) return;
	followLoading[userId] = true;

	try {
		if (followStates[userId]) {
			await misskeyApi('following/delete', { userId });
			followStates[userId] = false;
		} else {
			await misskeyApi('following/create', { userId });
			followStates[userId] = true;
		}
	} catch {
		toast('操作失败，请稍后重试');
	} finally {
		followLoading[userId] = false;
	}
}

// 初始化关注状态（从 note.user 获取，UserLite 类型不含此字段但 API 实际会返回）
function initFollowState(note: Misskey.entities.Note) {
	const userId = note.user.id;
	if (followStates[userId] === undefined) {
		const user = note.user as Record<string, unknown>;
		if (user.isFollowing != null) {
			followStates[userId] = !!user.isFollowing;
		}
	}
}

// P2-2.3: 左右滑动手势状态
let swipeStartX = 0;
let swipeStartY = 0;
let swipeStartTime = 0;
const SWIPE_THRESHOLD = 80; // 最小水平滑动距离
const SWIPE_MAX_VERTICAL = 60; // 最大垂直偏移（超过则视为上下滑，忽略）
const SWIPE_MAX_TIME = 500; // 最大滑动时间 ms

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

// VF-BUG-5: 同步小窗当前播放时间，防止恢复时跳回创建时的时间
function onMiniPlayerTimeUpdate(time: number) {
	miniPlayer.startTime = time;
}

// 访客视频限制
const GUEST_VIDEO_LIMIT = 5;
const watchedVideoIds = new Set<string>(); // VF-BUG-10: 用 Set 去重，防止滑回已看视频重复计数
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

// P4-24: 桌面端切换视频时加载评论
watch(currentIndex, (newIdx) => {
	if (!isDesktop.value) return;
	const note = videoNotes.value[newIdx];
	if (note) fetchPanelComments(note.id);
});

function setVideoRef(index: number, el: any) {
	if (el) {
		const video = el as HTMLVideoElement;
		video.muted = isMuted.value;
		video.volume = volume.value;
		videoRefs.set(index, video);

		// VF-BUG-8: 仅在首次绑定时添加事件监听器，防止虚拟模式重建时重复添加
		if (!boundVideoElements.has(video)) {
			boundVideoElements.add(video);

			// BUG-01 fix: 使用 AbortController 管理事件监听器生命周期
			const controller = new AbortController();
			videoAbortControllers.set(index, controller);
			const signal = controller.signal;

			// 追踪用户手动暂停 — 通过 pause 事件判断是否由用户触发
			video.addEventListener('pause', () => {
				// 如果不是自动播放逻辑触发的暂停，标记为用户手动暂停
				if (!video.dataset.autoPauseing) {
					userPaused.add(index);
				}
			}, { signal });
			// 用户手动播放时清除暂停标记
			video.addEventListener('play', () => {
				userPaused.delete(index);
			}, { signal });

			// 音量变化时保存记忆
			video.addEventListener('volumechange', () => {
				isMuted.value = video.muted;
				volume.value = video.volume;
				safeSetItem('cgvmi-video-muted', String(video.muted));
				safeSetItem('cgvmi-video-volume', String(video.volume));
				// 同步更新所有已挂载视频的音量
				videoRefs.forEach((v, i) => {
					if (i !== index) {
						v.muted = video.muted;
						v.volume = video.volume;
					}
				});
			}, { signal });

			// 更新播放进度 + 缓冲进度
			video.addEventListener('timeupdate', () => {
				if (!isDragging.value && video.duration && isFinite(video.duration)) {
					videoProgress[index] = video.currentTime / video.duration;
				}
				// P2-2.4: 追踪缓冲进度
				if (video.buffered.length > 0 && video.duration && isFinite(video.duration)) {
					videoBuffered[index] = video.buffered.end(video.buffered.length - 1) / video.duration;
				}
			}, { signal });

			// P4-10: canplay 事件驱动预加载（替代固定延迟）
			video.addEventListener("canplay", () => {
				preloadAdjacent(index);
			}, { signal });

			// P4-11: 视频加载失败处理
			video.addEventListener("error", () => {
				onVideoError(index);
			}, { signal });
		}

		// P4-15: 应用倍速
		video.playbackRate = playbackSpeed.value;

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

// P3-3.4: 描述文字展开/收起状态
const expandedCaptions = reactive<Record<string, boolean>>({});

function toggleCaption(noteId: string) {
	expandedCaptions[noteId] = !expandedCaptions[noteId];
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

// iframe 交互状态（外链视频不能用本地播放控制）
function onIframeInteract(_index: number, _isHovering: boolean) {
	// 保留事件处理以备将来使用（如 iframe hover 高亮等）
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
			// BUG-01 fix: 移除所有事件监听器
			videoAbortControllers.get(idx)?.abort();
			videoAbortControllers.delete(idx);
			// 释放 src 节省内存（虚拟模式已从 DOM 移除，无需保留缓冲）
			video.removeAttribute('src');
			video.load();
			videoRefs.delete(idx);
			userPaused.delete(idx);
			delete videoProgress[idx];
			delete videoBuffered[idx];
			delete isPlaying[idx];
			delete videoDurations[idx];
			delete heartParticles[idx];
			if (clickTimers[idx]) { clearTimeout(clickTimers[idx]!); clickTimers[idx] = null; }
		}
	}
}

/**
 * P3-4.2: 远离视口（>2）的 slide 强制释放 src 节省内存。
 * 虚拟模式保留 ±1 DOM，±2 以外的 video 元素虽已销毁但 Map 中可能残留引用。
 * 此函数额外检查距离 >2 的 slide，确保其 src 已被清除。
 */
function cleanupDistantSlides(activeIndex: number) {
	for (const [idx, video] of videoRefs) {
		if (Math.abs(idx - activeIndex) > 2) {
			if (video.isConnected) {
				// 虚拟模式应该已移除，但作为安全网再清理一次
				video.pause();
				video.removeAttribute('src');
				video.load();
				video.preload = 'none';
			}
			if (intersectionObserver) intersectionObserver.unobserve(video);
			// BUG-01 fix: 移除所有事件监听器
			videoAbortControllers.get(idx)?.abort();
			videoAbortControllers.delete(idx);
			videoRefs.delete(idx);
			userPaused.delete(idx);
			delete videoProgress[idx];
			delete videoBuffered[idx];
			delete isPlaying[idx];
			delete videoDurations[idx];
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

	// P3-4.2: 清理远离视口的 slide 释放内存
	cleanupDistantSlides(newIndex);

	// P4-10: 预加载由 canplay 事件驱动，不再用固定 setTimeout

	// 访客视频计数 — VF-BUG-10: 只对新视频计数
	if (!$i) {
		const currentNote = videoNotes.value[newIndex];
		if (currentNote && !watchedVideoIds.has(currentNote.id)) {
			watchedVideoIds.add(currentNote.id);
			watchedCount.value++;
		}
		if (watchedCount.value >= GUEST_VIDEO_LIMIT && !guestLimitReached.value) {
			guestLimitReached.value = true;
			pleaseLogin({ message: '登录后继续观看更多精彩视频' });
			if (swiperInstance) {
				swiperInstance.disable();
			}
		}
	}

	// 快到底了就加载更多
	if (newIndex >= videoNotes.value.length - 8) {
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
	isMuted.value = !isMuted.value;
	// 同步所有已挂载视频的静音状态
	videoRefs.forEach(v => {
		v.muted = isMuted.value;
	});
	safeSetItem('cgvmi-video-muted', String(isMuted.value));
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
	} else if (ev.key === '?') {
		// P4-13: 快捷键帮助弹窗
		showShortcuts.value = !showShortcuts.value;
	} else if (ev.key === 'Escape' && showShortcuts.value) {
		showShortcuts.value = false;
	}
}

// P4-11: 视频加载失败处理
function onVideoError(index: number) {
	videoErrors[index] = true;
	isPlaying[index] = false;
}

function retryVideo(index: number) {
	delete videoErrors[index];
	const video = videoRefs.get(index);
	if (video) {
		video.preload = 'auto';
		video.load();
	}
}

// P4-12: Feed 重新加载
function retryFetch() {
	fetchError.value = false;
	hasMore.value = true;
	featuredFetched = false;
	videoNotes.value = [];
	fetchVideoNotes();
}

// P4-13: 快捷键弹窗
function closeShortcuts() {
	showShortcuts.value = false;
}

// P4-15: 倍速控制
function setPlaybackSpeed(speed: number) {
	playbackSpeed.value = speed;
	safeSetItem('cgvmi-video-speed', String(speed));
	videoRefs.forEach(v => {
		v.playbackRate = speed;
	});
	showSpeedPanel.value = false;
}

function onLongPressStart(index: number) {
	longPressTriggered = false;
	longPressTimer = setTimeout(() => {
		longPressTriggered = true;
		// 清除可能的单击定时器，防止长按后触发播放/暂停
		if (clickTimers[index]) {
			clearTimeout(clickTimers[index]!);
			clickTimers[index] = null;
		}
		showSpeedPanel.value = true;
	}, 500);
}

function onLongPressEnd() {
	if (longPressTimer) {
		clearTimeout(longPressTimer);
		longPressTimer = null;
	}
}

function closeSpeedPanel() {
	showSpeedPanel.value = false;
}

async function playVideo(index: number) {
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
		// P4-11: 加载失败的视频不播放
		if (videoErrors[index]) return;
		video.muted = isMuted.value;
		video.volume = volume.value;
		video.preload = 'auto';
		video.playbackRate = playbackSpeed.value;
		// BUG-03 fix: await play() promise，避免竞态条件导致状态不一致
		try {
			await video.play();
			isPlaying[index] = true;
		} catch {
			// VF-BUG-7: 自动播放被浏览器策略阻止时，显式标记为暂停状态
			// 这样暂停播放按钮覆盖层会显示，用户可以手动点击播放
			isPlaying[index] = false;
		}
	}
}

function preloadAdjacent(index: number) {
	for (let offset = 1; offset <= 2; offset++) {
		for (const dir of [-1, 1]) {
			const i = index + offset * dir;
			if (i < 0 || i >= videoNotes.value.length) continue;
			const v = videoRefs.get(i);
			if (v) {
				const targetPreload = offset === 1 ? 'auto' : 'metadata';
				// 从 none 恢复时需要 load() 才能实际触发下载
				const needsLoad = v.preload === 'none' || v.preload !== targetPreload;
				if (needsLoad) {
					v.preload = targetPreload;
					if (v.networkState === HTMLVideoElement.NETWORK_EMPTY || v.networkState === HTMLVideoElement.NETWORK_NO_SOURCE) {
						v.load();
					}
				}
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
		// 暂停后停止预加载，节省带宽
		video.preload = 'none';
	}
}

function onTap(e: MouseEvent, note: Misskey.entities.Note, index: number) {
	// P4-15: 长按后不触发单击
	if (longPressTriggered) { longPressTriggered = false; return; }
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
	// 在点击位置生成爱心粒子 + 主心形动画
	const overlay = e.currentTarget as HTMLElement;
	const container = overlay.parentElement;
	if (container) {
		const rect = container.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 100;
		const y = ((e.clientY - rect.top) / rect.height) * 100;
		spawnHeartParticles(index, x, y);
		// 主心形缩放动画
		mainHeart.index = index;
		mainHeart.x = x;
		mainHeart.y = y;
		mainHeart.visible = true;
		setTimeout(() => { mainHeart.visible = false; }, 800);
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

// 底部评论抽屉状态
const commentDrawerNote = ref<Misskey.entities.Note | null>(null);

// P4-24: 桌面端右侧面板评论状态
const panelComments = ref<Misskey.entities.Note[]>([]);
const panelCommentsLoading = ref(false);
const panelCommentsLoadingMore = ref(false);
const panelNoMore = ref(false);
const panelCommentText = ref('');
const panelCommentsEl = ref<HTMLElement | null>(null);
const panelSortedComments = computed(() =>
	[...panelComments.value].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
);

// P4-23/P4-24: 桌面端响应式
const isDesktop = ref(window.matchMedia('(min-width: 1024px)').matches);
function _onDesktopMqChange(e: MediaQueryListEvent) { isDesktop.value = e.matches; }
const desktopMq = window.matchMedia('(min-width: 1024px)');
desktopMq.addEventListener('change', _onDesktopMqChange);

// P4-24: 当前视频笔记（桌面端右侧面板用）
const currentNote = computed(() => videoNotes.value[currentIndex.value] ?? null);

function openCommentDrawer(note: Misskey.entities.Note) {
	if (!$i) {
		pleaseLogin({ message: '登录后即可评论' });
		return;
	}
	// P4-24: 桌面端评论直接在右侧面板中显示，无需打开抽屉
	if (isDesktop.value) {
		// 滚动到评论区域
		panelCommentsEl.value?.scrollTo({ top: panelCommentsEl.value.scrollHeight, behavior: 'smooth' });
		return;
	}
	commentDrawerNote.value = note;
}

function closeCommentDrawer() {
	commentDrawerNote.value = null;
}

// P4-24: 桌面端右侧面板评论加载
async function fetchPanelComments(noteId: string) {
	panelComments.value = [];
	panelCommentsLoading.value = true;
	panelNoMore.value = false;
	try {
		panelComments.value = await misskeyApi('notes/replies', { noteId, limit: 30 });
		if (panelComments.value.length < 30) panelNoMore.value = true;
	} catch {
		// ignore
	}
	panelCommentsLoading.value = false;
}

async function fetchMorePanelComments() {
	if (panelCommentsLoadingMore.value || panelNoMore.value || !currentNote.value) return;
	const oldest = panelSortedComments.value[panelSortedComments.value.length - 1];
	if (!oldest) return;
	panelCommentsLoadingMore.value = true;
	try {
		const batch = await misskeyApi('notes/replies', {
			noteId: currentNote.value.id,
			limit: 30,
			untilId: oldest.id,
		});
		if (batch.length === 0) panelNoMore.value = true;
		else {
			const existingIds = new Set(panelComments.value.map(r => r.id));
			panelComments.value.push(...batch.filter((r: Misskey.entities.Note) => !existingIds.has(r.id)));
			if (batch.length < 30) panelNoMore.value = true;
		}
	} catch {
		// ignore
	}
	panelCommentsLoadingMore.value = false;
}

function onPanelCommentsScroll() {
	const el = panelCommentsEl.value;
	if (!el || panelCommentsLoadingMore.value || panelNoMore.value) return;
	if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
		fetchMorePanelComments();
	}
}

async function submitPanelComment() {
	if (!panelCommentText.value.trim() || !currentNote.value) return;
	const text = panelCommentText.value.trim();
	panelCommentText.value = '';
	try {
		const result = await misskeyApi('notes/create', { text, replyId: currentNote.value.id });
		panelComments.value.push(result.createdNote);
		currentNote.value.repliesCount = (currentNote.value.repliesCount || 0) + 1;
		toast('已发送');
		await nextTick();
		panelCommentsEl.value?.scrollTo({ top: panelCommentsEl.value.scrollHeight, behavior: 'smooth' });
	} catch {
		panelCommentText.value = text;
		toast('发送失败');
	}
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

// P3-3.3: 分享面板状态
const sharePanelNote = ref<Misskey.entities.Note | null>(null);

function shareNote(note: Misskey.entities.Note) {
	if (!$i) {
		pleaseLogin({ message: '登录后即可分享' });
		return;
	}
	sharePanelNote.value = note;
}

function closeSharePanel() {
	sharePanelNote.value = null;
}

function getShareUrl(note: Misskey.entities.Note): string {
	return `${window.location.origin}/notes/${note.id}`;
}

function getShareTitle(note: Misskey.entities.Note): string {
	const text = note.text ? note.text.slice(0, 50) : '';
	return text ? `${note.user.username}: ${text}` : `${note.user.username} 的视频`;
}

function shareToWeChat(note: Misskey.entities.Note) {
	// 微信无 Web Share API，复制链接让用户粘贴
	copyShareLink(note);
	toast('链接已复制，请在微信中粘贴分享');
}

function shareToQQ(note: Misskey.entities.Note) {
	const url = encodeURIComponent(getShareUrl(note));
	const title = encodeURIComponent(getShareTitle(note));
	window.open(`https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}`, '_blank');
	closeSharePanel();
}

function copyShareLink(note: Misskey.entities.Note) {
	try {
		navigator.clipboard.writeText(getShareUrl(note));
		toast('链接已复制');
	} catch {
		toast('复制失败');
	}
	closeSharePanel();
}

function saveVideo(note: Misskey.entities.Note) {
	const videoUrl = getVideoUrl(note);
	if (!videoUrl) {
		toast('无可保存的视频');
		closeSharePanel();
		return;
	}
	const a = document.createElement('a');
	a.href = videoUrl;
	a.download = `${note.user.username}_${note.id}.mp4`;
	a.target = '_blank';
	a.rel = 'noopener';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	closeSharePanel();
}

async function toggleLike(note: Misskey.entities.Note) {
	if (!$i) {
		pleaseLogin({ message: '登录后即可点赞' });
		return;
	}
	// VF-BUG-9: 保存原始状态用于失败回滚
	const prevReaction = note.myReaction;
	const prevCount = note.reactionCount;
	try {
		if (note.myReaction) {
			await misskeyApi('notes/reactions/delete', { noteId: note.id });
			note.myReaction = null;
			note.reactionCount = (note.reactionCount || 1) - 1;
		} else {
			await misskeyApi('notes/reactions/create', { noteId: note.id, reaction: '❤️' });
			note.myReaction = '❤️';
			note.reactionCount = (note.reactionCount || 0) + 1;
			// P4-04: 点赞弹跳动画
			likeAnimating[note.id] = true;
			setTimeout(() => { delete likeAnimating[note.id]; }, 400);
		}
	} catch (err) {
		console.error('Failed to toggle reaction:', err);
		// 回滚乐观更新
		note.myReaction = prevReaction;
		note.reactionCount = prevCount;
		toast('点赞失败，请稍后重试');
	}
}

// P4-01: 收藏功能
async function toggleFavorite(note: Misskey.entities.Note) {
	if (!$i) {
		pleaseLogin({ message: '登录后即可收藏' });
		return;
	}
	const noteId = note.id;
	try {
		if (favoriteStates[noteId]) {
			await misskeyApi('notes/favorites/delete', { noteId });
			favoriteStates[noteId] = false;
		} else {
			await misskeyApi('notes/favorites/create', { noteId });
			favoriteStates[noteId] = true;
		}
	} catch {
		toast('操作失败，请稍后重试');
	}
}

// === 进度条拖拽 ===

function getProgressPercent(index: number): number {
	if (isDragging.value && dragIndex.value === index) return dragProgress.value * 100;
	return (videoProgress[index] || 0) * 100;
}

function getTooltipLeft(): number {
	// 防止 tooltip 溢出边界
	const p = isDragging.value ? dragProgress.value : hoverProgress;
	return Math.max(6, Math.min(94, p * 100));
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

// P4-13: 进度条 hover 时间预览
function onProgressHover(e: MouseEvent, index: number) {
	if (isDragging.value) return;
	const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
	hoverProgress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
	hoverIndex.value = index;
	const video = videoRefs.get(index);
	if (video && video.duration && isFinite(video.duration)) {
		hoverTime.value = hoverProgress * video.duration;
	}
}

function onProgressHoverEnd() {
	hoverIndex.value = -1;
}

// P2-2.3: 左右滑动手势处理（仅触摸设备）
function onSwipeTouchStart(e: TouchEvent) {
	if (e.touches.length !== 1) return;
	swipeStartX = e.touches[0].clientX;
	swipeStartY = e.touches[0].clientY;
	swipeStartTime = Date.now();
}

function onSwipeTouchEnd(e: TouchEvent, note: Misskey.entities.Note) {
	if (swipeStartTime === 0) return;
	const touch = e.changedTouches[0];
	const dx = touch.clientX - swipeStartX;
	const dy = touch.clientY - swipeStartY;
	const dt = Date.now() - swipeStartTime;
	swipeStartTime = 0;

	// 必须是水平为主、距离足够、时间合理的滑动
	if (Math.abs(dx) < SWIPE_THRESHOLD) return;
	if (Math.abs(dy) > SWIPE_MAX_VERTICAL) return;
	if (dt > SWIPE_MAX_TIME) return;

	if (dx < 0) {
		// 左滑 → 进入作者主页
		mainRouter.pushByPath(userPage(note.user));
	} else {
		// 右滑 → 返回上一页
		window.history.back();
	}
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
			tasks.push(misskeyApiGet('notes/featured', { limit: 30, fileType: 'video/' }).catch((err) => { console.error('Failed to fetch featured notes:', err); return []; }));
		}

		// P4-25: 使用视频专属 API，服务端直接过滤视频笔记
		tasks.push(misskeyApiGet('notes/video-timeline', { limit: 30, untilId }).catch((err) => { console.error('Failed to fetch video timeline:', err); return []; }));

		const results = await Promise.all(tasks);
		const all = results.flat().filter(n => {
			if (seen.has(n.id)) return false;
			seen.add(n.id);
			return true;
		});
		if (all.length === 0) hasMore.value = false;
		else {
			// P2-3.1: 初始化关注状态
			all.forEach(n => {
				initFollowState(n);
				// P4-01: 初始化收藏状态
				const n2 = n as Record<string, unknown>;
				if (n2.isFavorited != null) favoriteStates[n.id] = !!n2.isFavorited;
			});
			videoNotes.value.push(...all);
		}
	} catch (err) {
		console.error('Failed to fetch video notes:', err);
		// P4-12: 加载失败时显示错误状态
		if (videoNotes.value.length === 0) fetchError.value = true;
	}
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
	}, { threshold: 0.7, rootMargin: '-10% 0px' });

	window.document.addEventListener('keydown', onKeydown);

	if (props.notes.length > 0) {
		videoNotes.value = props.notes;
		props.notes.forEach(n => {
			initFollowState(n);
			const n2 = n as Record<string, unknown>;
			if (n2.isFavorited != null) favoriteStates[n.id] = !!n2.isFavorited;
		});
		// P4-24: 桌面端加载首条视频评论
		if (isDesktop.value && props.notes[0]) fetchPanelComments(props.notes[0].id);
	} else {
		fetchVideoNotes().then(() => {
			// P4-24: 桌面端加载首条视频评论
			if (isDesktop.value && videoNotes.value[0]) fetchPanelComments(videoNotes.value[0].id);
		});
	}

	// P4-24: 桌面端评论滚动加载
	nextTick(() => {
		panelCommentsEl.value?.addEventListener('scroll', onPanelCommentsScroll, { passive: true });
	});
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
		// VF-BUG-11: 从小窗恢复时继承静音状态，防止状态重置
		video.muted = isMuted.value;
		video.volume = volume.value;
		video.currentTime = savedTime;
		userPaused.delete(idx);
		video.play().catch(() => {});
		isPlaying[idx] = true;
	}
});

onUnmounted(() => {
	panelCommentsEl.value?.removeEventListener('scroll', onPanelCommentsScroll);
	desktopMq.removeEventListener('change', _onDesktopMqChange);
	window.document.removeEventListener('keydown', onKeydown);
	document.removeEventListener('mousemove', onProgressDragMove);
	document.removeEventListener('mouseup', onProgressDragEnd);
	document.removeEventListener('touchmove', onProgressDragMove);
	document.removeEventListener('touchend', onProgressDragEnd);
	// P4-15: 清理长按定时器
	if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
	if (intersectionObserver) {
		intersectionObserver.disconnect();
		intersectionObserver = null;
	}
	// VF-BUG-12: 如果销毁时正在拖拽进度条，确保 swiper 被重新启用
	if (isDragging.value && swiperInstance) {
		swiperInstance.enable();
		isDragging.value = false;
	}
	// 清理小窗
	closeMiniPlayer();
	// BUG-01 fix: 终止所有 video 事件监听器
	for (const controller of videoAbortControllers.values()) {
		controller.abort();
	}
	videoAbortControllers.clear();
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
	/* P4-06: 刘海屏/底部横条安全区适配 */
	padding-top: env(safe-area-inset-top, 0px);
	padding-bottom: env(safe-area-inset-bottom, 0px);
	box-sizing: border-box;

	/* P4-24: 桌面端双栏布局 */
	@media (min-width: 1024px) {
		display: flex;
		flex-direction: row;
	}
}

.mainArea {
	position: relative;
	width: 100%;
	height: 100%;

	/* P4-24: 桌面端视频区占 60% */
	@media (min-width: 1024px) {
		width: 60%;
		flex-shrink: 0;
	}

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

/* P2-2.4: 缓冲进度浅色条 */
.progressBuffer {
	position: absolute;
	top: 0;
	left: 0;
	height: 100%;
	background: rgba(255, 255, 255, 0.3);
	border-radius: 2px;
	pointer-events: none;
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

/* 双击主心形缩放动画 */
.mainHeart {
	position: absolute;
	pointer-events: none;
	z-index: 10;
	font-size: 80px;
	transform: translate(-50%, -50%) scale(0);
	animation: mainHeartScale 800ms ease-out forwards;
	filter: drop-shadow(0 0 12px rgba(255, 0, 0, 0.3));
}

@keyframes mainHeartScale {
	0% {
		opacity: 1;
		transform: translate(-50%, -50%) scale(0);
	}
	40% {
		opacity: 1;
		transform: translate(-50%, -50%) scale(1.2);
	}
	60% {
		opacity: 1;
		transform: translate(-50%, -50%) scale(1);
	}
	100% {
		opacity: 0;
		transform: translate(-50%, -50%) scale(1);
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

/* P2-2.4: 顶部缓冲进度 */
.topProgressBuffer {
	position: absolute;
	top: 0;
	left: 0;
	height: 100%;
	background: rgba(255, 255, 255, 0.35);
	pointer-events: none;
}

.topProgressFill {
	position: relative;
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

/* P1-2.2 音量控制按钮 */
.muteBtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	margin-top: 8px;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.35);
	color: #fff;
	font-size: 16px;
	transition: all 0.2s;
	&:active { transform: scale(0.85); }
}

/* P2-3.2: 音乐信息 */
.musicInfo {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 8px;
	max-width: 200px;
}

.musicDisc {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.15);
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	font-size: 14px;
	flex-shrink: 0;
	animation: discSpin 4s linear infinite;
}

@keyframes discSpin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.musicMarquee {
	overflow: hidden;
	white-space: nowrap;
	flex: 1;
	mask-image: linear-gradient(to right, transparent, #000 8px, #000 calc(100% - 8px), transparent);
	-webkit-mask-image: linear-gradient(to right, transparent, #000 8px, #000 calc(100% - 8px), transparent);
}

.musicMarquee span {
	display: inline-block;
	color: #fff;
	font-size: 12px;
	font-weight: 500;
	animation: marqueeScroll 8s linear infinite;
}

@keyframes marqueeScroll {
	0% { transform: translateX(0%); }
	100% { transform: translateX(-50%); }
}

/* 右侧竖排操作按钮 */
.sideActions {
	position: absolute;
	right: 8px;
	bottom: calc(100px + env(safe-area-inset-bottom, 0px));
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
	transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* P2-3.1: 已关注状态 */
.sideFollowActive {
	background: rgba(255, 255, 255, 0.9);
	color: #333;
}

.sideFollowLoading {
	opacity: 0.6;
	pointer-events: none;
}

.sideFollowBtn:active {
	transform: translateX(-50%) scale(0.75);
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
	/* P4-13: hover scale */
	&:hover { transform: scale(1.1); }
	&:active { transform: scale(0.85); }
}

/* P4-04: 点赞按钮弹跳动画 */
.likeAnimating {
	animation: likePopBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes likePopBounce {
	0% { transform: scale(1); }
	40% { transform: scale(1.3); }
	100% { transform: scale(1); }
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
		bottom: calc(80px + env(safe-area-inset-bottom, 0px));
		gap: 12px;
	}
	.sideActionBtn { font-size: 22px; }
	.sideAvatar { width: 38px; height: 38px; }
	.bottomOverlay {
		right: 70px;
		padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
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

/* P3-3.4: 描述文字展开/收起 */
.bottomCaptionExpanded {
	-webkit-line-clamp: unset !important;
	display: block !important;
}

.captionCollapse {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.7);
	cursor: pointer;
	margin-top: 4px;
	&:active { opacity: 0.7; }
}

/* P3-3.4: 位置标签 */
.geoTag {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	margin-top: 6px;
	padding: 2px 8px;
	background: rgba(255, 255, 255, 0.15);
	border-radius: 12px;
	font-size: 11px;
	color: rgba(255, 255, 255, 0.8);
	i { font-size: 12px; }
}

/* 播放次数 */
.viewCount {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	margin-top: 6px;
	font-size: 12px;
	color: rgba(255, 255, 255, 0.75);
	i { font-size: 13px; }
}

/* P3-3.3: 分享面板 */
.shareOverlay {
	position: fixed;
	inset: 0;
	z-index: 10000;
	background: rgba(0, 0, 0, 0.45);
	backdrop-filter: blur(6px);
	-webkit-backdrop-filter: blur(6px);
	display: flex;
	align-items: flex-end;
	justify-content: center;
}

.sharePanel {
	width: 100%;
	max-width: 480px;
	background: rgba(30, 30, 30, 0.95);
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	border-radius: 16px 16px 0 0;
	padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px));
}

.sharePanelTitle {
	font-size: 14px;
	font-weight: 600;
	color: rgba(255, 255, 255, 0.6);
	text-align: center;
	margin-bottom: 20px;
}

.sharePanelOptions {
	display: flex;
	justify-content: center;
	gap: 24px;
	margin-bottom: 16px;
}

.shareOption {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 8px;
	background: transparent;
	border: none;
	cursor: pointer;
	color: #fff;
	font-size: 12px;
	transition: opacity 0.2s;
	&:active { opacity: 0.7; }
}

.shareIcon {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 22px;
	color: #fff;
}

.shareCancel {
	display: block;
	width: 100%;
	padding: 14px;
	border: none;
	border-radius: 12px;
	background: rgba(255, 255, 255, 0.1);
	color: #fff;
	font-size: 15px;
	font-weight: 500;
	cursor: pointer;
	transition: background 0.2s;
	&:active { background: rgba(255, 255, 255, 0.2); }
}

/* 分享面板动画 */
:global(.sharePanel-enter-from),
:global(.sharePanel-leave-to) {
	opacity: 0;
	.sharePanel {
		transform: translateY(100%);
	}
}

:global(.sharePanel-enter-active),
:global(.sharePanel-leave-active) {
	transition: opacity 0.25s ease;
	.sharePanel {
		transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
	}
}

/* P4-11: 视频加载失败兜底 */
.videoError {
	position: absolute;
	inset: 0;
	z-index: 12;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.6);
	gap: 12px;
}

.videoErrorIcon {
	font-size: 40px;
	color: rgba(255, 255, 255, 0.6);
}

.videoErrorText {
	font-size: 14px;
	color: rgba(255, 255, 255, 0.8);
}

.videoRetryBtn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 8px 20px;
	border: none;
	border-radius: 20px;
	background: rgba(255, 255, 255, 0.2);
	color: #fff;
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	transition: background 0.2s;
	&:hover { background: rgba(255, 255, 255, 0.3); }
	&:active { transform: scale(0.95); }
}

/* P4-12: 空状态 + 加载失败 */
.emptyState {
	position: absolute;
	inset: 0;
	z-index: 30;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background: #000;
	gap: 12px;
	padding: 32px;
}

.emptyIcon {
	font-size: 48px;
	color: rgba(255, 255, 255, 0.4);
}

.emptyTitle {
	font-size: 18px;
	font-weight: 600;
	color: rgba(255, 255, 255, 0.8);
}

.emptyDesc {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.5);
}

.emptyBtn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-top: 8px;
	padding: 10px 24px;
	border: none;
	border-radius: 24px;
	background: var(--MI_THEME-accent);
	color: #fff;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: opacity 0.2s;
	&:hover { opacity: 0.85; }
	&:active { transform: scale(0.95); }
}

/* P4-12: 已经到底了 */
.endHint {
	position: absolute;
	bottom: 40px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 20;
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 16px;
	background: rgba(255, 255, 255, 0.15);
	border-radius: 16px;
	font-size: 12px;
	color: rgba(255, 255, 255, 0.6);
	pointer-events: none;
}

/* P4-13: 快捷键帮助弹窗 */
.shortcutsOverlay {
	position: fixed;
	inset: 0;
	z-index: 10000;
	background: rgba(0, 0, 0, 0.5);
	backdrop-filter: blur(6px);
	-webkit-backdrop-filter: blur(6px);
	display: flex;
	align-items: center;
	justify-content: center;
}

.shortcutsPanel {
	width: 90%;
	max-width: 360px;
	background: rgba(30, 30, 30, 0.95);
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	border-radius: 16px;
	padding: 24px;
}

.shortcutsTitle {
	font-size: 16px;
	font-weight: 600;
	color: #fff;
	text-align: center;
	margin-bottom: 20px;
}

.shortcutsList {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.shortcutItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	kbd {
		display: inline-block;
		min-width: 36px;
		padding: 4px 10px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
		font-size: 13px;
		font-family: monospace;
		text-align: center;
	}
	span {
		color: rgba(255, 255, 255, 0.8);
		font-size: 13px;
	}
}

.shortcutsClose {
	display: block;
	width: 100%;
	margin-top: 20px;
	padding: 12px;
	border: none;
	border-radius: 10px;
	background: var(--MI_THEME-accent);
	color: #fff;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: opacity 0.2s;
	&:hover { opacity: 0.85; }
}

/* P4-13: 快捷键弹窗动画 */
:global(.shortcutsPanel-enter-from),
:global(.shortcutsPanel-leave-to) {
	opacity: 0;
	.shortcutsPanel { transform: scale(0.9); }
}
:global(.shortcutsPanel-enter-active),
:global(.shortcutsPanel-leave-active) {
	transition: opacity 0.2s ease;
	.shortcutsPanel { transition: transform 0.2s ease; }
}

/* P4-15: 倍速选择浮层 */
.speedOverlay {
	position: fixed;
	inset: 0;
	z-index: 10000;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
}

.speedPanel {
	width: 90%;
	max-width: 300px;
	background: rgba(30, 30, 30, 0.95);
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	border-radius: 16px;
	padding: 20px;
}

.speedTitle {
	font-size: 14px;
	font-weight: 600;
	color: rgba(255, 255, 255, 0.6);
	text-align: center;
	margin-bottom: 16px;
}

.speedOptions {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 8px;
}

.speedBtn {
	padding: 10px 0;
	border: 2px solid rgba(255, 255, 255, 0.2);
	border-radius: 10px;
	background: transparent;
	color: #fff;
	font-size: 15px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.15s;
	&:hover { border-color: rgba(255, 255, 255, 0.4); }
	&:active { transform: scale(0.95); }
}

.speedBtnActive {
	border-color: var(--MI-theme-accent, #fe2c55);
	background: rgba(254, 44, 85, 0.15);
}

/* P4-15: 倍速弹窗动画 */
:global(.speedPanel-enter-from),
:global(.speedPanel-leave-to) {
	opacity: 0;
	.speedPanel { transform: scale(0.9); }
}
:global(.speedPanel-enter-active),
:global(.speedPanel-leave-active) {
	transition: opacity 0.15s ease;
	.speedPanel { transition: transform 0.15s ease; }
}

/* P4-24: 桌面端右侧面板（≥1024px） */
.rightPanel {
	display: none;

	@media (min-width: 1024px) {
		display: flex;
		flex-direction: column;
		width: 40%;
		height: 100%;
		background: var(--MI_THEME-panel);
		overflow: hidden;
		flex-shrink: 0;
	}
}

.panelAuthor {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 20px 20px 16px;
	border-bottom: 1px solid var(--MI_THEME-divider);
	flex-shrink: 0;
}

.panelAvatar {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	flex-shrink: 0;
}

.panelAuthorInfo {
	flex: 1;
	min-width: 0;
}

.panelAuthorName {
	font-size: 15px;
	font-weight: 700;
	color: var(--MI_THEME-fg);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.panelAuthorHandle {
	font-size: 13px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-top: 2px;
}

.panelFollowBtn {
	padding: 6px 18px;
	border-radius: 20px;
	border: 1px solid var(--MI_THEME-accent);
	background: transparent;
	color: var(--MI_THEME-accent);
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s;
	flex-shrink: 0;

	&:hover { background: rgba(var(--MI_THEME-accentRgb), 0.1); }
}

.panelFollowActive {
	background: var(--MI_THEME-accent);
	color: #fff;
	&:hover { background: var(--MI_THEME-accent); opacity: 0.85; }
}

.panelDesc {
	padding: 16px 20px;
	font-size: 14px;
	line-height: 1.6;
	color: var(--MI_THEME-fg);
	border-bottom: 1px solid var(--MI_THEME-divider);
	flex-shrink: 0;
	max-height: 120px;
	overflow-y: auto;
}

.panelActions {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px 20px;
	border-bottom: 1px solid var(--MI_THEME-divider);
	flex-shrink: 0;
}

.panelActionBtn {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 12px;
	border-radius: 8px;
	background: transparent;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 18px;
	cursor: pointer;
	transition: all 0.15s;

	span {
		font-size: 13px;
		font-weight: 500;
	}

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
		color: var(--MI_THEME-fg);
	}
	&:active { transform: scale(0.92); }
}

.panelComments {
	flex: 1;
	overflow-y: auto;
	padding: 12px 20px;
	min-height: 0;
	-webkit-overflow-scrolling: touch;
}

.panelCommentsStatus {
	display: flex;
	justify-content: center;
	padding: 24px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 13px;
}

.panelCommentsNoMore {
	display: flex;
	justify-content: center;
	padding: 16px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 12px;
}

.panelComment {
	display: flex;
	gap: 10px;
	margin-bottom: 14px;
}

.panelCommentAvatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	flex-shrink: 0;
}

.panelCommentBody {
	flex: 1;
	min-width: 0;
}

.panelCommentName {
	font-size: 13px;
	font-weight: 600;
	color: var(--MI_THEME-fg);
}

.panelCommentText {
	font-size: 13px;
	margin-top: 4px;
	line-height: 1.5;
	color: var(--MI_THEME-fg);
	word-break: break-word;
}

.panelCommentTime {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-top: 4px;
	display: block;
}

.panelInputArea {
	padding: 8px 20px 16px;
	border-top: 1px solid var(--MI_THEME-divider);
	flex-shrink: 0;
	background: var(--MI_THEME-panel);
}

.panelInputWrap {
	display: flex;
	align-items: flex-end;
	gap: 8px;
	background: var(--MI_THEME-bg);
	border-radius: 20px;
	padding: 6px 6px 6px 14px;
}

.panelTextarea {
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

.panelSendBtn {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-accent);
	font-size: 16px;
	flex-shrink: 0;
	background: transparent;

	&:hover:not(:disabled) { background: var(--MI_THEME-buttonHoverBg); }
	&:disabled { opacity: 0.3; cursor: not-allowed; }
}
</style>
