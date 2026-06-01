<!--
  CG微米 - 刷视频页面
  直接全屏沉浸播放
-->
<template>
<div :class="$style.root">
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
.root {
	height: 100vh;
	overflow: hidden;
	background: #000;
}
</style>
