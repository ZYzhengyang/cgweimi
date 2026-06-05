<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root" class="_panel">
	<!-- 封面图 -->
	<div :class="$style.banner" :style="bannerStyle">
		<div :class="$style.bannerFade"></div>
		<span v-if="$i && $i.id !== user.id && user.isFollowed" :class="$style.followedBadge">
			{{ i18n.ts.followsYou }}
		</span>
	</div>

	<!-- 头像（半悬挂在封面上） -->
	<div :class="$style.avatarWrap">
		<MkAvatar :class="$style.avatar" :user="user" indicator :size="avatarSize"/>
	</div>

	<!-- 信息区 -->
	<div :class="$style.info">
		<!-- 昵称 + 用户名 -->
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

		<!-- 数据栏 -->
		<div :class="$style.stats">
			<MkA :class="$style.statItem" :to="userPage(user, 'notes')">
				<span :class="$style.statValue">{{ number(user.notesCount) }}</span>
				<span :class="$style.statLabel">{{ i18n.ts.notes }}</span>
			</MkA>
			<MkA v-if="isFollowingVisibleForMe(user)" :class="$style.statItem" :to="userPage(user, 'following')">
				<span :class="$style.statValue">{{ number(user.followingCount) }}</span>
				<span :class="$style.statLabel">{{ i18n.ts.following }}</span>
			</MkA>
			<MkA v-if="isFollowersVisibleForMe(user)" :class="$style.statItem" :to="userPage(user, 'followers')">
				<span :class="$style.statValue">{{ number(user.followersCount) }}</span>
				<span :class="$style.statLabel">{{ i18n.ts.followers }}</span>
			</MkA>
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

const props = withDefaults(defineProps<{
	user: Misskey.entities.UserDetailed;
	/** 头像尺寸(px)，默认 88 */
	avatarSize?: number;
}>(), {
	avatarSize: 88,
});

const emit = defineEmits<{
	(ev: 'update:user', value: Misskey.entities.UserDetailed): void;
}>();

const router = useRouter();

// 本地响应式 user 副本，跟随 follow 状态更新
const localUser = ref(props.user);
watch(() => props.user, (v) => { localUser.value = v; });
watch(localUser, (v) => { emit('update:user', v); });

const bannerStyle = computed(() => {
	if (props.user.bannerUrl == null) return { backgroundColor: '#4c5e6d' };
	const url = prefer.s.disableShowingAnimatedImages
		? getStaticImageUrl(props.user.bannerUrl)
		: props.user.bannerUrl;
	return { backgroundImage: `url(${url})` };
});

/** 是否可以私聊（本地用户 + 对方开启了 chat） */
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
	position: relative;
	overflow: clip;
}

/* ── 封面图 ── */
.banner {
	position: relative;
	height: 200px;
	background-color: #4c5e6d;
	background-size: cover;
	background-position: center;
}

.bannerFade {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	height: 60px;
	background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
}

.followedBadge {
	position: absolute;
	top: 12px;
	left: 12px;
	padding: 4px 10px;
	color: #fff;
	background: rgba(0, 0, 0, 0.6);
	font-size: 0.75em;
	border-radius: 6px;
}

/* ── 头像 ── */
.avatarWrap {
	position: relative;
	z-index: 2;
	margin-top: -44px; /* 头像半悬挂 */
	padding: 0 20px;
}

.avatar {
	display: block;
	border: 4px solid var(--MI_THEME-panel);
	border-radius: 50%;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* ── 信息区 ── */
.info {
	padding: 12px 20px 20px;
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
	font-size: 1.3em;
	font-weight: bold;
	line-height: 1.4;
}

.username {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.85em;
	opacity: 0.6;
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
	height: 38px;
	font-size: 14px;
	font-weight: bold;
	border-radius: 999px;
	border: solid 1px var(--MI_THEME-divider);
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);
	cursor: pointer;

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
	width: 38px;
	height: 38px;
	border-radius: 50%;
	border: solid 1px var(--MI_THEME-divider);
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);
	cursor: pointer;
	flex-shrink: 0;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
	}
}

/* ── 简介 ── */
.bio {
	margin-top: 12px;
	font-size: 0.9em;
	line-height: 1.6;
	opacity: 0.85;
	overflow: hidden;
	display: -webkit-box;
	-webkit-line-clamp: 4;
	-webkit-box-orient: vertical;
}

/* ── 数据栏 ── */
.stats {
	display: flex;
	margin-top: 16px;
	padding-top: 16px;
	border-top: solid 0.5px var(--MI_THEME-divider);
}

.statItem {
	flex: 1;
	text-align: center;
	text-decoration: none;
	color: var(--MI_THEME-fg);
	padding: 4px 0;
	border-radius: 8px;
	transition: background 0.15s;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
		text-decoration: none;
	}
}

.statValue {
	display: block;
	font-size: 1.15em;
	font-weight: bold;
	color: var(--MI_THEME-accent);
	line-height: 1.3;
}

.statLabel {
	display: block;
	font-size: 0.75em;
	opacity: 0.6;
	margin-top: 2px;
}

/* ── 移动端适配 ── */
@media (max-width: 500px) {
	.banner {
		height: 140px;
	}

	.avatarWrap {
		margin-top: -36px;
		padding: 0 16px;
	}

	.info {
		padding: 8px 16px 16px;
	}

	.nameRow {
		flex-direction: column;
	}

	.actions {
		width: 100%;
		justify-content: flex-start;
	}

	.stats {
		margin-top: 12px;
		padding-top: 12px;
	}
}
</style>
