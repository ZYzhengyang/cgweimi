# menu-config 清理与重组 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 `/admin/menu-config` 页面，消除假控件、强化角色可读性、把 5 个相似的开关 panel 折叠重组，让 admin 一眼看出"隐藏哪里/影响什么"。

**Architecture:** 纯前端改动，删除 `entrance*` 死字段、改 menu 标题、新增 inline SVG 组件、用 MkFolder 外层包裹 5 个 panel、清理空 PageWithHeader chrome。

**Tech Stack:** Vue 3 (Composition API, `<script setup>`) + TypeScript + SCSS Modules + 现有 MkFolder/MkSwitch/UniversalConfigPanel 组件。

## Global Constraints

- **SPDX 头**：新建 `.vue` / `.ts` 文件必须以 `syuilo and misskey-project` + `AGPL-3.0-only` 开头（项目 AGENTS.md §1）。
- **i18n**：仅编辑 `packages/frontend/src/locales/ja-JP.yml`，其他 locale 由 Crowdin 同步（AGENTS.md §2）。
- **Migration**：本期无 schema 变更，不需要 migration。
- **构建**：涉及多个 page 改动必须 `pnpm build`（CG 微米启动 SOP）。
- **CHANGELOG**：`## Unreleased` / `### Client` 加 3 条，格式 `- <Prefix>: <概要>`（AGENTS.md CHANGELOG 节）。
- **不引入新依赖**：用 Vue 原生 + 现有 Mk* 组件。

---

## File Structure

| 文件 | 状态 | 职责 |
|------|------|------|
| `packages/frontend/src/pages/admin/menu-config.vue` | 修改 | 主体：删除登录页 section、改 menu tab、UI 元素显示折叠、删外层 PageWithHeader |
| `packages/frontend/src/components/AdminSidebarPreview.vue` | 新建 | Inline SVG 侧栏示意图，props: `hidden`, `labels` |
| `packages/frontend/src/pages/admin/index.vue` | 修改 | 删外层空 PageWithHeader |
| `packages/frontend/src/pages/settings/index.vue` | 修改 | 删外层空 PageWithHeader |
| `CHANGELOG.md` | 修改 | Unreleased/Client 加 3 条 |
| `docs/superpowers/specs/2026-06-26-menu-config-cleanup-design.md` | 已存在 | 本期设计 spec |

---

## Task 1: 删除登录页 section（4 个开关 → 0）

**Files:**
- Modify: `packages/frontend/src/pages/admin/menu-config.vue`

**Step 1:** 定位文件 menu-config.vue，确认 4 个 state 在 L612-615：

```ts
const entranceVideoShow = ref(meta.clientOptions.entranceVideoShow ?? true);
const entranceVideoSize = ref<Misskey.entities.MetaClientOptions['entranceVideoSize']>(meta.clientOptions.entranceVideoSize ?? 'medium');
const entranceBrandRatio = ref(meta.clientOptions.entranceBrandRatio ?? 50);
const entranceShowFederation = ref(meta.clientOptions.entranceShowFederation ?? true);
```

**Step 2:** 删除 L605-615（`videoSizeOptions` 数组 + 4 个 state）：

用 Edit 工具删除这段：

```ts
// ========== 登录页设置 ==========
const videoSizeOptions = [
	{ value: 'small', label: '小（320px）' },
	{ value: 'medium', label: '中（400px）' },
	{ value: 'large', label: '大（500px）' },
	{ value: 'full', label: '全屏（占满右侧）' },
];

const entranceVideoShow = ref(meta.clientOptions.entranceVideoShow ?? true);
const entranceVideoSize = ref<Misskey.entities.MetaClientOptions['entranceVideoSize']>(meta.clientOptions.entranceVideoSize ?? 'medium');
const entranceBrandRatio = ref(meta.clientOptions.entranceBrandRatio ?? 50);
const entranceShowFederation = ref(meta.clientOptions.entranceShowFederation ?? true);
```

