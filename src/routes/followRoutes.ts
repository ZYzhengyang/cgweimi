import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/follows/:userId/follow
 * 关注用户（需要登录）
 */
router.post('/:userId/follow', authMiddleware, async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.userId;

    if (!req.user?.id) {
      return res.status(401).json({ error: '未认证' });
    }

    if (req.user.id === targetUserId) {
      return res.status(400).json({ error: '不能关注自己' });
    }

    // 验证目标用户存在
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 检查是否已关注
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: req.user.id,
          followingId: targetUserId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: '已关注该用户' });
    }

    const follow = await prisma.follow.create({
      data: {
        followerId: req.user.id,
        followingId: targetUserId,
      },
    });

    // 记录活动
    await prisma.activity.create({
      data: {
        type: 'CREATE_FOLLOW',
        sourceId: follow.id,
        sourceUserId: req.user.id,
        targetUserId,
      },
    });

    res.json({ followed: true });
  } catch (error) {
    console.error('关注失败:', error);
    res.status(500).json({ error: '关注失败' });
  }
});

/**
 * DELETE /api/follows/:userId/unfollow
 * 取消关注（需要登录）
 */
router.delete('/:userId/unfollow', authMiddleware, async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.userId;

    if (!req.user?.id) {
      return res.status(401).json({ error: '未认证' });
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: req.user.id,
          followingId: targetUserId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: '未关注该用户' });
    }

    // 删除活动记录
    await prisma.activity.deleteMany({
      where: {
        type: 'CREATE_FOLLOW',
        sourceUserId: req.user.id,
        targetUserId,
      },
    });

    await prisma.follow.delete({ where: { id: existing.id } });

    res.json({ unfollowed: true });
  } catch (error) {
    console.error('取消关注失败:', error);
    res.status(500).json({ error: '取消关注失败' });
  }
});

/**
 * GET /api/follows/:userId/followers
 * 获取用户的粉丝列表
 */
router.get('/:userId/followers', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: { id: true, username: true, name: true, profilePhoto: true },
          },
        },
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      prisma.follow.count({ where: { followingId: userId } }),
    ]);

    res.json({
      data: followers.map((f) => f.follower),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('获取粉丝列表失败:', error);
    res.status(500).json({ error: '获取粉丝列表失败' });
  }
});

/**
 * GET /api/follows/:userId/following
 * 获取用户的关注列表
 */
router.get('/:userId/following', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: { id: true, username: true, name: true, profilePhoto: true },
          },
        },
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    res.json({
      data: following.map((f) => f.following),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('获取关注列表失败:', error);
    res.status(500).json({ error: '获取关注列表失败' });
  }
});

export default router;