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
  _count: {
    products: number;
  };
}

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsLoggedIn(true);
      fetchProducts();
      fetchCategories();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:3001/api/users/login', {
        email,
        password
      });
      
      if (response.data.user.isAdmin) {
        localStorage.setItem('adminToken', response.data.token);
        setIsLoggedIn(true);
        fetchProducts();
        fetchCategories();
      } else {
        alert('您没有管理员权限');
      }
    } catch (error) {
      console.error('登录失败:', error);
      alert('登录失败，请检查邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('http://localhost:3001/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('获取产品失败:', error);
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

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsLoggedIn(false);
    setProducts([]);
    setCategories([]);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('请选择Excel文件');
      return;
    }

    try {
      setUploading(true);
      setUploadResult('');
      
      const formData = new FormData();
      formData.append('excel', uploadFile);
      
      const token = localStorage.getItem('adminToken');
      const response = await axios.post('http://localhost:3001/api/products/batch-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      setUploadResult(`批量导入成功！导入了 ${response.data.imported}/${response.data.total} 个产品`);
      setUploadFile(null);
      fetchProducts();
      fetchCategories();
    } catch (error: any) {
      console.error('批量上传失败:', error);
      setUploadResult(`批量导入失败: ${error.response?.data?.error || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-white font-bold text-2xl">3D</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              管理员登录
            </h2>
            <p className="mt-2 text-gray-600">
              3D资源市场 - 管理后台
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="邮箱地址"
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="密码"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 font-medium transition-all duration-300"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">3D</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                3D资源市场 - 管理后台
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 transition-colors font-medium"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="w-2 h-6 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full mr-3"></span>
            批量导入产品
          </h3>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择Excel文件 (支持 .xlsx, .xls 格式)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="submit"
                disabled={uploading || !uploadFile}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-medium transition-all duration-300"
              >
                {uploading ? '导入中...' : '开始导入'}
              </button>
              {uploadResult && (
                <div className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  uploadResult.includes('成功') 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {uploadResult}
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow-lg rounded-2xl">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">总产品数</dt>
                    <dd className="text-2xl font-bold text-gray-900">{products.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-lg rounded-2xl">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">总分类数</dt>
                    <dd className="text-2xl font-bold text-gray-900">{categories.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-lg rounded-2xl">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">总收入</dt>
                    <dd className="text-2xl font-bold text-gray-900">¥0</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg overflow-hidden rounded-2xl">
          <div className="px-6 py-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <span className="w-2 h-6 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full mr-3"></span>
              产品列表
            </h3>
            <p className="mt-1 text-sm text-gray-500">管理所有3D动画资源产品</p>
          </div>
          <div className="divide-y divide-gray-200">
            {products.map((product) => (
              <div key={product.id} className="px-6 py-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      className="h-20 w-20 rounded-xl object-cover shadow-md"
                      src={product.coverImage}
                      alt={product.name}
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/80x80/6366f1/ffffff?text=3D';
                      }}
                    />
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500 flex items-center space-x-4">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          {product.category.name}
                        </span>
                        <span className="font-medium text-green-600">¥{product.price}</span>
                        {product.brand && (
                          <span className="text-gray-400">{product.brand}</span>
                        )}
                        {product.status && (
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            product.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.status}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        文件大小: {product.fileSize}MB
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:from-blue-700 hover:to-blue-800 transition-all duration-300">
                      编辑
                    </button>
                    <button className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg text-sm hover:from-red-700 hover:to-red-800 transition-all duration-300">
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {products.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <div className="text-gray-500 text-lg">暂无产品数据</div>
              <div className="text-gray-400 text-sm">使用上方的批量导入功能添加产品</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}      