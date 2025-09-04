import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getTags,
  createCategory,
  createTag,
  batchUploadProducts,
  purchaseProduct,
  upload
} from '../controllers/productController';
import { authenticate, isAdmin } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/', getAllProducts);
router.get('/categories', getCategories);
router.get('/tags', getTags);
router.get('/:id', getProductById);

router.post('/', authenticate, isAdmin, createProduct);
router.put('/:id', authenticate, isAdmin, updateProduct);
router.delete('/:id', authenticate, isAdmin, deleteProduct);

router.post('/categories', authenticate, isAdmin, createCategory);
router.post('/tags', authenticate, isAdmin, createTag);
router.post('/purchase', authenticate, purchaseProduct);
router.post('/batch-upload', authenticate, isAdmin, upload.single('excel'), batchUploadProducts);

export default router;
