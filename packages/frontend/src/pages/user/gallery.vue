<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<MkWaterfall :userId="user.id"/>
</div>
</template>

<script lang="ts" setup>
import * as Misskey from 'misskey-js';
import MkWaterfall from '@/components/MkWaterfall.vue';

defineProps<{
	user: Misskey.entities.User;
}>();
</script>

<style lang="scss" module>
.root {
	padding: var(--MI-margin);
}
</style>
