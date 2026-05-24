'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/store/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ─── 类型 ─────────────────────────────────────────

interface DiscoverUser {
  id: number;
  username: string;
  avatar: string | null;
  bio?: string;
  followerCount: number;
  followingCount: number;
  productCount: number;
  isFollowing?: boolean;
}

// ─── 组件 ─────────────────────────────────────────

export default function DiscoverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, isAuthenticated } = useAuth();

  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ── 搜索用户 ──
  const fetchUsers = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', '20');

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/users?${params.toString()}`, { headers });

      if (!res.ok) {
        // 如果 /users 没有搜索功能，尝试 /users/discover
        const discoverRes = await fetch(`${API_BASE}/users/discover?${params.toString()}`, { headers });
        if (discoverRes.ok) {
          const data = await discoverRes.json();
          const list = Array.isArray(data) ? data : data.list || data.users || [];
          setUsers(list);
        } else {
          throw new Error('加载失败');
        }
      } else {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.list || data.users || [];
        setUsers(list);
      }
    } catch (e: any) {
      setError(e.message || '加载用户失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers(searchTerm);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 搜索防抖 ──
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    if (searchTimeout) clearTimeout(searchTimeout);

    const timeout = setTimeout(() => {
      // 更新 URL 参数
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }
      router.push(`/discover?${params.toString()}`, { scroll: false });

      fetchUsers(value);
    }, 500);

    setSearchTimeout(timeout);
  }, [searchTimeout, searchParams, router, fetchUsers]);

  // ── 关注/取消关注 ──
  const toggleFollow = useCallback(async (userId: number, currentlyFollowing: boolean) => {
    if (!token) return;

    // 乐观更新
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, isFollowing: !currentlyFollowing, followerCount: currentlyFollowing ? u.followerCount - 1 : u.followerCount + 1 }
          : u
      )
    );

    try {
      if (currentlyFollowing) {
        await fetch(`${API_BASE}/users/${userId}/follow`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`${API_BASE}/users/${userId}/follow`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // 回滚
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, isFollowing: currentlyFollowing, followerCount: currentlyFollowing ? u.followerCount + 1 : u.followerCount - 1 }
            : u
        )
      );
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 pt-24 pb-20">
        {/* ── 标题 ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
            发现创作者
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            探索CG社区中的优秀创作者，找到你感兴趣的3D艺术家
          </p>
        </div>

        {/* ── 搜索框 ── */}
        <div className="mb-8 sticky top-20 z-10">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="搜索创作者用户名或昵称..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all text-sm"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            />
          </div>
        </div>

        {/* ── 加载中 ── */}
        {loading && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-text-muted)]">加载创作者中...</p>
          </div>
        )}

        {/* ── 错误 ── */}
        {!loading && error && (
          <div className="text-center py-16">
            <p className="text-sm text-[var(--color-text-muted)]">{error}</p>
            <button
              onClick={() => fetchUsers(searchTerm)}
              className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
            >
              重试
            </button>
          </div>
        )}

        {/* ── 用户网格 ── */}
        {!loading && users.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)]/30 hover:shadow-lg transition-all"
                style={{ backgroundColor: 'var(--color-bg-card)' }}
              >
                {/* 头部装饰 */}
                <div className="h-20 bg-gradient-to-r from-[var(--color-primary)]/20 via-[var(--color-bg-elevated)] to-[var(--color-primary)]/10" />

                {/* 个人信息 */}
                <div className="px-4 pb-4 -mt-10">
                  <Link href={`/profile/${user.id}`} className="block">
                    <div className="h-20 w-20 rounded-full border-4 border-[var(--color-bg-card)] bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-primary)]/10 flex items-center justify-center overflow-hidden mx-auto">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-[var(--color-primary)]">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </Link>

                  <Link
                    href={`/profile/${user.id}`}
                    className="block mt-3 text-center"
                  >
                    <h3 className="text-lg font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors">
                      {user.username}
                    </h3>
                  </Link>

                  <p className="text-xs text-[var(--color-text-muted)] text-center mt-1 line-clamp-2 min-h-[2.5em]">
                    {user.bio || 'CG创作者'}
                  </p>

                  {/* 统计 */}
                  <div className="flex justify-center gap-4 mt-3">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      <strong className="text-[var(--color-text)]">{user.followerCount || 0}</strong> 粉丝
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      <strong className="text-[var(--color-text)]">{user.followingCount || 0}</strong> 关注
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      <strong className="text-[var(--color-text)]">{user.productCount || 0}</strong> 作品
                    </span>
                  </div>

                  {/* 关注按钮 */}
                  {isAuthenticated && (
                    <div className="flex justify-center mt-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFollow(user.id, !!user.isFollowing);
                        }}
                        className={`min-h-[36px] px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                          user.isFollowing
                            ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-red-400/50 hover:text-red-400'
                            : 'bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:opacity-90'
                        }`}
                      >
                        {user.isFollowing ? '已关注' : '+ 关注'}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── 空态 ── */}
        {!loading && users.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-bg-card)]">
              <svg className="h-8 w-8 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-[var(--color-text)]">
              {searchTerm ? '未找到相关创作者' : '暂无创作者'}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {searchTerm ? '试试其他关键词' : '成为第一个加入的创作者吧'}
            </p>
          </div>
        )}

        {/* ── 底部触发 ── */}
        <div ref={bottomRef} className="min-h-[8px]" />
      </main>

      <Footer />
    </div>
  );
}
