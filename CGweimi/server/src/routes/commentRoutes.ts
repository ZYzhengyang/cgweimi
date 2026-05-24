import express from 'express';
import {
  getComments,
  createComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getReplies,
  createReply,
} from '../controllers/commentController';
import { optionalAuth, authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

// GET /api/posts/:postId/comments — 获取帖子评论
// 注意：这个路径在 postRoutes 中或需要单独挂载
// 我们在此使用相对路径，由主路由来拼接

// GET /api/comments/:id/replies — 获取评论回复
router.get('/:id/replies', optionalAuth, getReplies);

// POST /api/comments/:id/replies — 创建回复（仅认证用户）
router.post('/:id/replies', authMiddleware, createReply);

// POST /api/comments/:id/like — 点赞评论
router.post('/:id/like', authMiddleware, likeComment);

// DELETE /api/comments/:id/like — 取消点赞评论
router.delete('/:id/like', authMiddleware, unlikeComment);

// DELETE /api/comments/:id — 删除评论
router.delete('/:id', authMiddleware, deleteComment);

export default router;
