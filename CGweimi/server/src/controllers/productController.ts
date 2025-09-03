import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export const getAllProducts = async (req: Request, res: Response) => {
  const { page = 1, limit = 12, category, search, tags } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    const whereClause: any = {};
    
    if (category) {
      whereClause.category = {
        name: category as string
      };
    }
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } }
      ];
    }

    if (tags) {
      const tagArray = (tags as string).split(',');
      whereClause.tags = {
        some: {
          tag: {
            name: { in: tagArray }
          }
        }
      };
    }

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
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.product.count({ where: whereClause });

    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('获取产品列表失败:', error);
    
    const mockProducts = [
      {
        id: 1,
        name: '战士角色模型',
        description: '高质量的3D战士角色模型，适用于游戏开发',
        price: 99.99,
        coverImage: 'https://via.placeholder.com/300x200?text=战士角色',
        previewIframe: 'https://sketchfab.com/models/example1/embed',
        fileSize: 15.5,
        downloadUrl: '/downloads/warrior.zip',
        createdAt: new Date(),
        category: { id: 1, name: '角色模型', description: '各种角色3D模型' },
        tags: [
          { tag: { id: 1, name: '战士' } },
          { tag: { id: 2, name: '游戏' } }
        ]
      },
      {
        id: 2,
        name: '跑步动画',
        description: '流畅的角色跑步动画，支持多种角色模型',
        price: 49.99,
        coverImage: 'https://via.placeholder.com/300x200?text=跑步动画',
        previewIframe: 'https://sketchfab.com/models/example2/embed',
        fileSize: 8.2,
        downloadUrl: '/downloads/running.fbx',
        createdAt: new Date(),
        category: { id: 2, name: '动画资源', description: '各种动作动画' },
        tags: [
          { tag: { id: 3, name: '跑步' } },
          { tag: { id: 4, name: '动作' } }
        ]
      },
      {
        id: 3,
        name: '法师角色模型',
        description: '魔法师角色模型，包含法杖和魔法效果',
        price: 129.99,
        coverImage: 'https://via.placeholder.com/300x200?text=法师角色',
        previewIframe: 'https://sketchfab.com/models/example3/embed',
        fileSize: 22.1,
        downloadUrl: '/downloads/mage.zip',
        createdAt: new Date(),
        category: { id: 1, name: '角色模型', description: '各种角色3D模型' },
        tags: [
          { tag: { id: 5, name: '法师' } },
          { tag: { id: 6, name: '魔法' } }
        ]
      },
      {
        id: 4,
        name: '攻击动画包',
        description: '包含多种攻击动作的动画包',
        price: 79.99,
        coverImage: 'https://via.placeholder.com/300x200?text=攻击动画',
        previewIframe: 'https://sketchfab.com/models/example4/embed',
        fileSize: 12.8,
        downloadUrl: '/downloads/attack-pack.fbx',
        createdAt: new Date(),
        category: { id: 2, name: '动画资源', description: '各种动作动画' },
        tags: [
          { tag: { id: 7, name: '攻击' } },
          { tag: { id: 8, name: '战斗' } }
        ]
      }
    ];

    let filteredProducts = mockProducts;
    
    if (category) {
      filteredProducts = filteredProducts.filter(p => p.category.name === category);
    }
    
    if (search) {
      filteredProducts = filteredProducts.filter(p => 
        p.name.includes(search as string) || p.description.includes(search as string)
      );
    }

    const startIndex = skip;
    const endIndex = startIndex + Number(limit);
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    res.json({
      products: paginatedProducts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filteredProducts.length,
        pages: Math.ceil(filteredProducts.length / Number(limit))
      }
    });
  }
};

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

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, price, coverImage, previewIframe, fileSize, downloadUrl, categoryId, tagIds } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: Number(price),
        coverImage,
        previewIframe,
        fileSize: Number(fileSize),
        downloadUrl,
        categoryId: Number(categoryId),
        tags: tagIds ? {
          create: tagIds.map((tagId: number) => ({
            tagId
          }))
        } : undefined
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('创建产品失败:', error);
    res.status(500).json({ error: '创建产品失败' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, coverImage, previewIframe, fileSize, downloadUrl, categoryId, tagIds } = req.body;

    await prisma.productTag.deleteMany({
      where: { productId: Number(id) }
    });

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
        categoryId: Number(categoryId),
        tags: tagIds ? {
          create: tagIds.map((tagId: number) => ({
            tagId
          }))
        } : undefined
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    res.json(product);
  } catch (error) {
    console.error('更新产品失败:', error);
    res.status(500).json({ error: '更新产品失败' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id: Number(id) }
    });

    res.json({ message: '产品删除成功' });
  } catch (error) {
    console.error('删除产品失败:', error);
    res.status(500).json({ error: '删除产品失败' });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    res.json(categories);
  } catch (error) {
    console.error('获取分类失败:', error);
    
    const mockCategories = [
      {
        id: 1,
        name: '角色模型',
        description: '各种角色3D模型',
        _count: { products: 2 }
      },
      {
        id: 2,
        name: '动画资源',
        description: '各种动作动画',
        _count: { products: 2 }
      },
      {
        id: 3,
        name: '建筑模型',
        description: '建筑和场景模型',
        _count: { products: 0 }
      },
      {
        id: 4,
        name: '场景素材',
        description: '环境和道具素材',
        _count: { products: 0 }
      }
    ];

    res.json(mockCategories);
  }
};

export const getTags = async (req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    res.json(tags);
  } catch (error) {
    console.error('获取标签失败:', error);
    res.status(500).json({ error: '获取标签失败' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    const category = await prisma.category.create({
      data: {
        name,
        description
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(500).json({ error: '创建分类失败' });
  }
};

export const createTag = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    const tag = await prisma.tag.create({
      data: {
        name
      }
    });

    res.status(201).json(tag);
  } catch (error) {
    console.error('创建标签失败:', error);
    res.status(500).json({ error: '创建标签失败' });
  }
};
