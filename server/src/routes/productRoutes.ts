import express from 'express';
import { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/productController';
// 这里可以导入中间件，如认证中间件
// import { authenticate, isAdmin } from '../middlewares/authMiddleware';

const router = express.Router();

// 公共路由
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// 管理员路由 - 添加适当的中间件
// router.post('/', authenticate, isAdmin, createProduct);
// router.put('/:id', authenticate, isAdmin, updateProduct);
// router.delete('/:id', authenticate, isAdmin, deleteProduct);

// 暂时不使用中间件
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router; 