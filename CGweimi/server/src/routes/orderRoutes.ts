import express from 'express';
import {
  createOrder,
  getUserOrders,
  paymentCallback,
  getDownloadLink,
  downloadFile,
  getAllOrders
} from '../controllers/orderController';
import { authenticate, isAdmin } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', authenticate, createOrder);
router.get('/my-orders', authenticate, getUserOrders);
router.get('/download/:productId', authenticate, getDownloadLink);

router.post('/payment-callback', paymentCallback);
router.get('/download-file/:token', downloadFile);

router.get('/', authenticate, isAdmin, getAllOrders);

export default router;
