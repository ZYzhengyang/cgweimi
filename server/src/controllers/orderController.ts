import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// 创建订单
export const createOrder = async (req: Request, res: Response) => {
  try {
    // @ts-ignore 这里需要通过中间件设置req.user
    const userId = req.user?.id;
    const { productId, paymentMethod } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    
    // 查询产品信息
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) }
    });
    
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }
    
    // 创建订单
    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount: product.price,
        status: 'pending',
        paymentMethod: paymentMethod || 'alipay',
        items: {
          create: {
            productId: product.id,
            price: product.price
          }
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

// 获取订单详情
export const getOrderById = async (req: Request, res: Response) => {
  try {
    // @ts-ignore 这里需要通过中间件设置req.user
    const userId = req.user?.id;
    // @ts-ignore 这里需要通过中间件设置req.user
    const isAdmin = req.user?.isAdmin;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    
    // 查询订单
    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    // 普通用户只能查看自己的订单
    if (!isAdmin && order.userId !== userId) {
      return res.status(403).json({ error: '没有权限查看此订单' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({ error: '获取订单详情失败' });
  }
};

// 获取用户订单列表
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    // @ts-ignore 这里需要通过中间件设置req.user
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(orders);
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
};

// 模拟支付回调
export const paymentCallback = async (req: Request, res: Response) => {
  try {
    const { orderId, status, transactionId } = req.body;
    
    // 查询订单
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) }
    });
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    // 更新订单状态
    const updatedOrder = await prisma.order.update({
      where: { id: Number(orderId) },
      data: {
        status: status === 'success' ? 'paid' : 'cancelled',
        transactionId: transactionId || crypto.randomUUID()
      }
    });
    
    // 如果支付成功，为用户创建下载记录
    if (status === 'success') {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: Number(orderId) }
      });
      
      // 为每个产品创建下载记录
      for (const item of orderItems) {
        // 创建下载令牌
        const downloadToken = crypto.randomBytes(32).toString('hex');
        
        // 设置过期时间（例如7天后）
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        // 创建下载记录
        await prisma.download.create({
          data: {
            userId: order.userId,
            productId: item.productId,
            downloadToken,
            expiresAt,
            downloadCount: 0
          }
        });
      }
    }
    
    res.json(updatedOrder);
  } catch (error) {
    console.error('处理支付回调失败:', error);
    res.status(500).json({ error: '处理支付回调失败' });
  }
};

// 获取下载信息
export const getDownloadInfo = async (req: Request, res: Response) => {
  try {
    // @ts-ignore 这里需要通过中间件设置req.user
    const userId = req.user?.id;
    const { productId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    
    // 查询下载记录
    const download = await prisma.download.findFirst({
      where: {
        userId,
        productId: Number(productId),
        expiresAt: {
          gt: new Date() // 未过期
        }
      },
      include: {
        product: true
      }
    });
    
    if (!download) {
      return res.status(404).json({ error: '未找到有效的下载记录，请先购买此产品' });
    }
    
    // 生成下载URL
    const downloadUrl = `/api/download/${download.id}?token=${download.downloadToken}`;
    
    res.json({
      product: download.product,
      downloadUrl,
      expiresAt: download.expiresAt,
      downloadCount: download.downloadCount
    });
  } catch (error) {
    console.error('获取下载信息失败:', error);
    res.status(500).json({ error: '获取下载信息失败' });
  }
};

// 处理文件下载
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { token } = req.query;
    
    if (!token) {
      return res.status(401).json({ error: '缺少下载令牌' });
    }
    
    // 查询下载记录
    const download = await prisma.download.findUnique({
      where: { id: Number(id) },
      include: {
        product: true
      }
    });
    
    if (!download) {
      return res.status(404).json({ error: '下载记录不存在' });
    }
    
    // 验证令牌
    if (download.downloadToken !== token) {
      return res.status(401).json({ error: '无效的下载令牌' });
    }
    
    // 检查是否过期
    if (download.expiresAt && new Date() > download.expiresAt) {
      return res.status(403).json({ error: '下载链接已过期' });
    }
    
    // 更新下载次数
    await prisma.download.update({
      where: { id: Number(id) },
      data: {
        downloadCount: download.downloadCount + 1
      }
    });
    
    // 此处应处理文件下载
    // 在实际环境中，您可能需要从云存储中获取文件或提供本地文件路径
    // 示例：res.download(filePath);
    // 由于这是演示，我们只返回一个成功消息
    res.json({
      message: '文件下载开始',
      fileUrl: download.product.downloadUrl
    });
  } catch (error) {
    console.error('处理文件下载失败:', error);
    res.status(500).json({ error: '处理文件下载失败' });
  }
}; 