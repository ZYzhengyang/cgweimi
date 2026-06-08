<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">
			<!-- 搬运统计 -->
			<MkFolder>
				<template #label><i class="ti ti-chart-bar"></i> 搬运统计</template>
				<div class="_gaps_s">
					<div :class="$style.statsGrid">
						<div :class="$style.statCard">
							<div :class="$style.statIcon"><i class="ti ti-robot"></i></div>
							<div :class="$style.statInfo">
								<div :class="$style.statValue">{{ botAccounts.length }}</div>
								<div :class="$style.statLabel">机器人账号</div>
							</div>
						</div>
						<div :class="$style.statCard">
							<div :class="$style.statIcon"><i class="ti ti-photo"></i></div>
							<div :class="$style.statInfo">
								<div :class="$style.statValue">{{ postedCount }}</div>
								<div :class="$style.statLabel">已搬运帖子</div>
							</div>
						</div>
						<div :class="$style.statCard">
							<div :class="$style.statIcon"><i class="ti ti-clock"></i></div>
							<div :class="$style.statInfo">
								<div :class="$style.statValue">{{ lastRunTime }}</div>
								<div :class="$style.statLabel">上次运行</div>
							</div>
						</div>
					</div>
				</div>
			</MkFolder>

			<!-- 机器人账号列表 -->
			<MkFolder>
				<template #label><i class="ti ti-users"></i> 机器人账号</template>
				<div class="_gaps_s">
					<MkInfo>搬运系统使用的机器人账号列表。账号由搬运系统自动创建。</MkInfo>
					<div :class="$style.accountList">
						<div v-for="account in botAccounts" :key="account.username" :class="$style.accountItem">
							<div :class="$style.accountInfo">
								<MkAvatar :user="{ username: account.username }" :class="$style.accountAvatar" />
								<div>
									<div :class="$style.accountName">@{{ account.username }}</div>
									<div :class="$style.accountMeta">{{ account.postCount || 0 }} 条帖子</div>
								</div>
							</div>
							<div :class="$style.accountActions">
								<MkButton :small="true" @click="viewAccount(account)">查看</MkButton>
							</div>
						</div>
						<div v-if="botAccounts.length === 0" :class="$style.empty">暂无机器人账号</div>
					</div>
				</div>
			</MkFolder>

			<!-- 分类配置 -->
			<MkFolder>
				<template #label><i class="ti ti-category"></i> 分类配置</template>
				<div class="_gaps_s">
					<MkInfo>每个分类对应一个机器人账号，搬运的内容会自动分类发布。</MkInfo>
					<div :class="$style.categoryList">
						<div v-for="cat in categories" :key="cat.key" :class="$style.categoryItem">
							<div :class="$style.categoryInfo">
								<span :class="$style.categoryIcon">{{ cat.icon }}</span>
								<div>
									<div :class="$style.categoryName">{{ cat.name }}</div>
									<div :class="$style.categoryTags">{{ cat.tags.join(', ') }}</div>
								</div>
							</div>
							<div :class="$style.categoryAccount">
								<span v-if="cat.account" :class="$style.accountBadge">@{{ cat.account }}</span>
								<span v-else :class="$style.noAccount">未分配</span>
							</div>
						</div>
					</div>
				</div>
			</MkFolder>

			<!-- 最近搬运记录 -->
			<MkFolder>
				<template #label><i class="ti ti-history"></i> 最近搬运记录</template>
				<div class="_gaps_s">
					<div :class="$style.recordList">
						<div v-for="record in recentRecords" :key="record.id" :class="$style.recordItem">
							<div :class="$style.recordInfo">
								<span :class="$style.recordType">{{ record.type }}</span>
								<span :class="$style.recordTitle">{{ record.title }}</span>
							</div>
							<div :class="$style.recordMeta">
								<span :class="$style.recordTime">{{ record.time }}</span>
								<span :class="$style.recordStatus" :class2="record.success ? $style.success : $style.failed">
									{{ record.success ? '✅' : '❌' }}
								</span>
							</div>
						</div>
						<div v-if="recentRecords.length === 0" :class="$style.empty">暂无搬运记录</div>
					</div>
					<div v-if="hasMoreRecords" style="text-align: center;">
						<MkButton :small="true" @click="loadMoreRecords">加载更多</MkButton>
					</div>
				</div>
			</MkFolder>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInfo from '@/components/MkInfo.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';

const botAccounts = ref<any[]>([]);
const postedCount = ref(0);
const lastRunTime = ref('未知');
const recentRecords = ref<any[]>([]);
const hasMoreRecords = ref(true);
const recordsOffset = ref('');

