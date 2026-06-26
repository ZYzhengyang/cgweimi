# Widget Grid 自由拖拽系统 — 设计 Spec

**作者**: Claude (扬总需求)
**日期**: 2026-06-26
**状态**: Draft（待 review）

---

## 1. 背景与目标

### 当前状态

Misskey 的 widget 系统是"右侧固定栏"模式：

- 所有 widget 只能放在右侧栏（`ui/universal.vue` 在 ≥1100px 时显示 `<XWidgets/>`）
- 移动端 / 窄屏完全没有 widget
- Widget 大小固定，无法调整
- 用户只能"加 / 删 / 改配置"，无法"摆位置"

### 目标

把 widget 系统升级为 **自由拖拽 + 自由缩放** 的 grid 画布：

- 主页变成 widget 网格（除 navbar 外全是 widget）
- Timeline 降级为 widget 之一，跟其他 widget 平级
- 用户可以拖拽 widget 到任意位置、调整大小、钉住锁定
- Admin 可以设置全站默认布局
- 移动端简化为只显示 Timeline

### 1.3 允许 Admin 设置默认布局（v1 范围内）

- Admin 后台可以设置全站默认 layout
- 该 layout 仅作为用户首次进入 / 重置时的默认值
- 用户随后可自由修改，不受影响

### 不做什么（YAGNI）

- ❌ widget 嵌套
- ❌ widget 间数据联动
- ❌ admin 强制锁定全站布局（v2 再说）
- ❌ widget 模板市场
- ❌ 移动端 widget 拖拽
- ❌ 视频瀑布流 widget（v2 再说，先确认现有 WidgetSlideshow 是否够用）

---

## 2. 架构总览

### 2.1 数据流

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Admin 后台   │ →  │ Meta.default │ →  │ 用户首次 /    │
│ 设置默认布局  │    │ WidgetLayout │    │ 重置时填充    │
└──────────────┘    └──────────────┘    └──────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 用户操作      │ →  │ prefer.s.    │ →  │ WidgetGrid   │
│ 拖/缩/钉/删   │    │ widgets      │    │ 自动 reflow   │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 2.2 模块边界

| 模块 | 职责 | 不负责 |
|------|------|--------|
| `WidgetGrid` | 网格容器、拖拽 / 缩放生命周期、layout 持久化 | 单个 widget 内容 |
| `WidgetGridItem` | 单 widget 容器、工具栏、resize 把手、钉住状态 | widget 业务逻辑 |
| `useWidgetGrid` (composable) | layout 序列 / 反序列化、冲突检测、迁移老数据 | UI 渲染 |
| Admin 后台 | 设置全站默认布局 | 用户自己布局 |
| Migration | schema 升级 + 老数据迁移 | 运行时逻辑 |

### 2.3 依赖

新增依赖：`grid-layout-plus`（gridstack 的 Vue 3 版本，支持拖拽 + 缩放 + 网格吸附 + 响应式 + 序列化）。

MIT 许可，~25KB gzip，活跃维护。

---

## 3. 数据模型

### 3.1 用户侧（preference `widgets`）

```ts
type StoredWidget = {
  id: string;
  name: WidgetName;        // 已有枚举: 'profile' | 'timeline' | ...
  place: 'right' | null;   // 兼容旧字段，grid 模式时统一为 null
  data: Record<string, any>;
  layout: {
    x: number;  // 列位置 0-11
    y: number;  // 行位置
    w: number;  // 列宽 1-12
    h: number;  // 行高（每行 80px）
  };
  pinned: boolean;         // 是否锁定
};
```

> 老用户迁移：检测 `widget.layout` 不存在 → 分配到右侧栏 grid 列（默认 w=4, h=4，从右往左填充）。

### 3.2 全站侧（Meta）

```ts
type Meta = {
  // ... 已有字段
  defaultWidgetLayout: StoredWidget[] | null;
};
```

> `null` 表示"不强制默认"，用户首次进入显示空白 + 提示。

### 3.3 数据库迁移

新建 `packages/backend/migration/{timestamp}-AddDefaultWidgetLayout.js`：

```js
class AddDefaultWidgetLayout{ts} {
  async up() {
    await queryRunner.addColumn('meta', new TableColumn({
      name: 'defaultWidgetLayout',
      type: 'jsonb',
      isNullable: true,
    }));
  }
  async down() {
    await queryRunner.dropColumn('meta', 'defaultWidgetLayout');
  }
}
```

并更新 `packages/backend/src/models/Meta.ts` 加 `defaultWidgetLayout`。

### 3.4 preference schema 升级

`packages/frontend/src/preferences/def.ts` `widgets` default：

```ts
widgets: {
  accountDependent: true,
  default: () => /* 现有默认 + 每项加 pinned: false */,
},
```

