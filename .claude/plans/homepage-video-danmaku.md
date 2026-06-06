# 首页优化方案：刷视频沉浸式 + 弹幕系统 + 侧边栏美化

## 背景分析

当前状态：
- **刷视频**：`CGVideoFeed.vue` 已实现 B站/抖音双模式，Swiper 垂直滚动，但与首页时间线是分离的（独立路由 `/video-feed`）
- **弹幕**：完全不存在，需要新建
- **首页侧边栏**：`universal.vue` 右侧 widget 面板是简单的垂直列表布局，无瀑布流

---

## 一、刷视频沉浸式优化

### 1.1 在时间线页面集成视频快捷入口

**文件**: `packages/frontend/src/pages/timeline.vue`

在时间线顶部 tab 栏添加"刷视频"快捷入口按钮，点击后进入全屏沉浸模式。

### 1.2 优化 CGVideoFeed 沉浸体验

**文件**: `packages/frontend/src/components/CGVideoFeed.vue`

改进项：
- 进入时自动隐藏导航栏（通过 `definePage` 设置 `needWideArea`）
- 添加滑动指示器（底部小圆点）
- 优化加载状态（骨架屏 + 渐入动画）
- 添加返回按钮（左上角，半透明）

---

## 二、弹幕系统

### 2.1 新建弹幕组件

**新文件**: `packages/frontend/src/components/MkDanmaku.vue`

弹幕轨道系统：
- 容器固定在视频上方，`position: absolute`，`pointer-events: none`
- 使用 CSS `@keyframes` 实现从右到左的水平滚动
- 多轨道系统（5-8 条轨道），自动分配避免重叠
- 弹幕密度控制（避免过于拥挤）
- 支持不同颜色（基于用户角色或自选颜色）

核心实现思路：
```vue
<template>
<div :class="$style.container" ref="containerEl">
  <div
    v-for="item in visibleDanmaku"
    :key="item.id"
    :class="$style.bullet"
    :style="{
      top: item.track * TRACK_HEIGHT + 'px',
      animationDuration: item.speed + 's',
      color: item.color,
    }"
  >{{ item.text }}</div>
</div>
</template>
```

### 2.2 弹幕数据层

**新文件**: `packages/frontend/src/composables/use-danmaku.ts`

组合式函数，管理弹幕数据：
- 接收当前 note 的 reactions 和 replies 作为弹幕来源
- 当用户发送评论时，同时作为弹幕飘过
- 当收到新 reaction 时，以 emoji 弹幕飘过
- 使用 `requestAnimationFrame` 管理弹幕生命周期
- 自动清理已滚出屏幕的弹幕

```typescript
interface DanmakuItem {
  id: string;
  text: string;
  color: string;
  track: number;
  speed: number; // seconds to cross screen
  createdAt: number;
}

export function useDanmaku(containerRef: Ref<HTMLElement | null>) {
  const items = ref<DanmakuItem[]>([]);
  // ... track management, spawning, cleanup
}
```

### 2.3 集成到 CGVideoFeed

**文件**: `packages/frontend/src/components/CGVideoFeed.vue`

- 在 `<video>` 元素上方叠加 `<MkDanmaku>` 组件
- 添加弹幕开关按钮（在右侧操作按钮区域）
- 添加弹幕输入框（在评论区或独立浮层）
- 弹幕数据来源：
  - 新评论 → 文字弹幕
  - 新 reaction → emoji 弹幕
  - 用户可主动发送弹幕

### 2.4 弹幕设置

**文件**: `packages/frontend/src/preferences/def.ts`

添加弹幕相关偏好设置：
- `danmaku.enabled`: 是否开启弹幕（默认 true）
- `danmaku.opacity`: 弹幕透明度（默认 0.7）
- `danmaku.speed`: 弹幕速度（默认 medium）
- `danmaku.density`: 弹幕密度（默认 medium）

---

## 三、侧边栏美化（瀑布流布局）

### 3.1 改造 Widget 容器

**文件**: `packages/frontend/src/ui/_common_/widgets.vue`

将当前的垂直列表布局改为瀑布流布局：
- 使用 CSS `columns` 实现两列瀑布流（类似 MkWaterfall.vue 的方案）
- Widget 卡片使用 `break-inside: avoid` 防止断裂
- 添加卡片圆角、阴影、hover 效果
- 保持拖拽排序功能（MkDraggable）

### 3.2 新增推荐内容 Widget

**新文件**: `packages/frontend/src/widgets/trending-notes.vue`

在侧边栏添加一个瀑布流式的推荐内容 widget：
- 展示热门笔记（图片优先，类似 explore.works 的卡片风格）
- 使用 CSS columns 两列布局
- 自动轮播或手动滚动
- 点击打开 MkNotePopup

### 3.3 美化现有 Widget 样式

**文件**: `packages/frontend/src/ui/_common_/widgets.vue`

- 为 widget 卡片添加统一的圆角和阴影
- 添加微妙的 hover 上浮效果
- 优化 widget 之间的间距
- 为编辑模式添加更现代的 UI

---

## 实施顺序

1. **第一阶段**：弹幕核心组件 `MkDanmaku.vue` + `use-danmaku.ts`
2. **第二阶段**：集成弹幕到 `CGVideoFeed.vue` + 偏好设置
3. **第三阶段**：侧边栏瀑布流改造 `widgets.vue`
4. **第四阶段**：推荐内容 widget `trending-notes.vue`
5. **第五阶段**：刷视频入口优化 + 沉浸体验打磨

## 需要修改/新建的文件

| 操作 | 文件路径 |
|------|----------|
| 新建 | `packages/frontend/src/components/MkDanmaku.vue` |
| 新建 | `packages/frontend/src/composables/use-danmaku.ts` |
| 新建 | `packages/frontend/src/widgets/trending-notes.vue` |
| 修改 | `packages/frontend/src/components/CGVideoFeed.vue` |
| 修改 | `packages/frontend/src/pages/timeline.vue` |
| 修改 | `packages/frontend/src/ui/_common_/widgets.vue` |
| 修改 | `packages/frontend/src/preferences/def.ts` |
