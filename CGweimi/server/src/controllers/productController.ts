import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

// GET /api/products — 获取所有产品
export async function getAllProducts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (error) {
    console.error('获取产品列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// GET /api/products/:id — 获取单个产品
export async function getProductById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: '无效的产品ID' });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!product) {
      res.status(404).json({ error: '产品未找到' });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('获取产品失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// GET /api/products/:id/license — 获取产品授权信息
export async function getProductLicense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: '无效的产品ID' });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        licenseLevel: true,
        price: true,
        commercialPrice: true,
        extendedPrice: true,
      },
    });

    if (!product) {
      res.status(404).json({ error: '产品未找到' });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('获取产品授权信息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// POST /api/products — 创建产品
export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      name, description, price, licenseLevel, commercialPrice, extendedPrice,
      coverImage, previewIframe, fileSize, downloadUrl, categoryId, tagIds,
    } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        licenseLevel: licenseLevel || 'PERSONAL',
        commercialPrice,
        extendedPrice,
        coverImage,
        previewIframe,
        fileSize,
        downloadUrl,
        categoryId,
        ...(tagIds && tagIds.length > 0 && {
          tags: {
            create: tagIds.map((tagId: number) => ({ tagId })),
          },
        }),
      },
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('创建产品失败:', error);
    res.status(500).json({ error: '创建产品失败' });
  }
}

// PUT /api/products/:id — 更新产品
export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: '无效的产品ID' });
      return;
    }

    const {
      name, description, price, licenseLevel, commercialPrice, extendedPrice,
      coverImage, previewIframe, fileSize, downloadUrl, categoryId, tagIds,
    } = req.body;

    // 如果传了新的 tagIds，先删除旧的关联
    if (tagIds !== undefined) {
      await prisma.productTag.deleteMany({ where: { productId: id } });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price,
        licenseLevel,
        commercialPrice,
        extendedPrice,
        coverImage,
        previewIframe,
        fileSize,
        downloadUrl,
        categoryId,
        ...(tagIds !== undefined && tagIds.length > 0 && {
          tags: {
            create: tagIds.map((tagId: number) => ({ tagId })),
          },
        }),
      },
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });

    res.json(product);
  } catch (error) {
    console.error('更新产品失败:', error);
    res.status(500).json({ error: '更新产品失败' });
  }
}

// DELETE /api/products/:id — 删除产品
export async function deleteProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: '无效的产品ID' });
      return;
    }

    await prisma.product.delete({ where: { id } });
    res.json({ id, deleted: true });
  } catch (error) {
    console.error('删除产品失败:', error);
    res.status(500).json({ error: '删除产品失败' });
  }
}
