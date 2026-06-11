<!--
  MkInspirationPopup.vue
  灵感工具全屏弹窗 — 包裹 MkInspirationGraph
-->
<template>
<teleport to="body">
<Transition name="popup-fade">
<div v-if="visible" :class="$style.overlay">
	<!-- 关闭按钮 -->
	<button class="_button" :class="$style.closeBtn" @click="close">
		<i class="ti ti-x"></i>
	</button>
	<!-- 全屏图谱 -->
	<MkInspirationGraph :class="$style.graph"/>
</div>
</Transition>
</teleport>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import MkInspirationGraph from '@/components/MkInspirationGraph.vue';

const emit = defineEmits<{
	closed: [];
}>();

const visible = ref(false);

function close() {
	visible.value = false;
	setTimeout(() => emit('closed'), 300);
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') close();
}

onMounted(() => {
	document.addEventListener('keydown', onKeydown);
	document.body.style.overflow = 'hidden';
	requestAnimationFrame(() => {
		visible.value = true;
	});
});

onUnmounted(() => {
	document.removeEventListener('keydown', onKeydown);
	document.body.style.overflow = '';
});
</script>

<style module lang="scss">
.overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	z-index: 10000;
	background: var(--MI_THEME-bg, #000);
}

.closeBtn {
	position: fixed;
	top: 16px;
	right: 16px;
	z-index: 10001;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.1);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	cursor: pointer;
	transition: background 0.2s;
	&:hover {
		background: rgba(255, 255, 255, 0.2);
	}
}

.graph {
	width: 100%;
	height: 100%;
}
</style>

<style>
.popup-fade-enter-active {
	transition: opacity 0.3s ease;
}
.popup-fade-leave-active {
	transition: opacity 0.2s ease;
}
.popup-fade-enter-from,
.popup-fade-leave-to {
	opacity: 0;
}
</style>
