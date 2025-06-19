import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">3D资源市场</h1>
        
        {/* 横幅宣传图 */}
        <div className="w-full h-64 bg-gray-200 rounded-lg mb-8 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
            横幅宣传图区域
          </div>
        </div>
        
        {/* 热门分类 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">热门分类</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['建筑模型', '角色模型', '场景素材', '动画资源'].map((category) => (
              <Link key={category} href={`/categories/${encodeURIComponent(category)}`} className="block p-4 bg-blue-100 rounded-lg text-center hover:bg-blue-200 transition-colors">
                {category}
              </Link>
            ))}
          </div>
        </div>
        
        {/* 推荐资源 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">推荐资源</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((id) => (
              <div key={id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gray-300 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    资源预览图
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold mb-2">3D资源 {id}</h3>
                  <p className="text-gray-600 text-sm mb-2">高质量3D模型，适用于各种场景</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-600">¥99.00</span>
                    <Link href={`/products/${id}`} className="text-blue-500 hover:underline">
                      查看详情
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 热门标签 */}
        <div>
          <h2 className="text-2xl font-bold mb-4">热门标签</h2>
          <div className="flex flex-wrap gap-2">
            {['建筑', '人物', '动物', '植物', '室内', '室外', '游戏', '动画', '科幻', '写实'].map((tag) => (
              <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`} className="px-3 py-1 bg-gray-200 rounded-full text-sm hover:bg-gray-300 transition-colors">
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
} 