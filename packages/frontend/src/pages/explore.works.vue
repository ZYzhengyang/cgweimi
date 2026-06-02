<!--
  CG微米 - Explore 作品页面
  上方瀑布流展示作品，下方时间线
-->
<template>
<div :class="$style.root">
	<!-- 分类筛选 -->
	<div :class="$style.categories">
		<button
			v-for="cat in categories"
			:key="cat.key"
			class="_button"
			:class="[$style.catBtn, { [$style.catBtnActive]: activeCategory === cat.key }]"
			@click="activeCategory = cat.key"
		>
			<i :class="cat.icon"></i>
			{{ cat.label }}
		</button>
	</div>

	<!-- 瀑布流作品展示 -->
	<div :class="$style.section">
		<div :class="$style.sectionHeader">
			<h2 :class="$style.sectionTitle"><i class="ti ti-layout-grid"></i> 作品</h2>
		</div>
		<MkWaterfall :key="activeCategory"/>
	</div>

	<!-- 时间线 -->
	<div :class="$style.section">
		<div :class="$style.sectionHeader">
			<h2 :class="$style.sectionTitle"><i class="ti ti-clock"></i> 动态</h2>
		</div>
		<MkNotesTimeline :paginator="timelinePaginator" :class="$style.timeline"/>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import MkWaterfall from '@/components/MkWaterfall.vue';
import MkNotesTimeline from '@/components/MkNotesTimeline.vue';
import { Paginator } from '@/utility/paginator.js';

const categories = [
	{ key: 'all', label: '全部', icon: 'ti ti-apps' },
	{ key: 'concept', label: '原画', icon: 'ti ti-pencil' },
	{ key: 'modeling', label: '建模', icon: 'ti ti-cube' },
	{ key: 'animation', label: '动画', icon: 'ti ti-player-play' },
	{ key: 'vfx', label: '特效', icon: 'ti ti-sparkles' },
	{ key: 'env', label: '场景', icon: 'ti ti-mountain' },
];

const activeCategory = ref('all');

const timelinePaginator = new Paginator('notes/local-timeline', {
	limit: 20,
});
</script>

<style module lang="scss">
.root {
	padding: 12px;
}

.categories {
	display: flex;
	gap: 8px;
	margin-bottom: 20px;
	overflow-x: auto;
	padding-bottom: 4px;
}

.catBtn {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 6px 14px;
	border-radius: 16px;
	font-size: 13px;
	color: var(--MI_THEME-fg);
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	transition: all 0.2s;
	white-space: nowrap;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.catBtnActive {
	background: var(--MI_THEME-accent);
	color: #fff;
	border-color: var(--MI_THEME-accent);
}

.section {
	margin-bottom: 28px;
}

.sectionHeader {
	margin-bottom: 12px;
}

.sectionTitle {
	font-size: 16px;
	font-weight: 600;
	color: var(--MI_THEME-fg);
	margin: 0;
	display: flex;
	align-items: center;
	gap: 6px;
}

.timeline {
	margin-top: 8px;
}
</style>
