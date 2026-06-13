# P4-31 管理后台快捷键管理

**目标**：管理员可以在后台配置和管理全局快捷键，控制用户可用的快捷键行为。

---

## 模块 A：后端 — 快捷键配置存储

### T1: Meta 实体加 `hotkeyConfig` 字段

**文件**: `packages/backend/src/models/Meta.ts`

- 在 Meta class 中加 `hotkeyConfig` column（`jsonb` 类型，默认空对象）
- 类型: `Record<string, { enabled: boolean, key: string, description?: string }>`
- 存储每个快捷键的配置（是否启用、按键绑定、描述）

```ts
@Column('jsonb', { default: {} })
public hotkeyConfig: Record<string, { enabled: boolean; key: string; description?: string }>;
```

### T2: 创建 Migration

- 文件名格式: `{unixMs}-addHotkeyConfig.js`
- `up`: `ALTER TABLE "meta" ADD "hotkeyConfig" jsonb NOT NULL DEFAULT '{}'`
- `down`: `ALTER TABLE "meta" DROP COLUMN "hotkeyConfig"`
- 运行 `pnpm --filter backend check-migrations` 验证

### T3: Admin API 端点 — 获取/更新 hotkeyConfig

**文件**: `packages/backend/src/server/api/endpoints/admin/update-meta.ts`

- 在 paramDef 中加 `hotkeyConfig` 字段（`type: 'object'`）
- 在 handler 中处理更新逻辑

**文件**: `packages/backend/src/server/api/endpoints/admin/meta.ts`

- 在响应 schema 中加 `hotkeyConfig` 字段

### T4: 公开 meta 接口返回 hotkeyConfig

**文件**: `packages/backend/src/server/api/endpoints/meta.ts`

- 在响应 schema 中加 `hotkeyConfig` 字段
- 值来自 `instanceMeta.hotkeyConfig`

### T5: json-schema 更新

**文件**: `packages/backend/src/models/json-schema/meta.ts`

- 在 `packedMetaDetailedOnlySchema` 中加 `hotkeyConfig` 字段定义

### T6: MetaEntityService 更新

**文件**: `packages/backend/src/core/entities/MetaEntityService.ts`

- 在 `packDetailed()` 中返回 `hotkeyConfig`

---

## 模块 B：前端 — 快捷键配置系统

### T7: 定义默认快捷键配置

**文件**: `packages/frontend/src/utility/hotkey.ts`（或新建 `hotkey-defaults.ts`）

- 定义所有可用快捷键的默认配置
- 包含：key、enabled、category、description、i18n key

```ts
export const DEFAULT_HOTKEY_CONFIG = {
  // 全局
  'global.newPost': { enabled: true, key: 'p|n', category: 'global', description: '打开发帖框' },
  'global.darkMode': { enabled: true, key: 'd', category: 'global', description: '切换暗色模式' },
  'global.search': { enabled: true, key: 's', category: 'global', description: '搜索' },
  
  // 帖子
  'note.reply': { enabled: true, key: 'r', category: 'note', description: '回复' },
  'note.react': { enabled: true, key: 'e|a|+', category: 'note', description: '表情反应' },
  'note.renote': { enabled: true, key: 'q', category: 'note', description: '转发' },
  'note.menu': { enabled: true, key: 'm', category: 'note', description: '菜单' },
  'note.clip': { enabled: true, key: 'c', category: 'note', description: '收藏' },
  'note.gallery': { enabled: true, key: 'o', category: 'note', description: '媒体画廊' },
  'note.toggleCw': { enabled: true, key: 'v|enter', category: 'note', description: '展开/折叠' },
  'note.prev': { enabled: true, key: 'up|k|shift+tab', category: 'note', description: '上一条' },
  'note.next': { enabled: true, key: 'down|j|tab', category: 'note', description: '下一条' },
  
  // 视频
  'video.playPause': { enabled: true, key: 'space', category: 'video', description: '播放/暂停' },
  'video.mute': { enabled: true, key: 'm', category: 'video', description: '静音' },
  'video.fullscreen': { enabled: true, key: 'f', category: 'video', description: '全屏' },
  'video.help': { enabled: true, key: '?', category: 'video', description: '快捷键帮助' },
  
  // 媒体播放器
  'media.playPause': { enabled: true, key: 'space', category: 'media', description: '播放/暂停' },
  'media.volumeUp': { enabled: true, key: 'up', category: 'media', description: '音量+' },
  'media.volumeDown': { enabled: true, key: 'down', category: 'media', description: '音量-' },
  'media.seekBack': { enabled: true, key: 'left', category: 'media', description: '快退5秒' },
  'media.seekForward': { enabled: true, key: 'right', category: 'media', description: '快进5秒' },
  
  // 发帖
  'post.submit': { enabled: true, key: 'ctrl+enter', category: 'post', description: '发送帖子' },
  
  // 聊天
  'chat.send': { enabled: true, key: 'enter', category: 'chat', description: '发送消息' },
};
```

