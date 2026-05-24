import express from 'express';
import {
  getUserProfile,
  getUserPosts,
} from '../controllers/userController';
import { optionalAuth } from '../middlewares/authMiddleware';

const router = express.Router();

// 用户资料（公开，可选认证用于判断是否关注）
router.get('/:id', optionalAuth, getUserProfile);

// 用户帖子列表（公开，可选认证用于判断是否点赞）
router.get('/:id/posts', optionalAuth, getUserPosts);

export default router;
