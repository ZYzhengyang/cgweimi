import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import multer from 'multer';
import path from 'path';

const prisma = new PrismaClient();

const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('只支持Excel文件格式'));
    }
  }
});

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
        name: 'T台待机到前行',
        description: '姿态',
        price: 49.99,
        coverImage: 'https://cdn.cgvmi.com/gif/Catwalk_Idle_to_Walk_Forward.gif',
        previewIframe: 'https://test.cgvmi.com/?model=Catwalk_Idle_to_Walk_Forward.fbx',
        fileSize: 15.5,
        downloadUrl: 'https://cdn.cgvmi.com/xiazia/catwalk_idle_to_walk_forward.zip',
        brand: '默认',
        status: 'active',
        createdAt: new Date(),
        category: { id: 1, name: 'T台动作', description: 'T台动作相关的3D资源' },
        tags: [
          { tag: { id: 1, name: '表演' } },
          { tag: { id: 2, name: '姿态' } },
          { tag: { id: 3, name: '移动' } }
        ]
      },
      {
        id: 2,
        name: '基础行走',
        description: '基础行走动画',
        price: 29.99,
        coverImage: 'https://cdn.cgvmi.com/gif/Basic_Walk.gif',
        previewIframe: 'https://test.cgvmi.com/?model=Basic_Walk.fbx',
        fileSize: 15.5,
        downloadUrl: 'https://cdn.cgvmi.com/xiazia/basic_walk.zip',
        brand: '默认',
        status: 'active',
        createdAt: new Date(),
        category: { id: 2, name: '基础行走', description: '基础行走相关的3D资源' },
        tags: [
          { tag: { id: 4, name: '运动' } },
          { tag: { id: 5, name: '基础' } }
        ]
      },
      {
        id: 3,
        name: '步枪动作',
        description: '步枪相关动作',
        price: 49.99,
        coverImage: 'https://cdn.cgvmi.com/gif/Rifle_Action.gif',
        previewIframe: 'https://test.cgvmi.com/?model=Rifle_Action.fbx',
        fileSize: 15.5,
        downloadUrl: 'https://cdn.cgvmi.com/xiazia/rifle_action.zip',
        brand: '默认',
        status: 'active',
        createdAt: new Date(),
        category: { id: 3, name: '步枪', description: '步枪相关的3D资源' },
        tags: [
          { tag: { id: 6, name: '武器' } },
          { tag: { id: 7, name: '射击' } }
        ]
      },
      {
        id: 4,
        name: '剑类动作',
        description: '剑类攻击动作',
        price: 49.99,
        coverImage: 'https://cdn.cgvmi.com/gif/Sword_Action.gif',
        previewIframe: 'https://test.cgvmi.com/?model=Sword_Action.fbx',
        fileSize: 15.5,
        downloadUrl: 'https://cdn.cgvmi.com/xiazia/sword_action.zip',
        brand: '默认',
        status: 'active',
        createdAt: new Date(),
        category: { id: 4, name: '剑类', description: '剑类相关的3D资源' },
        tags: [
          { tag: { id: 8, name: '武器' } },
          { tag: { id: 9, name: '近战' } }
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
        name: 'T台动作',
        description: 'T台动作相关的3D资源',
        _count: { products: 1 }
      },
      {
        id: 2,
        name: '基础行走',
        description: '基础行走相关的3D资源',
        _count: { products: 61 }
      },
      {
        id: 3,
        name: '步枪',
        description: '步枪相关的3D资源',
        _count: { products: 54 }
      },
      {
        id: 4,
        name: '基础奔跑',
        description: '基础奔跑相关的3D资源',
        _count: { products: 51 }
      },
      {
        id: 5,
        name: '剑类',
        description: '剑类相关的3D资源',
        _count: { products: 51 }
      },
      {
        id: 6,
        name: '基础待机',
        description: '基础待机相关的3D资源',
        _count: { products: 47 }
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

interface ExcelProduct {
  id: number;
  name: string;
  category: string;
  brand: string;
  tags: string;
  brief: string;
  description: string;
  price: number;
  status: string;
  iframeLink: string;
  image: string;
  fileUrl: string;
  intro: string;
  createdAt: string;
}

const parseExcelFile = (buffer: Buffer) => {
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: ExcelProduct[] = XLSX.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    console.error('解析Excel文件失败:', error);
    throw error;
  }
};

export const batchUploadProducts = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传Excel文件' });
    }

    const data = parseExcelFile(req.file.buffer);
    
    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'Excel文件为空或格式不正确' });
    }

    const categoryMap = new Map<string, number>();
    const tagMap = new Map<string, number>();

    for (const row of data) {
      if (!categoryMap.has(row.category)) {
        const category = await prisma.category.upsert({
          where: { name: row.category },
          update: {},
          create: {
            name: row.category,
            description: `${row.category}相关的3D资源`
          }
        });
        categoryMap.set(row.category, category.id);
      }

      if (row.tags) {
        const tagNames = row.tags.split(',').map(tag => tag.trim());
        for (const tagName of tagNames) {
          if (!tagMap.has(tagName)) {
            const tag = await prisma.tag.upsert({
              where: { name: tagName },
              update: {},
              create: { name: tagName }
            });
            tagMap.set(tagName, tag.id);
          }
        }
      }
    }

    const getCategoryBasedPrice = (category: string): number => {
      const lowerCategory = category.toLowerCase();
      if (lowerCategory.includes('基础') || lowerCategory.includes('基本')) {
        return 29.99;
      } else if (lowerCategory.includes('武器') || lowerCategory.includes('步枪') || lowerCategory.includes('剑')) {
        return 49.99;
      } else if (lowerCategory.includes('复杂') || lowerCategory.includes('高级')) {
        return 99.99;
      }
      return 39.99;
    };

    let importedCount = 0;
    const errors: string[] = [];

    for (const row of data) {
      try {
        const categoryId = categoryMap.get(row.category)!;
        const price = isNaN(row.price) ? getCategoryBasedPrice(row.category) : row.price;
        const description = row.brief || row.description || '暂无描述';
        const fileSize = 15.5;

        const product = await prisma.product.create({
          data: {
            name: row.name,
            description,
            price,
            coverImage: row.image,
            previewIframe: row.iframeLink,
            fileSize,
            downloadUrl: row.fileUrl,
            brand: row.brand || '默认',
            status: row.status || 'active',
            categoryId
          }
        });

        if (row.tags) {
          const tagNames = row.tags.split(',').map(tag => tag.trim());
          const tagIds = tagNames.map(tagName => tagMap.get(tagName)!).filter(Boolean);
          
          if (tagIds.length > 0) {
            await prisma.productTag.createMany({
              data: tagIds.map(tagId => ({
                productId: product.id,
                tagId
              }))
            });
          }
        }

        importedCount++;
      } catch (error) {
        console.error(`导入产品失败: ${row.name}`, error);
        errors.push(`${row.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    res.json({
      message: '批量导入完成',
      imported: importedCount,
      total: data.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : []
    });
  } catch (error) {
    console.error('批量上传失败:', error);
    res.status(500).json({ error: '批量上传失败' });
  }
};
