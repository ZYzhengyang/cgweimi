import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getCurrentUser,
  getUserFavorites,
  addToFavorite,
  removeFromFavorite
} from '../controllers/userController';
// 这里可以导入中间件，如认证中间件
// import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

// 认证路由
router.post('/register', registerUser);
router.post('/login', loginUser);

// 用户信息路由 - 需要认证
// router.get('/me', authenticate, getCurrentUser);
// router.get('/favorites', authenticate, getUserFavorites);
// router.post('/favorites', authenticate, addToFavorite);
// router.delete('/favorites/:productId', authenticate, removeFromFavorite);

// 暂时不使用中间件
router.get('/me', getCurrentUser);
router.get('/favorites', getUserFavorites);
router.post('/favorites', addToFavorite);
router.delete('/favorites/:productId', removeFromFavorite);

export default router; 