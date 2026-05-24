'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PostCard from '@/components/PostCard';
import { getAllPosts, getCategories } from '@/lib/communityApi';
import { useAuth } from '@/store/authStore';

// ─── 常量 ─────────────────────────────────────────

const POSTS_PER_PAGE = 10;

// ─── 类型 ─────────────────────────────────────────

interface PostData {
  id: number;
  content: string;
  type: string;
  productId: number | null;
  createdAt: string;
  user: { id: number; username: string; avatar: string | null };
  product?: { id: number; name: string; coverImage: string } | null;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isAuthorFollowed?: boolean;
}

interface CategoryFlat {
  id: number;
  name: string;
  parentId: number | null;
  children?: CategoryFlat[];
  count?: number;
}

// ─── 工具：将API数据转为PostCard格式 ─────────────

function toPostCardData(post: PostData) {
  const hasProduct = post.product && post.product.coverImage;
  const postType = hasProduct ? ('image' as const) : ('text' as const);
  return {
    id: post.id,
    author: {
      id: post.user?.id ?? 0,
      username: post.user?.username || '未知用户',
      avatar: post.user?.avatar || undefined,
      isFollowing: post.isAuthorFollowed ?? false,
    },
    content: post.content,
    type: postType,
    media: hasProduct ? [{ url: post.product!.coverImage, alt: post.product!.name }] : [],
    createdAt: post.createdAt,
    likes: post.likeCount ?? 0,
    comments: post.commentCount ?? 0,
    shares: 0,
    liked: post.isLiked ?? false,
  };
}

// ─── 页面组件 ─────────────────────────────────────

export default function PostsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState<PostData[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── 筛选状态 ──
  const [categories, setCategories] = useState<CategoryFlat[]>([]);
  const [activeType, setActiveType] = useState<string | undefined>(undefined);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ── 加载分类 ──
  useEffect(() => {
    getCategories()
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setCategories(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // ── 获取帖子数据 ──
  const fetchPosts = useCallback(
    async (targetPage = 1, reset = false) => {
      try {
        const isLoadMore = targetPage > 1 && !reset;
        if (isLoadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const res = await getAllPosts(targetPage, POSTS_PER_PAGE, activeType);

        if (res.error) {
          setError(res.error);
          return;
        }

        const data = res.data;
        if (!data) return;

        if (isLoadMore) {
          setPosts((prev) => [...prev, ...(data.list as unknown as PostData[])]);
        } else {
          setPosts(data.list as unknown as PostData[]);
        }

        setPage(targetPage);
        setTotalPages(data.totalPages || 1);
      } catch (e: any) {
        setError(e.message || '加载帖子失败');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeType],
  );

  // ── 初始加载 ──
  useEffect(() => {
    fetchPosts(1, true);
  }, [fetchPosts]);

  // ── 类型切换重置 ──
  const handleTypeChange = (type: string | undefined) => {
    if (type === activeType) return;
    setActiveType(type);
    setPosts([]);
    setPage(1);
  };

  // ── 无限滚动（向下加载更多）──
  useEffect(() => {
    if (!bottomRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages && !loading && !loadingMore) {
          fetchPosts(page + 1);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [page, totalPages, loading, loadingMore, fetchPosts]);

  // ── 加载中 ──
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <main className="flex items-center justify-center min-h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <p className="text-gray-400">加载中...</p>
          </div>
        </main>
      </div>
    );
  }

  // ── 主内容 ──
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text)] tracking-tight">
            全部帖子
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            浏览社区中所有创作者的分享与作品展示
          </p>
        </div>

        {/* ── 类型筛选栏 ── */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => handleTypeChange(undefined)}
            className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeType === undefined
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => handleTypeChange('text')}
            className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeType === 'text'
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            💬 文字
          </button>
          <button
            onClick={() => handleTypeChange('3d_showcase')}
            className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeType === '3d_showcase'
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            🎨 作品展示
          </button>
        </div>

        {/* ── 错误态 ── */}
        {error && (
          <div className="mt-6 grid place-items-center">
            <div className="inline-block rounded-xl bg-red-500/20 px-8 py-6">
              <p className="text-lg font-semibold text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* ── 首次加载中 ── */}
        {loading && posts.length === 0 && !error && (
          <div className="mt-6 flex flex-col items-center gap-5">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <p className="text-gray-400">加载帖子中...</p>
          </div>
        )}

        {/* ── 空态 ── */}
        {!loading && posts.length === 0 && !error && (
          <div className="mt-6 grid place-items-center">
            <div className="inline-block rounded-xl bg-[var(--color-bg-card)] px-8 py-6 text-center">
              <p className="text-lg font-semibold text-[var(--color-text-secondary)]">
                {activeType === 'text'
                  ? '暂无文字帖'
                  : activeType === '3d_showcase'
                    ? '暂无作品展示帖'
                    : '还没有帖子，快来发布第一条吧！'}
              </p>
              {activeType && (
                <button
                  onClick={() => handleTypeChange(undefined)}
                  className="mt-3 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                >
                  查看全部帖子
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 帖子列表 ── */}
        {posts.length > 0 && (
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={toPostCardData(post)} />
            ))}
          </div>
        )}

        {/* ── 底部加载触发器 ── */}
        <div ref={bottomRef} className="min-h-[16px]">
          {loadingMore && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="text-gray-400">加载更多帖子...</p>
            </div>
          )}
        </div>

        {/* ── 加载完毕 ── */}
        {!loading && !loadingMore && page >= totalPages && posts.length > 0 && (
          <div className="mt-6 grid place-items-center">
            <div className="inline-block rounded-xl bg-green-500/20 px-8 py-6">
              <p className="text-lg font-semibold text-green-400">已经到底了！</p>
            </div>
          </div>
        )}

        {/* ── 未登录提示 ── */}
        {!authLoading && !isAuthenticated && (
          <div className="mt-12 text-center py-8 border-t border-white/5">
            <p className="text-gray-500 text-sm mb-4">登录后即可互动、发布帖子</p>
            <button
              onClick={() => router.push('/login?redirect=/posts')}
              className="min-h-[44px] px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all text-sm active:scale-95"
            >
              立即登录
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