**Step 3:** 找到 🌐 所有人 section 中的"登录页"MkFolder（大约 L226-271），整个 MkFolder 块删除。用 Edit 工具匹配起始 `<MkFolder>` 和结束 `</MkFolder>`。

**Step 4:** 修改 `saveAll()` 函数（L745-768）。删除 `clientOptions` 中的 4 个 entrance 字段：

```ts
function saveAll() {
	os.apiWithDialog('admin/update-meta', {
		clientOptions: {
			customLabels: customLabels.value,
			layoutSections: layoutSections.value,
			userPermissions: userPermissions.value,
			hiddenUIElements: hiddenUIElements.value,
			hiddenSettingsForUsers: {
				hidden: hiddenSettingsForUsers.value,
				labels: settingsPageLabels.value,
			},
		},
		adminMenu: {
			hidden: hiddenAdminMenu.value,
			labels: adminMenuLabels.value,
		},
	}).then(() => {
		fetchInstance(true);
	});
}
```

**Step 5:** 验证：在 menu-config.vue 中 grep `entrance` 应为 0 命中。

```bash
grep -n "entrance" packages/frontend/src/pages/admin/menu-config.vue
```

期望：no matches（注意 `MetaClientOptions` 类型引用可能还残留 `entranceVideoSize`，需要保留类型不破坏，仅删除运行时使用）。

**Step 6:** Commit

```bash
git add packages/frontend/src/pages/admin/menu-config.vue
git commit -m "refactor(frontend): remove dead login-page settings from menu-config

The 4 entrance switches (video show, video size, brand ratio, federation)
had no effect on the actual login page welcome.entrance.classic.vue.
Removed to avoid admin misjudging save state.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 新建 AdminSidebarPreview SVG 组件

**Files:**
- Create: `packages/frontend/src/components/AdminSidebarPreview.vue`

**Interfaces:**
- Consumes: `hidden: string[]` (已隐藏路径数组) + `labels: Record<string, string>` (自定义文案映射)
- Produces: 一个 SVG 视觉示意，admin 能直观看到"勾掉这些项后侧栏会变成什么样"

**Step 1:** 写入文件 `packages/frontend/src/components/AdminSidebarPreview.vue`，完整内容如下：

```vue
<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.preview">
	<div :class="$style.previewHeader">
		<i class="ti ti-layout-sidebar"></i>
		<span>侧栏预览</span>
		<span :class="$style.previewHint">勾掉的项会从这里消失</span>
	</div>
	<div :class="$style.sidebar">
		<div v-for="group in groups" :key="group.title" :class="$style.group">
			<div :class="$style.groupTitle">{{ group.title }}</div>
			<div
				v-for="item in group.items"
				:key="item.key"
				:class="[$style.item, { [$style.hidden]: isHidden(item.key) }]"
			>
				<i :class="item.icon"></i>
				<span>{{ getLabel(item) }}</span>
				<span v-if="isHidden(item.key)" :class="$style.hiddenBadge">隐藏</span>
			</div>
		</div>
	</div>
</div>
</template>

<script setup lang="ts">
import { ADMIN_MENU_ITEMS } from '@/utility/admin-menu-items.js';

const props = withDefaults(defineProps<{
	hidden?: string[];
	labels?: Record<string, string>;
}>(), {
	hidden: () => [],
	labels: () => ({}),
});

const groups = ADMIN_MENU_ITEMS;

function isHidden(key: string): boolean {
	return props.hidden.includes(key);
}

function getLabel(item: { key: string; text: string }): string {
	return props.labels[item.key] ?? item.text;
}
</script>

<style lang="scss" module>
.preview {
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	border: 1px solid var(--MI_THEME-divider);
	overflow: hidden;
	margin-bottom: 16px;
}

.previewHeader {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 14px;
	background: color-mix(in srgb, var(--MI_THEME-accent) 6%, var(--MI_THEME-bg));
	border-bottom: 1px solid var(--MI_THEME-divider);
	font-size: 13px;
	font-weight: 600;
}

