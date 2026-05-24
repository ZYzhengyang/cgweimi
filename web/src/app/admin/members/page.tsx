'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/store/authStore';

interface MemberItem {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
  isActive: boolean;
  avatar: string | null;
  phone: string | null;
  phoneVerified: boolean;
  realName: string | null;
  verifyStatus: string;
  membershipTier: string;
  membershipExpiry: string | null;
  membershipAutoRenew: boolean;
  totalPoints: number;
  availablePoints: number;
  frozenPoints: number;
  freeDownloads: number;
  lastCheckInDate: string | null;
  consecutiveDays: number;
  totalCheckIns: number;
  invitedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface MemberListData {
  data: MemberItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    total: number;
  };
}

interface MemberStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  expiredMembers: number;
  tierDistribution: { tier: string; count: number }[];
  totalPoints: number;
  todayNewUsers: number;
  verifyDistribution: { status: string; count: number }[];
}

const tierLabel: Record<string, string> = {
  starter: '入门', creator: '创作者', studio: '工作室', pro: '专业版',
  FREE: '普通用户', BRONZE: '青铜', SILVER: '白银', GOLD: '黄金', PLATINUM: '铂金', DIAMOND: '钻石',
};

const tierColor: Record<string, string> = {
  starter: 'text-[var(--color-text-muted)]', creator: 'text-[var(--color-primary)]',
  studio: 'text-[var(--color-primary)]', pro: 'text-[var(--color-primary)]',
  FREE: 'text-[var(--color-text-muted)]', BRONZE: 'text-[var(--color-primary)]',
  SILVER: 'text-[var(--color-text-secondary)]', GOLD: 'text-[var(--color-primary)]',
  PLATINUM: 'text-[var(--color-primary)]', DIAMOND: 'text-[var(--color-primary)]',
};

const validLevels = ['starter', 'creator', 'studio', 'pro'];

