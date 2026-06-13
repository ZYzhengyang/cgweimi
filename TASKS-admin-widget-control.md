# P4-30 管理后台完善（4 个模块）

**目标**：补齐管理后台缺失的功能，让 ADMIN 能完全控制普通用户的一切行为。

---

## 模块 A：Widget 权限控制（核心）

**问题**：用户可通过"编辑小工具"添加管理员无法控制的 widget，`serverMetric`/`jobQueue` 暴露服务器敏感信息给所有用户。

### T1: 后端 Meta 实体加 `hiddenWidgets` 字段

**文件**: `packages/backend/src/models/Meta.ts`

- 在 `Meta` class 中加 `hiddenWidgets` column（`simple-array` 类型，默认空数组）
- 类型：`string[]`，存储被管理员隐藏的 widget 名称

```ts
@Column('simple-array', { default: [] })
public hiddenWidgets: string[];
```

### T2: 创建 Migration

- 文件名格式: `{unixMs}-addHiddenWidgets.js`
- `up`: `ALTER TABLE "meta" ADD "hiddenWidgets" text NOT NULL DEFAULT ''`
- `down`: `ALTER TABLE "meta" DROP COLUMN "hiddenWidgets"`
- 运行 `pnpm --filter backend check-migrations` 验证

### T3: Admin API 端点 — 获取/更新 hiddenWidgets

**新建文件**: `packages/backend/src/server/api/endpoints/admin/meta.ts`（如已存在则追加字段）

- GET: 返回 `hiddenWidgets` 数组
- POST/UPDATE: 接收 `hiddenWidgets` 参数，更新 Meta
- 需要 `kind: 'read:admin:meta'` / `'write:admin:meta'` 权限
- paramDef 定义 `hiddenWidgets` 为 `{ type: 'array', items: { type: 'string' } }`

**参考**: `packages/backend/src/server/api/endpoints/admin/meta.ts` 的现有结构

### T4: 公开 meta 接口返回 hiddenWidgets

**文件**: `packages/backend/src/server/api/endpoints/meta.ts`

- 在响应 schema 中加 `hiddenWidgets` 字段
- 值来自 `instanceMeta.hiddenWidgets`

### T5: 前端 widget 列表过滤

**文件**: `packages/frontend/src/components/MkWidgets.vue`

- 读取 `instance`（或 `useInstanceMeta()`）中的 `hiddenWidgets`
- 过滤 `_widgetDefs` 数组，排除在 `hiddenWidgets` 中的 widget
- 效果：admin 隐藏的 widget 不会出现在用户的"添加小工具"下拉框中

### T6: 前端 widget 渲染过滤

**文件**: `packages/frontend/src/ui/_common_/widgets.vue`

- 在渲染已有 widget 列表时，也检查 `hiddenWidgets`
- 如果某个 widget 已被 admin 隐藏，跳过渲染（或显示"此小工具已被管理员禁用"）

### T7: serverMetric / jobQueue 默认仅限 admin/mod

**文件**: `packages/frontend/src/components/MkWidgets.vue`

- 在 widget 列表过滤逻辑中，增加角色检查：
  - `serverMetric` 和 `jobQueue` 仅当用户是 admin 或 moderator 时才显示
  - 可复用 `$i.isAdmin || $i.isModerator` 判断

### T8: 流式通道加权限校验

**文件**:
- `packages/backend/src/server/api/stream/channels/server-stats.ts`
- `packages/backend/src/server/api/stream/channels/queue-stats.ts`

- 将 `requireCredential` 改为 `true`
- 添加 `kind: 'read:admin:stream'`（或新建 `read:server:stats` kind）
- 确保只有 admin/mod 能订阅这些通道

### T9: 管理后台 UI — Widget 管理页面

**文件**: `packages/frontend/src/pages/admin/settings.vue`（或新建独立页面）

- 在管理后台加一个"小工具管理"区域
- 列出所有可用 widget（25 + 2 federation）
- 每个 widget 一个开关（checkbox），控制是否对普通用户隐藏
- 保存时调用 T3 的 admin API

### T10: endpoint-list.ts 注册 + misskey-js 再生成

- `packages/backend/src/server/api/endpoint-list.ts` 注册新端点（如有新文件）
- `pnpm build-misskey-js-with-types` 重新生成类型

### T11: CHANGELOG 更新

**文件**: `CHANGELOG.md`

```markdown
### Server
- Feat: 管理后台新增小工具权限控制，可隐藏对普通用户可见的小工具

### Client
- Feat: 管理后台新增小工具管理页面
- Fix: serverMetric / jobQueue 小工具仅限管理员和版主使用
```

---

## 执行顺序

```
T1 → T2 → T3 → T4 → T10 → T5 → T6 → T7 → T8 → T9 → T11
 后端基础    →   API层   →   前端过滤   →   UI  →   完成
```

## 验证

1. `pnpm --filter backend check-migrations` — migration 无问题
2. `pnpm lint` — 全量 typecheck + eslint 通过
3. 手动测试：
   - 普通用户登录 → 编辑小工具 → 不应看到 serverMetric/jobQueue
   - Admin 登录 → 管理后台 → 小工具管理 → 隐藏某个 widget
   - 普通用户刷新 → 该 widget 从下拉框消失
