import { PrismaClient } from './generated/prisma';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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

const generatePrice = (categoryName: string): number => {
  const category = categoryName.toLowerCase();
  if (category.includes('基础') || category.includes('行走') || category.includes('奔跑')) {
    return 29.99;
  } else if (category.includes('武器') || category.includes('步枪') || category.includes('剑') || category.includes('刀')) {
    return 49.99;
  } else {
    return 99.99;
  }
};

async function importExcelData() {
  try {
    console.log('开始导入Excel数据...');
    
    const excelPath = '/home/ubuntu/attachments/1bc98202-a384-4233-b621-c2f478f177b7/products+3.xlsx';
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: ExcelProduct[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`找到 ${data.length} 个产品`);

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        username: 'admin',
        password: hashedPassword,
        isAdmin: true
      }
    });
    console.log('管理员用户已创建');

    let importedCount = 0;
    const categoryMap = new Map<string, number>();
    const tagMap = new Map<string, number>();

    for (const item of data) {
      try {
        let categoryId = categoryMap.get(item.category);
        if (!categoryId) {
          const category = await prisma.category.upsert({
            where: { name: item.category },
            update: {},
            create: { name: item.category }
          });
          categoryId = category.id;
          categoryMap.set(item.category, categoryId);
        }

        const product = await prisma.product.create({
          data: {
            name: item.name,
            description: item.brief || item.description || '',
            price: item.price || generatePrice(item.category),
            coverImage: item.image || '',
            previewIframe: item.iframeLink || '',
            fileSize: 15.5,
            downloadUrl: item.fileUrl || '',
            brand: item.brand || '',
            status: item.status || 'active',
            categoryId: categoryId
          }
        });

        if (item.tags) {
          const tagNames = item.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          for (const tagName of tagNames) {
            let tagId = tagMap.get(tagName);
            if (!tagId) {
              const tag = await prisma.tag.upsert({
                where: { name: tagName },
                update: {},
                create: { name: tagName }
              });
              tagId = tag.id;
              tagMap.set(tagName, tagId);
            }

            await prisma.productTag.create({
              data: {
                productId: product.id,
                tagId: tagId
              }
            });
          }
        }

        importedCount++;
        if (importedCount % 100 === 0) {
          console.log(`已导入 ${importedCount} 个产品...`);
        }
      } catch (error) {
        console.error(`导入产品失败: ${item.name}`, error);
      }
    }

    console.log(`成功导入 ${importedCount} 个产品`);
    console.log(`创建了 ${categoryMap.size} 个分类`);
    console.log(`创建了 ${tagMap.size} 个标签`);

  } catch (error) {
    console.error('导入数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importExcelData();
