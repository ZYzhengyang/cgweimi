<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.root, { [$style.edit]: editMode, [$style.pinned]: widget.pinned }]">
	<header :class="$style.header">
		<span :class="$style.title">{{ widget.name }}</span>
		<div v-if="editMode" :class="$style.actions">
			<button :class="$style.actionBtn" title="配置" @click="$emit('configure')">
				<i class="ti ti-settings"></i>
			</button>
			<button :class="$style.actionBtn" :title="widget.pinned ? '解除钉住' : '钉住'" @click="$emit('toggle-pin')">
				<i :class="widget.pinned ? 'ti ti-pin-filled' : 'ti ti-pin'"></i>
			</button>
			<button :class="$style.actionBtn" title="删除" @click="$emit('remove')">
				<i class="ti ti-x"></i>
			</button>
		</div>
	</header>
	<div :class="$style.body">
		<slot />
	</div>
</div>
</template>

<script lang="ts" setup>
import type { GridItem } from '@/composables/use-widget-grid.js';

defineProps<{
	widget: GridItem;
	editMode: boolean;
}>();

defineEmits<{
	(e: 'configure'): void;
	(e: 'toggle-pin'): void;
	(e: 'remove'): void;
}>();
</script>

<style lang="scss" module>
.root {
	background: var(--MI_THEME-panel);
	border-radius: 8px;
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.edit {
	outline: 2px dashed var(--MI_THEME-accent);
}

.pinned .header :global(.ti-pin-filled) {
	color: var(--MI_THEME-warn);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 12px;
	border-bottom: solid 0.5px var(--MI_THEME-divider);
	flex-shrink: 0;
}

.title {
	font-weight: 600;
	font-size: 0.9em;
}

.actions {
	display: flex;
	gap: 4px;
}

.actionBtn {
	background: transparent;
	border: none;
	cursor: pointer;
	padding: 4px 8px;
	border-radius: 4px;
	color: var(--MI_THEME-fg);

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.body {
	flex: 1;
	overflow: auto;
	min-height: 0;
}
</style>
