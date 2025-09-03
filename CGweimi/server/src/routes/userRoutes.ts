import express from 'express';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  getUserFavorites,
  addFavorite,
  removeFavorite
} from '../controllers/userController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

router.get('/me', authenticate, getCurrentUser);
router.get('/favorites', authenticate, getUserFavorites);
router.post('/favorites', authenticate, addFavorite);
router.delete('/favorites/:productId', authenticate, removeFavorite);

export default router;
