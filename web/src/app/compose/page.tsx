'use client';

import { useState, useRef, useCallback, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/store/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function ComposePage() {
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuth();

  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [tags, setTags] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('选择分类（可选）');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 处理图片选择 ──
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (!file.type.startsWith('image/')) continue;
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
  }, []);

  // ── 移除图片 ──
  const removeFile = useCallback((index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }, [previews]);

  // ── 发布 ──
  const handlePost = useCallback(async () => {
    if (!content.trim() && files.length === 0) return;
    if (!token) return;
    setPosting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('content', content.trim());

      if (categoryId) {
        formData.append('categoryId', String(categoryId));
      }

      if (tags.trim()) {
        formData.append('tags', tags.trim());
      }

      files.forEach((file) => {
        formData.append('media', file);
      });

      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `发布失败 (${res.status})`);
      }

      // 清理预览URL
      previews.forEach((url) => URL.revokeObjectURL(url));

      router.push('/posts');
    } catch (e: any) {
      setError(e.message || '发布失败');
    } finally {
      setPosting(false);
    }
  }, [content, files, token, categoryId, tags, previews, router]);

  // ── 快捷键 ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handlePost();
    }
  }, [handlePost]);

  // ── 未登录 ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-24 pb-20">
          <div className="text-center py-16">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-bg-card)]">
              <svg className="h-8 w-8 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-[var(--color-text)]">请先登录</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">登录后即可发布帖子</p>
            <button
              onClick={() => router.push('/login?redirect=/compose')}
              className="mt-4 inline-block min-h-[44px] px-6 py-2.5 bg-[var(--color-primary)] text-[var(--color-primary-text)] font-bold rounded-xl text-sm transition-all hover:opacity-90"
            >
              立即登录
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const canPost = (content.trim() || files.length > 0) && !posting;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">发布帖子</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            分享你的创作、想法或灵感
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] p-5 sm:p-6" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          {/* ── 文本输入区 ── */}
          <div className="flex gap-3">
            {/* 头像 */}
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-primary)]/10 flex items-center justify-center text-sm font-bold text-[var(--color-primary)] overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.username?.charAt(0).toUpperCase() || '?'
              )}
            </div>

            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="分享你的创作、想法或灵感..."
                rows={4}
                className="w-full resize-none bg-transparent text-[var(--color-text)] placeholder-[var(--color-text-muted)] text-[15px] leading-relaxed focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* ── 图片预览 ── */}
          {previews.length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {previews.map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    alt={`预览 ${i + 1}`}
                    className="h-24 w-24 rounded-xl object-cover border border-[var(--color-border)]"
                  />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── 错误提示 ── */}
          {error && (
            <div className="mt-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* ── 底部操作栏 ── */}
          <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* 图片上传 */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                图片
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              {/* 分类选择 */}
              <div className="relative group">
                <button
                  onClick={() => {
                    const categories = ['原画', '模型', '动作', '特效', '场景'];
                    const currentIdx = categories.indexOf(selectedCategoryName);
                    const nextIdx = (currentIdx + 1) % (categories.length + 1);
                    if (nextIdx === categories.length) {
                      setCategoryId(null);
                      setSelectedCategoryName('选择分类（可选）');
                    } else {
                      setCategoryId(nextIdx + 1);
                      setSelectedCategoryName(categories[nextIdx]);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    categoryId
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
                  }`}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                  </svg>
                  {selectedCategoryName}
                </button>
              </div>
            </div>

            {/* 发布按钮 */}
            <button
              onClick={handlePost}
              disabled={!canPost}
              className="min-h-[40px] px-6 py-2 bg-[var(--color-primary)] text-[var(--color-primary-text)] font-bold rounded-full text-sm transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[var(--color-primary)]/20"
            >
              {posting ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  发布中...
                </span>
              ) : (
                '发布'
              )}
            </button>
          </div>
        </div>

        {/* ── 提示 ── */}
        <p className="mt-4 text-center text-xs text-[var(--color-text-muted)]">
          Ctrl+Enter 快捷发布 · 支持 Markdown 格式 · 图片最大 10MB
        </p>
      </main>

      <Footer />
    </div>
  );
}
