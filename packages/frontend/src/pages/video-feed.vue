<!--
  CG微米 - 刷视频页面
  复用 Hermes 的 CGVideoFeed 组件
-->
<template>
<div :class="$style.container">
	<CGVideoFeed/>
</div>
</template>

<script lang="ts" setup>
import CGVideoFeed from '@/components/CGVideoFeed.vue';
import { definePage } from '@/page.js';

definePage(() => ({
	title: '刷视频',
	icon: 'ti ti-movie',
}));
</script>

<style module>
.container {
	height: 100vh;
	overflow: hidden;
}
</style>
