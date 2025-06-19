import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 注册用户
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingEmail) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }
    
    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });
    
    if (existingUsername) {
      return res.status(400).json({ error: '该用户名已被使用' });
    }
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword
      }
    });
    
    // 生成 JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // 返回用户信息和令牌（不包含密码）
    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      },
      token
    });
  } catch (error) {
    console.error('注册用户失败:', error);
    res.status(500).json({ error: '注册用户失败' });
  }
};

// 用户登录
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    // 查找用户（根据用户名或邮箱）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username || '' },
          { email: email || '' }
        ]
      }
    });
    
    if (!user) {
      return res.status(400).json({ error: '用户不存在' });
    }
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(400).json({ error: '密码不正确' });
    }
    
    // 生成 JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // 返回用户信息和令牌（不包含密码）
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      },
      token
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
};

// 获取当前用户信息
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // @ts-ignore 这里需要通过中间件设置req.user
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        createdAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
};

// 获取用户收藏列表
export const getUserFavorites = async (req: Request, res: Response) => {
  try {
    // @ts-ignore 这里需要通过中间件设置req.user
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true
          }
        }
      }
    });
    
    res.json(favorites);
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    res.status(500).json({ error: '获取收藏列表失败' });
  }
};

// 添加收藏
export const addToFavorite = async (req: Request, res: Response) => {
  try {
    // @ts-ignore 这里需要通过中间件设置req.user
    const userId = req.user?.id;
    const { productId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    
    // 检查产品是否存在
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) }
    });
    
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }
    
    // 检查是否已收藏
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      }
    });
    
    if (existingFavorite) {
      return res.status(400).json({ error: '已经收藏过该产品' });
    }
    
    // 添加收藏
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        productId: Number(productId)
      }
    });
    
    res.status(201).json(favorite);
  } catch (error) {
    console.error('添加收藏失败:', error);
    res.status(500).json({ error: '添加收藏失败' });
  }
};

// 取消收藏
export const removeFromFavorite = async (req: Request, res: Response) => {
  try {
    // @ts-ignore 这里需要通过中间件设置req.user
    const userId = req.user?.id;
    const { productId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    
    // 删除收藏
    await prisma.favorite.delete({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      }
    });
    
    res.json({ message: '已取消收藏' });
  } catch (error) {
    console.error('取消收藏失败:', error);
    res.status(500).json({ error: '取消收藏失败' });
  }
}; 