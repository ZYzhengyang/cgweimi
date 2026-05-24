import express from 'express';
import {
  getPosts,
  createPost,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
} from '../controllers/postController';
import { optionalAuth, authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

// 公开路由（可选认证，用于判断是否已点赞）
router.get('/', optionalAuth, getPosts);
router.get('/:id', optionalAuth, getPostById);

// 需要认证的路由
router.post('/', authMiddleware, createPost);
router.patch('/:id', authMiddleware, updatePost);
router.delete('/:id', authMiddleware, deletePost);
router.post('/:id/like', authMiddleware, likePost);
router.delete('/:id/like', authMiddleware, unlikePost);

export default router;
