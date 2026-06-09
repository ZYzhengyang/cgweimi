<!--
  CG微米 - Explore 作品页面
  纯瀑布流展示（无Banner轮播、无分类筛选）
-->
<template>
<div :class="$style.root">
	<MkWaterfall :key="waterfallKey"/>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import MkWaterfall from '@/components/MkWaterfall.vue';

const waterfallKey = ref(0);
</script>

<style module lang="scss">
.root {
	padding: 0;
}
</style>
