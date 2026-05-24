import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { getComments as getPostComments } from './commentController';

// GET /api/users/:id — 用户资料（含帖子数/粉丝数/关注数）
export async function getUserProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const targetUserId = parseInt(req.params.id);
    if (isNaN(targetUserId)) {
      res.status(400).json({ error: '无效的用户ID' });
      return;
    }

    const currentUserId = req.user?.userId;

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        coverImage: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: '用户未找到' });
      return;
    }

    // 检查当前用户是否关注了此用户
    let isFollowed = false;
    if (currentUserId && currentUserId !== targetUserId) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUserId,
          },
        },
      });
      isFollowed = !!follow;
    }

    res.json({
      ...user,
      postsCount: user._count.posts,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      isFollowedByMe: isFollowed,
    });
  } catch (error) {
    console.error('获取用户资料失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// GET /api/users/:id/posts — 获取用户的帖子列表
export async function getUserPosts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const targetUserId = parseInt(req.params.id);
    if (isNaN(targetUserId)) {
      res.status(400).json({ error: '无效的用户ID' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 5;
    const cursor = parseInt(req.query.cursor as string) || 0;
    const sortDirection = (req.query['sort-direction'] as string) || 'desc';
    const currentUserId = req.user?.userId;

    const where: any = { userId: targetUserId };
    if (cursor) {
      where.id = sortDirection === 'asc' ? { gt: cursor } : { lt: cursor };
    }

    const posts = await prisma.post.findMany({
      where,
      take: limit,
      orderBy: { id: sortDirection === 'asc' ? 'asc' : 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        visualMedia: {
          select: {
            id: true,
            type: true,
            fileName: true,
          },
        },
        postLikes: {
          select: { id: true },
          where: currentUserId ? { userId: currentUserId } : undefined,
        },
        _count: {
          select: {
            postLikes: true,
            comments: true,
          },
        },
      },
    });

    const formattedPosts = posts.map((post) => ({
      id: post.id,
      content: post.content,
      createdAt: post.createdAt,
      user: post.user,
      visualMedia: post.visualMedia || [],
      isLiked: currentUserId ? post.postLikes.length > 0 : false,
      _count: post._count,
    }));

    res.json(formattedPosts);
  } catch (error) {
    console.error('获取用户帖子失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}
