import express from 'express';
import {
  getNotifications,
  markNotificationRead,
  getUnreadCount,
} from '../controllers/notificationController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

// 所有通知路由都需要认证
router.get('/count', authMiddleware, getUnreadCount);
router.get('/', authMiddleware, getNotifications);
router.patch('/:id', authMiddleware, markNotificationRead);

export default router;
