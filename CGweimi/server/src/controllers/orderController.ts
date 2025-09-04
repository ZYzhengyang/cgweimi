import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: '订单项不能为空' });
    }

    const totalAmount = items.reduce((sum: number, item: any) => sum + Number(item.price), 0);

    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount,
        status: 'pending',
        items: {
          create: items.map((item: any) => ({
            productId: Number(item.productId),
            price: Number(item.price)
          }))
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
};

export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('获取订单失败:', error);
    res.status(500).json({ error: '获取订单失败' });
  }
};

export const paymentCallback = async (req: Request, res: Response) => {
  try {
    const { orderId, transactionId, paymentMethod } = req.body;

    const order = await prisma.order.update({
      where: { id: Number(orderId) },
      data: {
        status: 'paid',
        transactionId,
        paymentMethod
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    for (const item of order.items) {
      const downloadToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.download.create({
        data: {
          userId: order.userId,
          productId: item.productId,
          downloadToken,
          expiresAt
        }
      });
    }

    res.json({ message: '支付成功', order });
  } catch (error) {
    console.error('支付回调处理失败:', error);
    res.status(500).json({ error: '支付回调处理失败' });
  }
};

export const getDownloadLink = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { productId } = req.params;

    const download = await prisma.download.findFirst({
      where: {
        userId,
        productId: Number(productId),
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        product: true
      }
    });

    if (!download) {
      return res.status(404).json({ error: '下载链接不存在或已过期' });
    }

    res.json({
      downloadUrl: download.product.downloadUrl,
      token: download.downloadToken,
      expiresAt: download.expiresAt
    });
  } catch (error) {
    console.error('获取下载链接失败:', error);
    res.status(500).json({ error: '获取下载链接失败' });
  }
};

export const downloadFile = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const download = await prisma.download.findFirst({
      where: {
        downloadToken: token,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        product: true
      }
    });

    if (!download) {
      return res.status(404).json({ error: '下载链接无效或已过期' });
    }

    await prisma.download.update({
      where: { id: download.id },
      data: {
        downloadCount: {
          increment: 1
        }
      }
    });

    res.redirect(download.product.downloadUrl);
  } catch (error) {
    console.error('文件下载失败:', error);
    res.status(500).json({ error: '文件下载失败' });
  }
};

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                coverImage: true
              }
            }
          }
        }
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.order.count({ where: whereClause });

    res.json({
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
};
