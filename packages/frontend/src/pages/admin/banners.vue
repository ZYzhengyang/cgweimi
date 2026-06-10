<!--
SPDX-FileCopyrightText: CGVMI
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">
			<div :class="$style.header">
				<MkButton primary @click="showAdd = true"><i class="ti ti-plus"></i> 新增 Banner</MkButton>
			</div>

			<!-- Banner 列表 -->
			<div :class="$style.list">
				<div v-for="(banner, index) in banners" :key="banner.id" :class="[$style.item, { [$style.dragging]: dragIndex === index }]"
					draggable="true"
					@dragstart="onDragStart(index, $event)"
					@dragover.prevent="onDragOver(index, $event)"
					@drop.prevent="onDrop(index)"
					@dragend="onDragEnd"
				>
					<div :class="$style.preview">
						<img v-if="banner.imageUrl" :src="banner.imageUrl" :class="$style.previewImg" />
						<div v-else :class="$style.noPreview">暂无图片</div>
					</div>
					<div :class="$style.info">
						<div :class="$style.title">{{ banner.title }}</div>
						<div :class="$style.subtitle">{{ banner.subtitle }}</div>
						<div :class="$style.link"><i class="ti ti-link"></i> {{ banner.link }}</div>
					</div>
					<div :class="$style.actions">
						<MkSwitch v-model="banner.enabled" :class="$style.switch">
							<template #label>启用</template>
						</MkSwitch>
						<button class="_button" :class="$style.actionBtn" @click="moveUp(index)" :disabled="index === 0">
							<i class="ti ti-chevron-up"></i>
						</button>
						<button class="_button" :class="$style.actionBtn" @click="moveDown(index)" :disabled="index === banners.length - 1">
							<i class="ti ti-chevron-down"></i>
						</button>
						<button class="_button" :class="$style.actionBtn" @click="editBanner(banner)">
							<i class="ti ti-pencil"></i>
						</button>
						<button class="_button" :class="[$style.actionBtn, $style.danger]" @click="deleteBanner(banner.id)">
							<i class="ti ti-trash"></i>
						</button>
					</div>
				</div>
				<div v-if="banners.length === 0" :class="$style.empty">暂无 Banner</div>
			</div>
		</div>
	</div>

	<!-- 新增/编辑弹窗 -->
	<MkModalWindow v-if="showAdd || editingBanner" :width="480" @close="closeModal">
		<template #header>{{ editingBanner ? '编辑 Banner' : '新增 Banner' }}</template>
		<div class="_gaps_m" style="padding: 16px;">
			<MkInput v-model="form.title" :placeholder="'Banner 标题'">
				<template #label>标题</template>
			</MkInput>
			<MkInput v-model="form.subtitle" :placeholder="'副标题'">
				<template #label>副标题</template>
			</MkInput>
			<MkInput v-model="form.imageUrl" :placeholder="'https://...'">
				<template #label>图片链接</template>
			</MkInput>
			<MkInput v-model="form.link" :placeholder="'/explore 或 https://...'">
				<template #label>跳转链接</template>
			</MkInput>
			<div v-if="form.imageUrl" :class="$style.modalPreview">
				<img :src="form.imageUrl" :class="$style.modalPreviewImg" />
			</div>
			<div style="display: flex; justify-content: flex-end; gap: 8px;">
				<MkButton @click="closeModal">取消</MkButton>
				<MkButton primary @click="saveBanner">保存</MkButton>
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
import MkSwitch from '@/components/MkSwitch.vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';

interface Banner {
	id: string;
	title: string;
	subtitle: string;
	imageUrl: string;
	link: string;
	enabled: boolean;
}

const meta = await misskeyApi('admin/meta');
const banners = ref<Banner[]>(meta.clientOptions?.banners ?? []);
const showAdd = ref(false);
const editingBanner = ref<Banner | null>(null);
const form = ref({ title: '', subtitle: '', imageUrl: '', link: '' });