.previewHint {
	margin-left: auto;
	font-size: 11px;
	font-weight: 400;
	color: var(--MI_THEME-fgTransparentWeak);
}

.sidebar {
	padding: 8px 6px;
	max-height: 280px;
	overflow-y: auto;
}

.group {
	margin-bottom: 4px;
}

.groupTitle {
	padding: 8px 12px 4px;
	font-size: 11px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 7px 12px;
	font-size: 13px;
	border-radius: 6px;
	transition: opacity 0.15s;

	i {
		width: 18px;
		text-align: center;
		color: var(--MI_THEME-fgTransparentWeak);
		font-size: 14px;
		flex-shrink: 0;
	}

	&.hidden {
		opacity: 0.35;
		text-decoration: line-through;
		text-decoration-color: var(--MI_THEME-fgTransparentWeak);
	}
}

.hiddenBadge {
	margin-left: auto;
	font-size: 10px;
	padding: 2px 6px;
	border-radius: 999px;
	background: color-mix(in srgb, #ef4444 18%, transparent);
	color: #b91c1c;
	font-weight: 600;
}
</style>
```

**Step 2:** 验证 typecheck：

```bash
pnpm --filter frontend typecheck 2>&1 | grep -E "(AdminSidebarPreview|error)" | head -20
```

期望：0 error related to AdminSidebarPreview。

**Step 3:** Commit

```bash
git add packages/frontend/src/components/AdminSidebarPreview.vue
git commit -m "feat(frontend): add AdminSidebarPreview SVG component for menu-config

Visual aid showing admin which sidebar items will be hidden/labelled.
Used in /admin/menu-config to clarify 'this affects the admin sidebar'.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 菜单管理 tab 改名 + 接入 AdminSidebarPreview

**Files:**
- Modify: `packages/frontend/src/pages/admin/menu-config.vue`

**Step 1:** 在文件顶部 import AdminSidebarPreview。在 `import { ADMIN_MENU_ITEMS } from '@/utility/admin-menu-items.js';` 附近（约 L325）加一行：

```ts
import AdminSidebarPreview from '@/components/AdminSidebarPreview.vue';
```

**Step 2:** 修改"菜单管理"MkFolder 标题。原结构（约 L38-56）：

```vue
<MkFolder :defaultOpen="true">
	<template #label>菜单管理</template>
	<template #icon><i class="ti ti-layout-sidebar"></i></template>
	...
</MkFolder>
```

改标题为：`菜单管理（admin 后台侧栏）`。

**Step 3:** 在 MkInfo 之前插入 AdminSidebarPreview 组件。在 MkFolder 的内容起始处，MkInfo 上方加：

```vue
<AdminSidebarPreview
	:hidden="hiddenAdminMenu"
	:labels="adminMenuLabels"
/>
```

确保 `hiddenAdminMenu` 和 `adminMenuLabels` 这两个 ref 已经在 script 中定义（已存在）。

**Step 4:** 验证渲染逻辑：用 grep 确认 `hiddenAdminMenu` 和 `adminMenuLabels` 在 template 和 script 中都正确引用：

```bash
grep -n "hiddenAdminMenu\|adminMenuLabels" packages/frontend/src/pages/admin/menu-config.vue
```

期望：template 中有 `:hidden="hiddenAdminMenu"` 和 `:labels="adminMenuLabels"`，script 中 ref 定义齐全。

**Step 5:** 验证 typecheck：

```bash
pnpm --filter frontend typecheck 2>&1 | grep -E "menu-config" | head -10
```

期望：0 error。

**Step 6:** Commit

```bash
git add packages/frontend/src/pages/admin/menu-config.vue
git commit -m "feat(frontend): rename menu tab + show admin sidebar preview

Menu tab now reads '菜单管理（admin 后台侧栏）' and renders
AdminSidebarPreview so admin instantly sees which sidebar items are
affected by hidden/labels settings.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: UI 元素显示折叠重组（5 个 panel → 1 个外层 MkFolder）

**Files:**
- Modify: `packages/frontend/src/pages/admin/menu-config.vue`

**Interfaces:**
- 不改变内部 5 个 panel 的 modelValue 绑定（已正确），仅改变它们在 template 中的位置

**Step 1:** 删除 👤 普通用户 MkFolder 中除"用户权限 / 设置页 / 首页模块 / 时间线 / 个人主页标签"外的所有 MkFolder 子项——这些子项都要移走。原 MkFolder 在约 L58-203。

具体：找到每个子 MkFolder 的 `<MkFolder>` 起始标签和 `</MkFolder>` 结束标签，**只删除外层 MkFolder 包装**，保留内部 panel 代码。

具体子项（按当前结构）：
- 用户功能权限 MkFolder → 保留内部 `<UniversalConfigPanel category="userPermissions">`
- 设置页 MkFolder → 保留内部
- 首页模块 MkFolder → 保留内部（自定义排序 UI）
- 时间线 MkFolder → 保留内部
- 个人主页标签 MkFolder → 保留内部

注意：原 MkFolder 内可能还有 `<template #label>` / `<template #icon>`，这些只是装饰，删除时一起删。

**Step 2:** 同样处理 🌐 所有人 MkFolder（约 L205-304）中的"导航功能"MkFolder，删除外层 MkFolder 但保留内部 UniversalConfigPanel。

**Step 3:** 在 🛠 admin 后台 MkFolder 之后、👤 普通用户 MkFolder 之前（或之后，位置不重要），新增"⚙️ UI 元素显示"MkFolder：

```vue
<MkFolder :defaultOpen="false">
	<template #label>⚙️ UI 元素显示</template>
	<template #icon><i class="ti ti-eye"></i></template>
	<template #caption>统一管理 5 个相似的开关 panel（隐藏/重命名）</template>

	<!-- 📋 普通用户侧 -->
	<div :class="$style.subGroup">
		<div :class="$style.subGroupTitle">📋 普通用户侧</div>
		<!-- 用户功能权限 -->
		<MkInfo>勾选显示/取消隐藏，点击编辑重命名。影响普通用户可用的功能模块。</MkInfo>
		<UniversalConfigPanel
			:items="userPermissionsConfigItems"
			category="userPermissions"
			:modelValue="userPermissionsModelValue"
			@update="onUserPermissionsUpdate"
		/>
		<!-- 设置页 -->
		<MkInfo>勾选显示/取消隐藏，点击编辑重命名。影响普通用户设置页中的选项。</MkInfo>
		<UniversalConfigPanel
			:items="settingsPageConfigItems"
			category="settingsPage"
			:modelValue="settingsPageModelValue"
			@update="onSettingsPageUpdate"
		/>
		<!-- 首页模块 -->
		<MkInfo>调整首页模块的显示顺序和启用状态。</MkInfo>
		<div :class="$style.sectionList">
			<!-- 排序 UI 保留 -->
		</div>
		<!-- 时间线 -->
		<MkInfo>勾选显示/取消隐藏时间线标签。</MkInfo>
		<div :class="$style.permList">
			<!-- 时间线列表保留 -->
		</div>
		<!-- 个人主页标签 -->
		<MkInfo>勾选显示/取消隐藏个人主页标签。</MkInfo>
		<div :class="$style.permList">
			<!-- 个人主页标签列表保留 -->
		</div>
	</div>

	<!-- 🌐 公共侧 -->
	<div :class="$style.subGroup">
		<div :class="$style.subGroupTitle">🌐 公共侧</div>
		<!-- 顶部导航 -->
		<MkInfo>勾选显示/取消隐藏顶部导航项。</MkInfo>
		<UniversalConfigPanel
			:items="navbarConfigItems"
			category="navbar"
			:modelValue="navbarModelValue"
			@update="onNavbarUpdate"
		/>
		<!-- 帖子操作 -->
		<MkInfo>勾选显示/取消隐藏帖子操作按钮和发帖表单字段。</MkInfo>
		<UniversalConfigPanel
			:items="postConfigItems"
			category="post"
			:modelValue="postModelValue"
			@update="onPostUpdate"
		/>
	</div>
</MkFolder>
```

注意：实际代码片段需保留原 `div class="sectionList"` / `div class="permList"` 等完整 UI，不要简化。

**Step 4:** 删除原 👤 普通用户 MkFolder 中已搬空的子 MkFolder。原 MkFolder 中所有子项都已移到 ⚙️ UI 元素显示 后，该 MkFolder 整个删除（保留 MkInfo 描述的，可以保留一段简短的"已移到下方 UI 元素显示"的引导文字，或者直接删除整个 MkFolder）。

**Step 5:** 删除原 🌐 所有人 MkFolder 中已搬空的"导航功能"子 MkFolder，保留"自定义标签"（自定义标签本期不动，保留在原位）。

**Step 6:** 添加 subGroup CSS 到 `<style lang="scss" module>` 末尾：

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

**Step 7:** 验证：grep 确认 UniversalConfigPanel 出现 5 次（在新的外层 MkFolder 内），原 MkFolder 嵌套结构已被拆掉。

```bash
grep -c "UniversalConfigPanel" packages/frontend/src/pages/admin/menu-config.vue
```

期望：5（用户权限、设置页、菜单管理、navbar、post——菜单管理仍在 🛠 admin 后台 section 中，其他 4 个在 ⚙️ UI 元素显示）。

**Step 8:** typecheck

```bash
pnpm --filter frontend typecheck 2>&1 | grep -E "menu-config" | head -10
```

期望：0 error related to menu-config。

**Step 9:** Commit

```bash
git add packages/frontend/src/pages/admin/menu-config.vue
git commit -m "refactor(frontend): collapse 5 similar switch panels into UI elements folder

The 5 visually-identical switch panels (user permissions / settings /
home sections / timeline / profile tabs / navbar / post actions) now live
under a single '⚙️ UI 元素显示' MkFolder with 普通用户侧 / 公共侧
sub-groups. Reduces visual noise from 5 large blocks to 1 collapsible
folder with clear context labels.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: 3 个 section 默认折叠 + 删空 PageWithHeader

**Files:**
- Modify: `packages/frontend/src/pages/admin/menu-config.vue`
- Modify: `packages/frontend/src/pages/admin/index.vue`
- Modify: `packages/frontend/src/pages/settings/index.vue`

**Step 1:** menu-config.vue: 👤 普通用户 MkFolder 改 `:defaultOpen="false"`，🌐 所有人 MkFolder 改 `:defaultOpen="false"`，⚙️ UI 元素显示 MkFolder 已经是 `false`。🛠 admin 后台 MkFolder 保留 `true`。

**Step 2:** menu-config.vue: 删除外层 `<PageWithHeader :tabs="headerTabs" :actions="headerActions">` 包装。当前约 L7：

```vue
<template>
<PageWithHeader :tabs="headerTabs" :actions="headerActions">
	<div class="_spacer" style="--MI_SPACER-w: 900px; ...">
		...
	</div>
</PageWithHeader>
</template>
```

改为：

```vue
<template>
<div class="_spacer" style="--MI_SPACER-w: 900px; ...">
	...
</div>
</template>
```

注意：内部所有顶级子元素都需要缩进调整 1 级，但为最小改动可以只删外层 wrapper 而保留缩进。

**Step 3:** 删除 `headerTabs` 和 `headerActions` 两个 computed（在 script setup 末尾，约 L265-267）。

```ts
const headerActions = computed(() => []);
const headerTabs = computed(() => []);
```

如果其他地方没用这两个变量，直接删除。

**Step 4:** admin/index.vue: 同样删除外层 PageWithHeader wrapper 和对应 headerTabs/headerActions computed。

**Step 5:** settings/index.vue: 同样处理。注意 settings/index.vue 内部使用 `provideMetadataReceiver` 和 `provideReactiveMetadata`，这些**必须保留**——只删 PageWithHeader chrome，不删 provide* 逻辑。

**Step 6:** 验证 typecheck 三个文件：

```bash
pnpm --filter frontend typecheck 2>&1 | grep -E "(menu-config|admin/index|settings/index)" | head -20
```

期望：0 error。

**Step 7:** 验证：grep 确认 PageWithHeader 在三个文件中已不再作为外层 wrapper：

```bash
grep -n "PageWithHeader" packages/frontend/src/pages/admin/menu-config.vue packages/frontend/src/pages/admin/index.vue packages/frontend/src/pages/settings/index.vue
```

期望：menu-config.vue 0 命中；admin/index.vue 和 settings/index.vue 可能有命中（看是否还在 page 内部用），但不应作为 root 包装。

**Step 8:** Commit

```bash
git add packages/frontend/src/pages/admin/menu-config.vue packages/frontend/src/pages/admin/index.vue packages/frontend/src/pages/settings/index.vue
git commit -m "refactor(frontend): collapse sections by default + drop empty PageWithHeader chrome

- 👤 普通用户 / 🌐 所有人 sections now defaultOpen=false (admin comes
  in seeing only 🛠 admin 后台 which is what they care about)
- Removed outer empty PageWithHeader wrappers from 3 pages since each
  already has its own sticky topBar
- Dropped unused headerTabs / headerActions computeds

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 自定义标签 — 加引导链接

**Files:**
- Modify: `packages/frontend/src/pages/admin/menu-config.vue`

**Step 1:** 在 menu-config.vue 顶部 sticky topBar（约 L11-32）的 right side 加一个文字链接。在 preview button 旁边加：

```vue
<MkA :to="'/admin/labels'" :class="$style.linkItem">
	<i class="ti ti-tag"></i>
	自定义文案
</MkA>
```

但 `/admin/labels` 路由还不存在，会 404。改为更稳的方案——加一个按钮 + 弹 toast：

**改用 toast 方案**：在 topBar 加一个按钮：

```vue
<button :class="$style.linkItem" @click="onLabelsClick">
	<i class="ti ti-tag"></i>
	自定义文案
</button>
```

并在 script 中加：

```ts
function onLabelsClick() {
	os.toast('即将到来：独立的自定义文案编辑器将在下期上线');
}
```

`os.toast` 在项目里已是全局可用。

**Step 2:** 添加 linkItem CSS：

```scss
.linkItem {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 7px 12px;
	font-size: 13px;
	border-radius: 8px;
	background: transparent;
	border: 1px solid var(--MI_THEME-divider);
	color: var(--MI_THEME-fg);
	cursor: pointer;
	transition: background 0.15s, border-color 0.15s;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
		border-color: var(--MI_THEME-accent);
	}

	i {
		font-size: 14px;
		color: var(--MI_THEME-fgTransparentWeak);
	}
}
```

**Step 3:** 验证 typecheck：

```bash
pnpm --filter frontend typecheck 2>&1 | grep -E "menu-config" | head -5
```

期望：0 error。

**Step 4:** Commit

```bash
git add packages/frontend/src/pages/admin/menu-config.vue
git commit -m "feat(frontend): add 自定义文案 link with placeholder toast

Adds a button in menu-config topBar pointing to the future 自定义文案
editor. Currently shows a 'coming soon' toast. Full implementation
deferred to next iteration.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: 更新 CHANGELOG + 全量构建 + 验证

**Files:**
- Modify: `CHANGELOG.md`

**Step 1:** 在 `## Unreleased` → `### Client` 下加 3 条：

```markdown
- Refactor: admin 界面控制页面重组，删除登录页假控件、菜单管理加 SVG 侧栏示意图、5 个相似开关 panel 折叠为单一 folder
- Refactor: admin/overview 等 3 个页面删除空 PageWithHeader chrome，section 改默认折叠
- Feat: 新增 AdminSidebarPreview 组件用于直观展示 admin 后台侧栏配置
```

**Step 2:** Commit CHANGELOG：

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): menu-config 清理与重组

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

