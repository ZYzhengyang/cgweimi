'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  coverImage: string;
  previewIframe: string;
  fileSize: number;
  downloadUrl: string;
  brand?: string;
  status?: string;
  createdAt: string;
  category: {
    id: number;
    name: string;
    description: string;
  };
  tags: Array<{
    tag: {
      id: number;
      name: string;
    };
  }>;
}

interface Category {
  id: number;
  name: string;
  description: string;
  level: number;
  parentId?: number;
  children?: Category[];
  _count: {
    products: number;
  };
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 12;
  const [previewModal, setPreviewModal] = useState<{ show: boolean; url: string }>({
    show: false,
    url: ''
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Array<{id: number, name: string}>>([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchTags();
  }, [selectedCategory, searchTerm, selectedTags, currentPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      const response = await axios.get(`http://localhost:3001/api/products?${params}`);
      setProducts(response.data.products || []);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotalProducts(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('获取产品失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/products/categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/products/tags');
      setAvailableTags(response.data || []);
    } catch (error) {
      console.error('获取标签失败:', error);
    }
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev: string[]) => 
      prev.includes(tagName) 
        ? prev.filter((t: string) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const openPreview = (url: string) => {
    setPreviewModal({ show: true, url });
  };

  const closePreview = () => {
    setPreviewModal({ show: false, url: '' });
  };

  const handlePurchase = async (productId: number) => {
    try {
      const response = await axios.post('http://localhost:3001/api/products/purchase', {
        productId
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data && response.data.items && response.data.items[0]) {
        const downloadUrl = response.data.items[0].product.downloadUrl;
        alert(`购买成功！下载链接：${downloadUrl}`);
        if (downloadUrl) {
          window.open(downloadUrl, '_blank');
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        alert('请先登录后再购买产品');
      } else {
        console.error('购买失败:', error);
        alert('购买失败，请稍后重试');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">3D</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                3D资源市场
              </h1>
            </div>
            <div className="flex items-center space-x-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索动画资源..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80 px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg">
                登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-8">
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-2 h-6 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full mr-3"></span>
                动作分类
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                    selectedCategory === '' 
                      ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">全部分类</span>
                  </div>
                </button>
                {categories.filter(cat => cat.level === 1).map((level1Category) => (
                  <div key={level1Category.id} className="mb-4">
                    <button
                      onClick={() => setSelectedCategory(level1Category.name)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                        selectedCategory === level1Category.name 
                          ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700' 
                          : 'text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{level1Category.name}</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                          {level1Category._count.products}
                        </span>
                      </div>
                    </button>
                    
                    {level1Category.children && level1Category.children.length > 0 && (
                      <div className="ml-4 mt-2 space-y-1">
                        {level1Category.children.map((level2Category) => (
                          <button
                            key={level2Category.id}
                            onClick={() => setSelectedCategory(level2Category.name)}
                            className={`w-full text-left px-3 py-1.5 rounded-md transition-all duration-200 text-sm ${
                              selectedCategory === level2Category.name 
                                ? 'bg-blue-50 text-blue-600' 
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span>{level2Category.name}</span>
                              <span className="text-xs text-gray-500">
                                {level2Category._count.products}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-6 bg-gradient-to-b from-green-600 to-blue-600 rounded-full mr-3"></span>
                  标签筛选
                </h3>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {availableTags.slice(0, 20).map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.name)}
                      className={`px-2 py-1 rounded-md text-xs transition-all duration-200 ${
                        selectedTags.includes(tag.name)
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center items-center h-96">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0"></div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                      <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                        <img
                          src={product.coverImage}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/300x225/6366f1/ffffff?text=3D+Animation';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                            <button
                              onClick={() => openPreview(product.previewIframe)}
                              className="bg-white/90 backdrop-blur-sm text-gray-800 px-2 py-1 rounded text-xs font-medium hover:bg-white transition-all duration-300"
                            >
                              3D预览
                            </button>
                          </div>
                        </div>
                        <div className="absolute top-2 left-2">
                          <span className="inline-block bg-white/90 backdrop-blur-sm text-gray-800 text-xs px-1.5 py-0.5 rounded font-medium">
                            {product.category.name}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className="inline-block bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                            ¥{product.price}
                          </span>
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {product.tags.slice(0, 2).map((tagItem) => (
                            <span
                              key={tagItem.tag.id}
                              className="inline-block bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded"
                            >
                              {tagItem.tag.name}
                            </span>
                          ))}
                        </div>
                        <button 
                          onClick={() => handlePurchase(product.id)}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-1.5 px-3 rounded hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium text-xs"
                        >
                          立即购买
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {!loading && products.length > 0 && totalPages > 1 && (
                  <div className="flex justify-center items-center mt-12 space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      上一页
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-4 py-2 rounded-lg ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下一页
                    </button>
                    
                    <span className="text-sm text-gray-600 ml-4">
                      第 {currentPage} 页，共 {totalPages} 页 ({totalProducts} 个产品)
                    </span>
                  </div>
                )}

                {!loading && products.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <div className="text-gray-500 text-xl mb-2">暂无动画资源</div>
                    <div className="text-gray-400">尝试调整搜索条件或分类筛选</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {previewModal.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">3D动画预览</h3>
              <button
                onClick={closePreview}
                className="text-gray-500 hover:text-gray-700 text-3xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="aspect-video bg-gray-100">
              <iframe
                src={previewModal.url}
                className="w-full h-full"
                frameBorder="0"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}                                              