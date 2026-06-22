# 合并页面布局+菜单管理

## 目标
把 `page-layout.vue` 和 `menu-config.vue` 合并为一个页面 `menu-config.vue`，删除 `page-layout.vue`。

## 现状分析

### menu-config.vue（保留，作为基础）
- 使用 `UniversalConfigPanel` 组件化
- Tabs: 菜单管理, 用户权限, 设置页, 首页模块, 导航功能, 帖子操作, 小工具, 登录页, 自定义标签
- 保存到: `adminMenu`, `hiddenSettingsForUsers({hidden,labels})`, `hiddenWidgets`, `clientOptions.entrance*`, `clientOptions.customLabels`

### page-layout.vue（删除，功能合入 menu-config）
- 手动 MkSwitch/checkboxes
- Tabs: 登录页, 用户权限, 首页模块(排序), 自定义标签
- 模板里还有但 headerTabs 未暴露的: 时间线标签页, 导航功能, 帖子操作/弹窗, 个人主页, 发帖表单, 用户功能权限
- 保存到: `clientOptions.{hiddenSettingsForUsers, layoutSections, userPermissions, hiddenUIElements, customLabels, entrance*}`

### 独有功能需合入 menu-config
1. **首页模块排序** — page-layout 有上下箭头重排序，menu-config 的 UniversalConfigPanel 没有排序
2. **登录页预览** — page-layout 有实时预览框
3. **时间线标签页** — 控制首页时间线顶部标签页可见性
4. **帖子弹窗操作** — 帖子详情弹窗里的按钮控制
5. **个人主页标签** — 个人主页标签页可见性
6. **发帖表单选项** — 发帖表单里的功能控制
7. **用户功能权限分组** — page-layout 有漂亮的分组UI（带图标、整组开关），menu-config 用的是普通 UniversalConfigPanel
8. **首页模块重排序** — layoutSections 的 order 字段

## 实施步骤

### Step 1: 修改 menu-config.vue

#### 1a. 首页模块 tab — 增加重排序功能
当前 `modules` tab 用 `UniversalConfigPanel`（只有显示/隐藏）。需要：
- 保留 UniversalConfigPanel 的显示/隐藏和重命名
- 增加上下箭头重排序按钮
- 在 UniversalConfigPanel 上方或下方加排序UI
- 模块数据增加 `order` 字段，保存时带上

#### 1b. 登录页 tab — 增加预览
当前 `entrance` tab 只有开关。需要从 page-layout 搬过来：
- 预览框（previewBrand, previewVideo, previewFed）
- 相关 CSS（.preview, .previewBox, .previewBrand 等）

#### 1c. 新增 tab: 时间线标签页
在 headerTabs 增加 `timeline` tab，内容从 page-layout 搬过来：
- 7个标签页（home, local, social, global, lists, antennas, channels）
- MkSwitch 控制可见性
- 恢复默认按钮

#### 1d. 新增 tab: 帖子弹窗 + 个人主页 + 发帖表单
合并到现有的 `post` tab 里，或新增独立 tabs：
- 帖子弹窗操作（share, bookmark, report, copyLink, delete）
- 个人主页标签（followers, following, activity, clips, pages, gallery）
- 发帖表单选项（poll, cw, geo, visibility, reactionAcceptance, schedule）

建议：在 `post` tab 下面加三个 MkFolder 子区域，不增加新 tab。

#### 1e. 用户权限 tab — 使用分组UI
当前用 UniversalConfigPanel。改为 page-layout 的分组UI：
- PERMISSION_DEFINITIONS 按 group 分组
- 每组有图标、整组显示/隐藏按钮
- 个别条目有 MkSwitch

#### 1f. 保存逻辑统一
`saveAll()` 需要保存所有数据：
```js
os.apiWithDialog('admin/update-meta', {
  clientOptions: {
    entranceVideoShow, entranceVideoSize, entranceBrandRatio, entranceShowFederation,
    customLabels,
    layoutSections,        // 新增：首页模块排序
    userPermissions,       // 新增：用户功能权限
    hiddenUIElements,      // 新增：时间线/导航/帖子/弹窗/个人主页/发帖表单
    hiddenSettingsForUsers, // 已有（但格式要统一）
  },
  hiddenWidgets,
  hiddenSettingsForUsers: { hidden, labels },
  adminMenu: { hidden, labels },
})
```

注意：`hiddenSettingsForUsers` 同时存在 `clientOptions`（数组）和顶层（对象{hidden,labels}）。需要统一用顶层对象格式，`clientOptions` 里不再存。

#### 1g. headerTabs 调整
最终 tabs:
1. 菜单管理 (menu) — Admin菜单显示/隐藏/重命名
2. 用户权限 (permissions) — 分组UI
3. 设置页 (settingsPage) — UniversalConfigPanel
4. 首页模块 (modules) — UniversalConfigPanel + 排序
5. 导航功能 (navbar) — UniversalConfigPanel
6. 帖子操作 (post) — UniversalConfigPanel + 弹窗/个人主页/发帖表单子区域
7. 小工具 (widgets) — UniversalConfigPanel
8. 时间线 (timeline) — MkSwitch列表
9. 登录页 (entrance) — 开关+预览
10. 自定义标签 (labels) — 文字输入

### Step 2: 删除 page-layout.vue
- 删除 `packages/frontend/src/pages/admin/page-layout.vue`

### Step 3: 更新路由
- `router.definition.ts` — 注释掉或删除 page-layout 路由（470-472行）

### Step 4: 更新侧边栏
- `admin/index.vue` — 删除"页面布局"菜单项（192-195行）
- `menu-config.vue` 的 `menuConfigItems` — 删除 `/admin/page-layout` 条目

### Step 5: 编译验证
```bash
cd /c/CGweimi/cgvmi-server
pnpm build
```

## 关键文件
- `packages/frontend/src/pages/admin/menu-config.vue` — 主要修改
- `packages/frontend/src/pages/admin/page-layout.vue` — 删除
- `packages/frontend/src/router.definition.ts` — 删除路由
- `packages/frontend/src/pages/admin/index.vue` — 删除侧边栏条目
- `packages/frontend/src/components/UniversalConfigPanel.vue` — 可能需要增加排序功能
- `packages/frontend/src/utility/use-permission.js` — PERMISSION_DEFINITIONS
- `packages/frontend/src/utility/use-custom-label.js` — CUSTOM_LABEL_DEFINITIONS