**Step 3:** 全量构建：

```bash
pnpm build 2>&1 | tail -30
```

期望：`built in XX.XXs`，无 error。

**Step 4:** 重启后端：

```bash
powershell -Command "Start-Process powershell -ArgumentList '-NoProfile', '-Command', 'cd C:\\CGweimi\\cgvmi-server\\built; node packages\\backend\\built\\index.js' -WindowStyle Hidden"
```

**Step 5:** HTTP 200 验证：

```bash
curl -s -o /dev/null -w "%{http_code}" https://www.cgvmi.com/admin/menu-config
```

期望：200 或 302（重定向到登录页）。

**Step 6:** 浏览器手动验证三场景：

| 场景 | 期望 |
|------|------|
| 打开 /admin/menu-config | 首屏只看到 🛠 admin 后台（展开）+ ⚙️ UI 元素显示（折叠） |
| 菜单管理 MkFolder | 标题含 "admin 后台侧栏"，顶部有 SVG 侧栏预览 |
| 展开 ⚙️ UI 元素显示 | 看到 "📋 普通用户侧" + "🌐 公共侧" 子分组，5 个 panel 都在 |
| 点 自定义文案 按钮 | 弹 toast "即将到来" |
| 切换 preview 模式 | 仍正常工作（路由守卫 + iAmAdmin 不变） |

