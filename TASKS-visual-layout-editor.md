# P4-33: 可视化布局编辑器

> 创建时间：2026-06-14
> 预估总时间：~15h
> 依赖：无（可与 P4-32 并行）

---

## 目标

将 Misskey 的 widget 平铺列表升级为网格布局，支持拖拽定位和缩放。

---

## 技术方案

### 核心库

- **库名**：`grid-layout-plus`
- **GitHub**：https://github.com/qmhc/grid-layout-plus
- **npm**：grid-layout-plus (v1.1.1)
- **Stars**：596
- **License**：MIT
- **技术栈**：Vue 3 + TypeScript + Vite

### 存储 Schema 扩展

```ts
// 旧格式
widgets: [{ id: 'abc', type: 'calendar', data: {} }]

// 新格式
widgets: [{ id: 'abc', type: 'calendar', data: {}, layout: { x: 0, y: 0, w: 4, h: 3 } }]
```

### 组件结构

```vue
<GridLayout v-model:layout="layout" :col-num="12" :row-height="30">
  <GridItem v-for="item in layout" :key="item.i"
    :x="item.x" :y="item.y" :w="item.w" :h="item.h"
    :min-w="2" :min-h="2">
    <component :is="'Widget' + capitalize(item.type)" v-bind="item.data" />
  </GridItem>
</GridLayout>
```

### 响应式断点

| 设备 | 屏幕宽度 | 列数 |
|------|----------|------|
| 桌面 | ≥1024px | 12 |
| 平板 | 768-1023px | 8 |
| 手机 | <768px | 4 |

### 布局模板

| 模板名 | 描述 |
|--------|------|
| 经典双栏 | 左侧信息+右侧时间线 |
| 仪表盘 | 多小组件网格 |
| 单栏聚焦 | 大时间线+底部小组件 |
| 自定义 | 用户自由拖拽 |

---

## 子任务清单

| # | 任务 | 文件 | 状态 | 预估 |
|---|------|------|------|------|
| T1 | 安装 grid-layout-plus 依赖 | `packages/frontend/package.json` | ⏳ 待执行 | 0.1h |
| T2 | 扩展 widget 存储 schema | `packages/frontend/src/preferences/def.ts` | ⏳ 待执行 | 1h |
| T3 | 创建 GridLayout 容器组件 | 新建 `packages/frontend/src/components/MkGridLayout.vue` | ⏳ 待执行 | 2h |
| T4 | 替换 MkWidgets.vue 为网格布局 | `packages/frontend/src/components/MkWidgets.vue` | ⏳ 待执行 | 2h |
| T5 | Widget 拖拽定位+缩放 | `MkGridLayout.vue` | ⏳ 待执行 | 2h |
| T6 | 响应式断点（桌面/平板/手机） | `MkGridLayout.vue` | ⏳ 待执行 | 1.5h |
| T7 | 布局持久化（prefer.commit） | `widgets.vue` | ⏳ 待执行 | 1h |
| T8 | 管理后台布局模板预设 | `admin/settings.vue` | ⏳ 待执行 | 2h |
| T9 | 默认布局模板（3-5种） | 新建 `packages/frontend/src/utility/layout-templates.ts` | ⏳ 待执行 | 1h |
| T10 | 用户布局切换UI | `widgets.vue` | ⏳ 待执行 | 1h |
| T11 | 迁移旧布局数据 | 新建 migration 或兼容逻辑 | ⏳ 待执行 | 1h |
| T12 | CHANGELOG | `CHANGELOG.md` | ⏳ 待执行 | 0.1h |

---

## 详细实现指南

### T1: 安装 grid-layout-plus 依赖

```bash
cd packages/frontend
pnpm add grid-layout-plus
```

验证安装成功：
```bash
pnpm ls grid-layout-plus
```

### T2: 扩展 widget 存储 schema

**文件**：`packages/frontend/src/preferences/def.ts`

需要在 widget 类型定义中添加 `layout` 字段：

```ts
interface WidgetLayout {
  x: number;  // 列位置（0-based）
  y: number;  // 行位置（0-based）
  w: number;  // 宽度（列数）
  h: number;  // 高度（行数）
}

interface Widget {
  id: string;
  type: string;
  data: Record<string, any>;
  layout?: WidgetLayout;  // 新增
}
```

### T3: 创建 GridLayout 容器组件

**新建文件**：`packages/frontend/src/components/MkGridLayout.vue`

