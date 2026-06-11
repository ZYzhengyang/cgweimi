<!--
SPDX-FileCopyrightText: CGweimi
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div ref="containerEl" :class="$style.root">
	<canvas
		ref="canvasEl"
		:class="$style.canvas"
		@mousedown="onMouseDown"
		@mousemove="onMouseMove"
		@mouseup="onMouseUp"
		@mouseleave="onMouseUp"
		@contextmenu.prevent
		@touchstart.prevent="onTouchStart"
		@touchmove.prevent="onTouchMove"
		@touchend="onTouchEnd"
	/>
	<div v-if="showInfo" :class="$style.info">
		左键拖拽 | 右键切割<br>
		<span :class="$style.fps">{{ fpsText }}</span>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import tinycolor from 'tinycolor2';
import { themeManager } from '@/theme.js';

const props = withDefaults(defineProps<{
	cols?: number;
	rows?: number;
	color?: string;
	interactive?: boolean;
	wind?: boolean;
	showInfo?: boolean;
}>(), {
	cols: 70,
	rows: 45,
	color: '',
	interactive: true,
	wind: true,
	showInfo: false,
});

// --- refs ---
const containerEl = ref<HTMLDivElement>();
const canvasEl = ref<HTMLCanvasElement>();

// --- physics constants ---
const DIST = 8;
const GRAVITY = 0.18;
const ITERATIONS = 8;
const DAMPING = 0.98;
const FOCAL = 600;
const WIND_STRENGTH = 0.12;

// --- detect mobile and reduce point count ---
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
const effectiveCols = computed(() => isMobile ? Math.min(props.cols, 35) : props.cols);
const effectiveRows = computed(() => isMobile ? Math.min(props.rows, 25) : props.rows);

// --- physics classes ---
class Point {
	x: number;
	y: number;
	z: number;
	px: number;
	py: number;
	pz: number;
	locked: boolean;
	grabbed: boolean;

	constructor(x: number, y: number, z: number) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.px = x;
		this.py = y;
		this.pz = z;
		this.locked = false;
		this.grabbed = false;
	}

	update(t: number) {
		if (this.locked || this.grabbed) return;
		const vx = (this.x - this.px) * DAMPING;
		const vy = (this.y - this.py) * DAMPING;
		const vz = (this.z - this.pz) * DAMPING;
		this.px = this.x;
		this.py = this.y;
		this.pz = this.z;
		this.x += vx;
		this.y += vy;
		this.z += vz;
		this.y += GRAVITY;
		if (props.wind) {
			this.z += Math.sin(t + this.x * 0.04) * WIND_STRENGTH;
		}
		this.z *= 0.995;
	}
}

class Link {
	a: Point;
	b: Point;
	rest: number;
	broken: boolean;

	constructor(a: Point, b: Point) {
		this.a = a;
		this.b = b;
		const dx = a.x - b.x;
		const dy = a.y - b.y;
		const dz = a.z - b.z;
		this.rest = Math.sqrt(dx * dx + dy * dy + dz * dz);
		this.broken = false;
	}

	solve() {
		if (this.broken) return;
		const dx = this.a.x - this.b.x;
		const dy = this.a.y - this.b.y;
		const dz = this.a.z - this.b.z;
		const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
		if (d > this.rest * 5) {
			this.broken = true;
			return;
		}
		if (d < 0.01) return;
		const f = (this.rest - d) / d * 0.5;
		const ox = dx * f;
		const oy = dy * f;
		const oz = dz * f;
		if (!this.a.locked && !this.a.grabbed) {
			this.a.x += ox;
			this.a.y += oy;
			this.a.z += oz;
		}
		if (!this.b.locked && !this.b.grabbed) {
			this.b.x -= ox;
			this.b.y -= oy;
			this.b.z -= oz;
		}
	}
}

// --- state ---
let points: Point[] = [];
let links: Link[] = [];
let W = 0;
let H = 0;
let time = 0;
let frames = 0;
let lastFpsTime = performance.now();
const fpsText = ref('');
let handle: number | null = null;
let isVisible = true;
let observer: IntersectionObserver | null = null;
let resizeObserver: ResizeObserver | null = null;

// mouse state
let grabbed: Point | null = null;
let cutting = false;
const mouse = { x: 0, y: 0, px: 0, py: 0 };

// --- cloth color from theme ---
const accentColor = ref('#3498db');
const bgColor = ref('#0a0a0f');

function updateColor() {
	if (props.color) {
		accentColor.value = props.color;
		return;
	}
	const theme = themeManager.currentCompiledTheme;
	if (theme?.accent) {
		accentColor.value = tinycolor(theme.accent).toHexString();
	}
	if (theme?.bg) {
		bgColor.value = tinycolor(theme.bg).toHexString();
	}
}