### 3.5 Admin API

| Endpoint | 方法 | 说明 |
|----------|------|------|
| `admin/widget-layout/get-default` | GET | 读 `meta.defaultWidgetLayout` |
| `admin/widget-layout/set-default` | POST | 写入 `meta.defaultWidgetLayout` |
| `admin/widget-layout/reset-default` | POST | 清空为 `null` |

---

## 4. UI 设计

### 4.1 桌面端主页（≥1100px）

```
┌─────────────────────────────────────────────────────────┐
│ [Navbar: Logo | 搜索 | 通知 | 头像 | 发布按钮]              │
├─────────────────────────────────────────────────────────┤
│ [+ 添加 widget]    [✏ 编辑]    [↺ 恢复默认布局]              │ ← 浮动工具栏
├──────────┬───────────────────┬───────────────────────────┤
│  视频     │   Timeline        │   Notifications          │
│  widget  │   widget          │   widget                 │
│  (4×6)   │   (6×∞)           │   (4×4)                  │
│          │                   ├───────────────────────────┤
│          │                   │   Activity                │
│          │                   │   widget (4×4)            │
├──────────┴───────────────────┴───────────────────────────┤
│ [✏ 编辑模式时] 鼠标悬停 widget 出现工具栏 [⚙][📌][×]          │
└─────────────────────────────────────────────────────────┘
```

- 12 列 grid，每行 80px 自动扩展
- Timeline widget 默认 `w=8`，高度用 `autoHeight: true`（grid-layout-plus 内置，根据内容自适应）
- 其他 widget 默认 `w=4, h=4`
- 拖动手柄：整个 widget 卡片可拖（grid-layout-plus 默认行为），不是仅 title bar

### 4.2 编辑模式

进入编辑：浮动工具栏出现 "✏ 编辑" 按钮，激活后：

- 所有 widget 出现虚线边框
- 右上角出现 8 方向 resize 把手
- 鼠标悬停出现 `[⚙][📌][×]` 工具栏
- 顶部出现 `[+ 添加 widget]` 按钮
- 拖动时不钉住 → 实时预览，松手自动保存 layout
- 钉住的 widget 不响应拖动 / 缩放，钉子变金色
- 退出编辑：再次点 "✓ 完成" 按钮

### 4.3 单 widget 工具栏

```
┌──────────────────┐
│ [title]  [⚙][📌][×] │
├──────────────────┤
│                  │
│  widget content  │
│                  │
│                  │
│          [⬚ resize]│
└──────────────────┘
```

- 拖动：title bar 整条可拖
- 缩放：右下角 8 方向 resize handle
- ⚙：打开 `MkWidgetSettingsDialog`（已有）
- 📌：切换 pin 状态（金色 = 钉住）
- ×：移除 widget

### 4.4 添加 widget 流程

1. 点 `[+ 添加 widget]`
2. 弹出 widget 列表（已有 widget 注册枚举 + Admin 推荐 widget 置顶）
3. 选择一个 → 在 grid 末尾默认位置插入新 widget
4. 新 widget 默认未钉住，可立即拖动

### 4.5 移动端（<768px）

- 完全不显示 grid
- 只显示 Timeline widget（直接渲染 timeline）
- 不显示浮动工具栏、不显示添加按钮
- 不显示任何 widget 工具栏

### 4.6 Admin 后台

新增 `/admin/widget-layout`：

```
┌─────────────────────────────────────────────────────────┐
│ 全站默认布局                                              │
├─────────────────────────────┬───────────────────────────┤
│                             │  操作                     │
│  [WidgetGrid 编辑器]         │                           │
│   （admin 自己摆布局）       │  [💾 设为全站默认布局]      │
│                             │  [↺ 清空全站默认]           │
│                             │                           │
│                             │  提示：                    │
│                             │  · 设的布局仅作为用户首     │
│                             │    次进入 / 重置时的默认值   │
│                             │  · 用户随后可自由修改       │
└─────────────────────────────┴───────────────────────────┘
```

---

