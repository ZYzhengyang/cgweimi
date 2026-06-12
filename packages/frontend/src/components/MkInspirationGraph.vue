<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only

MkInspirationGraph.vue
创意发散器图谱组件 — 从 creative-muse 迁植
Canvas + DOM 混合渲染，贝塞尔曲线连线，拖拽/缩放/平移，节点展开/折叠/多选
-->

<template>
<div
	ref="containerRef"
	:class="$style.root"
	@contextmenu.prevent
>
	<!-- 背景网格 -->
	<div :class="$style.bgGrid" />

	<!-- 变换容器 -->
	<div ref="transformRef" :class="$style.canvasTransform">
		<!-- SVG 连线层 -->
		<svg ref="svgRef" :class="$style.connectionsLayer" />

		<!-- 节点层 -->
		<div ref="graphRef" :class="$style.graphLayer">
			<div
				v-for="node in visibleNodes"
				:key="node.id"
				:data-id="node.id"
				:class="[
					$style.node,
					node.isRoot && $style.large,
					node.isRoot && $style.rootNode,
					node.floatClass,
					selectedNodes.has(node.id) && $style.selected,
					node._entering && $style.entering,
					node._dragging && $style.dragging,
					node._expanding && $style.expanding,
					node._springActive && $style.springActive,
					node._hidden && $style.hidden,
				]"
				:style="nodeStyle(node)"
				:title="node.zh + (node.en ? ` (${node.en})` : '')"
				@click.stop="onNodeClick(node)"
				@contextmenu.prevent.stop="onNodeRightClick(node)"
				@pointerdown.left.stop="onNodePointerDown($event, node)"
			>
				<span :class="$style.zh">{{ node.zh }}</span>
				<span v-if="node.en" :class="$style.en">{{ node.en }}</span>

				<!-- 确认展开按钮 -->
				<div
					v-if="confirmTargetId === node.id"
					:class="$style.confirmIcon"
					@pointerdown.stop.prevent
					@click.stop.prevent="handleNodeExpand(node)"
				/>

				<!-- 子节点数量徽章 -->
				<span
					v-if="getChildCount(node.id) > 0"
					:class="[$style.nodeBadge, node.collapsed && $style.badgeCollapsed]"
					@click.stop="toggleCollapse(node)"
				>
					{{ node.collapsed ? getChildCount(node.id) + ' >' : getChildCount(node.id) }}
				</span>

				<!-- 加载动画 -->
				<div v-if="node._expanding" :class="$style.loader"><MkLoading :em="true"/></div>
			</div>
		</div>
	</div>

	<!-- 画布控件 -->
	<div :class="$style.canvasControls">
		<button :class="$style.ctrlBtn" title="放大" @click="zoomIn">+</button>
		<div :class="$style.zoomIndicator">{{ Math.round(zoom * 100) }}%</div>
		<button :class="$style.ctrlBtn" title="缩小" @click="zoomOut">-</button>
		<button :class="$style.ctrlBtn" title="适应视图" @click="fitToView">⊡</button>
		<button :class="$style.ctrlBtn" title="撤销 (Ctrl+Z)" @click="undo">↩</button>
	</div>

	<!-- 选中计数 -->
	<div :class="[$style.selectionBadge, selectedNodes.size > 0 && $style.selectionVisible]">
		已选 {{ selectedNodes.size }} 个词
	</div>

	<!-- 创意生成按钮 -->
	<button
		v-if="selectedNodes.size >= 2"
		:class="$style.generateBtn"
		@click="onGenerate"
	>
		生成创意方案
	</button>
</div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { misskeyApi } from '@/utility/misskey-api.js';

// ── 类型 ──

interface WordData {
	zh: string;
	en?: string;
}

interface GraphNode {
	id: number;
	zh: string;
	en?: string;
	x: number;
	y: number;
	parentId: number | null;
	isRoot: boolean;
	collapsed: boolean;
	floatClass: string;
	_entering?: boolean;
	_dragging?: boolean;
	_expanding?: boolean;
	_springActive?: boolean;
	_hidden?: boolean;
}

interface GraphEdge {
	from: number;
	to: number;
}

interface UndoAction {
	nodeIds: number[];
	parentId: number;
}

// ── Props & Emits ──

const props = defineProps<{
	/** 初始根节点词，可选 */
	initialWord?: string;
	/** 启用 AI 联想模式，自动调用后端接口获取联想词 */
	useAi?: boolean;
}>();

const emit = defineEmits<{
	(e: 'selection-change', nodes: GraphNode[]): void;
	(e: 'generate', nodes: GraphNode[]): void;
	(e: 'expand-request', node: GraphNode, callback: (words: WordData[]) => void): void;
}>();

// ── Refs ──

const containerRef = ref<HTMLDivElement>();
const transformRef = ref<HTMLDivElement>();
const graphRef = ref<HTMLDivElement>();
const svgRef = ref<SVGSVGElement>();

// ── 数据 ──

