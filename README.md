# 3D资源市场平台

一个完整的3D资源交易平台，包含用户端、管理端和后端API。

## 项目结构

- `/web` - 用户前端（Next.js）
- `/admin` - 管理后台（Next.js）
- `/server` - 后端API服务（Express + Prisma + TypeScript）

## 功能特点

### 用户端功能

- 首页资源展示
- 分类浏览
- 搜索功能
- 商品详情页
- 3D资源预览
- 用户注册/登录
- 用户中心
- 收藏功能
- 订单与支付
- 资源下载

### 管理端功能

- 管理员登录
- 产品管理
- 标签与分类管理
- 订单管理
- 用户管理
- 数据统计

### API服务

- 用户认证
- 产品管理
- 订单处理
- 支付集成
- 下载管理

## 技术栈

- **前端**：Next.js、React、Tailwind CSS
- **后端**：Express、TypeScript、Prisma ORM
- **数据库**：SQL Server
- **认证**：JWT
- **文件存储**：本地存储/云存储

## 安装说明

### 前端（用户端和管理端）

```bash
# 用户端
cd web
npm install
npm run dev

# 管理端
cd admin
npm install
npm run dev
```

### 后端

```bash
# 安装依赖
cd server
npm install

# 设置环境变量
# 复制.env.example为.env并配置

# 初始化数据库
npm run prisma:generate
npm run prisma:migrate

# 启动开发服务器
npm run dev
```

## 部署指南

详细的部署文档将在项目完成后提供。

## 项目状态

开发中 - 初始阶段

## 许可证

MIT 