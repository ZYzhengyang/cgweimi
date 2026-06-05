<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<!-- 封面图 -->
	<div :class="$style.banner" :style="bannerStyle">
		<div :class="$style.bannerOverlay"></div>
		<span v-if="$i && $i.id !== user.id && user.isFollowed" :class="$style.followedBadge">
			{{ i18n.ts.followsYou }}
		</span>
	</div>

	<!-- 头像 + 信息区（覆盖在封面底部） -->
	<div :class="$style.profileArea">
		<!-- 头像 -->
		<div :class="$style.avatarWrap">
			<MkAvatar :class="$style.avatar" :user="user" indicator :size="80"/>
		</div>

		<!-- 昵称 + 用户名 + 简介 -->
		<div :class="$style.nameSection">
			<div :class="$style.nameRow">
				<div :class="$style.nameBlock">
					<MkUserName :class="$style.displayName" :user="user" :nowrap="false"/>
					<div :class="$style.username">
						<MkAcct :user="user" :detail="true"/>
						<i v-if="user.isLocked" class="ti ti-lock" :class="$style.icon"></i>
						<i v-if="user.isBot" class="ti ti-robot" :class="$style.icon"></i>
					</div>
				</div>

				<!-- 操作按钮 -->
				<div v-if="$i" :class="$style.actions">
					<template v-if="$i.id !== user.id">
						<MkFollowButton v-model:user="localUser" :full="true" :large="true"/>
						<button
							v-if="canChat"
							:class="[$style.actionBtn, $style.dmBtn]"
							@click="openChat"
						>
							<i class="ti ti-messages"></i>
							<span>{{ i18n.ts._chat.chatWithThisUser }}</span>
						</button>
					</template>
					<button :class="$style.moreBtn" @click="showMenu">
						<i class="ti ti-dots"></i>
					</button>
				</div>
			</div>

			<!-- 简介 -->
			<div v-if="user.description" :class="$style.bio">
				<Mfm :text="user.description" :author="user" :isNote="false" class="_selectable"/>
			</div>
		</div>
	</div>

	<!-- 数据栏 -->
	<div :class="$style.stats">
		<MkA v-if="isFollowingVisibleForMe(user)" :class="$style.statItem" :to="userPage(user, 'following')">
			<span :class="$style.statValue">{{ number(user.followingCount) }}</span>
			<span :class="$style.statLabel">{{ i18n.ts.following }}</span>
		</MkA>
		<MkA v-if="isFollowersVisibleForMe(user)" :class="$style.statItem" :to="userPage(user, 'followers')">
			<span :class="$style.statValue">{{ number(user.followersCount) }}</span>
			<span :class="$style.statLabel">{{ i18n.ts.followers }}</span>
		</MkA>
		<div :class="$style.statItem">
			<span :class="$style.statValue">{{ number(user.receivedLikesCount ?? 0) }}</span>
			<span :class="$style.statLabel">获赞</span>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import * as Misskey from 'misskey-js';
import MkFollowButton from '@/components/MkFollowButton.vue';
import number from '@/filters/number.js';
import { userPage } from '@/filters/user.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { isFollowingVisibleForMe, isFollowersVisibleForMe } from '@/utility/isFfVisibleForMe.js';
import { getStaticImageUrl } from '@/utility/media-proxy.js';
import { prefer } from '@/preferences.js';
import { useRouter } from '@/router.js';
import { getUserMenu } from '@/utility/get-user-menu.js';
import * as os from '@/os.js';

const props = defineProps<{
	user: Misskey.entities.UserDetailed;
}>();

const emit = defineEmits<{
	(ev: 'update:user', value: Misskey.entities.UserDetailed): void;
}>();

const router = useRouter();

const localUser = ref(props.user);
watch(() => props.user, (v) => { localUser.value = v; });
watch(localUser, (v) => { emit('update:user', v); });

const bannerStyle = computed(() => {
	if (props.user.bannerUrl == null) return { backgroundColor: '#2a2a2a' };
	const url = prefer.s.disableShowingAnimatedImages
		? getStaticImageUrl(props.user.bannerUrl)
		: props.user.bannerUrl;
	return { backgroundImage: `url(${url})` };
});

const canChat = computed(() => {
	return $i
		&& $i.policies.chatAvailability === 'available'
		&& props.user.canChat
		&& props.user.host == null;
});