## 5. 关键文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `packages/frontend/src/components/WidgetGrid.vue` | 新建 | grid-layout-plus 包装 + 工具栏 + 编辑模式 |
| `packages/frontend/src/components/WidgetGridItem.vue` | 新建 | 单 widget 容器、resize、工具栏、钉住 |
| `packages/frontend/src/composables/use-widget-grid.ts` | 新建 | layout 序列化、迁移、冲突检测 |
| `packages/frontend/src/pages/index.vue` | 大改 | 移除 PageWithHeader 三栏 → WidgetGrid |
| `packages/frontend/src/ui/universal.vue` | 小改 | 移除右侧 XWidgets 栏 |
| `packages/frontend/src/ui/_common_/widgets.vue` | 改造 | 编辑器入口兼容 |
| `packages/frontend/src/preferences/def.ts` | 小改 | widgets schema + pinned 字段 |
| `packages/frontend/src/widgets/index.ts` | 小改 | 导出新组件 |
| `packages/frontend/src/pages/admin/widget-layout.vue` | 新建 | admin 布局编辑器 |
| `packages/frontend/src/pages/admin/index.vue` | 小改 | 注册新菜单项 |
| `packages/backend/src/server/api/endpoints/admin/widget-layout/*.ts` | 新建 | 3 个 API endpoint |
| `packages/backend/src/server/api/endpoint-list.ts` | 小改 | 注册新 endpoints |
| `packages/backend/src/models/Meta.ts` | 小改 | 加 `defaultWidgetLayout` 字段 |
| `packages/backend/migration/{ts}-AddDefaultWidgetLayout.js` | 新建 | DB 迁移 |
| `packages/frontend/src/widgets/WidgetVideoFeed.vue` | **不纳入本期** | 视频瀑布流 widget 留到 v2（先确认现有 WidgetSlideshow 是否复用） |
| `packages/frontend/src/utility/migrate-widget-layout.ts` | 新建 | 老数据迁移工具 |
| `packages/i18n/built/locales/ja-JP.yml` | 小改 | 加 i18n keys |
| `CHANGELOG.md` | 小改 | Unreleased / General 加一行 |
| `pnpm-workspace.yaml` 或 `packages/frontend/package.json` | 小改 | 加 grid-layout-plus 依赖 |

---

## 6. 验收标准

### 功能验收

- [ ] 桌面端可以从 widget 库添加 widget
- [ ] 桌面端可以拖动 widget 到任意 grid 位置，吸附准确
- [ ] 桌面端可以缩放 widget（8 方向 resize）
- [ ] 钉住 widget 后，拖动 / 缩放都禁用，钉子变金色
- [ ] 移除 widget 后 layout 自动 reflow
- [ ] 编辑模式可进 / 可出，工具栏显示 / 隐藏正确
- [ ] 移动端只显示 Timeline，不显示其他 widget
- [ ] 用户布局持久化（刷新 / 重新登录后保留）
- [ ] Admin 后台可以设置全站默认布局
- [ ] 首次访问用户（或 prefer.widgets 为空）使用 admin 设置的默认布局
- [ ] 老用户 widget 自动迁移到 grid 模式（无报错）

### 性能验收

- [ ] 12 个 widget 同时拖动，FPS ≥ 30
- [ ] layout 持久化 throttle 1s（避免每次拖动都写 storage）

### i18n 验收

- [ ] 所有新增 UI 文案走 i18n
- [ ] 日文 / 英文都有覆盖（中文之后从 ja-JP 翻译）

---

## 7. 风险与缓解

| 风险 | 等级 | 缓解 |
|------|------|------|
| grid-layout-plus 与 Vue 3.5 兼容性 | 中 | pin 到稳定版本，先在 storybook 跑通最小 demo |
| Timeline widget 被 resize 后滚动性能差 | 中 | Timeline widget 内部用虚拟滚动（已有）；resize 不改变内部实现 |
| 老用户 widget 迁移出错 | 中 | 迁移函数加防御：layout 缺字段时 fallback 默认值；migration run 后跑 dry-run 检测 |
| admin 误操作覆盖全站默认 | 低 | 二次确认弹窗；保留上次值用于"撤销" |
| 移动端 widget 完全消失用户投诉 | 低 | navbar 顶部加"切换桌面版"链接；移动版时间线正常显示 |

---

## 8. 后续 v2（不做，但留接口）

- admin 强制锁定全站布局（新增 `meta.lockedWidgetLayout` 字段）
- widget 模板市场（用户保存 / 分享布局方案）
- widget 数据联动（一个 widget 操作影响另一个）
- widget 嵌套 / tab 容器
- widget 自动布局（AI 推荐布局）

---

## 9. 实施阶段拆分（建议）

**Stage A：基础 grid**（1 天）
- 加 grid-layout-plus 依赖
- 新建 `WidgetGrid` / `WidgetGridItem` 骨架（只支持静态 layout）
- 数据模型 + preference schema 升级
- 老用户迁移工具

**Stage B：交互**（1 天）
- 拖拽 / 缩放 / 钉住 / 移除
- 编辑模式 + 工具栏
- 添加 widget 弹窗

**Stage C：admin 后台**（0.5 天）
- 3 个 API endpoint
- admin 布局编辑器页面
- meta.defaultWidgetLayout 字段 + migration

**Stage D：移动端 + 验收**（0.5 天）
- 移动端简化
- CHANGELOG / i18n
- 浏览器实测

总计 ~3 天单人工作量。