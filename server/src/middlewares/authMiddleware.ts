import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';

// 用户请求对象的扩展接口
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        isAdmin: boolean;
      };
    }
  }
}

// 认证中间件
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 获取 token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN格式
    
    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }
    
    // 验证 token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      isAdmin: boolean;
    };
    
    // 查询用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    
    // 在请求对象上设置用户信息
    req.user = {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin
    };
    
    next();
  } catch (error) {
    console.error('身份验证失败:', error);
    res.status(401).json({ error: '无效的认证令牌' });
  }
};

// 管理员权限中间件
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: '需要管理员权限' });
  }
}; 