function editBanner(banner: Banner) {
	editingBanner.value = banner;
	form.value = { title: banner.title, subtitle: banner.subtitle, imageUrl: banner.imageUrl, link: banner.link };
}

function deleteBanner(id: string) {
	banners.value = banners.value.filter(b => b.id !== id);
}

function moveUp(index: number) {
	if (index <= 0) return;
	const arr = [...banners.value];
	[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
	banners.value = arr;
}

function moveDown(index: number) {
	if (index >= banners.value.length - 1) return;
	const arr = [...banners.value];
	[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
	banners.value = arr;
}

// 拖拽排序
const dragIndex = ref<number | null>(null);

function onDragStart(index: number, ev: DragEvent) {
	dragIndex.value = index;
	if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
}

function onDragOver(index: number, ev: DragEvent) {
	if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
}

function onDrop(targetIndex: number) {
	if (dragIndex.value === null || dragIndex.value === targetIndex) return;
	const arr = [...banners.value];
	const [item] = arr.splice(dragIndex.value, 1);
	arr.splice(targetIndex, 0, item);
	banners.value = arr;
	dragIndex.value = null;
}

function onDragEnd() {
	dragIndex.value = null;
}

function saveBanner() {
	if (!form.value.title) return;

	if (editingBanner.value) {
		const idx = banners.value.findIndex(b => b.id === editingBanner.value!.id);
		if (idx >= 0) {
			banners.value[idx] = { ...editingBanner.value, ...form.value };
		}
	} else {
		banners.value.push({
			id: Date.now().toString(),
			...form.value,
			enabled: true,
		});
	}
	closeModal();
}

function closeModal() {
	showAdd.value = false;
	editingBanner.value = null;
	form.value = { title: '', subtitle: '', imageUrl: '', link: '' };
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		clientOptions: {
			...meta.clientOptions,
			banners: banners.value,
		},
	}).then(() => {
		fetchInstance(true);
	});
}

const headerTabs = computed(() => []);

definePage(() => ({
	title: 'Banner 管理',
	icon: 'ti ti-photo',
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
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.item {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px;
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	transition: box-shadow 0.15s, opacity 0.15s;
	cursor: grab;

	&.dragging {
		opacity: 0.5;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--MI_THEME-fg) 15%, transparent);
	}

	&:hover {
		box-shadow: 0 2px 8px color-mix(in srgb, var(--MI_THEME-fg) 8%, transparent);
	}
}

.preview {
	width: 160px;
	height: 80px;
	border-radius: 8px;
	overflow: hidden;
	flex-shrink: 0;
	background: var(--MI_THEME-bg);
}

.previewImg {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.noPreview {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 12px;
}

.info {
	flex: 1;
	min-width: 0;
}

.title {
	font-weight: 600;
	font-size: 14px;
	margin-bottom: 4px;
}

.subtitle {
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
	margin-bottom: 4px;
}

.link {
	font-size: 11px;
	color: var(--MI_THEME-accent);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.actions {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
}

.switch {
	font-size: 12px;
}

.actionBtn {
	width: 32px;
	height: 32px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--MI_THEME-fgTransparentWeak);

	&:hover {
		background: var(--MI_THEME-accentedBg);
		color: var(--MI_THEME-accent);
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
	padding: 32px;
	text-align: center;
	color: var(--MI_THEME-fgTransparentWeak);
	background: var(--MI_THEME-panel);
	border-radius: 12px;
}

.modalPreview {
	border-radius: 8px;
	overflow: hidden;
	max-height: 200px;
}

.modalPreviewImg {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

@media (max-width: 600px) {
	.item {
		flex-wrap: wrap;
		padding: 12px;
		gap: 12px;
	}

	.preview {
		width: 100%;
		height: 120px;
	}

	.actions {
		width: 100%;
		justify-content: flex-end;
	}
}
</style>