const nodes = reactive<GraphNode[]>([]);
const edges = reactive<GraphEdge[]>([]);
let nodeIdCounter = 0;
const selectedNodes = reactive(new Set<number>());
const expandingNodes = reactive(new Set<number>());
const undoStack: UndoAction[] = [];

// ── 平移缩放 ──

const panX = ref(0);
const panY = ref(0);
const zoom = ref(1);

let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartPanX = 0;
let panStartPanY = 0;

// ── 拖拽 ──

let dragNode: GraphNode | null = null;
let dragEl: HTMLDivElement | null = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragMoved = false;
let dragStartClientX = 0;
let dragStartClientY = 0;
const DRAG_THRESHOLD = 6;

// ── 触摸/缩放 ──

interface PointerInfo { clientX: number; clientY: number }
const activePointers = new Map<number, PointerInfo>();
let pinchStartDistance = 0;
let pinchStartZoom = 1;
let pinchStartWorld: { x: number; y: number } | null = null;

// ── 弹簧物理 ──

interface SpringChild {
	id: number;
	relX: number;
	relY: number;
	curX: number;
	curY: number;
	displayX?: number;
	displayY?: number;
	depth: number;
	phase1: number; phase2: number; phase3: number;
	freq1: number; freq2: number; freq3: number;
	amp1: number; amp2: number; amp3: number;
	tailX: number; tailY: number;
	tailStrength: number;
	tailDamping: number;
	tailEase: number;
	tailReturn: number;
	maxTail: number;
}

interface SpringState {
	parentId: number;
	children: SpringChild[];
}

let springState: SpringState | null = null;
let springFrameId: number | null = null;
let springSettling = false;
let lastDragNodeX = 0;
let lastDragNodeY = 0;

// ── 确认按钮 ──

const confirmTargetId = ref<number | null>(null);

// ── 计算属性 ──

const visibleNodes = computed(() => nodes);

// ── 常量 ──

const APPEND_CLUSTER_GAP = 520;
const CHILDREN_PER_RING = 8;
const FIRST_CHILD_RING_RADIUS = 180;
const CHILD_RING_GAP = 110;

// ── 工具函数 ──

function screenToWorld(sx: number, sy: number) {
	return {
		x: (sx - panX.value) / zoom.value,
		y: (sy - panY.value) / zoom.value,
	};
}

function applyTransform() {
	if (!transformRef.value) return;
	transformRef.value.style.transform = `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`;
	transformRef.value.style.transformOrigin = '0 0';
}

function clampZoom(value: number) {
	return Math.min(Math.max(value, 0.2), 5);
}

