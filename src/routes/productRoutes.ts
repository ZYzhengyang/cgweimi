import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/products
 * 获取产品列表（公开）
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          _count: {
            select: { orderItems: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('获取产品列表失败:', error);
    res.status(500).json({ error: '获取产品列表失败' });
  }
});

/**
 * GET /api/products/:id
 * 获取单个产品详情（公开）
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: '无效的产品ID' });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        _count: {
          select: { orderItems: true },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    res.json(product);
  } catch (error) {
    console.error('获取产品详情失败:', error);
    res.status(500).json({ error: '获取产品详情失败' });
  }
});

/**
 * POST /api/products
 * 创建产品（需要管理员权限）
 */
router.post('/', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, price, categoryId, imageUrl, modelUrl, status } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: '产品名称和价格为必填项' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        price: parseFloat(price),
        categoryId: categoryId ? parseInt(categoryId) : null,
        imageUrl: imageUrl || null,
        modelUrl: modelUrl || null,
        status: status || 'ACTIVE',
      },
      include: {
        category: true,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('创建产品失败:', error);
    res.status(500).json({ error: '创建产品失败' });
  }
});

/**
 * PUT /api/products/:id
 * 更新产品（需要管理员权限）
 */
router.put('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: '无效的产品ID' });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: '产品不存在' });
    }

    const { name, description, price, categoryId, imageUrl, modelUrl, status } = req.body;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(categoryId !== undefined && { categoryId: categoryId ? parseInt(categoryId) : null }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(modelUrl !== undefined && { modelUrl }),
        ...(status !== undefined && { status }),
      },
      include: {
        category: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('更新产品失败:', error);
    res.status(500).json({ error: '更新产品失败' });
  }
});

/**
 * DELETE /api/products/:id
 * 删除产品（需要管理员权限）
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: '无效的产品ID' });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: '产品不存在' });
    }

    await prisma.product.delete({ where: { id } });

    res.json({ id, deleted: true });
  } catch (error) {
    console.error('删除产品失败:', error);
    res.status(500).json({ error: '删除产品失败' });
  }
});

/**
 * POST /api/products/batch-delete
 * 批量删除产品（需要管理员权限）
 */
router.post('/batch-delete', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的产品ID列表' });
    }

    const result = await prisma.product.deleteMany({
      where: { id: { in: ids } },
    });

    res.json({ deleted: result.count });
  } catch (error) {
    console.error('批量删除失败:', error);
    res.status(500).json({ error: '批量删除失败' });
  }
});

/**
 * DELETE /api/products/delete-all
 * 删除所有产品（需要管理员权限）
 */
router.delete('/delete-all', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await prisma.product.deleteMany();
    res.json({ deleted: result.count, message: '所有产品已删除' });
  } catch (error) {
    console.error('删除所有产品失败:', error);
    res.status(500).json({ error: '删除所有产品失败' });
  }
});

export default router;