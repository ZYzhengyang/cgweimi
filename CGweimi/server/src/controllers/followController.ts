import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { followSchema } from '../validations/follow';

// POST /api/users/:userId/follow — 关注用户
export async function followUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const followerId = req.user.userId;
    const targetUserId = parseInt(req.params.userId);

    if (isNaN(targetUserId)) {
      res.status(400).json({ error: '无效的用户ID' });
      return;
    }

    if (followerId === targetUserId) {
      res.status(400).json({ error: '不能关注自己' });
      return;
    }

    // 检查用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      res.status(404).json({ error: '用户未找到' });
      return;
    }

    // 检查是否已关注
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
        },
      },
    });

    if (existing) {
      res.status(409).json({ error: '已经关注了此用户' });
      return;
    }

    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId: targetUserId,
      },
    });

    // 记录 CREATE_FOLLOW 活动
    await prisma.activity.create({
      data: {
        type: 'CREATE_FOLLOW',
        sourceId: follow.id,
        sourceUserId: followerId,
        targetUserId: targetUserId,
      },
    });

    res.status(201).json({ followed: true });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ error: '已经关注了此用户' });
      return;
    }
    console.error('关注用户失败:', error);
    res.status(500).json({ error: '关注失败' });
  }
}

// DELETE /api/users/:userId/follow — 取消关注用户
export async function unfollowUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const followerId = req.user.userId;
    const targetUserId = parseInt(req.params.userId);

    if (isNaN(targetUserId)) {
      res.status(400).json({ error: '无效的用户ID' });
      return;
    }

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
        },
      },
    });

    if (!follow) {
      res.status(409).json({ error: '尚未关注此用户' });
      return;
    }

    const deleted = await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
        },
      },
    });

    // 删除关联的 CREATE_FOLLOW 活动
    await prisma.activity.deleteMany({
      where: {
        type: 'CREATE_FOLLOW',
        sourceId: deleted.id,
        sourceUserId: followerId,
        targetUserId: targetUserId,
      },
    });

    res.json({ unfollowed: true });
  } catch (error) {
    console.error('取消关注失败:', error);
    res.status(500).json({ error: '取消关注失败' });
  }
}

// GET /api/users/:userId/followers — 获取粉丝列表
export async function getFollowers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const targetUserId = parseInt(req.params.userId);

    if (isNaN(targetUserId)) {
      res.status(400).json({ error: '无效的用户ID' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;
    const currentUserId = req.user?.userId;

    const followers = await prisma.follow.findMany({
      where: { followingId: targetUserId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { id: 'desc' },
    });

    // 检查当前用户是否关注了这些粉丝
    const followerIds = followers.map((f) => f.followerId);
    let currentUserFollows: number[] = [];

    if (currentUserId && followerIds.length > 0) {
      const followRecords = await prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: followerIds },
        },
        select: { followingId: true },
      });
      currentUserFollows = followRecords.map((r) => r.followingId);
    }

    const total = await prisma.follow.count({
      where: { followingId: targetUserId },
    });

    const formatted = followers.map((f) => ({
      id: f.follower.id,
      username: f.follower.username,
      avatar: f.follower.avatar,
      bio: f.follower.bio,
      isFollowedByMe: currentUserFollows.includes(f.followerId),
    }));

    res.json({
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取粉丝列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// GET /api/users/:userId/following — 获取关注列表
export async function getFollowing(req: AuthRequest, res: Response): Promise<void> {
  try {
    const targetUserId = parseInt(req.params.userId);

    if (isNaN(targetUserId)) {
      res.status(400).json({ error: '无效的用户ID' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;
    const currentUserId = req.user?.userId;

    const following = await prisma.follow.findMany({
      where: { followerId: targetUserId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { id: 'desc' },
    });

    // 检查当前用户是否关注了这些人
    const followingIds = following.map((f) => f.followingId);
    let currentUserFollows: number[] = [];

    if (currentUserId && followingIds.length > 0) {
      const followRecords = await prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: followingIds },
        },
        select: { followingId: true },
      });
      currentUserFollows = followRecords.map((r) => r.followingId);
    }

    const total = await prisma.follow.count({
      where: { followerId: targetUserId },
    });

    const formatted = following.map((f) => ({
      id: f.following.id,
      username: f.following.username,
      avatar: f.following.avatar,
      bio: f.following.bio,
      isFollowedByMe: currentUserFollows.includes(f.followingId),
    }));

    res.json({
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取关注列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}
