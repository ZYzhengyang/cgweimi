import express from 'express';
import { getAllProducts, getProductById, getProductLicense, createProduct, updateProduct, deleteProduct } from '../controllers/productController';

const router = express.Router();

// 公共路由
router.get('/', getAllProducts);
router.get('/:id/license', getProductLicense);
router.get('/:id', getProductById);

// 管理路由
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;
