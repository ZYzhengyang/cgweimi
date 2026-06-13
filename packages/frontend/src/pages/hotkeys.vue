<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div :class="$style.container">
		<div :class="$style.header">
			<h1 :class="$style.title"><i class="ti ti-keyboard"></i> {{ i18n.ts._hotkeys.title }}</h1>
			<MkInput v-model="searchQuery" :placeholder="i18n.ts.search" type="search">
				<template #prefix><i class="ti ti-search"></i></template>
			</MkInput>
		</div>

		<div :class="$style.categories">
			<div v-for="cat in filteredCategories" :key="cat.id" :class="$style.category">
				<h2 :class="$style.categoryTitle"><i :class="cat.icon"></i> {{ cat.label }}</h2>
				<div :class="$style.hotkeyList">
					<div v-for="entry in getFilteredEntries(cat.id)" :key="entry.id" :class="$style.hotkeyItem">
						<span :class="$style.hotkeyDesc">{{ entry.def.description }}</span>
						<span :class="$style.hotkeyKeys">
							<kbd v-for="(k, idx) in parseKeys(entry.key)" :key="idx">{{ k }}</kbd>
						</span>
					</div>
					<div v-if="getFilteredEntries(cat.id).length === 0" :class="$style.empty">
						{{ i18n.ts._hotkeys.noResults }}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import MkInput from '@/components/MkInput.vue';
import { i18n } from '@/i18n.js';
import type { HotkeyDef } from '@/utility/hotkey-defaults.js';
import { HOTKEY_CATEGORIES, getMergedHotkeyConfig } from '@/utility/hotkey-defaults.js';
import { instance } from '@/instance.js';
import { definePage } from '@/page.js';

// eslint-disable-next-line vue/multi-word-component-names
definePage(() => ({
	title: i18n.ts._hotkeys.title,
	icon: 'ti ti-keyboard',
}));

const searchQuery = ref('');

function getCategoryIcon(cat: string): string {
	switch (cat) {
		case 'global': return 'ti ti-world';
		case 'note': return 'ti ti-note';
		case 'media': return 'ti ti-player-play';
		case 'post': return 'ti ti-pencil';
		case 'chat': return 'ti ti-message';
		default: return 'ti ti-keyboard';
	}
}

const mergedConfig = computed(() => {
	const adminConfig = instance.hotkeyConfig as Record<string, { enabled: boolean; key: string }> | undefined;
	return getMergedHotkeyConfig(adminConfig);
});

const allCategories = Object.entries(HOTKEY_CATEGORIES).map(([id, label]) => ({
	id,
	label,
	icon: getCategoryIcon(id),
}));

const filteredCategories = computed(() => {
	return allCategories;
});

interface HotkeyEntry {
	id: string;
	def: HotkeyDef;
	key: string;
}

function getEntriesByCategory(category: string): HotkeyEntry[] {
	return Object.entries(mergedConfig.value)
		.filter(([, def]) => def.category === category && def.enabled)
		.map(([id, def]) => ({ id, def, key: def.key }));
}

function getFilteredEntries(category: string): HotkeyEntry[] {
	const entries = getEntriesByCategory(category);
	if (!searchQuery.value.trim()) return entries;
	const q = searchQuery.value.toLowerCase();
	return entries.filter(entry =>
		entry.def.description.toLowerCase().includes(q) ||
		entry.id.toLowerCase().includes(q) ||
		entry.key.toLowerCase().includes(q),
	);
}

function parseKeys(keyStr: string): string[] {
	return keyStr.split('|').map(k => {
		return k.split('+').map(part => {
			switch (part.trim().toLowerCase()) {
				case 'ctrl': return 'Ctrl';
				case 'shift': return 'Shift';
				case 'alt': return 'Alt';
				case 'enter': return 'Enter';
				case 'space': return 'Space';
				case 'up': return '↑';
				case 'down': return '↓';
				case 'left': return '←';
				case 'right': return '→';
				case 'esc': return 'Esc';
				case 'tab': return 'Tab';
				case 'plus': return '+';
				default: return part.toUpperCase();
			}
		}).join(' + ');
	});
}
</script>

<style lang="scss" module>
.root {
	padding: 24px;
	max-width: 800px;
	margin: 0 auto;
}

.container {
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	flex-wrap: wrap;
}

.title {
	font-size: 1.4em;
	font-weight: 700;
	margin: 0;
	display: flex;
	align-items: center;
	gap: 8px;
}

.categories {
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.categoryTitle {
	font-size: 1.1em;
	font-weight: 600;
	margin: 0 0 12px 0;
	display: flex;
	align-items: center;
	gap: 8px;
	opacity: 0.8;
}

.hotkeyList {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.hotkeyItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 16px;
	border-radius: 8px;
	background: var(--MI_THEME-panel);
}

.hotkeyDesc {
	font-size: 0.95em;
}

.hotkeyKeys {
	display: flex;
	gap: 4px;
	flex-shrink: 0;

	kbd {
		display: inline-block;
		padding: 2px 8px;
		font-size: 0.85em;
		font-family: monospace;
		background: var(--MI_THEME-bg);
		border: 1px solid var(--MI_THEME-divider);
		border-radius: 4px;
		min-width: 24px;
		text-align: center;
	}
}

.empty {
	text-align: center;
	opacity: 0.5;
	padding: 16px;
}
</style>
