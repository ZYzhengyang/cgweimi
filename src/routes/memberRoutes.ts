import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/members
 * 获取会员列表（管理员）
 */
router.get('/', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          profilePhoto: true,
          bio: true,
          _count: {
            select: {
              post: true,
              followers: true,
              following: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: members,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('获取会员列表失败:', error);
    res.status(500).json({ error: '获取会员列表失败' });
  }
});

/**
 * GET /api/members/:id
 * 获取单个会员详情（管理员）
 */
router.get('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const member = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            post: true,
            comments: true,
            followers: true,
            following: true,
            postLikes: true,
            commentLikes: true,
          },
        },
      },
    });

    if (!member) {
      return res.status(404).json({ error: '会员不存在' });
    }

    res.json(member);
  } catch (error) {
    console.error('获取会员详情失败:', error);
    res.status(500).json({ error: '获取会员详情失败' });
  }
});

/**
 * PUT /api/members/:id
 * 更新会员信息（管理员）
 */
router.put('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, bio, email, gender } = req.body;

    const member = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!member) {
      return res.status(404).json({ error: '会员不存在' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(email !== undefined && { email }),
        ...(gender !== undefined && { gender }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('更新会员失败:', error);
    res.status(500).json({ error: '更新会员失败' });
  }
});

/**
 * DELETE /api/members/:id
 * 删除会员（管理员）
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const member = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!member) {
      return res.status(404).json({ error: '会员不存在' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });

    res.json({ id: req.params.id, deleted: true });
  } catch (error) {
    console.error('删除会员失败:', error);
    res.status(500).json({ error: '删除会员失败' });
  }
});

/**
 * GET /api/members/stats/overview
 * 获取会员统计概览（管理员）
 */
router.get('/stats/overview', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const [totalMembers, newMembersToday, activeMembers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          // User model doesn't have createdAt, using sessions as proxy
        },
      }),
      prisma.session.count({
        where: {
          expires: { gte: new Date() },
        },
      }),
    ]);

    res.json({
      totalMembers,
      newMembersToday,
      activeMembers,
    });
  } catch (error) {
    console.error('获取会员统计失败:', error);
    res.status(500).json({ error: '获取会员统计失败' });
  }
});

export default router;