**Step 7:** 写交付文档到 Obsidian：

文件路径：`C:\CGweimi\obsidian\AI知识库\07-AI协作中心\对话记录\2026-06-26-menu-config清理与重组交付.md`

内容包含：
- 任务背景（扬总反馈的 3 个问题）
- 实施 6 个 task 的核心改动
- 验证结果（typecheck / build / 烟测）
- 文件变更清单（git log --stat）
- 偏好洞察（最小依赖 + 删除 vs 标记 + section 默认折叠）

---

## Self-Review

**1. Spec 覆盖检查**：

- Part 1（删除登录页 section）→ Task 1 ✓
- Part 2（菜单管理 tab 改名 + SVG）→ Task 2 + Task 3 ✓
- Part 3（UI 元素显示折叠重组）→ Task 4 ✓
- Part 4（3 个 section 默认折叠）→ Task 5 ✓
- Part 5（删空 PageWithHeader）→ Task 5 ✓
- Part 6（自定义标签引导链接）→ Task 6 ✓
- CHANGELOG + 验证 → Task 7 ✓

**2. Placeholder 扫描**：

- Task 4 Step 3 中"<!-- 排序 UI 保留 -->"和"<!-- 时间线列表保留 -->"是占位提示，不是 placeholder——实际 copy 时从原 menu-config.vue 完整迁移现有代码即可。
- 无 TBD / TODO / "implement later"。

**3. 类型一致性**：

- `hiddenAdminMenu: Ref<string[]>` 在 Task 3 和原 script 中都用，未变。
- `adminMenuLabels: Ref<Record<string, string>>` 同上。
- `UniversalConfigPanel` props：`:items`、`category`、`:modelValue`、`@update` 在 Task 4 与原 binding 一致。
- `AdminSidebarPreview` props: `hidden?: string[]`, `labels?: Record<string, string>` 在 Task 2 定义，Task 3 调用时与 hiddenAdminMenu / adminMenuLabels 类型完全匹配。
- `onNavbarUpdate` / `onPostUpdate` / `onSettingsPageUpdate` / `onUserPermissionsUpdate` 等 callback 函数签名未变。

**4. Commit 频率**：7 个 task = 7+ 个独立 commit，每个 commit 单一目的，符合 DRY/小颗粒度原则。

**5. 范围检查**：本期只动 frontend，无 backend schema 变更，无需 migration。