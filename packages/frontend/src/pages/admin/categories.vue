<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">
			<div :class="$style.header">
				<MkButton primary @click="showAdd = true"><i class="ti ti-plus"></i> 新增分类</MkButton>
			</div>

			<!-- 分类列表 -->
			<div :class="$style.list">
				<div v-for="(cat, index) in categories" :key="cat.id" :class="[$style.item, { [$style.dragging]: dragIndex === index }]"
					draggable="true"
					@dragstart="onDragStart(index, $event)"
					@dragover.prevent="onDragOver(index, $event)"
					@drop.prevent="onDrop(index)"
					@dragend="onDragEnd"
				>
					<div :class="$style.itemLeft">
						<span :class="$style.dragHandle"><i class="ti ti-grip-vertical"></i></span>
						<span :class="$style.icon">{{ cat.icon }}</span>
						<div :class="$style.itemInfo">
							<div :class="$style.itemName">{{ cat.name }}</div>
							<div :class="$style.itemTags">
								<span v-for="tag in cat.tags" :key="tag" :class="$style.tag">{{ tag }}</span>
							</div>
						</div>
					</div>
					<div :class="$style.itemActions">
						<button class="_button" :class="$style.actionBtn" @click="moveUp(index)" :disabled="index === 0">
							<i class="ti ti-chevron-up"></i>
						</button>
						<button class="_button" :class="$style.actionBtn" @click="moveDown(index)" :disabled="index === categories.length - 1">
							<i class="ti ti-chevron-down"></i>
						</button>
						<button class="_button" :class="$style.actionBtn" @click="editCategory(cat)">
							<i class="ti ti-pencil"></i>
						</button>
						<button class="_button" :class="[$style.actionBtn, $style.danger]" @click="deleteCategory(cat.id)">
							<i class="ti ti-trash"></i>
						</button>
					</div>
				</div>
				<div v-if="categories.length === 0" :class="$style.empty">暂无分类</div>
			</div>
		</div>
	</div>

	<!-- 新增/编辑弹窗 -->
	<MkModalWindow v-if="showAdd || editingCat" :width="400" @close="closeModal">
		<template #header>{{ editingCat ? '编辑分类' : '新增分类' }}</template>
		<div class="_gaps_m" style="padding: 16px;">
			<MkInput v-model="form.name" :placeholder="'分类名称，如：2D插画'">
				<template #label>分类名称</template>
			</MkInput>
			<MkInput v-model="form.icon" :placeholder="'Emoji 图标，如：🎨'">
				<template #label>图标</template>
			</MkInput>
			<MkInput v-model="form.tagsStr" :placeholder="'标签，逗号分隔，如：illustration, comic'">
				<template #label>标签</template>
			</MkInput>
			<div style="display: flex; justify-content: flex-end; gap: 8px;">
				<MkButton @click="closeModal">取消</MkButton>
				<MkButton primary @click="saveCategory">保存</MkButton>
			</div>
		</div>
	</MkModalWindow>

	<template #footer>
		<div :class="$style.footer">
			<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 16px; --MI_SPACER-max: 16px;">
				<MkButton primary rounded @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
			</div>
		</div>
	</template>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';

interface Category {
	id: string;
	name: string;
	icon: string;
	tags: string[];
}

const meta = await misskeyApi('admin/meta');
const categories = ref<Category[]>(meta.clientOptions?.categories ?? []);
const showAdd = ref(false);
const editingCat = ref<Category | null>(null);
const form = ref({ name: '', icon: '', tagsStr: '' });

function editCategory(cat: Category) {
	editingCat.value = cat;
	form.value = { name: cat.name, icon: cat.icon, tagsStr: cat.tags.join(', ') };
}

function deleteCategory(id: string) {
	categories.value = categories.value.filter(c => c.id !== id);
}

