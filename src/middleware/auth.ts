import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 扩展Express Request类型以包含user信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username?: string;
        role?: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * JWT鉴权中间件
 * 验证请求头中的Bearer token
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username?: string;
      role?: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'token无效或已过期' });
  }
}

/**
 * 管理员鉴权中间件
 * 需要先通过authMiddleware，然后检查role是否为admin
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: '未认证' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  next();
}