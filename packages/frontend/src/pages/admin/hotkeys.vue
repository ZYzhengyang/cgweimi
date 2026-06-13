<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="currentTab" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">
			<MkInfo>{{ i18n.ts._hotkeyAdmin.description }}</MkInfo>

			<template v-for="cat in categories" :key="cat.id">
				<MkFolder v-if="currentTab === 'all' || currentTab === cat.id" :defaultOpen="true">
					<template #icon><i :class="cat.icon"></i></template>
					<template #label>{{ cat.label }}</template>

					<div class="_gaps_s">
						<div v-for="entry in getEntriesByCategory(cat.id)" :key="entry.id" :class="$style.hotkeyItem">
							<div :class="$style.hotkeyInfo">
								<div :class="$style.hotkeyName">{{ entry.def.description }}</div>
								<div :class="$style.hotkeyId">{{ entry.id }}</div>
							</div>
							<div :class="$style.hotkeyControls">
								<MkInput
									v-model="editingConfig[entry.id].key"
									:class="$style.keyInput"
									:disabled="!editingConfig[entry.id].enabled"
									:placeholder="DEFAULT_HOTKEY_CONFIG[entry.id]?.key ?? ''"
								/>
								<MkSwitch v-model="editingConfig[entry.id].enabled" />
							</div>
						</div>
					</div>
				</MkFolder>
			</template>

			<div :class="$style.actions">
				<MkButton primary @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
				<MkButton @click="resetToDefaults"><i class="ti ti-reload"></i> {{ i18n.ts._hotkeyAdmin.resetToDefaults }}</MkButton>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue';
import PageWithHeader from '@/components/global/PageWithHeader.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkInput from '@/components/MkInput.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { DEFAULT_HOTKEY_CONFIG, HOTKEY_CATEGORIES } from '@/utility/hotkey-defaults.js';
import { instance, fetchInstance } from '@/instance.js';
import { definePage } from '@/page.js';

definePage(() => ({
	title: i18n.ts._hotkeyAdmin.title,
	icon: 'ti ti-keyboard',
}));

const currentTab = ref('all');

const categories = Object.entries(HOTKEY_CATEGORIES).map(([id, label]) => ({
	id,
	label,
	icon: getCategoryIcon(id),
}));

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

const headerTabs = [
	{ key: 'all', title: i18n.ts._hotkeyAdmin.all },
	...categories.map(c => ({ key: c.id, title: c.label })),
];

interface EditingEntry {
	enabled: boolean;
	key: string;
}

const editingConfig = reactive<Record<string, EditingEntry>>({});

function getEntriesByCategory(category: string) {
	return Object.entries(DEFAULT_HOTKEY_CONFIG)
		.filter(([, def]) => def.category === category)
		.map(([id, def]) => ({ id, def }));
}

function initEditingConfig() {
	const adminConfig = instance.hotkeyConfig as Record<string, { enabled: boolean; key: string }> | undefined;
	for (const [id, def] of Object.entries(DEFAULT_HOTKEY_CONFIG)) {
		const override = adminConfig?.[id];
		editingConfig[id] = {
			enabled: override?.enabled ?? def.enabled,
			key: override?.key ?? def.key,
		};
	}
}

onMounted(() => {
	initEditingConfig();
});

async function save() {
	const config: Record<string, { enabled: boolean; key: string }> = {};
	for (const [id, entry] of Object.entries(editingConfig)) {
		config[id] = {
			enabled: entry.enabled,
			key: entry.key,
		};
	}
	await misskeyApi('admin/update-meta', { hotkeyConfig: config });
	await fetchInstance(true);
	os.success();
}

function resetToDefaults() {
	for (const [id, def] of Object.entries(DEFAULT_HOTKEY_CONFIG)) {
		editingConfig[id] = {
			enabled: def.enabled,
			key: def.key,
		};
	}
}
</script>

<style lang="scss" module>
.hotkeyItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 12px;
	border-radius: 8px;
	background: var(--MI_THEME-panel);

	&:not(:last-child) {
		margin-bottom: 4px;
	}
}

.hotkeyInfo {
	flex: 1;
	min-width: 0;
}

.hotkeyName {
	font-weight: 600;
	font-size: 0.95em;
}

.hotkeyId {
	font-size: 0.8em;
	opacity: 0.6;
	font-family: monospace;
}

.hotkeyControls {
	display: flex;
	align-items: center;
	gap: 12px;
	flex-shrink: 0;
}

.keyInput {
	width: 140px;
}

.actions {
	display: flex;
	gap: 12px;
	justify-content: flex-end;
	margin-top: 16px;
}
</style>