updateColor();

// --- parse hex color to rgb ---
function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
		: { r: 50, g: 150, b: 255 };
}

// --- init physics ---
function initCloth() {
	const cols = effectiveCols.value;
	const rows = effectiveRows.value;
	points = [];
	links = [];

	const ox = (cols * DIST) / 2;
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const p = new Point(x * DIST - ox, y * DIST + 30, 0);
			if (y === 0) p.locked = true;
			points.push(p);
		}
	}

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const i = y * cols + x;
			if (x < cols - 1) links.push(new Link(points[i], points[i + 1]));
			if (y < rows - 1) links.push(new Link(points[i], points[i + cols]));
		}
	}
}

// --- projection ---
function project(p: Point) {
	const persp = FOCAL / (FOCAL + p.z + 300);
	return {
		sx: W / 2 + p.x * persp,
		sy: H / 10 + p.y * persp,
		depth: p.z,
	};
}

// --- geometry helpers ---
function ccw(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
	return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
}

function segIntersect(
	ax: number, ay: number, bx: number, by: number,
	cx: number, cy: number, dx: number, dy: number,
) {
	return (
		ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
		ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy)
	);
}

// --- find nearest point ---
function findNearest(clientX: number, clientY: number): Point | null {
	let best = 60;
	let found: Point | null = null;
	for (const p of points) {
		if (p.locked) continue;
		const { sx, sy } = project(p);
		const d = Math.hypot(sx - clientX, sy - clientY);
		if (d < best) {
			best = d;
			found = p;
		}
	}
	return found;
}

// --- mouse events ---
function onMouseDown(e: MouseEvent) {
	if (!props.interactive) return;
	const canvas = canvasEl.value;
	if (!canvas) return;
	const rect = canvas.getBoundingClientRect();

	if (e.button === 0) {
		const found = findNearest(e.clientX - rect.left, e.clientY - rect.top);
		if (found) {
			grabbed = found;
			found.grabbed = true;
		}
	}
	if (e.button === 2) {
		cutting = true;
	}
}

function onMouseMove(e: MouseEvent) {
	if (!props.interactive) return;
	const canvas = canvasEl.value;
	if (!canvas) return;
	const rect = canvas.getBoundingClientRect();
	const cx = e.clientX - rect.left;
	const cy = e.clientY - rect.top;

	mouse.px = mouse.x;
	mouse.py = mouse.y;
	mouse.x = cx;
	mouse.y = cy;

	if (grabbed) {
		const persp = FOCAL / (FOCAL + grabbed.z + 300);
		grabbed.x = (cx - W / 2) / persp;
		grabbed.y = (cy - H / 10) / persp;
		grabbed.px = grabbed.x;
		grabbed.py = grabbed.y;
	}
}

function onMouseUp(e: MouseEvent) {
	if (e.button === 0 && grabbed) {
		grabbed.grabbed = false;
		grabbed = null;
	}
	if (e.button === 2) {
		cutting = false;
	}
}

// --- touch events ---
function onTouchStart(e: TouchEvent) {
	if (!props.interactive) return;
	const touch = e.touches[0];
	const canvas = canvasEl.value;
	if (!canvas) return;
	const rect = canvas.getBoundingClientRect();
	const cx = touch.clientX - rect.left;
	const cy = touch.clientY - rect.top;

	mouse.x = cx;
	mouse.y = cy;
	mouse.px = cx;
	mouse.py = cy;

	const found = findNearest(cx, cy);
	if (found) {
		grabbed = found;
		found.grabbed = true;
	}
}

function onTouchMove(e: TouchEvent) {
	if (!props.interactive) return;
	const touch = e.touches[0];
	const canvas = canvasEl.value;
	if (!canvas) return;
	const rect = canvas.getBoundingClientRect();
	const cx = touch.clientX - rect.left;
	const cy = touch.clientY - rect.top;

	mouse.px = mouse.x;
	mouse.py = mouse.y;
	mouse.x = cx;
	mouse.y = cy;

	if (grabbed) {
		const persp = FOCAL / (FOCAL + grabbed.z + 300);
		grabbed.x = (cx - W / 2) / persp;
		grabbed.y = (cy - H / 10) / persp;
		grabbed.px = grabbed.x;
		grabbed.py = grabbed.y;
	}
}

function onTouchEnd() {
	if (grabbed) {
		grabbed.grabbed = false;
		grabbed = null;
	}
}

