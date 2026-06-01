<!--
  CG微米 - 管理后台内容搬运概览
-->
<template>
<div :class="$style.root">
	<div v-if="loading" :class="$style.loading">
		<MkLoading mini/>
	</div>
	<div v-else>
		<!-- 统计卡片 -->
		<div :class="$style.stats">
			<div :class="$style.statCard">
				<div :class="$style.statValue">{{ stats.totalPosts }}</div>
				<div :class="$style.statLabel">已搬运</div>
			</div>
			<div :class="$style.statCard">
				<div :class="$style.statValue">{{ stats.botAccounts }}</div>
				<div :class="$style.statLabel">机器人号</div>
			</div>
			<div :class="$style.statCard">
				<div :class="$style.statValue">{{ stats.categoryAccounts }}</div>
				<div :class="$style.statLabel">分类号</div>
			</div>
		</div>

		<!-- 分类号列表 -->
		<div :class="$style.section">
			<div :class="$style.sectionTitle">分类号</div>
			<div :class="$style.accountList">
				<div v-for="acc in accounts" :key="acc.username" :class="$style.accountItem">
					<MkAvatar :user="{ username: acc.username }" :class="$style.accountAvatar"/>
					<div :class="$style.accountInfo">
						<div :class="$style.accountName">@{{ acc.username }}</div>
						<div :class="$style.accountCategory">{{ getCategoryLabel(acc.category) }}</div>
					</div>
				</div>
			</div>
		</div>

		<!-- 最近搬运 -->
		<div :class="$style.section">
			<div :class="$style.sectionTitle">最近搬运</div>
			<div :class="$style.recentList">
				<div v-for="item in recentPosts" :key="item" :class="$style.recentItem">
					<span :class="$style.recentId">{{ item }}</span>
				</div>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { misskeyApiGet } from '@/utility/misskey-api.js';

const loading = ref(true);
const stats = ref({
	totalPosts: 0,
	botAccounts: 0,
	categoryAccounts: 0,
});
const accounts = ref<any[]>([]);
const recentPosts = ref<string[]>([]);

const categoryLabels: Record<string, string> = {
	concept: '原画',
	modeling: '建模',
	rigging: '绑定',
	animation: '动画',
	vfx: '特效',
	env: '场景',
};

function getCategoryLabel(key: string): string {
	return categoryLabels[key] || key;
}

onMounted(async () => {
	try {
		// 从 API 获取搬运统计数据
		const notes = await misskeyApiGet('notes/local-timeline', {
			limit: 100,
			withFiles: true,
		});

		// 统计不同用户的帖子数
		const userMap = new Map<string, number>();
		notes.forEach((note: any) => {
			const username = note.user?.username || 'unknown';
			userMap.set(username, (userMap.get(username) || 0) + 1);
		});

		// 过滤出机器人号（以 cg_ 开头的）
		const botUsers = [...userMap.entries()].filter(([name]) => name.startsWith('cg_'));
		const totalFromBots = botUsers.reduce((sum, [, count]) => sum + count, 0);

		stats.value = {
			totalPosts: totalFromBots,
			botAccounts: botUsers.length,
			categoryAccounts: botUsers.length,
		};

		accounts.value = botUsers.map(([username]) => ({
			username,
			category: username.replace('cg_', ''),
		}));

		recentPosts.value = notes.slice(0, 10).map((n: any) => n.id);
	} catch (e) {
		console.error('Failed to load scraping stats:', e);
	}
	loading.value = false;
});
</script>

<style module lang="scss">
.root {
	padding: 12px;
}

.loading {
	display: flex;
	justify-content: center;
	padding: 24px;
}

.stats {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 12px;
	margin-bottom: 20px;
}

.statCard {
	background: var(--MI_THEME-panel);
	border-radius: 10px;
	padding: 16px;
	text-align: center;
}

.statValue {
	font-size: 28px;
	font-weight: 700;
	color: var(--MI_THEME-accent);
}

.statLabel {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-top: 4px;
}

.section {
	margin-bottom: 20px;
}

.sectionTitle {
	font-size: 14px;
	font-weight: 600;
	color: var(--MI_THEME-fg);
	margin-bottom: 10px;
}

.accountList {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.accountItem {
	display: flex;
	align-items: center;
	gap: 8px;
	background: var(--MI_THEME-panel);
	border-radius: 8px;
	padding: 8px 12px;
}

.accountAvatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
}

.accountName {
	font-size: 13px;
	font-weight: 500;
}

.accountCategory {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.recentList {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.recentItem {
	background: var(--MI_THEME-panel);
	border-radius: 6px;
	padding: 4px 10px;
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-family: monospace;
}
</style>
