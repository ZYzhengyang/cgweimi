import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据...');

  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cgweimi.com' },
    update: {},
    create: {
      email: 'admin@cgweimi.com',
      username: 'admin',
      password: hashedPassword,
      isAdmin: true
    }
  });

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: '角色模型' },
      update: {},
      create: {
        name: '角色模型',
        description: '游戏角色、动画角色等3D模型'
      }
    }),
    prisma.category.upsert({
      where: { name: '动画资源' },
      update: {},
      create: {
        name: '动画资源',
        description: '角色动画、动作捕捉数据等'
      }
    }),
    prisma.category.upsert({
      where: { name: '建筑模型' },
      update: {},
      create: {
        name: '建筑模型',
        description: '建筑物、室内外场景模型'
      }
    }),
    prisma.category.upsert({
      where: { name: '场景素材' },
      update: {},
      create: {
        name: '场景素材',
        description: '环境、道具、装饰等场景元素'
      }
    })
  ]);

  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { name: '游戏' },
      update: {},
      create: { name: '游戏' }
    }),
    prisma.tag.upsert({
      where: { name: '动画' },
      update: {},
      create: { name: '动画' }
    }),
    prisma.tag.upsert({
      where: { name: '写实' },
      update: {},
      create: { name: '写实' }
    }),
    prisma.tag.upsert({
      where: { name: '卡通' },
      update: {},
      create: { name: '卡通' }
    }),
    prisma.tag.upsert({
      where: { name: '科幻' },
      update: {},
      create: { name: '科幻' }
    }),
    prisma.tag.upsert({
      where: { name: '奇幻' },
      update: {},
      create: { name: '奇幻' }
    })
  ]);

  const sampleProducts = [
    {
      name: '战士角色模型',
      description: '高质量的中世纪战士3D模型，包含完整的装备和武器',
      price: 99.00,
      coverImage: 'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=战士角色',
      previewIframe: 'https://sketchfab.com/models/example1/embed',
      fileSize: 25.5,
      downloadUrl: 'https://example.com/downloads/warrior.zip',
      categoryId: categories[0].id
    },
    {
      name: '跑步动画包',
      description: '包含多种跑步动画的动作包，适用于各种角色',
      price: 59.00,
      coverImage: 'https://via.placeholder.com/400x300/059669/FFFFFF?text=跑步动画',
      previewIframe: 'https://sketchfab.com/models/example2/embed',
      fileSize: 15.2,
      downloadUrl: 'https://example.com/downloads/running-animations.zip',
      categoryId: categories[1].id
    },
    {
      name: '现代办公楼',
      description: '详细的现代办公楼3D模型，包含内部结构',
      price: 149.00,
      coverImage: 'https://via.placeholder.com/400x300/DC2626/FFFFFF?text=办公楼',
      previewIframe: 'https://sketchfab.com/models/example3/embed',
      fileSize: 45.8,
      downloadUrl: 'https://example.com/downloads/office-building.zip',
      categoryId: categories[2].id
    },
    {
      name: '森林场景包',
      description: '完整的森林场景，包含树木、植被、地形等元素',
      price: 199.00,
      coverImage: 'https://via.placeholder.com/400x300/16A34A/FFFFFF?text=森林场景',
      previewIframe: 'https://sketchfab.com/models/example4/embed',
      fileSize: 78.3,
      downloadUrl: 'https://example.com/downloads/forest-scene.zip',
      categoryId: categories[3].id
    }
  ];

  for (const productData of sampleProducts) {
    await prisma.product.create({
      data: {
        ...productData,
        tags: {
          create: [
            { tagId: tags[0].id },
            { tagId: tags[2].id }
          ]
        }
      }
    });
  }

  console.log('数据初始化完成！');
  console.log('管理员账号: admin@cgweimi.com');
  console.log('管理员密码: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