function getPointerDistance(a: PointerInfo, b: PointerInfo) {
	return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function getPointerMidpoint(a: PointerInfo, b: PointerInfo) {
	return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

function resetPinchState() {
	pinchStartDistance = 0;
	pinchStartWorld = null;
}

function updatePointer(e: PointerEvent) {
	if (!activePointers.has(e.pointerId)) return;
	activePointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
}

function beginPinchIfNeeded() {
	if (activePointers.size < 2 || pinchStartDistance > 0) return;
	const [a, b] = [...activePointers.values()];
	const midpoint = getPointerMidpoint(a, b);
	pinchStartDistance = getPointerDistance(a, b);
	pinchStartZoom = zoom.value;
	pinchStartWorld = screenToWorld(midpoint.x, midpoint.y);
	isPanning = false;
	if (dragNode) {
		dragNode._dragging = false;
		dragNode = null;
		dragEl = null;
		clearSpring();
	}
}

function handlePinchZoom(): boolean {
	if (activePointers.size < 2 || !pinchStartWorld || pinchStartDistance === 0) return false;
	const [a, b] = [...activePointers.values()];
	const distance = getPointerDistance(a, b);
	if (distance === 0) return true;
	const midpoint = getPointerMidpoint(a, b);
	zoom.value = clampZoom(pinchStartZoom * (distance / pinchStartDistance));
	panX.value = midpoint.x - pinchStartWorld.x * zoom.value;
	panY.value = midpoint.y - pinchStartWorld.y * zoom.value;
	applyTransform();
	return true;
}

// ── 树操作 ──

function getAllDescendants(parentId: number): GraphNode[] {
	const result: GraphNode[] = [];
	const stack = [parentId];
	while (stack.length > 0) {
		const pid = stack.pop()!;
		edges.forEach(e => {
			if (e.from === pid) {
				const child = nodes.find(n => n.id === e.to);
				if (child) {
					result.push(child);
					stack.push(child.id);
				}
			}
		});
	}
	return result;
}

function collectDescendantsFrom(nodeId: number): GraphNode[] {
	return getAllDescendants(nodeId);
}

function isHidden(nodeId: number): boolean {
	let current = nodes.find(n => n.id === nodeId);
	while (current && current.parentId) {
		const parent = nodes.find(n => n.id === current!.parentId);
		if (parent && parent.collapsed) return true;
		current = parent;
	}
	return false;
}

function getChildCount(nodeId: number): number {
	return edges.filter(e => e.from === nodeId).length;
}

// ── 弹簧物理 ──

function startSpring(draggedId: number) {
	clearSpring();
	const parent = nodes.find(n => n.id === draggedId);
	if (!parent) return;

	const descendants = getAllDescendants(draggedId);
	if (descendants.length === 0) return;

	const children: SpringChild[] = [];
	for (const child of descendants) {
		child._springActive = true;
		let depth = 0;
		let cur: GraphNode | undefined = child;
		while (cur.parentId && cur.parentId !== draggedId) {
			cur = nodes.find(n => n.id === cur!.parentId);
			depth++;
		}

		const r1 = Math.random();
		const r2 = Math.random();
		const r3 = Math.random();
		children.push({
			id: child.id,
			relX: child.x - parent.x,
			relY: child.y - parent.y,
			curX: child.x,
			curY: child.y,
			tailX: 0,
			tailY: 0,
			depth,
			phase1: r1 * Math.PI * 2,
			phase2: r2 * Math.PI * 2,
			phase3: r3 * Math.PI * 2,
			freq1: 0.002 + r1 * 0.002,
			freq2: 0.003 + r2 * 0.002,
			freq3: 0.001 + r3 * 0.0015,
			amp1: 5 + depth * 3 + r1 * 5,
			amp2: 3 + r2 * 4,
			amp3: 2 + depth * 2 + r3 * 3,
			tailStrength: 0.72 + Math.min(depth, 4) * 0.13 + r1 * 0.12,
			tailDamping: 0.84 + r2 * 0.05,
			tailEase: 0.15 + r3 * 0.04,
			tailReturn: 0.9 + r2 * 0.04,
			maxTail: 72 + depth * 14,
		});
	}

	if (children.length === 0) return;
	springState = { parentId: draggedId, children };
	springSettling = false;
	lastDragNodeX = parent.x;
	lastDragNodeY = parent.y;
	requestSpringFrame();
}

function updateSpring(): boolean {
	if (!springState) return true;
	const parent = nodes.find(n => n.id === springState!.parentId);
	if (!parent) return true;

	const t = performance.now();
	const parentDeltaX = parent.x - lastDragNodeX;
	const parentDeltaY = parent.y - lastDragNodeY;
	lastDragNodeX = parent.x;
	lastDragNodeY = parent.y;
	let settled = true;

	for (const sc of springState.children) {
		const node = nodes.find(n => n.id === sc.id);
		if (!node) continue;

		const targetX = parent.x + sc.relX;
		const targetY = parent.y + sc.relY;

		if (dragNode) {
			sc.tailX = (sc.tailX - parentDeltaX * sc.tailStrength) * sc.tailDamping;
			sc.tailY = (sc.tailY - parentDeltaY * sc.tailStrength) * sc.tailDamping;
		} else {
			sc.tailX *= sc.tailReturn;
			sc.tailY *= sc.tailReturn;
		}

		const tailLength = Math.hypot(sc.tailX, sc.tailY);
		if (tailLength > sc.maxTail) {
			const ratio = sc.maxTail / tailLength;
			sc.tailX *= ratio;
			sc.tailY *= ratio;
		}

		sc.curX += (targetX + sc.tailX - sc.curX) * sc.tailEase;
		sc.curY += (targetY + sc.tailY - sc.curY) * sc.tailEase;

		const driftScale = dragNode ? 0.3 : 0.2;
		const driftX = (Math.sin(t * sc.freq1 + sc.phase1) * sc.amp1
			+ Math.sin(t * sc.freq3 + sc.phase3) * sc.amp3) * driftScale;
		const driftY = (Math.cos(t * sc.freq2 + sc.phase2) * sc.amp2
			+ Math.cos(t * sc.freq3 * 1.4 + sc.phase3) * sc.amp3) * driftScale;

		node.x = sc.curX + driftX;
		node.y = sc.curY + driftY;
		sc.displayX = node.x;
		sc.displayY = node.y;

		const distance = Math.hypot(targetX - sc.curX, targetY - sc.curY);
		const tail = Math.hypot(sc.tailX, sc.tailY);
		if (distance > 0.7 || tail > 0.7) settled = false;
	}

	renderEdges();
	return settled;
}

function requestSpringFrame() {
	if (springFrameId) return;
	springFrameId = requestAnimationFrame(runSpringFrame);
}

function runSpringFrame() {
	springFrameId = null;
	if (!springState) return;
	const settled = updateSpring();
	if (dragNode || !springSettling || !settled) {
		requestSpringFrame();
		return;
	}
	commitSpring();
}

function commitSpring() {
	if (!springState) return;
	for (const sc of springState.children) {
		const node = nodes.find(n => n.id === sc.id);
		if (node) {
			node.x = sc.displayX ?? sc.curX;
			node.y = sc.displayY ?? sc.curY;
		}
		node._springActive = false;
	}
	springState = null;
	springSettling = false;
}

function clearSpring() {
	if (springFrameId) {
		cancelAnimationFrame(springFrameId);
		springFrameId = null;
	}
	if (springState) {
		for (const sc of springState.children) {
			const node = nodes.find(n => n.id === sc.id);
			if (node) node._springActive = false;
		}
		springState = null;
	}
	springSettling = false;
}

// ── 节点样式 ──

function nodeStyle(node: GraphNode) {
	const size = node.isRoot ? 120 : 90;
	return {
		left: `${node.x - size / 2}px`,
		top: `${node.y - size / 2}px`,
		width: `${size}px`,
		height: `${size}px`,
	};
}

// ── 渲染连线 ──

function renderEdges() {
	if (!svgRef.value) return;
	// 清空 SVG
	while (svgRef.value.firstChild) {
		svgRef.value.removeChild(svgRef.value.firstChild);
	}

	const visibleIds = new Set(nodes.filter(n => !isHidden(n.id)).map(n => n.id));

	for (const edge of edges) {
		const from = nodes.find(n => n.id === edge.from);
		const to = nodes.find(n => n.id === edge.to);
		if (!from || !to) continue;
		if (!visibleIds.has(from.id) || !visibleIds.has(to.id)) continue;

		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const dist = Math.hypot(dx, dy);
		if (dist < 1) continue;

		const ux = dx / dist;
		const uy = dy / dist;
		const fromRadius = from.isRoot ? 64 : 49;
		const toRadius = to.isRoot ? 64 : 49;
		const startX = from.x + ux * fromRadius;
		const startY = from.y + uy * fromRadius;
		const endX = to.x - ux * toRadius;
		const endY = to.y - uy * toRadius;
		if (Math.hypot(endX - startX, endY - startY) < 8) continue;

		// 贝塞尔曲线：控制点在中点偏移，产生自然弧线
		const midX = (startX + endX) / 2;
		const midY = (startY + endY) / 2;
		const perpX = -uy;
		const perpY = ux;
		const curvature = Math.min(dist * 0.12, 30);
		const ctrlX = midX + perpX * curvature;
		const ctrlY = midY + perpY * curvature;

		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`);
		svgRef.value.appendChild(path);
	}
}

// ── 节点操作 ──

function createNodeData(word: WordData, x: number, y: number, parentId: number | null, isRoot: boolean): GraphNode {
	return {
		id: ++nodeIdCounter,
		zh: word.zh,
		en: word.en,
		x, y, parentId, isRoot,
		collapsed: false,
		floatClass: `floating${(Math.floor(Math.random() * 3)) + 1}`,
		_entering: true,
	};
}

function arrangeChildrenAroundParent(parent: GraphNode, childNodes: GraphNode[]) {
	childNodes.forEach((node, i) => {
		const ring = Math.floor(i / CHILDREN_PER_RING);
		const ringStart = ring * CHILDREN_PER_RING;
		const itemsInRing = Math.min(CHILDREN_PER_RING, childNodes.length - ringStart);
		const indexInRing = i - ringStart;
		const radius = FIRST_CHILD_RING_RADIUS + ring * CHILD_RING_GAP;
		const angle = -Math.PI / 2 + (2 * Math.PI * indexInRing) / itemsInRing;
		node.x = parent.x + Math.cos(angle) * radius;
		node.y = parent.y + Math.sin(angle) * radius;
	});
}

function moveNodeTree(node: GraphNode, targetX: number, targetY: number) {
	const dx = targetX - node.x;
	const dy = targetY - node.y;
	node.x = targetX;
	node.y = targetY;
	collectDescendantsFrom(node.id).forEach(descendant => {
		descendant.x += dx;
		descendant.y += dy;
	});
}

function chooseAppendRootPosition(): { x: number; y: number } {
	if (nodes.length === 0) return { x: 0, y: 0 };
	const maxX = Math.max(...nodes.map(n => n.x));
	const minY = Math.min(...nodes.map(n => n.y));
	const maxY = Math.max(...nodes.map(n => n.y));
	return { x: maxX + APPEND_CLUSTER_GAP, y: (minY + maxY) / 2 };
}

// ── 公开方法：添加根节点 ──

function addRootNode(word: WordData, append = false) {
	const position = (append && nodes.length > 0)
		? chooseAppendRootPosition()
		: {
			x: ((containerRef.value?.clientWidth ?? window.innerWidth) / 2 - panX.value) / zoom.value,
			y: ((containerRef.value?.clientHeight ?? window.innerHeight) / 2 - panY.value) / zoom.value,
		};
	const node = createNodeData(word, position.x, position.y, null, true);
	nodes.push(node);
	// 入场动画结束后清除标记
	setTimeout(() => { node._entering = false; }, 500);
	return node;
}

// ── 公开方法：展开子节点 ──

function expandNode(parentId: number, words: WordData[]) {
	const parent = nodes.find(n => n.id === parentId);
	if (!parent) return;

	words = words.filter(w => !nodes.some(n => n.zh === w.zh));
	if (words.length === 0) return;

	const newNodes: GraphNode[] = [];

	for (const word of words) {
		const node = createNodeData(word, parent.x, parent.y, parentId, false);
		nodes.push(node);
		newNodes.push(node);
		edges.push({ from: parentId, to: node.id });
		// 入场动画
		setTimeout(() => { node._entering = false; }, 500);
	}

	const directChildren = nodes.filter(n => n.parentId === parentId);
	const arrangedChildren = directChildren.map(n => ({ ...n }));
	arrangeChildrenAroundParent(parent, arrangedChildren);
	directChildren.forEach((node, i) => {
		moveNodeTree(node, arrangedChildren[i].x, arrangedChildren[i].y);
	});

	undoStack.push({
		nodeIds: newNodes.map(n => n.id),
		parentId: parentId,
	});

	updateNodeBadge(parent);
	renderEdges();
}

// ── 节点交互 ──

function onNodeClick(node: GraphNode) {
	if (dragMoved) return;
	if (confirmTargetId.value === node.id) {
		confirmTargetId.value = null;
	} else {
		confirmTargetId.value = node.id;
	}
}

function onNodeRightClick(node: GraphNode) {
	if (selectedNodes.has(node.id)) {
		selectedNodes.delete(node.id);
	} else {
		selectedNodes.add(node.id);
	}
	emit('selection-change', nodes.filter(n => selectedNodes.has(n.id)));
}

function onNodePointerDown(e: PointerEvent, node: GraphNode) {
	if (e.button !== 0) return;
	if (expandingNodes.has(node.id)) return;

	activePointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
	beginPinchIfNeeded();
	if (activePointers.size >= 2) {
		e.preventDefault();
		return;
	}

	const el = e.target as HTMLDivElement;
	el.setPointerCapture(e.pointerId);
	const world = screenToWorld(e.clientX, e.clientY);
	dragNode = node;
	dragEl = el;
	dragStartClientX = e.clientX;
	dragStartClientY = e.clientY;
	dragOffsetX = world.x - node.x;
	dragOffsetY = world.y - node.y;
	dragMoved = false;
	node._dragging = true;
}

function handleNodeExpand(node: GraphNode) {
	if (expandingNodes.has(node.id)) return;
	confirmTargetId.value = null;
	expandingNodes.add(node.id);
	node._expanding = true;

	if (props.useAi) {
		// AI 模式：直接调用后端接口
		misskeyApi('inspiration/associate', { keyword: node.zh })
			.then((words: WordData[]) => {
				expandNode(node.id, words);
			})
			.catch((err: unknown) => {
				console.error('[MkInspirationGraph] AI associate error:', err);
			})
			.finally(() => {
				expandingNodes.delete(node.id);
				node._expanding = false;
			});
	} else {
		// 传统模式：向父组件请求联想数据
		emit('expand-request', node, (words: WordData[]) => {
			expandNode(node.id, words);
			expandingNodes.delete(node.id);
			node._expanding = false;
		});
	}
}

function updateNodeBadge(node: GraphNode) {
	// badge 通过模板自动响应 getChildCount，无需额外操作
}

function toggleCollapse(node: GraphNode) {
	const childCount = getChildCount(node.id);
	if (childCount === 0) return;
	node.collapsed = !node.collapsed;
	// 更新子树隐藏状态
	for (const n of nodes) {
		n._hidden = isHidden(n.id);
	}
}

// ── 画布事件 ──

function onPointerDown(e: PointerEvent) {
	if (e.button !== 0) return;
	// 排除 UI 控件
	if ((e.target as HTMLElement).closest(`.${$style.canvasControls}, .${$style.generateBtn}, .${$style.selectionBadge}`)) return;
	// 排除节点（节点有自己的 handler）
	if ((e.target as HTMLElement).closest(`.${$style.node}`)) return;

	confirmTargetId.value = null;
	activePointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
	beginPinchIfNeeded();
	if (activePointers.size >= 2) {
		e.preventDefault();
		return;
	}

	isPanning = true;
	panStartX = e.clientX;
	panStartY = e.clientY;
	panStartPanX = panX.value;
	panStartPanY = panY.value;
	document.body.style.cursor = 'grabbing';
	e.preventDefault();
}

function onPointerMove(e: PointerEvent) {
	updatePointer(e);
	if (activePointers.size >= 2) {
		e.preventDefault();
		beginPinchIfNeeded();
		if (handlePinchZoom()) return;
	}

	if (isPanning) {
		panX.value = panStartPanX + (e.clientX - panStartX);
		panY.value = panStartPanY + (e.clientY - panStartY);
		applyTransform();
		return;
	}

	if (!dragNode || !dragEl) return;
	if (!dragMoved) {
		const moved = Math.hypot(e.clientX - dragStartClientX, e.clientY - dragStartClientY);
		if (moved < DRAG_THRESHOLD) return;
		dragMoved = true;
	}

	const world = screenToWorld(e.clientX, e.clientY);
	dragNode.x = world.x - dragOffsetX;
	dragNode.y = world.y - dragOffsetY;

	// 启动弹簧（首次拖拽时）
	if (!springState || springState.parentId !== dragNode.id) {
		startSpring(dragNode.id);
	}
	requestSpringFrame();
}

function onPointerUp(e: PointerEvent) {
	activePointers.delete(e.pointerId);
	if (activePointers.size < 2) resetPinchState();

	if (isPanning) {
		isPanning = false;
		document.body.style.cursor = '';
		return;
	}
	if (dragNode) {
		dragNode._dragging = false;
		dragNode = null;
		dragEl = null;
		if (springState) {
			springSettling = true;
			requestSpringFrame();
		}
	}
}

function onWheel(e: WheelEvent) {
	if ((e.target as HTMLElement).closest(`.${$style.canvasControls}`)) return;
	e.preventDefault();
	const delta = e.deltaY > 0 ? 0.92 : 1.08;
	const newZoom = clampZoom(zoom.value * delta);
	const mx = e.clientX;
	const my = e.clientY;
	panX.value = mx - (mx - panX.value) * (newZoom / zoom.value);
	panY.value = my - (my - panY.value) * (newZoom / zoom.value);
	zoom.value = newZoom;
	applyTransform();
}

function onKeyDown(e: KeyboardEvent) {
	if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
		e.preventDefault();
		undo();
	}
}

// 点击空白区域关闭确认按钮
function onDocumentClick(e: MouseEvent) {
	if (confirmTargetId.value == null) return;
	const target = e.target as HTMLElement;
	if (!target.closest(`.${$style.node}`)) {
		confirmTargetId.value = null;
	}
}

// ── 控件按钮 ──

function zoomIn() {
	setZoom(zoom.value * 1.2);
}

function zoomOut() {
	setZoom(zoom.value / 1.2);
}

function setZoom(newZoom: number, cx?: number, cy?: number) {
	const rect = containerRef.value?.getBoundingClientRect();
	const mx = cx ?? (rect ? rect.width / 2 : 0);
	const my = cy ?? (rect ? rect.height / 2 : 0);
	const clamped = clampZoom(newZoom);
	panX.value = mx - (mx - panX.value) * (clamped / zoom.value);
	panY.value = my - (my - panY.value) * (clamped / zoom.value);
	zoom.value = clamped;
	applyTransform();
}

function fitToView() {
	if (nodes.length === 0) {
		panX.value = 0; panY.value = 0; zoom.value = 1;
		applyTransform();
		return;
	}
	const minX = Math.min(...nodes.map(n => n.x)) - 120;
	const maxX = Math.max(...nodes.map(n => n.x)) + 120;
	const minY = Math.min(...nodes.map(n => n.y)) - 120;
	const maxY = Math.max(...nodes.map(n => n.y)) + 120;
	const worldW = maxX - minX;
	const worldH = maxY - minY;
	const screenW = containerRef.value?.clientWidth ?? window.innerWidth;
	const screenH = containerRef.value?.clientHeight ?? window.innerHeight;
	zoom.value = Math.min(screenW / worldW, screenH / worldH, 2);
	panX.value = (screenW - worldW * zoom.value) / 2 - minX * zoom.value;
	panY.value = (screenH - worldH * zoom.value) / 2 - minY * zoom.value;
	applyTransform();
}

function undo() {
	if (undoStack.length === 0) return;
	const action = undoStack.pop()!;
	confirmTargetId.value = null;

	// 移除边
	for (let i = edges.length - 1; i >= 0; i--) {
		if (action.nodeIds.includes(edges[i].to)) {
			edges.splice(i, 1);
		}
	}

	// 移除节点
	for (const id of action.nodeIds) {
		const idx = nodes.findIndex(n => n.id === id);
		if (idx !== -1) nodes.splice(idx, 1);
		selectedNodes.delete(id);
	}

	const parentNode = nodes.find(n => n.id === action.parentId);
	if (parentNode) {
		const remaining = edges.filter(e => e.from === parentNode.id).length;
		if (remaining === 0) parentNode.collapsed = false;
	}

	for (const n of nodes) {
		n._hidden = isHidden(n.id);
	}

	renderEdges();
	emit('selection-change', nodes.filter(n => selectedNodes.has(n.id)));
}

function onGenerate() {
	emit('generate', nodes.filter(n => selectedNodes.has(n.id)));
}

// ── 生命周期 ──

onMounted(() => {
	document.addEventListener('pointerdown', onPointerDown, { capture: true });
	document.addEventListener('pointermove', onPointerMove, { passive: false });
	document.addEventListener('pointerup', onPointerUp);
	document.addEventListener('pointercancel', onPointerUp);
	document.addEventListener('keydown', onKeyDown);
	document.addEventListener('click', onDocumentClick);
	containerRef.value?.addEventListener('wheel', onWheel, { passive: false });

	// 如果有初始词，自动创建根节点
	if (props.initialWord) {
		addRootNode({ zh: props.initialWord });
	}
});

onBeforeUnmount(() => {
	document.removeEventListener('pointerdown', onPointerDown, { capture: true } as any);
	document.removeEventListener('pointermove', onPointerMove as any);
	document.removeEventListener('pointerup', onPointerUp as any);
	document.removeEventListener('pointercancel', onPointerUp as any);
	document.removeEventListener('keydown', onKeyDown);
	document.removeEventListener('click', onDocumentClick);
	containerRef.value?.removeEventListener('wheel', onWheel as any);
	clearSpring();
});

// ── 暴露给父组件的 API ──

defineExpose({
	addRootNode,
	expandNode,
	fitToView,
	undo,
	clearGraph() {
		confirmTargetId.value = null;
		clearSpring();
		nodes.splice(0, nodes.length);
		edges.splice(0, edges.length);
		selectedNodes.clear();
		expandingNodes.clear();
		undoStack.splice(0, undoStack.length);
		nodeIdCounter = 0;
	},
	getSelectedNodes() {
		return nodes.filter(n => selectedNodes.has(n.id));
	},
});
</script>

<style lang="scss" module>
/* ── 金色调色板 ── */
$yellow: #FFD600;
$yellow-light: rgba(255, 214, 0, 0.15);
$yellow-glow: rgba(255, 214, 0, 0.3);

.root {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
	touch-action: none;
	user-select: none;
	background: var(--MI_THEME-bg, #000);
}

/* ── 背景网格 ── */
.bgGrid {
	position: absolute;
	inset: 0;
	background-image:
		radial-gradient(circle at 1px 1px, color(from var(--MI_THEME-fg) srgb r g b / 0.04) 1px, transparent 0);
	background-size: 40px 40px;
	pointer-events: none;
	z-index: 0;
}

/* ── 画布变换容器 ── */
.canvasTransform {
	position: absolute;
	inset: 0;
	transform-origin: 0 0;
	z-index: 1;
	touch-action: none;
}

/* ── SVG 连线层 ── */
.connectionsLayer {
	position: absolute;
	width: 100%;
	height: 100%;
	left: 0;
	top: 0;
	pointer-events: none;
	overflow: visible;

	path {
		fill: none;
		stroke: var(--MI_THEME-fgTransparentWeak, rgba(255, 255, 255, 0.12));
		stroke-width: 1.5;
		stroke-linecap: round;
	}
}

/* ── 节点容器 ── */
.graphLayer {
	position: absolute;
	width: 100%;
	height: 100%;
	left: 0;
	top: 0;
}

/* ── 词语节点 ── */
.node {
	position: absolute;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 90px;
	height: 90px;
	border-radius: 50%;
	background: rgba(40, 40, 40, 0.55);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	border: 1.5px solid rgba(255, 255, 255, 0.08);
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
	cursor: grab;
	transition: box-shadow 0.3s, border-color 0.3s;
	z-index: 10;
	padding: 8px;
	text-align: center;
	touch-action: none;

	&:hover {
		box-shadow: 0 6px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}

	&:active {
		cursor: grabbing;
	}

	&.expanding {
		cursor: wait;
	}
}

.large {
	width: 120px;
	height: 120px;
	z-index: 20;
}

.rootNode {
	background: linear-gradient(135deg, rgba(255, 214, 0, 0.2), rgba(255, 152, 0, 0.15));
	border-color: rgba(255, 183, 0, 0.4);
	box-shadow:
		0 0 30px rgba(255, 214, 0, 0.15),
		0 6px 30px rgba(0, 0, 0, 0.4),
		inset 0 1px 0 rgba(255, 255, 255, 0.05);

	&:hover {
		box-shadow:
			0 0 40px rgba(255, 214, 0, 0.2),
			0 8px 35px rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}
}

.selected {
	border-color: $yellow;
	box-shadow: 0 0 20px $yellow-glow, 0 4px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
	background: rgba(255, 214, 0, 0.15);
}

.hidden {
	display: none;
}

.dragging {
	animation: none !important;
	cursor: grabbing;
	z-index: 100;
	box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.springActive {
	animation: none !important;
}

/* ── 节点文字 ── */
.zh {
	font-size: 14px;
	font-weight: 600;
	color: var(--MI_THEME-fg, #dadada);
	line-height: 1.3;
}

.large .zh {
	font-size: 18px;
}

.rootNode .zh {
	font-size: 20px;
	font-weight: 700;
}

.en {
	font-size: 10px;
	color: var(--MI_THEME-fgTransparentWeak, #999);
	line-height: 1.2;
	margin-top: 2px;
	word-break: break-word;
	overflow-wrap: break-word;
	max-width: 100%;
}

.large .en {
	font-size: 12px;
}

/* ── 节点入场动画 ── */
.entering {
	animation: nodeAppear 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes nodeAppear {
	from {
		opacity: 0;
		transform: scale(0.4);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}

/* ── 确认展开按钮 ── */
.confirmIcon {
	position: absolute;
	bottom: -18px;
	left: 50%;
	transform: translateX(-50%);
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: linear-gradient(135deg, #FFD600, #FFAB00);
	color: #fff;
	font-size: 18px;
	font-weight: 300;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	box-shadow: 0 3px 12px rgba(255, 171, 0, 0.4);
	animation: confirmPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	z-index: 30;
	line-height: 1;
	border: 2px solid rgba(255, 255, 255, 0.6);
	transition: transform 0.15s, box-shadow 0.15s;

	&::before {
		content: '+';
		display: block;
	}

	&:hover {
		transform: translateX(-50%) scale(1.2);
		box-shadow: 0 4px 18px rgba(255, 171, 0, 0.55);
	}

	&:active {
		transform: translateX(-50%) scale(1.05);
	}
}

@keyframes confirmPop {
	from { opacity: 0; transform: translateX(-50%) scale(0.3) translateY(6px); }
	to { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
}

/* ── 节点数量徽章 ── */
.nodeBadge {
	position: absolute;
	top: -4px;
	right: -4px;
	min-width: 20px;
	height: 20px;
	padding: 0 5px;
	border-radius: 10px;
	background: $yellow;
	color: #1a1a1a;
	font-size: 10px;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	cursor: pointer;
	transition: transform 0.15s;

	&:hover {
		transform: scale(1.2);
	}
}

.badgeCollapsed {
	background: #999;
	color: #fff;
}

/* ── 加载动画 ── */
.loader {
	position: absolute;
	inset: -3px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
}

/* ── 画布控件 ── */
.canvasControls {
	position: absolute;
	bottom: 100px;
	left: 24px;
	z-index: 1000;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
}

.ctrlBtn {
	width: 40px;
	height: 40px;
	border-radius: 12px;
	border: 1.5px solid rgba(255, 255, 255, 0.08);
	background: rgba(40, 40, 40, 0.6);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	cursor: pointer;
	font-size: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: background 0.2s, box-shadow 0.2s;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
	color: var(--MI_THEME-fg, #dadada);
	font-family: inherit;

	&:hover {
		background: rgba(60, 60, 60, 0.8);
	}
}

.zoomIndicator {
	font-size: 11px;
	color: var(--MI_THEME-fgTransparentWeak, #999);
	padding: 4px 0;
	text-align: center;
	min-width: 40px;
}

/* ── 选中计数 ── */
.selectionBadge {
	position: absolute;
	bottom: 80px;
	right: 24px;
	z-index: 999;
	padding: 6px 14px;
	border-radius: 20px;
	background: rgba(0, 0, 0, 0.7);
	color: #fff;
	font-size: 12px;
	opacity: 0;
	transition: opacity 0.3s;
	pointer-events: none;
}

.selectionVisible {
	opacity: 1;
}

/* ── 创意生成按钮 ── */
.generateBtn {
	position: absolute;
	bottom: 32px;
	right: 24px;
	z-index: 1000;
	padding: 10px 24px;
	border-radius: 24px;
	border: 1.5px solid $yellow;
	background: $yellow;
	color: #1a1a1a;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: transform 0.2s, box-shadow 0.2s;
	box-shadow: 0 4px 20px $yellow-glow;
	font-family: inherit;

	&:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 30px $yellow-glow;
	}
}

/* ── 浮动动画 ── */
.floating1 { animation: float1 6s ease-in-out infinite; }
.floating2 { animation: float2 7s ease-in-out infinite; }
.floating3 { animation: float3 5s ease-in-out infinite; }

@keyframes float1 {
	0%, 100% { transform: translateY(0); }
	50% { transform: translateY(-4px); }
}

@keyframes float2 {
	0%, 100% { transform: translate(0, 0); }
	33% { transform: translate(2px, -3px); }
	66% { transform: translate(-2px, 1px); }
}

@keyframes float3 {
	0%, 100% { transform: translateY(0); }
	50% { transform: translateY(3px); }
}

/* ── 响应式 ── */
@media (max-width: 600px) {
	.canvasControls {
		left: 14px;
		bottom: 168px;
		gap: 8px;
	}

	.ctrlBtn {
		width: 40px;
		height: 40px;
		font-size: 17px;
	}

	.zoomIndicator {
		min-width: 40px;
		padding: 2px 0;
		font-size: 12px;
	}

	.generateBtn {
		right: 14px;
		bottom: 108px;
		min-width: 120px;
		padding: 10px 18px;
		text-align: center;
	}

	.selectionBadge {
		right: 14px;
		bottom: 154px;
	}

	.node {
		width: 76px;
		height: 76px;
	}

	.large {
		width: 100px;
		height: 100px;
	}
}
</style>