const categories = [
	{ key: 'concept', name: '原画', icon: '🎨', tags: ['illustration', 'comic', 'fan-art'], account: '' },
	{ key: 'modeling', name: '建模', icon: '🧊', tags: ['character-modeling', 'hard-surface', 'props'], account: '' },
	{ key: 'rigging', name: '绑定', icon: '🔧', tags: ['rigging', 'skeleton', 'bones'], account: '' },
	{ key: 'animation', name: '动画', icon: '🎬', tags: ['animation', 'motion', 'keyframe'], account: '' },
	{ key: 'vfx', name: '特效', icon: '✨', tags: ['vfx', 'particles', 'effects'], account: '' },
	{ key: 'env', name: '场景', icon: '🏛️', tags: ['environment', 'level-design', 'terrain'], account: '' },
];

async function loadBotData() {
	try {
		// 获取机器人账号列表
		const users = await misskeyApi('admin/show-users', { limit: 50, sort: '+createdAt' });
		botAccounts.value = users.filter((u: any) => u.username.startsWith('cgb_')).map((u: any) => ({
			username: u.username,
			postCount: u.notesCount || 0,
		}));

		// 获取帖子总数
		const stats = await misskeyApi('stats');
		postedCount.value = stats.originalNotesCount;

		// 获取最近的搬运记录（通过本地时间线）
		const notes = await misskeyApi('notes/local-timeline', { limit: 20, withFiles: true });
		const botNotes = notes.filter((n: any) => n.user?.username?.startsWith('cgb_'));
		recentRecords.value = botNotes.slice(0, 10).map((n: any) => ({
			id: n.id,
			type: n.files?.length > 0 ? '图文' : '文字',
			title: n.text?.slice(0, 50) || '[无文字内容]',
			time: new Date(n.createdAt).toLocaleString('zh-CN'),
			success: true,
		}));
		if (botNotes.length > 0) {
			recordsOffset.value = botNotes[botNotes.length - 1].id;
		}
		hasMoreRecords.value = botNotes.length >= 10;

	} catch (e) {
		console.error('Failed to load bot data:', e);
	}
}

function viewAccount(account: any) {
	os.pageWindow(`/@${account.username}`);
}

async function loadMoreRecords() {
	if (!recordsOffset.value) return;
	try {
		const notes = await misskeyApi('notes/local-timeline', { limit: 20, withFiles: true, untilId: recordsOffset.value });
		const botNotes = notes.filter((n: any) => n.user?.username?.startsWith('cgb_'));
		const newRecords = botNotes.map((n: any) => ({
			id: n.id,
			type: n.files?.length > 0 ? '图文' : '文字',
			title: n.text?.slice(0, 50) || '[无文字内容]',
			time: new Date(n.createdAt).toLocaleString('zh-CN'),
			success: true,
		}));
		recentRecords.value = [...recentRecords.value, ...newRecords];
		if (botNotes.length > 0) {
			recordsOffset.value = botNotes[botNotes.length - 1].id;
		}
		hasMoreRecords.value = botNotes.length >= 10;
	} catch (e) {
		console.error('Failed to load more records:', e);
	}
}

onMounted(() => {
	loadBotData();
});

const headerTabs = computed(() => []);

definePage(() => ({
	title: '搬运管理',
	icon: 'ti ti-robot',
}));
</script>

<style lang="scss" module>
.statsGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 12px;
}

.statCard {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
}

.statIcon {
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--MI_THEME-accentedBg);
	border-radius: 12px;
	font-size: 20px;
	color: var(--MI_THEME-accent);
}

.statInfo {
	flex: 1;
}

.statValue {
	font-size: 24px;
	font-weight: 700;
	color: var(--MI_THEME-fg);
}

.statLabel {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-top: 4px;
}

.accountList, .categoryList, .recordList {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.accountItem, .categoryItem, .recordItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: var(--MI_THEME-panel);
	border-radius: 8px;
	transition: background 0.15s;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
	}
}

.accountInfo, .categoryInfo, .recordInfo {
	display: flex;
	align-items: center;
	gap: 12px;
	flex: 1;
	min-width: 0;
}

.accountAvatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
}

.accountName {
	font-weight: 600;
	font-size: 13px;
}

.accountMeta {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.categoryIcon {
	font-size: 24px;
}

.categoryName {
	font-weight: 600;
	font-size: 13px;
}

.categoryTags {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.categoryAccount, .accountActions {
	flex-shrink: 0;
}

.accountBadge {
	padding: 4px 8px;
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
	border-radius: 6px;
	font-size: 12px;
	font-family: monospace;
}

.noAccount {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.recordType {
	padding: 2px 6px;
	background: var(--MI_THEME-bg);
	border-radius: 4px;
	font-size: 11px;
	margin-right: 8px;
}

.recordTitle {
	font-size: 13px;
}

.recordMeta {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
}

.recordTime {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.empty {
	padding: 32px;
	text-align: center;
	color: var(--MI_THEME-fgTransparentWeak);
	background: var(--MI_THEME-panel);
	border-radius: 12px;
}
</style>
