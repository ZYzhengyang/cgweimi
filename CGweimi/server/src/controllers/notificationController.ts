import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

// 用户选择字段
const userSelect = {
  id: true,
  username: true,
  avatar: true,
};

// GET /api/notifications — 用户通知列表（分页）
export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const userId = req.user.userId;

    const limit = parseInt(req.query.limit as string) || 5;
    const cursor = parseInt(req.query.cursor as string) || 0;
    const sortDirection = (req.query['sort-direction'] as string) || 'desc';

    const where: any = {
      targetUserId: userId,
      sourceUserId: { not: userId },
    };

    if (cursor) {
      where.id = sortDirection === 'asc' ? { gt: cursor } : { lt: cursor };
    }

    const activities = await prisma.activity.findMany({
      where,
      take: limit,
      orderBy: { id: sortDirection === 'asc' ? 'asc' : 'desc' },
      select: {
        id: true,
        type: true,
        sourceId: true,
        targetId: true,
        createdAt: true,
        isNotificationRead: true,
        sourceUser: { select: userSelect },
        targetUser: { select: userSelect },
      },
    });

    res.json(activities);
  } catch (error) {
    console.error('获取通知失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// PATCH /api/notifications/:id — 标记单个通知为已读
export async function markNotificationRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const userId = req.user.userId;
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      res.status(400).json({ error: '无效的通知ID' });
      return;
    }

    // 验证通知属于当前用户
    const notification = await prisma.activity.findFirst({
      where: {
        id: notificationId,
        targetUserId: userId,
      },
    });

    if (!notification) {
      res.status(403).json({ error: '无权操作此通知' });
      return;
    }

    await prisma.activity.update({
      where: { id: notificationId },
      data: { isNotificationRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('标记通知已读失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// GET /api/notifications/count — 未读通知计数
export async function getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const userId = req.user.userId;

    const count = await prisma.activity.count({
      where: {
        isNotificationRead: false,
        targetUserId: userId,
        sourceUserId: { not: userId },
      },
    });

    res.json({ count });
  } catch (error) {
    console.error('获取未读通知计数失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}
