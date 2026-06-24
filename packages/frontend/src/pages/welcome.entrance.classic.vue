<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithAnimBg>
	<div :class="$style.formContainer">
		<div :class="$style.form" class="_panel">
			<!-- 标题区域 -->
			<div :class="$style.title">
				<img :src="cgvmisvg" :class="$style.logo" alt="CG微米"/>
				<div :class="$style.slogan">创作者的灵感社区</div>
			</div>

			<!-- 登录表单 -->
			<div :class="$style.body">
				<MkSignin :autoSet="true"/>
			</div>
		</div>
	</div>
</PageWithAnimBg>
</template>

<script lang="ts" setup>
import PageWithAnimBg from '@/components/global/PageWithAnimBg.vue';
import MkSignin from '@/components/MkSignin.vue';
import cgvmisvg from '/client-assets/cgvmi.svg';
</script>

<style lang="scss" module>
.formContainer {
	min-height: 100svh;
	padding: var(--cg-space-8) var(--cg-space-8) 64px var(--cg-space-8);
	box-sizing: border-box;
	align-content: center;
	background-color: var(--cg-bg-primary);
}

.form {
	position: relative;
	z-index: 10;
	border-radius: var(--cg-radius-lg);
	border: 1px solid var(--cg-border);
	box-shadow: var(--cg-shadow-none);
	background-color: var(--cg-bg-secondary);
	overflow: clip;
	max-width: 450px;
	margin: 0 auto;
}

.title {
	position: absolute;
	top: var(--cg-space-4);
	left: 0;
	right: 0;
	z-index: 1;
	margin: 0;
	text-align: center;
	padding: var(--cg-space-8);
	color: var(--cg-text-primary);
}

.logo {
	width: 48px;
	margin-bottom: var(--cg-space-2);
}

.slogan {
	font-size: 14px;
	font-weight: 500;
	color: var(--cg-text-secondary);
	opacity: 0.95;
	text-shadow: var(--cg-shadow-none);
	letter-spacing: 0.5px;
}

.body {
	padding: var(--cg-space-4) var(--cg-space-8) var(--cg-space-8) var(--cg-space-8);
}
</style>
