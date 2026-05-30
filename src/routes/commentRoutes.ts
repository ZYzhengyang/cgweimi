import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/comments/:commentId
 * 获取单条评论
 */
router.get('/:commentId', async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.commentId, 10);
    if (isNaN(commentId)) {
      return res.status(400).json({ error: '无效的评论ID' });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: { id: true, username: true, name: true, profilePhoto: true },
        },
        _count: {
          select: { commentLikes: true, replies: true },
        },
      },
    });

    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    res.json(comment);
  } catch (error) {
    console.error('获取评论失败:', error);
    res.status(500).json({ error: '获取评论失败' });
  }
});

/**
 * PUT /api/comments/:commentId
 * 编辑评论（需要登录且为评论作者）
 */
router.put('/:commentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.commentId, 10);
    if (isNaN(commentId)) {
      return res.status(400).json({ error: '无效的评论ID' });
    }

    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }

    // 验证是否为评论作者
    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existing) {
      return res.status(404).json({ error: '评论不存在' });
    }

    if (existing.userId !== req.user?.id) {
      return res.status(403).json({ error: '无权编辑此评论' });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        user: {
          select: { id: true, username: true, name: true, profilePhoto: true },
        },
        _count: {
          select: { commentLikes: true, replies: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('编辑评论失败:', error);
    res.status(500).json({ error: '编辑评论失败' });
  }
});

/**
 * DELETE /api/comments/:commentId
 * 删除评论（需要登录且为评论作者）
 */
router.delete('/:commentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.commentId, 10);
    if (isNaN(commentId)) {
      return res.status(400).json({ error: '无效的评论ID' });
    }

    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existing) {
      return res.status(404).json({ error: '评论不存在' });
    }

    if (existing.userId !== req.user?.id) {
      return res.status(403).json({ error: '无权删除此评论' });
    }

    // 删除关联的活动记录
    const type = existing.parentId ? 'CREATE_REPLY' : 'CREATE_COMMENT';
    await prisma.activity.deleteMany({
      where: {
        type: type as any,
        sourceUserId: req.user?.id,
        sourceId: existing.id,
        targetId: type === 'CREATE_COMMENT' ? existing.postId : existing.parentId,
      },
    });

    await prisma.comment.delete({ where: { id: commentId } });

    res.json({ id: commentId, deleted: true });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ error: '删除评论失败' });
  }
});

/**
 * GET /api/comments/:commentId/replies
 * 获取评论的回复列表
 */
router.get('/:commentId/replies', async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.commentId, 10);
    if (isNaN(commentId)) {
      return res.status(400).json({ error: '无效的评论ID' });
    }

    const replies = await prisma.comment.findMany({
      where: { parentId: commentId },
      include: {
        user: {
          select: { id: true, username: true, name: true, profilePhoto: true },
        },
        _count: {
          select: { commentLikes: true, replies: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    res.json(replies);
  } catch (error) {
    console.error('获取回复失败:', error);
    res.status(500).json({ error: '获取回复失败' });
  }
});

/**
 * POST /api/comments/:commentId/replies
 * 创建回复（需要登录）
 */
router.post('/:commentId/replies', authMiddleware, async (req: Request, res: Response) => {
  try {
    const parentId = parseInt(req.params.commentId, 10);
    if (isNaN(parentId)) {
      return res.status(400).json({ error: '无效的评论ID' });
    }

    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: '回复内容不能为空' });
    }

    // 验证父评论存在
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
    });

    if (!parentComment) {
      return res.status(404).json({ error: '父评论不存在' });
    }

    const reply = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: req.user!.id,
        postId: parentComment.postId,
        parentId,
      },
      include: {
        user: {
          select: { id: true, username: true, name: true, profilePhoto: true },
        },
        _count: {
          select: { commentLikes: true, replies: true },
        },
      },
    });

    // 记录活动
    await prisma.activity.create({
      data: {
        type: 'CREATE_REPLY',
        sourceId: reply.id,
        sourceUserId: req.user!.id,
        targetUserId: parentComment.userId,
        targetId: parentId,
      },
    });

    res.status(201).json(reply);
  } catch (error) {
    console.error('创建回复失败:', error);
    res.status(500).json({ error: '创建回复失败' });
  }
});

export default router;