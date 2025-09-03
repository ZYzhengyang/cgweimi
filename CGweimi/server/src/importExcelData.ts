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

const createHierarchicalCategories = async () => {
  const categoryHierarchy = {
    '基础动作': ['基础行走', '基础奔跑', '基础姿态', '基础站立', '基础手势', '基础待机', '基础转身', '基础跳跃', '基础蹲下', '基础俯卧', '基础动作', '基础表情', '基础蹲伏'],
    '战斗动作': ['步枪', '剑类', '拳击', '格斗', '魔法武器', '手枪', '弓箭', '冷兵器', '热兵器', '近战类', '防御类', '格挡'],
    '表演动作': ['T台行走', '表演动作', 'T台待机', 'T台动作', '机器人表演', '定格动作'],
    '特殊动作': ['受伤类', '僵尸类', '重击受伤', '普通死亡', '僵尸行走', '死亡类', '重击死亡', '僵尸待机', '爆头死亡', '背后死亡', '被勒'],
    '运动动作': ['跳跃', '蹲伏移动', '特技类', '街舞类', '特技跳跃', '攀爬', '冲刺', '翻滚', '空翻', '闪避', '潜行', '爬行'],
    '生活动作': ['工作类', '日常生活', '使用物品', '拾取物品', '持物行走', '打字', '打电话', '开车', '驾驶类', '进入车辆'],
    '社交动作': ['交谈', '招手', '挥手', '握手', '指向', '敬礼', '鼓掌', '飞吻', '欢呼', '社交类', '礼仪'],
    '情感动作': ['开心', '悲伤', '生气', '害怕', '害羞', '惊讶', '失望', '无聊', '自负'],
    '舞蹈动作': ['嘻哈舞类', '街舞类', '民族舞类', '现代舞类', '萨尔萨舞', '肚皮舞', '爵士', '舞蹈动作'],
    '运动竞技': ['足球', '篮球', '橄榄球', '棒球', '高尔夫', '运动类'],
    '健身动作': ['举重', '深蹲', '卷腹', '健身类', '休闲类'],
    '其他动作': []
  };
  
  const categoryMap = new Map<string, number>();
  
  for (const [level1Name, level2List] of Object.entries(categoryHierarchy)) {
    const level1Category = await prisma.category.upsert({
      where: { name: level1Name },
      update: {},
      create: { name: level1Name, level: 1 }
    });
    categoryMap.set(level1Name, level1Category.id);
    
    for (const level2Name of level2List) {
      const level2Category = await prisma.category.upsert({
        where: { name: level2Name },
        update: {},
        create: { 
          name: level2Name, 
          level: 2, 
          parentId: level1Category.id 
        }
      });
      categoryMap.set(level2Name, level2Category.id);
    }
  }
  
  return categoryMap;
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

    console.log('创建分层分类结构...');
    const categoryMap = await createHierarchicalCategories();
    
    const tagMap = new Map<string, number>();
    let importedCount = 0;

    for (const item of data) {
      try {
        let categoryId = categoryMap.get(item.category);
        if (!categoryId) {
          const otherCategoryId = categoryMap.get('其他动作');
          if (otherCategoryId) {
            const category = await prisma.category.upsert({
              where: { name: item.category },
              update: {},
              create: { 
                name: item.category, 
                level: 2, 
                parentId: otherCategoryId 
              }
            });
            categoryId = category.id;
            categoryMap.set(item.category, categoryId);
          } else {
            const category = await prisma.category.upsert({
              where: { name: item.category },
              update: {},
              create: { name: item.category, level: 1 }
            });
            categoryId = category.id;
            categoryMap.set(item.category, categoryId);
          }
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
