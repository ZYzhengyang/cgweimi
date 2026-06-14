<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<div :class="$style.layout">
		<!-- 左侧：配置项列表 -->
		<div :class="$style.list">
			<div v-for="(items, groupName) in groupedItems" :key="groupName" :class="$style.group">
				<div :class="$style.groupTitle">{{ groupName }}</div>
				<div
					v-for="item in items"
					:key="getItemKey(item)"
					:class="[$style.item, { [$style.selected]: selectedKey === getItemKey(item) }]"
					@click="selectedKey = getItemKey(item)"
				>
					<input
						type="checkbox"
						:checked="!hiddenItems.has(getItemKey(item))"
						@click.stop
						@change="toggleHidden(getItemKey(item), !$event.target.checked)"
					/>
					<i :class="item.icon"></i>
					<span>{{ getLabel(item) }}</span>
					<button
						v-if="selectedKey !== getItemKey(item)"
						class="_button"
						:class="$style.editBtn"
						@click.stop="selectedKey = getItemKey(item)"
					>
						<i class="ti ti-pencil"></i>
					</button>
				</div>
			</div>
		</div>

		<!-- 右侧：编辑面板 -->
		<div :class="$style.panel">
			<template v-if="selectedItem">
				<div :class="$style.panelHeader">
					<i :class="selectedItem.icon"></i>
					<span>{{ getItemLabel(selectedItem) }}</span>
				</div>
				<div :class="$style.panelPath">{{ getItemKey(selectedItem) }}</div>
				<div :class="$style.panelField">
					<label>自定义名称</label>
					<input
						type="text"
						:class="$style.input"
						:value="customLabels[getItemKey(selectedItem)] || ''"
						:placeholder="getItemLabel(selectedItem)"
						@input="updateLabel(getItemKey(selectedItem), ($event.target as HTMLInputElement).value)"
					/>
				</div>
				<div :class="$style.panelActions">
					<button class="_button" @click="clearLabel(getItemKey(selectedItem))">
						<i class="ti ti-reload"></i> 恢复默认
					</button>
					<button
						class="_button"
						:class="[$style.hideBtn, { [$style.hidden]: hiddenItems.has(getItemKey(selectedItem)) }]"
						@click="toggleHidden(getItemKey(selectedItem), !hiddenItems.has(getItemKey(selectedItem)))"
					>
						<i :class="hiddenItems.has(getItemKey(selectedItem)) ? 'ti ti-eye-off' : 'ti ti-eye'"></i>
						{{ hiddenItems.has(getItemKey(selectedItem)) ? '已隐藏' : '已显示' }}
					</button>
				</div>
			</template>
			<div v-else :class="$style.panelEmpty">
				<i class="ti ti-click"></i>
				<p>点击左侧项目进行编辑</p>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';

interface ConfigItem {
	key: string;
	label: string;
	icon: string;
	group?: string;
}

interface ModuleItem {
	id: string;
	name: string;
	icon: string;
	group?: string;
}

const props = defineProps<{
	items: (ConfigItem | ModuleItem)[];
	category: string;
	valueKey?: string;
	labelKey?: string;
}>();

const emit = defineEmits<{
	update: [{ hidden: string[]; labels: Record<string, string> }];
}>();

// 获取项的唯一标识
function getItemKey(item: ConfigItem | ModuleItem): string {
	if (props.valueKey && props.valueKey in item) {
		return (item as any)[props.valueKey];
	}
	return (item as ConfigItem).key || (item as ModuleItem).id;
}

// 获取项的显示名称
function getItemLabel(item: ConfigItem | ModuleItem): string {
	if (props.labelKey && props.labelKey in item) {
		return (item as any)[props.labelKey];
	}
	return (item as ConfigItem).label || (item as ModuleItem).name;
}

// 内部状态
const hiddenItems = ref<Set<string>>(new Set());
const customLabels = ref<Record<string, string>>({});
const selectedKey = ref<string | null>(null);

// 从 items 初始化隐藏状态
function initFromItems() {
	hiddenItems.value = new Set();
	customLabels.value = {};
}

// 监听 items 变化重新初始化
watch(() => props.items, initFromItems, { immediate: true });

// 分组
const groupedItems = computed(() => {
	const groups: Record<string, (ConfigItem | ModuleItem)[]> = {};
	for (const item of props.items) {
		const group = item.group || '其他';
		if (!groups[group]) groups[group] = [];
		groups[group].push(item);
	}
	return groups;
});

const selectedItem = computed(() => {
	if (!selectedKey.value) return null;
	return props.items.find(i => getItemKey(i) === selectedKey.value);
});

function getLabel(item: ConfigItem | ModuleItem): string {
	const key = getItemKey(item);
	return customLabels.value[key] || getItemLabel(item);
}