function moveUp(index: number) {
	if (index <= 0) return;
	const arr = [...categories.value];
	[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
	categories.value = arr;
}

function moveDown(index: number) {
	if (index >= categories.value.length - 1) return;
	const arr = [...categories.value];
	[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
	categories.value = arr;
}

// 拖拽排序
const dragIndex = ref<number | null>(null);

function onDragStart(index: number, ev: DragEvent) {
	dragIndex.value = index;
	if (ev.dataTransfer) {
		ev.dataTransfer.effectAllowed = 'move';
	}
}

function onDragOver(index: number, ev: DragEvent) {
	if (ev.dataTransfer) {
		ev.dataTransfer.dropEffect = 'move';
	}
}

function onDrop(targetIndex: number) {
	if (dragIndex.value === null || dragIndex.value === targetIndex) return;
	const arr = [...categories.value];
	const [item] = arr.splice(dragIndex.value, 1);
	arr.splice(targetIndex, 0, item);
	categories.value = arr;
	dragIndex.value = null;
}

function onDragEnd() {
	dragIndex.value = null;
}

function saveCategory() {
	if (!form.value.name || !form.value.icon) return;
	const tags = form.value.tagsStr.split(',').map(t => t.trim()).filter(Boolean);

	if (editingCat.value) {
		const idx = categories.value.findIndex(c => c.id === editingCat.value!.id);
		if (idx >= 0) {
			categories.value[idx] = { ...editingCat.value, name: form.value.name, icon: form.value.icon, tags };
		}
	} else {
		categories.value.push({
			id: form.value.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
			name: form.value.name,
			icon: form.value.icon,
			tags,
		});
	}
	closeModal();
}

function closeModal() {
	showAdd.value = false;
	editingCat.value = null;
	form.value = { name: '', icon: '', tagsStr: '' };
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		clientOptions: {
			...meta.clientOptions,
			categories: categories.value,
		},
	}).then(() => {
		fetchInstance(true);
	});
}

const headerTabs = computed(() => []);

definePage(() => ({
	title: '分类管理',
	icon: 'ti ti-folder',
}));
</script>

<style lang="scss" module>
.footer {
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
}

.header {
	display: flex;
	justify-content: flex-end;
}

.list {
	background: var(--MI_THEME-panel);
	border-radius: 16px;
	overflow: hidden;
	border: 1px solid var(--MI_THEME-divider);
}

.item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid var(--MI_THEME-divider);
	cursor: grab;
	transition: opacity 0.2s, background 0.2s, transform 0.15s;

	&:last-child {
		border-bottom: none;
	}

	&.dragging {
		opacity: 0.6;
		background: var(--MI_THEME-accentedBg);
		transform: scale(1.02);
	}

	&:hover {
		background: var(--MI_THEME-accentedBg);
		transform: translateX(4px);
	}
}

.itemLeft {
	display: flex;
	align-items: center;
	gap: 16px;
	flex: 1;
	min-width: 0;
}

.dragHandle {
	color: var(--MI_THEME-fgTransparentWeak);
	cursor: move;
	font-size: 18px;
	transition: color 0.15s;

	&:hover {
		color: var(--MI_THEME-accent);
	}
}

.icon {
	font-size: 28px;
}

.itemInfo {
	min-width: 0;
}

.itemName {
	font-weight: 600;
	font-size: 15px;
	color: var(--MI_THEME-fg);
}

.itemTags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 8px;
}

.tag {
	padding: 4px 12px;
	background: color-mix(in srgb, var(--MI_THEME-accent) 15%, transparent);
	border: 1px solid color-mix(in srgb, var(--MI_THEME-accent) 30%, transparent);
	border-radius: 20px;
	font-size: 12px;
	color: var(--MI_THEME-accent);
	font-weight: 500;
	transition: all 0.15s;

	&:hover {
		background: color-mix(in srgb, var(--MI_THEME-accent) 25%, transparent);
		transform: scale(1.05);
	}
}

.itemActions {
	display: flex;
	gap: 6px;
}

.actionBtn {
	width: 34px;
	height: 34px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);
	transition: all 0.15s;

	&:hover {
		background: var(--MI_THEME-accentedBg);
		color: var(--MI_THEME-accent);
		transform: scale(1.05);
	}

	&:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	&.danger:hover {
		background: var(--MI_THEME-dangerBg);
		color: var(--MI_THEME-danger);
	}
}

.empty {
	padding: 48px;
	text-align: center;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 14px;
}

@media (max-width: 600px) {
	.item {
		padding: 12px 14px;
		gap: 10px;
	}

	.itemLeft {
		gap: 10px;
	}

	.icon {
		font-size: 22px;
	}

	.itemName {
		font-size: 13px;
	}

	.itemTags {
		margin-top: 6px;
	}

	.tag {
		padding: 3px 10px;
		font-size: 11px;
	}

	.actionBtn {
		width: 30px;
		height: 30px;
	}

	.actions {
		gap: 4px;
	}
}
</style>
