# menu-config 页面清理与重组 — Design Spec

> 日期：2026-06-26
> 来源：扬总反馈 + Claude Code 分析
> 关联：紧接 `2026-06-26-menu-config三大问题修复交付.md`（已落地的 bug 修复 + role 重分类 + 预览模式）

---

## 📌 Context

扬总在 `/admin/menu-config` 页面（界面控制）反馈以下问题，本 spec 解决：

1. **登录页设置是死代码** — 4 个开关（视频显示 / 视频大小 / 品牌占比 / 联邦开关）在实际登录页 `welcome.entrance.classic.vue` 中**完全无作用**。扬总原话："后期肯定要根据我的实际布局重新做到"。
2. **菜单管理角色模糊** — tab 标题只写"菜单管理"，扬总不知道是 admin 后台侧栏还是普通用户菜单。role chip 🛠 admin 虽然存在，但描述藏在折叠的 MkInfo 里。
3. **5 个 tab 视觉重复** — 用户权限 / 设置页 / 导航功能 / 帖子操作 / 时间线标签 / 个人主页标签——全是同一种 `UniversalConfigPanel`（勾选 + 重命名），看着很乱。
4. **整页过长** — 3 个 section 都 `defaultOpen=true`，首屏 1500+ px 高。
5. **PageWithHeader 空 chrome** — `menu-config.vue:7` 等多处 `<PageWithHeader :tabs="[]" :actions="[]">` 渲染了一个空的顶栏。
6. **自定义标签混入** — i18n 文案覆盖（30+ 字段）和"显示/隐藏"是完全不同的关注点，但混在同一个页面。

**预期成果**：admin 进来 menu-config 一眼看到"菜单管理（admin 后台侧栏）"，可点预览按钮；其他 section 折叠隐藏，认知负担降到最低。死代码清除、视觉减负、admin 误判归零。

---

## 🎯 决策记录

| 决策 | 内容 | 原因 | 影响 |
|------|------|------|------|
| 登录页 section 整体下架 | 删除 4 个开关 + 对应 state + saveAll 字段 | 当前是假控件，会导致 admin 误判 | meta schema 不破坏（字段保留），仅前端不显示 |
| 菜单管理 tab 加 SVG 侧栏示意图 | inline SVG 画简化 admin 侧栏 | "影响哪里" 一目了然 | 0 外部依赖，纯 inline |
| UI 元素显示折叠重组 | 5 个相似 panel → 1 个外层 MkFolder + 2 个子分组 | 视觉减负 | 内部子区块仍用 UniversalConfigPanel |
| 3 个 section 默认折叠 | admin 后台保留 defaultOpen，其他 2 个改 false | admin 进来只看自己关心的 | 页面长度减半 |
| 删外层空 PageWithHeader | menu-config.vue / admin/index.vue / settings/index.vue 3 处 | 内部已有更漂亮的 sticky topBar | chrome 减少 |
| 自定义标签本期不动结构 | 仅在 menu-config 顶部加个"→ 自定义文案"链接 | 改动大，下期再做 | 引导用户即可 |
| 实施时机 | 写完 spec 直接进 plan → 用户睡醒看 git log | 用户原话"我睡觉了" | 全自动推进 |

---

## 🔧 实施要点

### Part 1：删除登录页 section（4 个开关 → 0）

**menu-config.vue** 改动：

- 删除 L226-271 的 4 个 state：`entranceVideoShow` / `entranceVideoSize` / `entranceBrandRatio` / `entranceShowFederation`
- 删除 L605-610 的 `videoSizeOptions` 数组
- 删除 🌐 所有人 section 内的 `<MkFolder title="登录页">` 块
- 修改 `saveAll()`（L745-768）：从 `clientOptions` 中删除这 4 个字段的写入
- 删除 `i18n` 中无用的 4 个 key（如有，ja-JP.yml 中对应字段清理）
- `meta.clientOptions.entranceVideoShow` 等字段**保留**在 schema 中（不影响后端），下期重做时直接复用