```vue
<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
  <GridLayout
    v-model:layout="layout"
    :col-num="colNum"
    :row-height="30"
    :is-draggable="true"
    :is-resizable="true"
    :vertical-compact="true"
    :use-css-transforms="true"
    @layout-updated="onLayoutUpdated"
  >
    <GridItem
      v-for="item in layout"
      :key="item.i"
      :x="item.x"
      :y="item.y"
      :w="item.w"
      :h="item.h"
      :min-w="2"
      :min-h="2"
    >
      <slot :name="item.i" :item="item" />
    </GridItem>
  </GridLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { GridLayout, GridItem } from 'grid-layout-plus';

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const props = defineProps<{
  layout: LayoutItem[];
  colNum?: number;
}>();

const emit = defineEmits<{
  (e: 'update:layout', layout: LayoutItem[]): void;
}>();

const colNum = computed(() => props.colNum ?? 12);

function onLayoutUpdated(newLayout: LayoutItem[]) {
  emit('update:layout', newLayout);
}
</script>
```

### T4: 替换 MkWidgets.vue 为网格布局

**文件**：`packages/frontend/src/components/MkWidgets.vue`

将现有的平铺列表替换为 MkGridLayout 组件，保持向后兼容。

### T5: Widget 拖拽定位+缩放

在 MkGridLayout.vue 中实现：
- 拖拽手柄（标题栏）
- 缩放手柄（右下角）
- 最小尺寸限制（minW: 2, minH: 2）
- 垂直紧凑排列

### T6: 响应式断点

```ts
const breakpoints = { lg: 1024, md: 768, sm: 0 };
const cols = { lg: 12, md: 8, sm: 4 };

// 使用 window.matchMedia 或 resize observer
```

### T7: 布局持久化

在 widgets.vue 中监听 layout 变更，通过 `prefer.commit()` 保存到用户偏好。

### T8: 管理后台布局模板预设

在 `admin/settings.vue` 中添加：
- 模板选择下拉框
- 模板预览
- 应用到所有用户的按钮

### T9: 默认布局模板

**新建文件**：`packages/frontend/src/utility/layout-templates.ts`

```ts
export const layoutTemplates = {
  classic: {
    name: '经典双栏',
    layout: [
      { i: 'profile', x: 0, y: 0, w: 4, h: 6 },
      { i: 'timeline', x: 4, y: 0, w: 8, h: 12 },
      { i: 'calendar', x: 0, y: 6, w: 4, h: 3 },
      { i: 'notifications', x: 0, y: 9, w: 4, h: 3 },
    ],
  },
  dashboard: {
    name: '仪表盘',
    layout: [
      { i: 'timeline', x: 0, y: 0, w: 6, h: 8 },
      { i: 'notifications', x: 6, y: 0, w: 6, h: 4 },
      { i: 'calendar', x: 6, y: 4, w: 3, h: 4 },
      { i: 'profile', x: 9, y: 4, w: 3, h: 4 },
    ],
  },
  focused: {
    name: '单栏聚焦',
    layout: [
      { i: 'timeline', x: 0, y: 0, w: 12, h: 10 },
      { i: 'notifications', x: 0, y: 10, w: 6, h: 3 },
      { i: 'calendar', x: 6, y: 10, w: 6, h: 3 },
    ],
  },
};
```

### T10: 用户布局切换UI

在 widgets.vue 中添加：
- 布局模板选择器
- 重置布局按钮
- 切换网格/列表视图

### T11: 迁移旧布局数据

兼容逻辑：检测到旧格式 widget（无 layout 字段）时，自动分配默认位置。

```ts
function migrateWidgetsWithLayout(widgets: Widget[]): Widget[] {
  return widgets.map((w, index) => ({
    ...w,
    layout: w.layout ?? {
      x: (index % 3) * 4,
      y: Math.floor(index / 3) * 3,
      w: 4,
      h: 3,
    },
  }));
}
```

### T12: CHANGELOG

在 `CHANGELOG.md` 的 `## Unreleased > ### Client` 下添加：

```markdown
- Enhance: Widget 布局升级为网格布局，支持拖拽定位和缩放
```

---

## 验证清单

- [ ] `pnpm --filter frontend add grid-layout-plus` — 依赖安装成功
- [ ] `pnpm lint` — 全量 typecheck + eslint 通过
- [ ] Widget 列表 → 切换网格布局 → 拖拽调整位置和大小
- [ ] 布局持久化 → 刷新页面后布局保持
- [ ] 响应式断点 → 桌面/平板/手机三档切换正常
- [ ] 布局模板 → 选择预设模板 → 布局自动应用
- [ ] 旧数据兼容 → 升级后旧 widget 自动分配默认布局
- [ ] 管理后台 → 预设模板 → 应用到所有用户

---

## 风险点

1. **grid-layout-plus 兼容性**：需确认与当前 Vue 3 / Vite 版本兼容，必要时锁定版本
2. **旧数据迁移**：升级后旧 widget 缺少 layout 字段，需要兼容逻辑自动分配默认位置
3. **响应式性能**：大量 widget 在移动端可能卡顿，需测试性能边界
4. **SPDX 头**：新建文件必须添加 AGPL-3.0-only 头部

---

## 相关文档

- [[任务队列]] — 主任务队列（P0~P4 全部任务）
- [[2026-06-14-管理后台完善任务队列]] — 管理后台完善任务（P4-30 ~ P4-33）
