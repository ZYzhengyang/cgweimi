'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Comments } from '@/components/Comments';
import { HighlightedMentionsAndHashTags } from '@/components/HighlightedMentionsAndHashTags';
import { useAuth } from '@/store/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

// ─── 工具 ─────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const past = new Date(dateStr).getTime();
  const diff = Math.floor((now - past) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

// ─── 组件 ─────────────────────────────────────────

export default function PostDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { user, token, isAuthenticated } = useAuth();

  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // ── 获取帖子详情 ──
  const fetchPost = useCallback(async () => {
    if (!id || isNaN(id)) {
      setError('无效的帖子ID');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/posts/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('帖子不存在或已被删除');
        throw new Error('加载帖子失败');
      }
      const data: PostData = await res.json();
      setPost(data);
      setLiked(data.isLiked ?? false);
      setLikeCount(data.likeCount ?? 0);
      setFollowing(data.isAuthorFollowed ?? false);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // ── 点赞/取消点赞 ──
  const toggleLike = useCallback(async () => {
    if (!token) return;
    const prev = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));

    try {
      if (!liked) {
        await fetch(`${API_BASE}/posts/${id}/like`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`${API_BASE}/posts/${id}/like`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      setLiked(prev);
      setLikeCount(prevCount);
    }
  }, [liked, likeCount, id, token]);

  // ── 关注/取消关注 ──
  const toggleFollow = useCallback(async () => {
    if (!token || !post) return;
    setFollowLoading(true);
    try {
      if (following) {
        await fetch(`${API_BASE}/users/${post.user.id}/follow`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`${API_BASE}/users/${post.user.id}/follow`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setFollowing(!following);
    } catch {} finally {
      setFollowLoading(false);
    }
  }, [following, token, post]);

  // ── 内容中的高亮 ──
  const renderContent = (text: string) => {
    // 对 #hashtag 和 @mention 做简单高亮
    const parts = text.split(/(#[\w\u4e00-\u9fff]+|@[\w\u4e00-\u9fff]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <Link
            key={i}
            href={`/posts?search=${encodeURIComponent(part)}`}
            className="text-[var(--color-primary)] hover:underline"
          >
            {part}
          </Link>
        );
      }
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-[var(--color-primary)]">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // ── 加载中 ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <main className="flex items-center justify-center min-h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-text-muted)]">加载帖子中...</p>
          </div>
        </main>
      </div>
    );
  }

  // ── 错误 ──
  if (error || !post) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <main className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-bg-card)]">
              <svg className="h-8 w-8 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-[var(--color-text)]">
              {error || '帖子不存在'}
            </p>
            <Link
              href="/posts"
              className="mt-4 inline-block text-sm text-[var(--color-primary)] hover:underline"
            >
              ← 返回帖子列表
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const hasProduct = post.product && post.product.coverImage;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        {/* ── 帖子卡片 ── */}
        <article
          className="rounded-2xl border border-[var(--color-border)] p-5 sm:p-8"
          style={{ backgroundColor: 'var(--color-bg-card)' }}
        >
          {/* ── 作者信息行 ── */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Link href={`/profile/${post.user.id}`}>
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-primary)]/10 flex items-center justify-center text-sm font-bold text-[var(--color-primary)] overflow-hidden">
                  {post.user.avatar ? (
                    <img src={post.user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    post.user.username.charAt(0).toUpperCase()
                  )}
                </div>
              </Link>
              <div>
                <Link
                  href={`/profile/${post.user.id}`}
                  className="font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
                >
                  {post.user.username}
                </Link>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {timeAgo(post.createdAt)}
                  {post.type === '3d_showcase' && ' · 作品展示'}
                </p>
              </div>
            </div>

            {/* 关注按钮 */}
            {isAuthenticated && user?.id !== post.user.id && (
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className={`min-h-[36px] px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  following
                    ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-red-400/50 hover:text-red-400'
                    : 'bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:opacity-90'
                }`}
              >
                {followLoading ? '...' : following ? '已关注' : '+ 关注'}
              </button>
            )}
          </div>

          {/* ── 帖子内容 ── */}
          {post.content && (
            <div className="mb-5 text-[15px] leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap break-words">
              {renderContent(post.content)}
            </div>
          )}

          {/* ── 媒体展示 ── */}
          {hasProduct && (
            <div className="mb-5 overflow-hidden rounded-xl">
              <img
                src={post.product!.coverImage}
                alt={post.product!.name}
                className="w-full h-auto max-h-[480px] object-cover"
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-elevated)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                  </svg>
                  {post.product!.name}
                </span>
              </div>
            </div>
          )}

          {/* ── 互动栏 ── */}
          <div className="flex items-center justify-start gap-2 border-t border-[var(--color-border)] pt-4">
            {/* 点赞 */}
            <button
              onClick={toggleLike}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                liked
                  ? 'bg-red-500/10 text-red-400'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
              }`}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill={liked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {likeCount > 0 && <span className="font-medium">{likeCount}</span>}
              <span>赞</span>
            </button>

            {/* 评论 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--color-text-muted)]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              {post.commentCount > 0 && <span className="font-medium">{post.commentCount}</span>}
              <span>评论</span>
            </div>

            {/* 分享 */}
            <button
              onClick={() => {
                if (typeof navigator !== 'undefined') {
                  navigator.clipboard?.writeText(window.location.href);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>分享</span>
            </button>
          </div>
        </article>

        {/* ── 评论区 ── */}
        <div className="mt-4 rounded-2xl border border-[var(--color-border)] p-5 sm:p-8" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <h3 className="text-lg font-bold text-[var(--color-text)] mb-1">
            评论 ({post.commentCount || 0})
          </h3>
          <Comments postId={post.id} />
        </div>

        {/* ── 返回链接 ── */}
        <div className="mt-8 text-center">
          <Link
            href="/posts"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            返回帖子列表
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
