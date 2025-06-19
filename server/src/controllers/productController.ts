import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取所有产品
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, categoryId, search, sort = 'createdAt', order = 'desc' } = req.query;
    
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;
    
    // 构建查询条件
    const whereClause: any = {};
    if (categoryId) {
      whereClause.categoryId = Number(categoryId);
    }
    
    if (search) {
      whereClause.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    
    // 查询产品
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        tags: {
          include: {
            tag: true
          }
        }
      },
      skip,
      take: limitNumber,
      orderBy: {
        [String(sort)]: order === 'desc' ? 'desc' : 'asc'
      }
    });
    
    // 获取总数
    const total = await prisma.product.count({ where: whereClause });
    
    res.json({
      data: products,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    console.error('获取产品列表失败:', error);
    res.status(500).json({ error: '获取产品列表失败' });
  }
};

// 获取单个产品
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        category: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });
    
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('获取产品详情失败:', error);
    res.status(500).json({ error: '获取产品详情失败' });
  }
};

// 创建产品
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, price, coverImage, previewIframe, fileSize, downloadUrl, categoryId, tags } = req.body;
    
    // 创建产品
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: Number(price),
        coverImage,
        previewIframe,
        fileSize: Number(fileSize),
        downloadUrl,
        categoryId: Number(categoryId)
      }
    });
    
    // 添加标签
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagConnections = tags.map((tagId: number) => ({
        tagId: Number(tagId),
        productId: product.id
      }));
      
      await prisma.productTag.createMany({
        data: tagConnections
      });
    }
    
    // 返回创建的产品
    const createdProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });
    
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('创建产品失败:', error);
    res.status(500).json({ error: '创建产品失败' });
  }
};

// 更新产品
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, coverImage, previewIframe, fileSize, downloadUrl, categoryId, tags } = req.body;
    
    // 更新产品
    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        price: Number(price),
        coverImage,
        previewIframe,
        fileSize: Number(fileSize),
        downloadUrl,
        categoryId: Number(categoryId)
      }
    });
    
    // 更新标签
    if (tags && Array.isArray(tags)) {
      // 先删除现有标签
      await prisma.productTag.deleteMany({
        where: { productId: Number(id) }
      });
      
      // 添加新标签
      if (tags.length > 0) {
        const tagConnections = tags.map((tagId: number) => ({
          tagId: Number(tagId),
          productId: product.id
        }));
        
        await prisma.productTag.createMany({
          data: tagConnections
        });
      }
    }
    
    // 返回更新后的产品
    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });
    
    res.json(updatedProduct);
  } catch (error) {
    console.error('更新产品失败:', error);
    res.status(500).json({ error: '更新产品失败' });
  }
};

// 删除产品
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 先删除相关的标签关联
    await prisma.productTag.deleteMany({
      where: { productId: Number(id) }
    });
    
    // 删除产品
    await prisma.product.delete({
      where: { id: Number(id) }
    });
    
    res.json({ message: '产品删除成功' });
  } catch (error) {
    console.error('删除产品失败:', error);
    res.status(500).json({ error: '删除产品失败' });
  }
}; 