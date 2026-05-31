<!--
  CG微米 - 关于页面
-->
<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div style="overflow: clip;">
		<div class="_spacer" style="--MI_SPACER-w: 600px; --MI_SPACER-min: 20px;">
			<div class="_gaps_m">
				<div v-panel class="about" style="text-align: center; padding: 32px;">
					<div class="container">
						<img src="/client-assets/about-icon.png" alt="" style="width: 80px; border-radius: 16px;" draggable="false"/>
						<div style="font-size: 1.5em; font-weight: bold; margin-top: 12px;">CG微米</div>
						<div style="opacity: 0.5; margin-top: 4px;">v{{ version }}</div>
					</div>
				</div>
				<div style="text-align: center; line-height: 1.8;">
					CG微米 — CG 创作者社区平台<br>
					聚集 CG 人才，展示作品，交流技术，发现灵感
				</div>
				<FormSection>
					<div class="_gaps_s">
						<FormLink to="https://www.cgvmi.com" external>
							<template #icon><i class="ti ti-home"></i></template>
							CG微米官网
							<template #suffix>cgvmi.com</template>
						</FormLink>
					</div>
				</FormSection>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { version } from '@@/js/config.js';
import FormLink from '@/components/form/link.vue';
import FormSection from '@/components/form/section.vue';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';

const headerActions = computed(() => []);
const headerTabs = computed(() => []);

definePage(() => ({
	title: '关于 CG微米',
	icon: null,
}));
</script>
