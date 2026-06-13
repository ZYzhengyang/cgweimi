<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div ref="container" :class="$style.root">
	<div
		v-for="item in activeDanmakus"
		:key="item.id"
		:class="$style.danmaku"
		:style="{
			top: item.track * 33.33 + '%',
			color: item.color || '#ffffff',
			animationDuration: item.speed + 's',
		}"
	>
		{{ item.text }}
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, watch, onUnmounted, nextTick } from 'vue';

export interface DanmakuItem {
	id: string;
	text: string;
	color?: string;
	speed?: number;
	time?: number;
}

const props = withDefaults(defineProps<{
	danmakus: DanmakuItem[];
	maxTracks?: number;
}>(), {
	maxTracks: 3,
});

const container = ref<HTMLElement | null>(null);
const activeDanmakus = ref<(DanmakuItem & { track: number })[]>([]);
let nextId = 0;
let animationTimers: ReturnType<typeof setTimeout>[] = [];

const trackOccupied = ref<boolean[]>([]);

function resetTracks() {
	trackOccupied.value = new Array(props.maxTracks).fill(false);
}

function findFreeTrack(): number {
	for (let i = 0; i < props.maxTracks; i++) {
		if (!trackOccupied.value[i]) {
			trackOccupied.value[i] = true;
			return i;
		}
	}
	// If all tracks occupied, pick a random one
	return Math.floor(Math.random() * props.maxTracks);
}

function spawnDanmaku(item: DanmakuItem) {
	const track = findFreeTrack();
	const speed = item.speed ?? (3 + Math.random() * 5); // 3-8s random
	const id = `dm-${nextId++}`;

	const active = { ...item, id, track, speed };
	activeDanmakus.value.push(active);

	// Release track after animation ends
	const timer = setTimeout(() => {
		const idx = activeDanmakus.value.findIndex(d => d.id === id);
		if (idx !== -1) {
			activeDanmakus.value.splice(idx, 1);
		}
		trackOccupied.value[track] = false;
	}, speed * 1000);

	animationTimers.push(timer);
}

let lastLength = 0;

watch(() => props.danmakus, (newVal) => {
	// Only process newly added danmakus
	if (newVal.length > lastLength) {
		const newItems = newVal.slice(lastLength);
		for (const item of newItems) {
			spawnDanmaku(item);
		}
	}
	lastLength = newVal.length;
}, { deep: true });

resetTracks();

onUnmounted(() => {
	for (const timer of animationTimers) {
		clearTimeout(timer);
	}
	animationTimers = [];
	activeDanmakus.value = [];
});
</script>

<style lang="scss" module>
.root {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	overflow: hidden;
	pointer-events: none;
	z-index: 10;
}

.danmaku {
	position: absolute;
	left: 100%;
	white-space: nowrap;
	font-weight: bold;
	font-size: 16px;
	line-height: 1.4;
	text-shadow:
		1px 1px 2px rgba(0, 0, 0, 0.8),
		-1px -1px 2px rgba(0, 0, 0, 0.8),
		1px -1px 2px rgba(0, 0, 0, 0.8),
		-1px 1px 2px rgba(0, 0, 0, 0.8);
	animation: danmaku-scroll linear forwards;
	user-select: none;
}

@keyframes danmaku-scroll {
	from {
		transform: translateX(0);
	}
	to {
		transform: translateX(calc(-100vw - 100%));
	}
}
</style>
