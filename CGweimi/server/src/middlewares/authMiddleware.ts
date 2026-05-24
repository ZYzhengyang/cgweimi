import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 扩展Express Request类型
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    username: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '未提供认证令牌' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'default-secret';
    const decoded = jwt.verify(token, secret) as {
      userId: number;
      email: string;
      username: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: '认证令牌无效或已过期' });
  }
};

// 可选的认证中间件 — 不强制要求登录，但如果有token就解析
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'default-secret';
      const decoded = jwt.verify(token, secret) as {
        userId: number;
        email: string;
        username: string;
      };
      req.user = decoded;
    }
  } catch {
    // token无效也继续，当作未登录
  }
  next();
};
