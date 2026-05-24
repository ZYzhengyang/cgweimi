# 🎯 竞品优势 & 可复用源码目录

> 大脑每轮巡逻时读此文件，自动识别可融合的竞品功能并生成任务。

## 📂 参考源码仓库（可直接搬运）

| 目录 | 类型 | 可搬内容 |
|------|------|---------|
| `C:\CGweimi\munia\` | Next.js社交平台 | Post/Comment/Follow/Activity Prisma模型, 动态卡片, 评论框, 用户主页 |
| `C:\CGweimi\reference\DwellScan\` | Next.js+Prisma+Tailwind | 房源搜索/筛选UI, 地图集成, 图片轮播 |
| `C:\CGweimi\reference\the-print-forge\` | Next.js 3D打印商城 | 产品定制UI, 文件上传预览, 购物车流程 |
| `C:\CGweimi\reference\prosets-marketplace\` | 市场平台(仅README) | 付费模式参考 |
| `C:\CGweimi\reference\wedding-lp\` | Vite+React落地页 | 动画效果, 视差滚动, 响应式布局 |

## 🔬 已融入CG微米的竞品设计

| 竞品 | 融入内容 | 状态 |
|------|---------|------|
| Sketchfab | 3D查看器最大化+全屏+工具栏, 圆角科技感UI, 搜索框嵌入Hero | ✅ |
| ArtStation | 极简标题排版, 暗色沉浸卡片, 用户主页大封面+瀑布流 | ✅ |
| Behance | 白色主题, CSS瀑布流, 纯白卡片+Behance蓝, Footer设计 | ✅ |
| Unity Asset Store | 克制专业配色(午夜蓝主题) | ✅ |
| BAYC | 暗金配色, 3D流体背景, 金色渐变 | ✅ |
| Misskey | Widget式用户主页, emoji回应, 通知分类Tab | ⏳ 部分 |

## 💡 尚未融合的竞品优点（大脑自动生成任务）

1. **微博/小红书** — 话题标签系统、热门推荐算法、图文混排
2. **抖音/TikTok** — 短视频Feed、全屏沉浸滑动、算法推荐
3. **Patreon/Buy Me a Coffee** — 创作者会员层级、打赏、专属内容解锁
4. **Discogs** — 收藏管理、版本对比、社区评分
5. **CGTrader/TurboSquid** — 授权级别(个人/商业/扩展)、3D预览水印
6. **Pixiv** — 标签聚合页、排行榜、R18分级
7. **Instagram** — Stories快拍、滤镜、探索页
8. **DwellScan源码** — 高级搜索筛选UI、图片画廊轮播

## 🤖 大脑自驱动规则

1. 每N轮读此文件
2. 对照参考源码，找可直接搬运的组件/功能
3. 在BRAIN.md自动生成融合任务：`🟢 搬运: {来源} → {目标功能}`
4. 简单组件搬运→cronjob工人，复杂重构→Claude
5. 搬运完更新此文件状态
