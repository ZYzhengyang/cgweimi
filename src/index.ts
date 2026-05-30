import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// 导入路由
import commentRoutes from './routes/commentRoutes';
import followRoutes from './routes/followRoutes';
import memberRoutes from './routes/memberRoutes';
import productRoutes from './routes/productRoutes';

// 加载环境变量
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 挂载路由
app.use('/api/comments', commentRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/products', productRoutes);

// 基本路由
app.get('/', (_req, res) => {
  res.json({ message: '欢迎使用CG微米API', version: '1.0.0' });
});

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});