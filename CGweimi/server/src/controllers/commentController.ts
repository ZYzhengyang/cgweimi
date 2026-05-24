import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { commentWriteSchema } from '../validations/comment';

// 辅助函数：构造评论的include对象
function includeToComment(userId?: number) {
  return {
    user: {
      select: {
        id: true,
        username: true,
        avatar: true,
      },
    },
    commentLikes: {
      select: { id: true },
      where: userId ? { userId } : undefined,
    },
    _count: {
      select: {
        commentLikes: true,
        replies: true,
      },
    },
  };
}

// 格式化评论输出
function formatComment(comment: any, userId?: number) {
  const liked = userId ? comment.commentLikes?.length > 0 : false;
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    user: comment.user,
    postId: comment.postId,
    parentId: comment.parentId || null,
    isLiked: liked,
    _count: comment._count,
  };
}

// GET /api/posts/:postId/comments — 获取帖子的评论列表
export async function getComments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const postId = parseInt(req.params.postId);
    if (isNaN(postId)) {
      res.status(400).json({ error: '无效的帖子ID' });
      return;
    }

    const userId = req.user?.userId;

    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: null, // 只获取顶级评论
      },
      include: includeToComment(userId),
      orderBy: { id: 'asc' },
    });

    const formatted = comments.map((c) => formatComment(c, userId));
    res.json(formatted);
  } catch (error) {
    console.error('获取评论失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// POST /api/posts/:postId/comments — 创建评论
export async function createComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const userId = req.user.userId;
    const postId = parseInt(req.params.postId);

    if (isNaN(postId)) {
      res.status(400).json({ error: '无效的帖子ID' });
      return;
    }

    const validation = commentWriteSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(422).json({ error: validation.error.issues[0].message });
      return;
    }

    const { content } = validation.data;

    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        postId,
      },
      include: includeToComment(userId),
    });

    // 记录 CREATE_COMMENT 活动
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (post && post.userId !== userId) {
      await prisma.activity.create({
        data: {
          type: 'CREATE_COMMENT',
          sourceId: comment.id,
          sourceUserId: userId,
          targetId: postId,
          targetUserId: post.userId,
        },
      });
    }

    res.status(201).json(formatComment(comment, userId));
  } catch (error) {
    console.error('创建评论失败:', error);
    res.status(500).json({ error: '创建评论失败' });
  }
}

// DELETE /api/comments/:id — 删除评论
export async function deleteComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const userId = req.user.userId;
    const commentId = parseInt(req.params.id);

    if (isNaN(commentId)) {
      res.status(400).json({ error: '无效的评论ID' });
      return;
    }

    // 验证评论所有权
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, parentId: true, postId: true },
    });

    if (!comment) {
      res.status(404).json({ error: '评论未找到' });
      return;
    }

    if (comment.userId !== userId) {
      res.status(403).json({ error: '无权删除此评论' });
      return;
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    // 删除关联的活动
    const activityType = comment.parentId ? 'CREATE_REPLY' : 'CREATE_COMMENT';
    await prisma.activity.deleteMany({
      where: {
        type: activityType,
        sourceUserId: userId,
        sourceId: commentId,
        targetId: activityType === 'CREATE_COMMENT' ? comment.postId : comment.parentId || 0,
      },
    });

    res.json({ id: commentId, deleted: true });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ error: '删除评论失败' });
  }
}

// POST /api/comments/:id/like — 点赞评论
export async function likeComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const userId = req.user.userId;
    const commentId = parseInt(req.params.id);

    if (isNaN(commentId)) {
      res.status(400).json({ error: '无效的评论ID' });
      return;
    }

    // 检查是否已点赞
    const existing = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      res.status(409).json({ error: '已经点赞过此评论' });
      return;
    }

    const commentLike = await prisma.commentLike.create({
      data: { userId, commentId },
    });

    // 记录活动
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { parentId: true, userId: true },
    });

    if (comment && comment.userId !== userId) {
      const type = comment.parentId ? 'REPLY_LIKE' : 'COMMENT_LIKE';
      await prisma.activity.create({
        data: {
          type,
          sourceId: commentLike.id,
          sourceUserId: userId,
          targetId: commentId,
          targetUserId: comment.userId,
        },
      });
    }

    res.json({ liked: true });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ error: '已经点赞过此评论' });
      return;
    }
    console.error('点赞评论失败:', error);
    res.status(500).json({ error: '点赞失败' });
  }
}

// DELETE /api/comments/:id/like — 取消点赞评论
export async function unlikeComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const userId = req.user.userId;
    const commentId = parseInt(req.params.id);

    if (isNaN(commentId)) {
      res.status(400).json({ error: '无效的评论ID' });
      return;
    }

    const existing = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (!existing) {
      res.status(409).json({ error: '尚未点赞此评论' });
      return;
    }

    const deleted = await prisma.commentLike.delete({
      where: { userId_commentId: { userId, commentId } },
    });

    // 删除关联的活动
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { parentId: true },
    });
    const type = comment?.parentId ? 'REPLY_LIKE' : 'COMMENT_LIKE';
    await prisma.activity.deleteMany({
      where: {
        type,
        sourceUserId: userId,
        sourceId: deleted.id,
        targetId: commentId,
      },
    });

    res.json({ unliked: true });
  } catch (error) {
    console.error('取消点赞评论失败:', error);
    res.status(500).json({ error: '取消点赞失败' });
  }
}

// GET /api/comments/:id/replies — 获取评论的回复列表
export async function getReplies(req: AuthRequest, res: Response): Promise<void> {
  try {
    const commentId = parseInt(req.params.id);
    if (isNaN(commentId)) {
      res.status(400).json({ error: '无效的评论ID' });
      return;
    }

    const userId = req.user?.userId;

    const replies = await prisma.comment.findMany({
      where: {
        parentId: commentId,
      },
      include: includeToComment(userId),
      orderBy: { id: 'asc' },
    });

    const formatted = replies.map((r) => formatComment(r, userId));
    res.json(formatted);
  } catch (error) {
    console.error('获取回复失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// POST /api/comments/:id/replies — 创建回复（嵌套评论）
export async function createReply(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const userId = req.user.userId;
    const parentId = parseInt(req.params.id);

    if (isNaN(parentId)) {
      res.status(400).json({ error: '无效的评论ID' });
      return;
    }

    const validation = commentWriteSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(422).json({ error: validation.error.issues[0].message });
      return;
    }

    const { content } = validation.data;

    // 获取父评论信息
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { userId: true, postId: true },
    });

    if (!parentComment) {
      res.status(404).json({ error: '要回复的评论不存在' });
      return;
    }

    const reply = await prisma.comment.create({
      data: {
        content,
        userId,
        parentId,
        postId: parentComment.postId,
      },
      include: includeToComment(userId),
    });

    // 记录 CREATE_REPLY 活动
    if (parentComment.userId !== userId) {
      await prisma.activity.create({
        data: {
          type: 'CREATE_REPLY',
          sourceId: reply.id,
          sourceUserId: userId,
          targetId: parentId,
          targetUserId: parentComment.userId,
        },
      });
    }

    res.status(201).json(formatComment(reply, userId));
  } catch (error) {
    console.error('创建回复失败:', error);
    res.status(500).json({ error: '创建回复失败' });
  }
}