export default function AdminMembers() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<MemberListData | null>(null);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editUser, setEditUser] = useState<MemberItem | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const pageSize = 20;

  const fetchMembers = useCallback(async (p: number, kw: string, lv: string, st: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(pageSize) });
    if (kw) params.set('search', kw);
    if (lv) params.set('level', lv);
    if (st) params.set('status', st);
    try {
      const res = await api.get(`/members/admin/all?${params}`);
      if (res.data) setData(res.data as MemberListData);
    } catch { /* handled by api */ }
    finally { setLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/members/admin/stats');
      if (res.data) setStats(res.data as MemberStats);
    } catch { /* handled by api */ }
  }, []);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user?.isAdmin)) {
      router.push('/');
      return;
    }
    if (isAuthenticated && user?.isAdmin) {
      fetchMembers(page, keyword, levelFilter, statusFilter);
      fetchStats();
    }
  }, [authLoading, isAuthenticated, user, page, keyword, levelFilter, statusFilter, fetchMembers, fetchStats, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMembers(1, keyword, levelFilter, statusFilter);
  };

  const handleStatusToggle = async (m: MemberItem) => {
    const newStatus = m.isActive ? 'inactive' : 'active';
    const action = m.isActive ? '禁用' : '启用';
    if (!window.confirm(`确定要${action}用户 "${m.username}" 吗？`)) return;
    const res = await api.put(`/members/admin/${m.id}/status`, { status: newStatus });
    if (!res.error) {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((x) =>
            x.id === m.id ? { ...x, isActive: !x.isActive } : x
          ),
        };
      });
    }
  };

  const handleDelete = async (m: MemberItem) => {
    if (!window.confirm(`确定要永久删除用户 "${m.username}" 吗？此操作不可撤销。`)) return;
    const res = await api.delete(`/members/admin/${m.id}`);
    if (!res.error) {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.filter((x) => x.id !== m.id),
          pagination: { ...prev.pagination, total: prev.pagination.total - 1 },
        };
      });
    }
  };

  const openEdit = (m: MemberItem) => {
    setEditUser(m);
    setEditForm({
      membershipTier: m.membershipTier || 'starter',
      totalPoints: m.totalPoints ?? 0,
      availablePoints: m.availablePoints ?? 0,
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    // Update tier if changed
    if (editForm.membershipTier !== editUser.membershipTier) {
      await api.put(`/members/admin/${editUser.id}/level`, { level: editForm.membershipTier });
    }
    // Update points if changed
    const pointsDiff = (editForm.totalPoints ?? 0) - (editUser.totalPoints ?? 0);
    if (pointsDiff !== 0) {
      await api.put(`/members/admin/${editUser.id}/points`, {
        points: pointsDiff,
        reason: '管理员手动调整',
      });
    }
    setEditUser(null);
    fetchMembers(page, keyword, levelFilter, statusFilter);
    fetchStats();
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/members/admin/export', {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('userToken') || localStorage.getItem('userToken')}`,
        },
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `members-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('导出失败，请稍后再试');
    }
  };

  if (authLoading || !isAuthenticated || !user?.isAdmin) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-[var(--color-text)]/5 rounded" />
        <div className="h-10 bg-[var(--color-text)]/5 rounded-lg" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 bg-[var(--color-text)]/5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">会员管理</h1>
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-text-muted)] text-sm">
            共 {data?.pagination?.total ?? 0} 位会员
          </span>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-[var(--color-text)]/5 text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-text)]/10 transition-colors"
          >
            导出CSV
          </button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-6 bg-[var(--color-text)]/5 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === 'list'
              ? 'bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          会员列表
        </button>
        <button
          onClick={() => { setActiveTab('stats'); fetchStats(); }}
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === 'stats'
              ? 'bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          数据统计
        </button>
      </div>

      {activeTab === 'stats' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--color-text)]/5 border border-[var(--color-border)] rounded-xl p-4">
            <div className="text-[var(--color-text-muted)] text-xs mb-1">总用户</div>
            <div className="text-2xl font-bold text-[var(--color-text)]">{stats?.totalUsers ?? '-'}</div>
          </div>
          <div className="bg-[var(--color-text)]/5 border border-[var(--color-border)] rounded-xl p-4">
            <div className="text-[var(--color-text-muted)] text-xs mb-1">活跃用户</div>
            <div className="text-2xl font-bold text-[var(--color-success)]">{stats?.activeUsers ?? '-'}</div>
          </div>
          <div className="bg-[var(--color-text)]/5 border border-[var(--color-border)] rounded-xl p-4">
            <div className="text-[var(--color-text-muted)] text-xs mb-1">过期会员</div>
            <div className="text-2xl font-bold text-[var(--color-danger)]">{stats?.expiredMembers ?? '-'}</div>
          </div>
          <div className="bg-[var(--color-text)]/5 border border-[var(--color-border)] rounded-xl p-4">
            <div className="text-[var(--color-text-muted)] text-xs mb-1">今日新增</div>
            <div className="text-2xl font-bold text-[var(--color-primary)]">{stats?.todayNewUsers ?? '-'}</div>
          </div>
          {stats?.tierDistribution && stats.tierDistribution.length > 0 && (
            <div className="col-span-2 md:col-span-4 bg-[var(--color-text)]/5 border border-[var(--color-border)] rounded-xl p-4">
              <div className="text-[var(--color-text-muted)] text-xs mb-3">会员等级分布</div>
              <div className="flex gap-4 flex-wrap">
                {stats.tierDistribution.map((t) => (
                  <div key={t.tier} className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${tierColor[t.tier] || 'text-[var(--color-text-secondary)]'}`}>
                      {tierLabel[t.tier] || t.tier}
                    </span>
                    <span className="text-sm text-[var(--color-text)] font-semibold">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 筛选栏 */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索用户名、邮箱、手机号..."
            className="flex-1 min-w-[200px] px-4 py-2 bg-[var(--color-text)]/5 border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]/50"
          />
          <select
            value={levelFilter}
            onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50"
          >
            <option value="">全部等级</option>
            {validLevels.map((l) => (
              <option key={l} value={l} className="bg-[var(--color-bg-card)]">{tierLabel[l] || l}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50"
          >
            <option value="">全部状态</option>
            <option value="active">已激活</option>
            <option value="inactive">已禁用</option>
            <option value="expired">已过期</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            搜索
          </button>
          {(keyword || levelFilter || statusFilter) && (
            <button
              type="button"
              onClick={() => { setKeyword(''); setLevelFilter(''); setStatusFilter(''); setPage(1); fetchMembers(1, '', '', ''); }}
              className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              清除
            </button>
          )}
        </div>
      </form>

      {/* 表格 */}
      {activeTab === 'list' && (
        <div className="bg-[var(--color-text)]/5 border border-[var(--color-border)] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-14 bg-[var(--color-text)]/5 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-4 font-medium">用户</th>
                    <th className="text-left py-3 px-4 font-medium">邮箱/手机</th>
                    <th className="text-center py-3 px-4 font-medium">会员等级</th>
                    <th className="text-center py-3 px-4 font-medium">米金</th>
                    <th className="text-center py-3 px-4 font-medium">会员到期</th>
                    <th className="text-center py-3 px-4 font-medium">状态</th>
                    <th className="text-right py-3 px-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.length ? (
                    data.data.map((m) => (
                      <tr key={m.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-text)]/5 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {m.avatar ? (
                              <img src={m.avatar} alt="" className="w-8 h-8 rounded-full object-cover bg-[var(--color-bg-elevated)]" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center text-[var(--color-text-muted)] text-xs">
                                {m.username?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div>
                              <div className="text-[var(--color-text)]">{m.username}</div>
                              <div className="text-xs text-[var(--color-text-muted)]">
                                {m.realName && `${m.realName} · `}ID: {m.id}
                                {m.isAdmin && <span className="ml-1 text-[var(--color-primary)]">· 管理员</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[var(--color-text-secondary)]">{m.email}</div>
                          {m.phone && <div className="text-xs text-[var(--color-text-muted)]">{m.phone}</div>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={tierColor[m.membershipTier] || 'text-[var(--color-text-secondary)]'}>
                            {tierLabel[m.membershipTier] || m.membershipTier || '入门'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="text-[var(--color-text)]">{m.availablePoints}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">/ {m.totalPoints} 总</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {m.membershipExpiry ? (
                            <span className={`text-xs ${
                              new Date(m.membershipExpiry) < new Date()
                                ? 'text-[var(--color-danger)]'
                                : 'text-[var(--color-text-secondary)]'
                            }`}>
                              {new Date(m.membershipExpiry).toLocaleDateString('zh-CN')}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--color-text-muted)]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            m.isActive
                              ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                              : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                          }`}>
                            {m.isActive ? '正常' : '已禁用'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(m)}
                              className="px-3 py-1 rounded text-xs bg-[var(--color-text)]/5 text-[var(--color-text-secondary)] hover:bg-[var(--color-text)]/10 transition-colors"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleStatusToggle(m)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                m.isActive
                                  ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20'
                                  : 'bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20'
                              }`}
                            >
                              {m.isActive ? '禁用' : '启用'}
                            </button>
                            <button
                              onClick={() => handleDelete(m)}
                              className="px-2 py-1 rounded text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[var(--color-text-muted)]">暂无会员数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 分页 */}
      {activeTab === 'list' && data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 text-sm">
          <span className="text-[var(--color-text-muted)]">
            第 {data.pagination.currentPage} / {data.pagination.totalPages} 页
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded bg-[var(--color-text)]/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-30 transition-colors"
            >
              上一页
            </button>
            {Array.from({ length: Math.min(data.pagination.totalPages, 7) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 3, data.pagination.totalPages - 6));
              const pn = start + i;
              if (pn > data.pagination.totalPages) return null;
              return (
                <button
                  key={pn}
                  onClick={() => setPage(pn)}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    pn === page ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)] font-medium' : 'bg-[var(--color-text)]/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {pn}
                </button>
              );
            })}
            <button
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              className="px-3 py-1.5 rounded bg-[var(--color-text)]/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-30 transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditUser(null)}>
          <div
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">编辑会员 - {editUser.username}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">会员等级</label>
                <select
                  value={editForm.membershipTier}
                  onChange={(e) => setEditForm({ ...editForm, membershipTier: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50"
                >
                  {validLevels.map((t) => (
                    <option key={t} value={t} className="bg-[var(--color-bg-card)]">{tierLabel[t] || t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">总米金</label>
                <input
                  type="number"
                  value={editForm.totalPoints}
                  onChange={(e) => setEditForm({ ...editForm, totalPoints: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  当前值: {editUser.totalPoints}，差值将作为调整依据
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setEditUser(null)}
                className="flex-1 py-2 bg-[var(--color-text)]/5 text-[var(--color-text-secondary)] rounded-lg hover:text-[var(--color-text)] transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
