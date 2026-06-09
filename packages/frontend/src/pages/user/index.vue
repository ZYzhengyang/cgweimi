<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.page">
	<div v-if="user">
		<!-- 个人主页头部 -->
		<UserProfileHeader v-model:user="user"/>

		<!-- Tab 导航 -->
		<div :class="$style.tabs">
			<button
				v-for="t in tabs"
				:key="t.key"
				:class="[$style.tab, tab === t.key && $style.tabActive]"
				@click="tab = t.key"
			>
				<i :class="t.icon"></i>
				<span>{{ t.title }}</span>
			</button>
		</div>

		<!-- Tab 内容 -->
		<div :class="$style.content">
			<XHome v-if="tab === 'home'" :user="user"/>
			<XNotes v-else-if="tab === 'notes'" :user="user"/>
			<XMedia v-else-if="tab === 'media'" :user="user"/>
			<XLikes v-else-if="tab === 'likes'" :user="user"/>
			<XGallery v-else-if="tab === 'gallery'" :user="user"/>
		</div>
	</div>
	<MkError v-else-if="error" @retry="fetchUser()"/>
	<MkLoading v-else/>
</div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, computed, watch, ref } from 'vue';
import * as Misskey from 'misskey-js';
import { acct as getAcct } from '@/filters/user.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import { $i, iAmAdmin } from '@/i.js';
import { instance } from '@/instance.js';
import { serverContext, assertServerContext } from '@/server-context.js';
import UserProfileHeader from '@/components/UserProfileHeader.vue';

const XHome = defineAsyncComponent(() => import('./home.vue'));
const XNotes = defineAsyncComponent(() => import('./notes.vue'));
const XMedia = defineAsyncComponent(() => import('./files.vue'));
const XLikes = defineAsyncComponent(() => import('./reactions.vue'));
const XGallery = defineAsyncComponent(() => import('./gallery.vue'));

const CTX_USER = !$i && assertServerContext(serverContext, 'user') ? serverContext.user : null;

const props = withDefaults(defineProps<{
	acct: string;
	page?: string;
}>(), {
	page: 'home',
});

const tab = ref(props.page);

const user = ref<null | Misskey.entities.UserDetailed>(CTX_USER);
const error = ref<any>(null);

function fetchUser(): void {
	if (props.acct == null) return;

	const { username, host } = Misskey.acct.parse(props.acct);

	if (CTX_USER && CTX_USER.username === username && CTX_USER.host === host) {
		user.value = CTX_USER;
		return;
	}

	user.value = null;
	misskeyApi('users/show', {
		username,
		host,
	}).then(u => {
		user.value = u;
	}).catch(err => {
		error.value = err;
	});
}

watch(() => props.acct, fetchUser, {
	immediate: true,
});

// 个人主页标签权限
function isProfileTabVisible(tabKey: string): boolean {
	if (iAmAdmin) return true;
	const hidden = instance.clientOptions?.hiddenUIElements?.profileTabs ?? [];
	return !hidden.includes(tabKey);
}

const tabs = computed(() => {
	if (!user.value) return [];
	const allTabs = [
		{ key: 'home', title: i18n.ts.overview, icon: 'ti ti-home' },
		{ key: 'notes', title: i18n.ts.notes, icon: 'ti ti-pencil' },
		{ key: 'media', title: i18n.ts.media, icon: 'ti ti-photo' },
		{ key: 'likes', title: i18n.ts.likes, icon: 'ti ti-heart' },
		{ key: 'gallery', title: i18n.ts.gallery, icon: 'ti ti-icons' },
	];
	return allTabs.filter(t => isProfileTabVisible(t.key));
});

definePage(() => ({
	title: i18n.ts.user,
	icon: 'ti ti-user',
	...user.value ? {
		title: user.value.name ? `${user.value.name} (@${user.value.username})` : `@${user.value.username}`,
		subtitle: `@${getAcct(user.value)}`,
		userName: user.value,
		avatar: user.value,
		path: `/@${user.value.username}`,
		share: {
			title: user.value.name,
		},
	} : {},
}));
</script>

<style lang="scss" module>
.page {
	min-height: 100vh;
	background: var(--MI_THEME-bg);
}

/* ── Tab 导航 ── */
.tabs {
	display: flex;
	gap: 0;
	padding: 0 24px;
	border-bottom: solid 0.5px var(--MI_THEME-divider);
	background: var(--MI_THEME-bg);
	position: sticky;
	top: 0;
	z-index: 10;
}

.tab {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 14px 20px;
	font-size: 14px;
	font-weight: 500;
	color: var(--MI_THEME-fg);
	opacity: 0.6;
	background: transparent;
	border: none;
	border-bottom: 2px solid transparent;
	cursor: pointer;
	transition: opacity 0.15s, border-color 0.15s;
	white-space: nowrap;

	&:hover {
		opacity: 0.9;
	}

	i {
		font-size: 16px;
	}
}

.tabActive {
	opacity: 1;
	border-bottom-color: var(--MI_THEME-accent);
	font-weight: 600;
}

/* ── 内容区 ── */
.content {
	min-height: 50vh;
}

/* ── 移动端适配 ── */
@media (max-width: 500px) {
	.tabs {
		padding: 0 12px;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;

		&::-webkit-scrollbar {
			display: none;
		}
	}

	.tab {
		padding: 12px 14px;
		font-size: 13px;
	}
}
</style>