### Part 2：菜单管理 tab 改名 + SVG 侧栏示意图

**menu-config.vue** 改动：

- 菜单管理 MkFolder 标题改为：`菜单管理（admin 后台侧栏）`
- 在 MkInfo 上方加一个 inline SVG 组件 `<AdminSidebarPreview />`，画一个简化版 admin 后台侧栏布局（5 个分组 + 高亮"勾选显示"项）
- 描述保留："勾选显示 / 取消隐藏，点击编辑重命名"

**新文件**：`packages/frontend/src/components/AdminSidebarPreview.vue`

- 50 行 inline SVG：5 个分组标题 + 若干菜单项图标 + 文字
- 接受 props：`hidden: string[]`（已隐藏项）+ `labels: Record<string, string>`（自定义标签）
- 视觉上：白色背景面板 + 左边框 accent 色 + 圆角 12px + 高度约 180px
- 高亮已隐藏项（灰色 + 划线）
- 走 SCSS module

> 这是**纯视觉辅助**，不接事件，不影响数据流。

### Part 3：UI 元素显示折叠重组

**新结构**：

```
⚙️ UI 元素显示（外层 MkFolder, defaultOpen=false）
  📋 普通用户侧（子分组，纯标题 + 分隔线）
    - 用户功能权限（UniversalConfigPanel）
    - 设置页（UniversalConfigPanel）
    - 首页模块（自定义排序 UI）
    - 时间线（switch 列表）
    - 个人主页标签（switch 列表）
  🌐 公共侧（子分组）
    - 顶部导航（UniversalConfigPanel）
    - 帖子操作（UniversalConfigPanel）
```

实现：

- 外层用 `<MkFolder title="⚙️ UI 元素显示">` 包裹
- 子分组用 `<div class="subGroup">` + 一个小标题（`<h3>`）+ 灰色分割线
- 内部 panel 的写法不变（仍是 UniversalConfigPanel）
- 调整后位置：把 5 个 panel 从 👤 普通用户 / 🌐 所有人 section 移到 ⚙️ UI 元素显示 外层

**新增 CSS**：

```scss
.subGroup {
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.subGroupTitle {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--MI_THEME-fgTransparentWeak);
  margin: 16px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--MI_THEME-divider);
}
```

### Part 4：3 个 section 默认折叠

| Section | 当前 defaultOpen | 改后 |
|---------|-----------------|------|
| 🛠 admin 后台 | true | true（保留，菜单管理是 admin 自己的） |
| 👤 普通用户 | true | **false** |
| 🌐 所有人 | true | **false** |
| ⚙️ UI 元素显示（新增外层） | — | **false** |

### Part 5：删外层空 PageWithHeader

3 个文件：

- `packages/frontend/src/pages/admin/menu-config.vue:7` — 删除 `<PageWithHeader :tabs="headerTabs" :actions="headerActions">` 包装，直接用 `<div>` + sticky topBar
- `packages/frontend/src/pages/admin/index.vue` — 同上
- `packages/frontend/src/pages/settings/index.vue` — 同上

**注意**：

- `headerTabs` / `headerActions` 这两个 computed 如果其他地方没用，直接删除
- `definePage` 必须保留（它定义 `title` 和 `icon` 元信息给浏览器 tab）
- 保留 `provideMetadataReceiver` / `provideReactiveMetadata` / `nested-router-view` 逻辑

### Part 6：自定义标签 — 引导链接

menu-config.vue 顶部 sticky topBar 右侧增加一个文字链接：

```vue
<MkA to="/admin/labels" class="linkItem">
  <i class="ti ti-tag"></i>
  自定义文案
</MkA>
```

**新文件**：`packages/frontend/src/pages/admin/labels.vue`（最小占位，提示"即将到来"）