function openChat() {
	router.push('/chat/user/:userId', {
		params: { userId: props.user.id },
	});
}

function showMenu(ev: PointerEvent) {
	const { menu, cleanup } = getUserMenu(localUser.value, router);
	os.popupMenu(menu, ev.currentTarget ?? ev.target).finally(cleanup);
}
</script>

<style lang="scss" module>
.root {
	background: var(--MI_THEME-bg);
	overflow: clip;
}

/* ── 封面图 ── */
.banner {
	position: relative;
	height: 240px;
	background-color: #2a2a2a;
	background-size: cover;
	background-position: center;
}

.bannerOverlay {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	height: 80px;
	background: linear-gradient(transparent, rgba(0, 0, 0, 0.4));
}

.followedBadge {
	position: absolute;
	top: 12px;
	left: 12px;
	padding: 4px 10px;
	color: #fff;
	background: rgba(0, 0, 0, 0.6);
	font-size: 0.75em;
	border-radius: 4px;
	backdrop-filter: blur(4px);
}

/* ── 头像 + 信息区 ── */
.profileArea {
	display: flex;
	align-items: flex-start;
	gap: 20px;
	padding: 0 24px;
	margin-top: -40px;
	position: relative;
	z-index: 2;
}

.avatarWrap {
	flex-shrink: 0;
}

.avatar {
	display: block;
	border: 3px solid var(--MI_THEME-bg);
	border-radius: 50%;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.nameSection {
	flex: 1;
	min-width: 0;
	padding-top: 48px; /* 与头像对齐 */
}

.nameRow {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
}

.nameBlock {
	min-width: 0;
}

.displayName {
	display: block;
	font-size: 1.4em;
	font-weight: 700;
	line-height: 1.3;
	letter-spacing: -0.01em;
}

.username {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.85em;
	opacity: 0.5;
	margin-top: 2px;
}

.icon {
	font-size: 0.9em;
}

/* ── 操作按钮 ── */
.actions {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
}

.actionBtn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 0 16px;
	height: 36px;
	font-size: 13px;
	font-weight: 600;
	border-radius: 6px;
	border: solid 1px var(--MI_THEME-divider);
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);
	cursor: pointer;
	transition: background 0.15s, border-color 0.15s;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
	}
}

.dmBtn {
	border-color: var(--MI_THEME-accent);
	color: var(--MI_THEME-accent);

	&:hover {
		background: color-mix(in srgb, var(--MI_THEME-accent) 10%, var(--MI_THEME-panel));
	}
}

.moreBtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 6px;
	border: solid 1px var(--MI_THEME-divider);
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);
	cursor: pointer;
	flex-shrink: 0;
	transition: background 0.15s;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
	}
}

/* ── 简介 ── */
.bio {
	margin-top: 10px;
	font-size: 0.9em;
	line-height: 1.6;
	opacity: 0.7;
	overflow: hidden;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
}

/* ── 数据栏 ── */
.stats {
	display: flex;
	gap: 0;
	margin-top: 20px;
	padding: 16px 24px;
	border-top: solid 0.5px var(--MI_THEME-divider);
	border-bottom: solid 0.5px var(--MI_THEME-divider);
}

.statItem {
	flex: 1;
	text-align: center;
	text-decoration: none;
	color: var(--MI_THEME-fg);
	padding: 4px 0;
	border-radius: 6px;
	transition: background 0.15s;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
		text-decoration: none;
	}
}

.statValue {
	display: block;
	font-size: 1.1em;
	font-weight: 700;
	color: var(--MI_THEME-fg);
	line-height: 1.3;
}

.statLabel {
	display: block;
	font-size: 0.75em;
	opacity: 0.5;
	margin-top: 2px;
}

/* ── 移动端适配 ── */
@media (max-width: 500px) {
	.banner {
		height: 160px;
	}

	.profileArea {
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 0 16px;
		margin-top: -32px;
	}

	.nameSection {
		padding-top: 12px;
	}

	.nameRow {
		flex-direction: column;
		align-items: center;
	}

	.actions {
		justify-content: center;
		margin-top: 8px;
	}

	.bio {
		text-align: center;
	}

	.stats {
		padding: 12px 16px;
	}
}
</style>
