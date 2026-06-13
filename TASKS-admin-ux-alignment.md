# P4-32 管理员体验对齐普通用户

**目标**：管理员浏览普通页面时，看到的界面和普通用户完全一致。所有管理功能只在 `/admin` 后台可用。管理员的个性化设置按普通用户默认值。

---

## 模块 A：Widget 权限控制调整（基于已提交的 P4-30）

### T1: 移除普通 UI 中的 adminOnlyWidgets 过滤

**文件**: `packages/frontend/src/components/MkWidgets.vue`

- 移除 `iAmModerator` 角色检查逻辑
- `serverMetric` 和 `jobQueue` 对所有用户（包括 admin/mod）隐藏
- 效果：admin 在普通页面看到的 widget 列表和普通用户完全一致

### T2: 移除 widgets/index.ts 中的 adminOnlyWidgets 常量

**文件**: `packages/frontend/src/widgets/index.ts`

- 删除 `adminOnlyWidgets = ['serverMetric', 'jobQueue']`
- 将这两个 widget 从 `widgets` 数组中移除（彻底不在普通 UI 中出现）

### T3: 管理后台展示 serverMetric/jobQueue 数据

**文件**: `packages/frontend/src/pages/admin/overview.vue`（或 performance.vue）

- 在管理后台的仪表盘/性能页面中，嵌入 serverMetric 和 jobQueue 的数据展示
- 复用现有的 widget 组件，但只在后台页面中渲染
- 效果：admin 在后台查看服务器状态，普通页面中看不到

### T4: 流式通道权限保持

**文件**:
- `packages/backend/src/server/api/stream/channels/server-stats.ts`
- `packages/backend/src/server/api/stream/channels/queue-stats.ts`

- 保持 `requireCredential: true` 和 `kind: 'read:admin:stream'`
- 这些数据只在后台页面中使用，普通页面不需要

---

## 模块 B：管理员个性化同步

### T5: 管理员默认 widget 配置

**文件**: `packages/frontend/src/preferences/def.ts`

- 管理员账号的默认 widget 配置 = 普通用户默认值
- 不因为 `isAdmin`/`isModerator` 而添加额外 widget
- 确保新注册的管理员账号看到的默认布局和普通用户一致

### T6: 管理员主题/布局同步

**文件**: 检查所有使用 `isAdmin`/`isModerator` 的地方

- 搜索 `packages/frontend/src/` 中所有 `isAdmin`、`isModerator`、`iAmModerator` 的使用
- 评估每个分支是否应该在普通页面中存在
- 只保留后台页面（`/admin/*`）中的 admin 角色检查
- 普通页面中的 admin 分支全部移除或改为普通用户行为

### T7: 管理员快捷键配置同步

**文件**: `packages/frontend/src/utility/hotkey.ts`（基于 P4-31）

- 管理员在后台配置的快捷键，对所有用户生效
- 管理员自己浏览普通页面时，也使用普通用户的快捷键配置
- 不因为是管理员而有额外的快捷键

---

## 模块 C：管理后台功能收拢

### T8: 管理后台 — 服务器状态面板

**文件**: `packages/frontend/src/pages/admin/overview.vue`

- 将 serverMetric 的数据展示集成到管理后台仪表盘
- CPU、内存、网络、磁盘使用率图表
- 复用 `WidgetServerMetric.vue` 的渲染逻辑

### T9: 管理后台 — 队列状态面板

**文件**: `packages/frontend/src/pages/admin/overview.vue`

- 将 jobQueue 的数据展示集成到管理后台仪表盘
- Inbox/Deliver 队列统计
- 复用 `WidgetJobQueue.vue` 的渲染逻辑

### T10: 管理后台 — 快捷键管理（整合 P4-31）

**文件**: `packages/frontend/src/pages/admin/settings.vue`

- 快捷键管理 Tab（P4-31 的 T10）
- 管理员在此配置全局快捷键
- 配置对所有用户生效，包括管理员自己

---

## 模块 D：收尾

### T11: 全面检查 admin 分支

**检查清单**:
- [ ] `MkWidgets.vue` — 无 admin 分支
- [ ] `widgets/index.ts` — 无 adminOnlyWidgets
- [ ] `main-boot.ts` — 无 admin 专属快捷键
- [ ] `MkNote.vue` — 无 admin 专属功能
- [ ] `CGVideoFeed.vue` — 无 admin 专属功能
- [ ] `preferences/def.ts` — 无 admin 专属默认值
- [ ] 其他组件 — 无散落的 admin 分支

### T12: CHANGELOG 更新

**文件**: `CHANGELOG.md`

```markdown
### Client
- Fix: 管理员浏览普通页面时界面与普通用户完全一致
- Enhance: 管理后台仪表盘集成服务器状态和队列状态展示
```

---

## 执行顺序

```
模块 A (T1-T4) → 模块 B (T5-T7) → 模块 C (T8-T10) → 模块 D (T11-T12)
 Widget调整      → 个性化同步      → 后台功能收拢     → 检查+收尾
```

## 验证

1. `pnpm lint` — 全量 typecheck + eslint 通过
2. 手动测试：
   - 管理员登录 → 浏览普通页面 → 看到的界面和普通用户完全一致
   - 管理员进入 `/admin` → 看到服务器状态、队列状态、快捷键管理
   - 普通用户登录 → 看不到 serverMetric/jobQueue，看不到管理功能
   - 管理员修改快捷键配置 → 普通用户和管理员都使用新配置

## 设计原则

- **普通页面 = 用户视角**：管理员看到的就是用户看到的
- **管理功能 = 后台专属**：所有 admin 功能收进 `/admin`
- **配置全局生效**：管理员的配置对所有用户生效，包括自己