> ⚠️ 这个新 page 暂不实施完整版，仅放 MkInfo 占位。下期再做完整 i18n 编辑器。

实际上为最小改动，**本轮不创建新 page**，改为：

- menu-config 顶部链接改成 `#` + `@click` 弹 toast："即将到来"
- 或直接链接到 `/admin/menu-config` 顶部锚点（不太好）

**最终决策**：menu-config 顶部加一个**折叠的"自定义标签"内嵌区**（默认折叠），保留原逻辑但用 `defaultOpen=false` 的 MkFolder 包起来，避免被误以为是"显示/隐藏"。

---

## 📦 文件变更清单

| 文件 | 改动 | 改动量 |
|------|------|--------|
| `pages/admin/menu-config.vue` | 大改：删除登录页 section + 改菜单管理 tab + UI 元素显示重组 + section 默认折叠 + 删外层 PageWithHeader | ~150 行 |
| `components/AdminSidebarPreview.vue` | 新建：inline SVG 侧栏示意图 | ~80 行 |
| `pages/admin/index.vue` | 小改：删空 PageWithHeader | ~5 行 |
| `pages/settings/index.vue` | 小改：删空 PageWithHeader | ~5 行 |
| `CHANGELOG.md` | Unreleased / Client 加 3 条 | ~3 行 |

---

## 🧪 验证

### 自动化
- `pnpm --filter frontend typecheck` — 零新增 error
- `pnpm build` — 全量构建（涉及多个 page 改动）
- 后端 pm2 restart misskey
- HTTP 200: `/`, `/manifest.json`
- 浏览器手动验证 menu-config 页

### 手动烟测

| 场景 | 期望 |
|------|------|
| 打开 `/admin/menu-config` | 首屏只看到 🛠 admin 后台（展开）+ ⚙️ UI 元素显示（折叠），其他 section 折叠 |
| 展开 ⚙️ UI 元素显示 | 看到 "📋 普通用户侧" + "🌐 公共侧" 子分组，5 个 panel 都在 |
| 点 "👁 预览普通用户视角" | 弹 preview banner，整站按普通用户渲染 |
| 切到 "🌐 所有人" section 展开 | 不再有"登录页"子 folder（已删除） |
| 切到 "👤 普通用户" section 展开 | 不再有"用户权限 / 设置页 / 首页模块 / 时间线 / 个人主页标签"——都移到 ⚙️ UI 元素显示了 |
| 菜单管理 MkFolder | 标题是"菜单管理（admin 后台侧栏）"，顶部有 SVG 示意图 |
| 保存按钮 | 4 个 entrance 字段不再写入 meta（验证方法：保存后 GET /api/meta 看 clientOptions 无这些字段） |

### 回归
- `/admin/overview` admin 仪表盘渲染正常
- `/settings` 普通用户设置页正常
- 预览模式 + 路由守卫不变
- 已有 hiddenUIElements 隐藏效果不变

---

## ⚠️ 不在本期范围

- admin 操作权限校验（preview 模式下 admin 仍能改 meta）
- 后端 impersonation 接口
- 多语言翻译（用中文兜底）
- 「自定义标签」独立路由化
- `welcome.entrance.classic.vue` 登录页实际重做

---

## 💡 Why this approach

- **删除假控件 > 标记"即将重做"**：admin 误判一次就够烦了，长期留着没意义
- **折叠重组 > 重写组件**：UniversalConfigPanel 本身好用，重复问题在结构不在组件
- **不创建新 page**：自定义标签大改动放在下期，本期仅折叠即可
- **先 spec 后 plan 后实施**：让扬总睡醒能看 git log 验证进度

---

## ⏱ 实施时间窗

- 写 spec + commit：5 分钟
- 写 plan：5 分钟
- 实施 6 个 part：60-90 分钟
- 验证 + commit：15 分钟

总计预计 90-120 分钟，扬总睡醒前可完成。
