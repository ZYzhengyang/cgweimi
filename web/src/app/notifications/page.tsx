'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/store/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ─── 类型 ─────────────────────────────────────────

interface NotificationItem {
  id: number;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'MENTION' | 'SYSTEM';
  message: string;
  createdAt: string;
  read: boolean;
  actor?: {
    id: number;
    username: string;
    avatar: string | null;
  };
  targetId?: number;
  targetType?: 'post' | 'comment' | 'user';
}

// ─── 图标映射 ─────────────────────────────────────

const notificationIcons: Record<string, { icon: JSX.Element; label: string; color: string }> = {
  LIKE: {
    label: '赞',
    color: '#ef4444',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  COMMENT: {
    label: '评论',
    color: '#3b82f6',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  FOLLOW: {
    label: '关注',
    color: '#22c55e',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
  },
  MENTION: {
    label: '提及',
    color: '#a855f7',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" />
      </svg>
    ),
  },
  SYSTEM: {
    label: '系统',
    color: '#f59e0b',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
};

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

function getTargetLink(item: NotificationItem): string {
  if (item.targetType === 'post' && item.targetId) return `/posts/${item.targetId}`;
  if (item.targetType === 'user' && item.targetId) return `/profile/${item.targetId}`;
  return '#';
}

// ─── 组件 ─────────────────────────────────────────

export default function NotificationsPage() {
  const { user, token, isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const bottomRef = useRef<HTMLDivElement>(null);

  // ── 获取通知 ──
  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('加载通知失败');
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.list || data.notifications || [];
      setNotifications(list);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── 标记已读 ──
  const markAsRead = useCallback(async (notifId: number) => {
    if (!token) return;
    // 乐观更新
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    try {
      await fetch(`${API_BASE}/notifications/${notifId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }, [token]);

  // ── 全部标记已读 ──
  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }, [token]);

  // ── 过滤 ──
  const filtered = activeTab === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── 未登录 ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-24 pb-20">
          <div className="text-center py-16">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-bg-card)]">
              <svg className="h-8 w-8 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-[var(--color-text)]">请先登录</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">登录后即可查看通知</p>
            <Link
              href="/login?redirect=/notifications"
              className="mt-4 inline-block min-h-[44px] px-6 py-2.5 bg-[var(--color-primary)] text-[var(--color-primary-text)] font-bold rounded-xl text-sm transition-all hover:opacity-90"
            >
              立即登录
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        {/* ── 标题栏 ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--color-text)]">通知</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              全部标为已读
            </button>
          )}
        </div>

        {/* ── Tab 切换 ── */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`min-h-[40px] px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)]'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`min-h-[40px] px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'unread'
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)]'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            未读 {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {/* ── 加载中 ── */}
        {loading && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-text-muted)]">加载通知中...</p>
          </div>
        )}

        {/* ── 错误 ── */}
        {!loading && error && (
          <div className="text-center py-16">
            <p className="text-sm text-[var(--color-text-muted)]">{error}</p>
            <button
              onClick={fetchNotifications}
              className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
            >
              重试
            </button>
          </div>
        )}

        {/* ── 通知列表 ── */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {filtered.map((item) => {
              const iconInfo = notificationIcons[item.type] || notificationIcons.SYSTEM;
              const link = getTargetLink(item);

              return (
                <Link
                  key={item.id}
                  href={link}
                  onClick={() => !item.read && markAsRead(item.id)}
                  className={`flex items-start gap-3 py-4 px-3 -mx-3 rounded-xl transition-colors hover:bg-[var(--color-bg-elevated)] ${
                    !item.read ? 'bg-[var(--color-primary)]/5' : ''
                  }`}
                >
                  {/* 类型图标 */}
                  <div
                    className="flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${iconInfo.color}15`, color: iconInfo.color }}
                  >
                    {iconInfo.icon}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {item.actor?.avatar && (
                        <img
                          src={item.actor.avatar}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      )}
                      <span className="text-xs font-medium" style={{ color: iconInfo.color }}>
                        {iconInfo.label}
                      </span>
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-text)] line-clamp-2">
                      {item.message}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>

                  {/* 箭头 */}
                  <svg className="h-4 w-4 flex-shrink-0 mt-1 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── 空态 ── */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-bg-card)]">
              <svg className="h-7 w-7 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-[var(--color-text)]">
              {activeTab === 'unread' ? '没有未读通知' : '暂无通知'}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {activeTab === 'unread' ? '你已查看所有通知' : '当有人与你互动时会显示在这里'}
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