function toggleHidden(key: string, isHidden: boolean) {
	const newSet = new Set(hiddenItems.value);
	if (isHidden) {
		newSet.add(key);
	} else {
		newSet.delete(key);
	}
	hiddenItems.value = newSet;
	emitUpdate();
}

function updateLabel(key: string, value: string) {
	if (value.trim()) {
		customLabels.value[key] = value.trim();
	} else {
		delete customLabels.value[key];
	}
	customLabels.value = { ...customLabels.value };
	emitUpdate();
}

function clearLabel(key: string) {
	delete customLabels.value[key];
	customLabels.value = { ...customLabels.value };
	emitUpdate();
}

function emitUpdate() {
	emit('update', {
		hidden: Array.from(hiddenItems.value),
		labels: { ...customLabels.value },
	});
}

// 暴露方法给父组件
defineExpose({
	getData: () => ({
		hidden: Array.from(hiddenItems.value),
		labels: { ...customLabels.value },
	}),
	setData: (data: { hidden: string[]; labels: Record<string, string> }) => {
		hiddenItems.value = new Set(data.hidden || []);
		customLabels.value = { ...(data.labels || {}) };
	},
});
</script>

<style lang="scss" module>
.layout {
	display: flex;
	gap: 24px;
	min-height: 400px;
}

.list {
	flex: 1;
	max-width: 420px;
	overflow-y: auto;
	max-height: 600px;
}

.group {
	margin-bottom: 16px;
}

.groupTitle {
	font-size: 11px;
	font-weight: 600;
	color: var(--MI_THEME-fgTransparentWeak);
	padding: 8px 12px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.item {
	display: flex;
	align-items: center;
	padding: 8px 12px;
	gap: 10px;
	border-radius: 6px;
	cursor: pointer;
	transition: background 0.15s;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
	}

	&.selected {
		background: var(--MI_THEME-accentedBg);
		border: 1px solid var(--MI_THEME-accent);
	}

	input[type="checkbox"] {
		width: 16px;
		height: 16px;
		accent-color: var(--MI_THEME-accent);
		flex-shrink: 0;
	}

	i {
		font-size: 16px;
		color: var(--MI_THEME-fgTransparentWeak);
		width: 20px;
		text-align: center;
		flex-shrink: 0;
	}

	span {
		flex: 1;
		font-size: 14px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

.editBtn {
	padding: 4px;
	border-radius: 4px;
	color: var(--MI_THEME-fgTransparentWeak);
	opacity: 0;
	transition: opacity 0.15s;

	.item:hover & {
		opacity: 1;
	}

	&:hover {
		color: var(--MI_THEME-accent);
	}
}

.panel {
	flex: 1;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	padding: 20px;
	border: 1px solid var(--MI_THEME-divider);
	min-height: 200px;
}

.panelHeader {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 18px;
	font-weight: 600;
	margin-bottom: 8px;

	i {
		font-size: 22px;
		color: var(--MI_THEME-accent);
	}
}

.panelPath {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-family: var(--MI-font-mono);
	margin-bottom: 24px;
}

.panelField {
	margin-bottom: 20px;

	label {
		display: block;
		font-size: 13px;
		font-weight: 500;
		margin-bottom: 8px;
		color: var(--MI_THEME-fgTransparentWeak);
	}
}

.input {
	width: 100%;
	padding: 10px 14px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 8px;
	font-size: 14px;
	background: var(--MI_THEME-bg);
	color: var(--MI_THEME-fg);
	outline: none;
	transition: border-color 0.15s;

	&:focus {
		border-color: var(--MI_THEME-accent);
	}
}

.panelActions {
	display: flex;
	gap: 12px;

	button {
		padding: 8px 14px;
		border-radius: 6px;
		font-size: 13px;
		background: var(--MI_THEME-bg);
		border: 1px solid var(--MI_THEME-divider);
		color: var(--MI_THEME-fg);
		transition: all 0.15s;

		&:hover {
			border-color: var(--MI_THEME-accent);
			color: var(--MI_THEME-accent);
		}
	}
}

.hideBtn {
	&.hidden {
		background: var(--MI_THEME-accentedBg);
		border-color: var(--MI_THEME-accent);
		color: var(--MI_THEME-accent);
	}
}

.panelEmpty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	min-height: 200px;
	color: var(--MI_THEME-fgTransparentWeak);
	text-align: center;
	gap: 12px;

	i {
		font-size: 48px;
		opacity: 0.3;
	}

	p {
		font-size: 14px;
	}
}

@media (max-width: 700px) {
	.layout {
		flex-direction: column;
	}

	.list {
		max-width: none;
		max-height: 300px;
	}
}
</style>