### T8: 修改 hotkey.ts 读取配置

**文件**: `packages/frontend/src/utility/hotkey.ts`

- 启动时从 `instance.hotkeyConfig` 读取管理员配置
- 与默认配置合并（管理员配置优先）
- 如果某个快捷键被管理员禁用（`enabled: false`），跳过绑定

### T9: 修改各组件使用配置化的快捷键

**文件**: 涉及所有使用 `v-hotkey` 的组件

- `MkNote.vue` — 帖子快捷键
- `MkNoteDetailed.vue` — 帖子详情快捷键
- `CGVideoFeed.vue` — 视频快捷键
- `main-boot.ts` — 全局快捷键
- `MkPostForm.vue` — 发帖快捷键
- `chat/room.form.vue` — 聊天快捷键

改为从配置系统读取，而不是硬编码。

---

## 模块 C：管理后台 UI

### T10: 管理后台 — 快捷键管理页面

**文件**: `packages/frontend/src/pages/admin/settings.vue`（或新建独立页面）

- 在管理后台加一个"快捷键管理" Tab
- 按分类展示所有快捷键（全局、帖子、视频、媒体、发帖、聊天）
- 每个快捷键显示：
  - 当前按键绑定（可编辑）
  - 启用/禁用开关
  - 描述说明
- 保存时调用 `admin/update-meta` API

### T11: 前端 — 用户快捷键帮助页面

**文件**: 新建 `packages/frontend/src/pages/hotkeys.vue`

- 用户可查看当前生效的所有快捷键
- 按分类展示，带搜索功能
- 路由: `/hotkeys` 或集成到设置页面

### T12: 路由注册

**文件**: `packages/frontend/src/router.definition.ts`

- 注册 `/hotkeys` 路由（如果独立页面）

---

## 模块 D：收尾

### T13: endpoint-list.ts 注册 + misskey-js 再生成

- 如有新端点文件，注册到 `endpoint-list.ts`
- `pnpm build-misskey-js-with-types` 重新生成类型

### T14: CHANGELOG 更新

**文件**: `CHANGELOG.md`

```markdown
### Server
- Feat: 管理后台新增快捷键配置功能，可自定义全局快捷键绑定

### Client
- Feat: 管理后台新增快捷键管理页面
- Feat: 新增快捷键帮助页面，用户可查看所有可用快捷键
```

---

## 执行顺序

```
T1 → T2 → T3 → T4 → T5 → T6 → T13 → T7 → T8 → T9 → T10 → T11 → T12 → T14
 后端基础      →   API层   →   前端配置系统   →   管理UI   →   用户UI   →   完成
```

## 验证

1. `pnpm --filter backend check-migrations` — migration 无问题
2. `pnpm lint` — 全量 typecheck + eslint 通过
3. 手动测试：
   - Admin 登录 → 管理后台 → 快捷键管理 → 禁用某个快捷键
   - 普通用户刷新 → 该快捷键不再生效
   - Admin 修改按键绑定 → 普通用户使用新按键
   - 用户访问快捷键帮助页面 → 查看所有生效的快捷键

## 注意事项

- SPDX 文件头必须添加（AGPL-3.0-only）
- Migration 文件名格式: `{unixMs}-addHotkeyConfig.js`
- 遵循现有代码风格和命名规范
- 快捷键配置使用 JSONB 存储，便于扩展
- 前端读取配置后与默认值合并，确保向后兼容
