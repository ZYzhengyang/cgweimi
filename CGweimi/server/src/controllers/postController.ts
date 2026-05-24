import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { postWriteSchema } from '../validations/post';

// 辅助函数：构造帖子的select对象
function selectPost(userId?: number) {
  return {
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
      where: userId ? { userId } : undefined,
    },
    _count: {
      select: {
        postLikes: true,
        comments: true,
      },
    },
  };
}

// 格式化帖子输出
function formatPost(post: any, userId?: number) {
  const liked = userId ? post.postLikes?.length > 0 : false;
  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt,
    user: post.user,
    visualMedia: post.visualMedia || [],
    isLiked: liked,
    _count: post._count,
  };
}

// GET /api/posts — 帖子列表（支持分页和类型筛选）
export async function getPosts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const cursor = parseInt(req.query.cursor as string) || 0;
    const sortDirection = (req.query['sort-direction'] as string) || 'desc';
    const type = req.query.type as string | undefined; // 'PHOTO' | 'VIDEO' 筛选
    const userId = req.user?.userId;

    const orderBy = sortDirection === 'asc' ? 'asc' as const : 'desc' as const;

    const where: any = {};

    // 游标分页
    if (cursor) {
      where.id = sortDirection === 'asc' ? { gt: cursor } : { lt: cursor };
    }

    // 类型筛选：通过关联的visualMedia来筛选
    if (type === 'PHOTO' || type === 'VIDEO') {
      where.visualMedia = {
        some: { type },
      };
    }

    const posts = await prisma.post.findMany({
      where,
      take: limit,
      orderBy: { id: orderBy },
      select: selectPost(userId),
    });

    const formattedPosts = posts.map((p) => formatPost(p, userId));

    res.json(formattedPosts);
  } catch (error) {
    console.error('获取帖子列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// POST /api/posts — 创建帖子
export async function createPost(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const userId = req.user.userId;

    const validation = postWriteSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(422).json({ error: validation.error.issues[0].message });
      return;
    }

    const { content, mediaFiles } = validation.data;

    const post = await prisma.post.create({
      data: {
        content: content || null,
        userId,
        ...(mediaFiles && mediaFiles.length > 0 && {
          visualMedia: {
            create: mediaFiles.map((fileName) => ({
              type: fileName.toLowerCase().match(/\.(mp4|webm|mov)$/) ? 'VIDEO' : 'PHOTO',
              fileName,
              userId,
            })),
          },
        }),
      },
      select: selectPost(userId),
    });

    res.status(201).json(formatPost(post, userId));
  } catch (error) {
    console.error('创建帖子失败:', error);
    res.status(500).json({ error: '创建帖子失败' });
  }
}

// GET /api/posts/:id — 获取单个帖子
export async function getPostById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      res.status(400).json({ error: '无效的帖子ID' });
      return;
    }

    const userId = req.user?.userId;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: selectPost(userId),
    });

    if (!post) {
      res.status(404).json({ error: '帖子未找到' });
      return;
    }

    res.json(formatPost(post, userId));
  } catch (error) {
    console.error('获取帖子失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// PATCH /api/posts/:id — 编辑帖子
export async function updatePost(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const userId = req.user.userId;
    const postId = parseInt(req.params.id);

    if (isNaN(postId)) {
      res.status(400).json({ error: '无效的帖子ID' });
      return;
    }

    // 验证帖子所有权
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, visualMedia: true },
    });

    if (!existingPost) {
      res.status(404).json({ error: '帖子未找到' });
      return;
    }

    if (existingPost.userId !== userId) {
      res.status(403).json({ error: '无权编辑此帖子' });
      return;
    }

    const validation = postWriteSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(422).json({ error: validation.error.issues[0].message });
      return;
    }

    const { content, mediaFiles } = validation.data;

    // 如果有旧的视觉媒体，先删除
    if (existingPost.visualMedia.length > 0) {
      await prisma.visualMedia.deleteMany({
        where: { postId },
      });
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        content: content !== undefined ? content : existingPost.content,
        ...(mediaFiles !== undefined && {
          visualMedia: mediaFiles.length > 0 ? {
            create: mediaFiles.map((fileName) => ({
              type: fileName.toLowerCase().match(/\.(mp4|webm|mov)$/) ? 'VIDEO' : 'PHOTO',
              fileName,
              userId,
            })),
          } : undefined,
        }),
      },
      select: selectPost(userId),
    });

    res.json(formatPost(post, userId));
  } catch (error) {
    console.error('更新帖子失败:', error);
    res.status(500).json({ error: '更新帖子失败' });
  }
}

// DELETE /api/posts/:id — 删除帖子
export async function deletePost(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const userId = req.user.userId;
    const postId = parseInt(req.params.id);

    if (isNaN(postId)) {
      res.status(400).json({ error: '无效的帖子ID' });
      return;
    }

    // 验证帖子所有权
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!existingPost) {
      res.status(404).json({ error: '帖子未找到' });
      return;
    }

    if (existingPost.userId !== userId) {
      res.status(403).json({ error: '无权删除此帖子' });
      return;
    }

    // 级联删除会自动处理关联的 visualMedia, postLikes, comments
    await prisma.post.delete({
      where: { id: postId },
    });

    res.json({ id: postId, deleted: true });
  } catch (error) {
    console.error('删除帖子失败:', error);
    res.status(500).json({ error: '删除帖子失败' });
  }
}

// POST /api/posts/:id/like — 点赞帖子
export async function likePost(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const userId = req.user.userId;
    const postId = parseInt(req.params.id);

    if (isNaN(postId)) {
      res.status(400).json({ error: '无效的帖子ID' });
      return;
    }

    // 检查是否已点赞
    const existing = await prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      res.status(409).json({ error: '已经点赞过此帖子' });
      return;
    }

    const postLike = await prisma.postLike.create({
      data: { userId, postId },
    });

    // 记录活动
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (post && post.userId !== userId) {
      await prisma.activity.create({
        data: {
          type: 'POST_LIKE',
          sourceId: postLike.id,
          sourceUserId: userId,
          targetId: postId,
          targetUserId: post.userId,
        },
      });
    }

    res.json({ liked: true });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ error: '已经点赞过此帖子' });
      return;
    }
    console.error('点赞帖子失败:', error);
    res.status(500).json({ error: '点赞失败' });
  }
}

// DELETE /api/posts/:id/like — 取消点赞帖子
export async function unlikePost(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const userId = req.user.userId;
    const postId = parseInt(req.params.id);

    if (isNaN(postId)) {
      res.status(400).json({ error: '无效的帖子ID' });
      return;
    }

    const existing = await prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (!existing) {
      res.status(409).json({ error: '尚未点赞此帖子' });
      return;
    }

    const deleted = await prisma.postLike.delete({
      where: { userId_postId: { userId, postId } },
    });

    // 删除关联的POST_LIKE活动记录
    await prisma.activity.deleteMany({
      where: {
        type: 'POST_LIKE',
        sourceUserId: userId,
        sourceId: deleted.id,
        targetId: postId,
      },
    });

    res.json({ unliked: true });
  } catch (error) {
    console.error('取消点赞失败:', error);
    res.status(500).json({ error: '取消点赞失败' });
  }
}
