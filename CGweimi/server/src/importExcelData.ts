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
    '基础动作': ['基础俯卧', '基础奔跑', '基础姿态', '基础手势', '基础站立', '基础行走', '基础表情', '基础蹲伏'],
    '特技类': ['特技跳跃', '特殊技能', '特殊移动', '特殊角色'],
    '掩体类': ['掩体待机', '掩体移动'],
    'T台动作': ['T台待机', 'T台行走'],
    '僵尸类': ['僵尸行走'],
    '变异体待机': ['变异体攻击', '变异体死亡'],
    '步枪': ['剑类', '手枪', '弓箭', '热兵器', '冷兵器', '魔法武器', '匕首', '长矛'],
    '格斗': ['拳击', '摔跤', '擒拿', '格挡', '近战类', '防御类'],
    '橄榄球': ['棒球', '足球', '高尔夫', '举重', '健身类', '运动类', '卷腹', '深蹲'],
    '街舞类': ['嘻哈舞类', '民族舞类', '现代舞类', '肚皮舞', '舞蹈动作', '萨尔萨舞', '卡波耶拉', '爵士'],
    '复杂表情': ['基础表情', '开心', '生气', '惊讶', '悲伤', '害羞', '害怕', '失望', '自负'],
    '受伤类': ['重击受伤', '普通死亡', '爆头死亡', '背后死亡', '变异体死亡', '抽搐', '被勒'],
    '互动': ['交谈', '日常生活', '打电话', '打字', '开车', '调酒', '挤牛奶', '玩牌'],
    '工作类': ['弹奏乐器', '驾驶类', '进入车辆'],
    '跳跃': ['特技跳跃', '空翻'],
    '蹲伏移动': ['蹲伏观察'],
    '使用物品': ['拾取物品', '持物行走'],
    '休闲类': ['无聊', '定格动作'],
    '爬行': ['俯卧移动', '攀爬'],
    '翻滚': ['闪避'],
    '招手': ['挥手', '指向', '握手', '敬礼', '飞吻', '鼓掌'],
    '欢呼': ['同意', '认可'],
    '社交类': ['礼仪'],
    '表演动作': ['机器人表演'],
    '臀部动作': ['手臂动作']
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
          const category = await prisma.category.upsert({
            where: { name: item.category },
            update: {},
            create: { name: item.category, level: 1 }
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
