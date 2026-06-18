# T9 内容审核队列 - 设计文档

## 概述

在管理后台新建内容审核中心页面，让管理员可以审核搬运的内容。

## 数据模型

### 待审内容来源
- **搬运内容 (ScrapedContent)**：`published=false` 为待审内容
- 复用现有 `ModerationLog` 记录审核操作

### 审核状态
- `pending` - 待审核（ScrapedContent.published = false, errorMessage = null）
- `approved` - 已通过（ScrapedContent.published = true）
- `rejected` - 已拒绝（ScrapedContent.errorMessage = 'rejected'）

## API 设计

### 新增端点

#### 1. `admin/scraping/approve` - 审核通过
- **请求参数**：
  - `id: string | string[]` - 单个或多个待审内容 ID
- **响应**：更新 ScrapedContent.published = true
- **副作用**：记录 moderation log

#### 2. `admin/scraping/reject` - 审核拒绝
- **请求参数**：
  - `id: string | string[]` - 单个或多个待审内容 ID
- **响应**：更新 ScrapedContent.errorMessage = 'rejected'
- **副作用**：记录 moderation log

#### 3. `admin/scraping/list` - 扩展
- 现有端点扩展 `status` 参数：`pending | approved | rejected`

## 前端页面

### 路径
- `/admin/moderation-queue`

### 布局
```
┌─────────────────────────────────────────┐
│ 内容审核中心                              │
├─────────────────────────────────────────┤
│ [待审核] [已通过] [已拒绝]                │  ← Tab 切换
├─────────────────────────────────────────┤
│ 筛选: [全部▼] [来源▼]                    │
├─────────────────────────────────────────┤
│ ☐ 全选                                  │  ← 批量操作栏
│ [批量通过] [批量拒绝]                     │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ ☐ [Cara] @author                   │ │
│ │     内容预览...                      │ │
│ │     标签: #tag1 #tag2               │ │
│ │     2024-01-01 12:00              │ │
│ │     [通过] [拒绝]                   │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ☐ [YouTube] @author                │ │
│ │     ...                             │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 筛选选项
- **Tab**: 待审核 / 已通过 / 已拒绝
- **来源**: 全部 / Cara / YouTube / ArtStation

### 功能
1. **单个操作**：通过 / 拒绝按钮
2. **批量操作**：勾选多条 → 批量通过 / 批量拒绝
3. **全选**：选中当前页所有项
4. **分页**：加载更多

## 实现计划

### Phase 1: 后端 API
1. 新增 `admin/scraping/approve.ts`
2. 新增 `admin/scraping/reject.ts`
3. 注册到 `endpoint-list.ts`
4. 注册到 `EndpointsModule`

### Phase 2: 前端页面
1. 新建 `moderation-queue.vue`
2. 实现 Tab 切换
3. 实现筛选功能
4. 实现列表展示
5. 实现单个操作
6. 实现批量操作
7. 添加到管理菜单

## 参考代码
- `packages/frontend/src/pages/admin/scraper.vue` - 搬运管理页面
- `packages/frontend/src/pages/admin/abuses.vue` - 举报管理页面（分页模式）
- `packages/backend/src/server/api/endpoints/admin/scraping/list.ts` - 列表 API
