<!--
  CG微米 - 灵感工具页面
  全屏节点图谱：输入词 → AI联想 → 展开 → 生成方案
-->
<template>
<div :class="$style.root">
	<MkInspirationGraph :class="$style.graph"/>
</div>
</template>

<script lang="ts" setup>
import MkInspirationGraph from '@/components/MkInspirationGraph.vue';
import { definePage } from '@/page.js';

definePage(() => ({
	title: '灵感',
	icon: 'ti ti-sparkles',
}));
</script>

<style module lang="scss">
.root {
	width: 100%;
	height: 100%;
	background: var(--MI_THEME-bg, #000);
}

.graph {
	width: 100%;
	height: 100%;
}
</style>
