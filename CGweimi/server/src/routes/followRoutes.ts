import express from 'express';
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from '../controllers/followController';
import { optionalAuth, authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

// 关注/取消关注需要认证
router.post('/:userId/follow', authMiddleware, followUser);
router.delete('/:userId/follow', authMiddleware, unfollowUser);

// 粉丝和关注列表（可选认证，用于判断当前用户是否关注了列表中的用户）
router.get('/:userId/followers', optionalAuth, getFollowers);
router.get('/:userId/following', optionalAuth, getFollowing);

export default router;
