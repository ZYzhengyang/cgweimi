'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PostCard from '@/components/PostCard';
import { api } from '@/lib/api';
import { useAuth } from '@/store/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface UserProfile {
  id: number;
  username: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  productCount: number;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

interface Post {
  id: number;
  author: { id: number; username: string; avatar?: string; isFollowing?: boolean };
  content: string;
  type: 'text' | 'image' | 'video' | '3d';
  media: { url: string; alt?: string }[];
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
}

interface Product {
  id: number;
  name: string;
  description: string;
  coverImage: string;
  price: number;
  category: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user: currentUser, token, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'posts' | 'products' | 'about'>('posts');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Parallax effect
  const coverRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const coverY = useTransform(scrollY, [0, 500], [0, 150]);

  // ── 获取用户标识（ID或用户名）──
  const getUserId = useCallback((): string => {
    const pathParts = window.location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    return lastPart;
  }, []);

  // ── 加载用户资料 ──
  const loadProfile = useCallback(async () => {
    const identifier = getUserId();
    setLoading(true);

    try {
      // 尝试按数字ID获取
      const isNumeric = /^\d+$/.test(identifier);
      let endpoint: string;

      if (isNumeric) {
        endpoint = `${API_BASE}/users/${identifier}`;
      } else {
        endpoint = `${API_BASE}/users/profile/${identifier}`;
      }

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const user = data.user || data;
      setProfile({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        coverImage: user.coverImage,
        bio: user.bio || 'CG创作者 · 分享3D数字艺术',
        productCount: user.productCount ?? user._count?.products ?? 0,
        postCount: user.postCount ?? user._count?.posts ?? 0,
        followerCount: user.followerCount ?? user._count?.followers ?? 0,
        followingCount: user.followingCount ?? user._count?.following ?? 0,
        isFollowing: user.isFollowing ?? false,
      });
      setIsFollowing(user.isFollowing ?? false);

      // 加载用户的帖子
      if (user.id) {
        try {
          const postsRes = await fetch(`${API_BASE}/users/${user.id}/posts?page=1&limit=20`, { headers });
          if (postsRes.ok) {
            const postsData = await postsRes.json();
            const postList = Array.isArray(postsData) ? postsData : postsData.list || [];
            setPosts(postList.map((p: any) => ({
              id: p.id,
              author: {
                id: p.user?.id ?? user.id,
                username: p.user?.username ?? user.username,
                avatar: p.user?.avatar ?? user.avatar,
                isFollowing: p.isAuthorFollowed ?? false,
              },
              content: p.content || '',
              type: p.type === '3d_showcase' ? 'image' : 'text',
              media: p.product?.coverImage ? [{ url: p.product.coverImage, alt: p.product.name }] : [],
              createdAt: p.createdAt,
              likes: p.likeCount ?? 0,
              comments: p.commentCount ?? 0,
              shares: 0,
              liked: p.isLiked ?? false,
            })));
          }
        } catch {}
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [getUserId, token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── 关注/取消关注 ──
  const toggleFollow = useCallback(async () => {
    if (!profile || !token) return;
    setFollowLoading(true);

    try {
      if (isFollowing) {
        await fetch(`${API_BASE}/users/${profile.id}/follow`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`${API_BASE}/users/${profile.id}/follow`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setIsFollowing(!isFollowing);
      setProfile((prev) => prev ? {
        ...prev,
        followerCount: isFollowing ? prev.followerCount - 1 : prev.followerCount + 1,
      } : prev);
    } catch {} finally {
      setFollowLoading(false);
    }
  }, [profile, token, isFollowing]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <main className="flex items-center justify-center min-h-[80vh]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <main className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold mb-2">用户不存在</h2>
            <p className="text-[var(--color-text-muted)] mb-4">该用户可能已更改用户名或账号不存在</p>
            <button onClick={() => router.push('/')} className="px-6 py-2 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-lg font-medium">
              返回首页
            </button>
          </div>
        </main>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />

      {/* Cover Photo */}
      <div ref={coverRef} className="h-64 sm:h-80 md:h-96 relative overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{ y: coverY }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-elevated)] via-[var(--color-primary)]/10 to-[var(--color-bg-elevated)]" />
          {profile.coverImage && (
            <img src={profile.coverImage} alt="" className="w-full h-full object-cover" />
          )}
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-transparent to-transparent" />
        {isOwnProfile && (
          <button className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/40 backdrop-blur-sm text-white text-xs rounded-lg hover:bg-black/60 transition-colors z-10">
            更换封面
          </button>
        )}
      </div>

      {/* Profile Info Section */}
      <div className="nav-content -mt-16 relative z-20">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
          {/* Avatar */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-[var(--color-bg)] bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-primary)]/10 flex items-center justify-center overflow-hidden shadow-xl shrink-0">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-[var(--color-primary)]">{profile.username.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{profile.username}</h1>
            <p className="text-[var(--color-text-secondary)] text-sm mt-1">{profile.bio}</p>

            {/* Stats */}
            <div className="flex gap-4 mt-3 text-sm">
              <span className="text-[var(--color-text-muted)]">
                <strong className="text-[var(--color-text)]">{profile.postCount}</strong> 动态
              </span>
              <span className="text-[var(--color-text-muted)]">
                <strong className="text-[var(--color-text)]">{profile.productCount}</strong> 作品
              </span>
              <span className="text-[var(--color-text-muted)]">
                <strong className="text-[var(--color-text)]">{profile.followerCount}</strong> 粉丝
              </span>
              <span className="text-[var(--color-text-muted)]">
                <strong className="text-[var(--color-text)]">{profile.followingCount}</strong> 关注
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 shrink-0">
            {isOwnProfile ? (
              <button className="px-4 py-2 border border-[var(--color-border)] text-sm font-medium rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors">
                编辑资料
              </button>
            ) : isAuthenticated ? (
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
                  isFollowing
                    ? 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-red-400/50 hover:text-red-400'
                    : 'bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:opacity-90'
                }`}
              >
                {followLoading ? '...' : isFollowing ? '已关注' : '+ 关注'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
          {[
            { key: 'posts' as const, label: '动态', icon: '📝' },
            { key: 'products' as const, label: '作品', icon: '🎨' },
            { key: 'about' as const, label: '关于', icon: 'ℹ️' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium transition-all relative ${
                activeTab === tab.key
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>{tab.label}
              {activeTab === tab.key && (
                <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-20">
          {activeTab === 'posts' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 max-w-2xl mx-auto"
            >
              {posts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="text-[var(--color-text-muted)]">暂无动态</p>
                </div>
              ) : (
                posts.map(post => <PostCard key={post.id} post={post} />)
              )}
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {products.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">🎨</div>
                  <p className="text-[var(--color-text-muted)]">暂无作品</p>
                </div>
              ) : (
                <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
                  {products.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="break-inside-avoid group cursor-pointer"
                      onClick={() => router.push(`/products/${product.id}`)}
                    >
                      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)]/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                        <div className="aspect-square bg-gradient-to-br from-[var(--color-primary)]/20 via-[var(--color-bg-elevated)] to-[var(--color-primary)]/10 flex items-center justify-center relative overflow-hidden">
                          {product.coverImage ? (
                            <img src={product.coverImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <span className="text-4xl opacity-30">🎨</span>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                        </div>
                        <div className="p-3">
                          <h3 className="text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-1">{product.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">{product.category}</span>
                            <span className="font-bold text-[var(--color-primary)] text-sm">¥{product.price}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-lg mx-auto"
            >
              <div className="rounded-2xl p-6 border border-[var(--color-border)]" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                <h3 className="text-lg font-bold mb-4">关于 @{profile.username}</h3>
                <p className="text-[var(--color-text-secondary)] leading-relaxed mb-4">
                  {profile.bio || '这位创作者还没有填写简介...'}
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <span className="text-[var(--color-primary)]">📅</span> 加入 CG微米
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <span className="text-[var(--color-primary)]">📍</span> CG创作者社区
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <span className="text-[var(--color-primary)]">🎨</span> 专注于3D数字艺术创作
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