// --- resize ---
function handleResize() {
	const canvas = canvasEl.value;
	const container = containerEl.value;
	if (!canvas || !container) return;
	const w = container.clientWidth;
	const h = container.clientHeight;
	if (w > 0 && h > 0) {
		canvas.width = w;
		canvas.height = h;
		W = w;
		H = h;
	}
}

// --- main loop ---
function frame() {
	if (!isVisible) {
		handle = null;
		return;
	}

	handle = requestAnimationFrame(frame);
	time += 0.02;

	// cutting
	if (cutting && props.interactive) {
		for (const l of links) {
			const a = project(l.a);
			const b = project(l.b);
			if (segIntersect(mouse.px, mouse.py, mouse.x, mouse.y, a.sx, a.sy, b.sx, b.sy)) {
				l.broken = true;
			}
		}
	}

	// solve constraints
	for (let i = 0; i < ITERATIONS; i++) {
		for (const l of links) l.solve();
	}
	links = links.filter((l) => !l.broken);

	// update points
	for (const p of points) p.update(time);

	// draw
	const canvas = canvasEl.value;
	if (!canvas) return;
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	// background (theme-aware)
	ctx.fillStyle = bgColor.value;
	ctx.fillRect(0, 0, W, H);

	const { r, g: gc, b } = hexToRgb(accentColor.value);

	// draw links
	for (const l of links) {
		const a = project(l.a);
		const b2 = project(l.b);
		const depth = Math.max(0, Math.min(1, (l.a.z + 100) / 400));
		const brightness = Math.round(255 * (1 - depth));

		let col: string;
		if (l.a.grabbed || l.b.grabbed) {
			col = `rgba(255,255,0,${(0.6 + 0.4 * (1 - depth)).toFixed(2)})`;
		} else {
			// use theme accent color with depth-based alpha
			col = `rgba(${r},${brightness},${b},${(0.15 + 0.85 * (1 - depth)).toFixed(2)})`;
		}
		ctx.strokeStyle = col;
		ctx.beginPath();
		ctx.moveTo(a.sx, a.sy);
		ctx.lineTo(b2.sx, b2.sy);
		ctx.stroke();
	}

	// grabbed highlight
	if (grabbed) {
		const p = project(grabbed);
		ctx.beginPath();
		ctx.arc(p.sx, p.sy, 5, 0, Math.PI * 2);
		ctx.fillStyle = '#ff0';
		ctx.shadowColor = '#ff0';
		ctx.shadowBlur = 15;
		ctx.fill();
		ctx.shadowBlur = 0;
	}

	// fps
	frames++;
	const now = performance.now();
	if (now - lastFpsTime > 500) {
		fpsText.value = `${Math.round(frames / (now - lastFpsTime) * 1000)} FPS | ${links.length} links`;
		frames = 0;
		lastFpsTime = now;
	}
}

function startLoop() {
	if (handle != null) return;
	lastFpsTime = performance.now();
	frames = 0;
	handle = requestAnimationFrame(frame);
}

function stopLoop() {
	if (handle != null) {
		cancelAnimationFrame(handle);
		handle = null;
	}
}

// --- lifecycle ---
onMounted(() => {
	const canvas = canvasEl.value;
	const container = containerEl.value;
	if (!canvas || !container) return;

	handleResize();
	initCloth();

	// IntersectionObserver: pause when out of viewport
	observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				isVisible = entry.isIntersecting;
				if (isVisible) {
					startLoop();
				} else {
					stopLoop();
				}
			}
		},
		{ threshold: 0 },
	);
	observer.observe(canvas);

	// ResizeObserver: auto-adapt to container size
	resizeObserver = new ResizeObserver(() => {
		handleResize();
	});
	resizeObserver.observe(container);

	themeManager.on('themeChanged', updateColor);

	startLoop();
});

onBeforeUnmount(() => {
	stopLoop();

	if (observer) {
		observer.disconnect();
		observer = null;
	}
	if (resizeObserver) {
		resizeObserver.disconnect();
		resizeObserver = null;
	}

	themeManager.off('themeChanged', updateColor);
});
</script>

<style lang="scss" module>
.root {
	position: relative;
	width: 100%;
	height: 100%;
	min-height: 200px;
	overflow: hidden;
}

.canvas {
	display: block;
	width: 100%;
	height: 100%;
	cursor: grab;
	touch-action: none;

	&:active {
		cursor: grabbing;
	}
}

.info {
	position: absolute;
	top: 12px;
	left: 12px;
	color: #55aaff;
	font: 13px/1.5 monospace;
	pointer-events: none;
	text-shadow: 0 0 6px #0088ff;
}

.fps {
	opacity: 0.7;
}
</style>
