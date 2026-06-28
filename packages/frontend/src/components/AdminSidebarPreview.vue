<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<!--
 * AdminSidebarPreview
 * 纯视觉辅助组件：inline SVG 画一个简化版的 admin 后台侧边栏布局，
 * 用于 settings 页面"布局与外观" tab 的"admin 后台菜单" MkFolder 顶部，让 admin 一眼看到
 * "勾选/取消隐藏影响的是 admin 后台左侧菜单栏"。
 *
 * 不接事件，不影响数据流。
 *
 * Props:
 *   - hidden: string[]      —— 当前被隐藏的菜单 key（路径）列表
 *   - labels: Record<string,string> —— 自定义标签，key 是路径
 -->

<template>
<div :class="$style.preview" aria-hidden="true">
	<div :class="$style.frame">
		<!-- 顶部 logo 区 -->
		<div :class="$style.logo">
			<i class="ti ti-shield"></i>
			<span>{{ appName }}</span>
		</div>

		<!-- 5 个分组 + 项 -->
		<div
			v-for="(group, gi) in groups"
			:key="group.title"
			:class="$style.group"
		>
			<div :class="$style.groupTitle">{{ group.title }}</div>
			<div
				v-for="item in group.items"
				:key="item.key"
				:class="[
					$style.item,
					isHidden(item.key) && $style.itemHidden,
				]"
			>
				<i :class="[item.icon, $style.itemIcon]"></i>
				<span :class="$style.itemLabel">{{ displayLabel(item) }}</span>
			</div>
			<!-- 组间分隔线（除最后一组外） -->
			<div v-if="gi < groups.length - 1" :class="$style.divider"></div>
		</div>
	</div>

	<!-- 图例 -->
	<div :class="$style.legend">
		<span :class="$style.legendItem">
			<span :class="[$style.swatch, $style.swatchVisible]"></span>
			可见
		</span>
		<span :class="$style.legendItem">
			<span :class="[$style.swatch, $style.swatchHidden]"></span>
			隐藏
		</span>
	</div>
</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ADMIN_MENU_ITEMS, type AdminMenuItemDef, type AdminMenuGroupDef } from '@/utility/admin-menu-items.js';

const props = withDefaults(defineProps<{
	hidden?: string[];
	labels?: Record<string, string>;
}>(), {
	hidden: () => [] as string[],
	labels: () => ({}),
});

const groups = computed<AdminMenuGroupDef[]>(() => ADMIN_MENU_ITEMS);

const hiddenSet = computed(() => new Set(props.hidden));

function isHidden(key: string): boolean {
	return hiddenSet.value.has(key);
}

function displayLabel(item: AdminMenuItemDef): string {
	return props.labels[item.key] ?? item.text;
}

// 顶部 logo 文字：取 ADMIN_MENU_ITEMS 第一个分组的第一项 text，
// 但更合适是用 instance name；为了纯静态 + 零依赖，这里用固定文案。
const appName = 'CG 微米后台';
</script>

<style module lang="scss">
.preview {
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-left: 3px solid var(--MI_THEME-accent);
	border-radius: 12px;
	padding: 16px;
}

.frame {
	background: var(--MI_THEME-bg);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 8px;
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.logo {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;
	font-weight: 700;
	color: var(--MI_THEME-fg);
	padding: 4px 8px;
	border-bottom: 1px solid var(--MI_THEME-divider);
	padding-bottom: 8px;

	i {
		color: var(--MI_THEME-accent);
	}
}

.group {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.groupTitle {
	font-size: 10px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--MI_THEME-fgTransparentWeak);
	padding: 4px 8px;
}

.item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 8px;
	border-radius: 6px;
	font-size: 12px;
	color: var(--MI_THEME-fg);
	transition: background 0.15s;

	&:hover {
		background: var(--MI_THEME-buttonBg);
	}
}

.itemIcon {
	width: 14px;
	font-size: 14px;
	color: var(--MI_THEME-fgTransparent);
}

.itemLabel {
	flex: 1;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.itemHidden {
	color: var(--MI_THEME-fgTransparentWeak);
	text-decoration: line-through;
	background: transparent;

	&:hover {
		background: transparent;
	}
}

.divider {
	height: 1px;
	background: var(--MI_THEME-divider);
	margin: 4px 0;
}

.legend {
	display: flex;
	gap: 16px;
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid var(--MI_THEME-divider);
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.legendItem {
	display: flex;
	align-items: center;
	gap: 6px;
}

.swatch {
	display: inline-block;
	width: 12px;
	height: 12px;
	border-radius: 3px;
	border: 1px solid var(--MI_THEME-divider);
}

.swatchVisible {
	background: var(--MI_THEME-fg);
}

.swatchHidden {
	background: var(--MI_THEME-fgTransparentWeak);
	border-style: dashed;
}
</style>