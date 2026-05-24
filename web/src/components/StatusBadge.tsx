'use client';

import { cn } from '@/lib/cn';

type StatusType =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending'
  | 'neutral';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  className?: string;
}

const STATUS_STYLES: Record<StatusType, string> = {
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20',
  pending: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  neutral: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const DOT_COLORS: Record<StatusType, string> = {
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  error: 'bg-red-400',
  info: 'bg-[var(--color-primary)]',
  pending: 'bg-gray-400',
  neutral: 'bg-gray-400',
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide',
        STATUS_STYLES[status],
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT_COLORS[status])} />
      {label}
    </span>
  );
}

// ─── Order status mapping ───

const ORDER_STATUS_MAP: Record<string, { status: StatusType; label: string }> = {
  pending: { status: 'pending', label: '待支付' },
  paid: { status: 'info', label: '已支付' },
  completed: { status: 'success', label: '已完成' },
  cancelled: { status: 'error', label: '已取消' },
  refunded: { status: 'warning', label: '已退款' },
};

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const config = ORDER_STATUS_MAP[status] || { status: 'neutral' as StatusType, label: status };
  return <StatusBadge status={config.status} label={config.label} className={className} />;
}

// ─── Membership tier mapping ───

const TIER_STATUS_MAP: Record<string, { status: StatusType; label: string }> = {
  starter: { status: 'neutral', label: '入门版' },
  creator: { status: 'info', label: '创作者' },
  studio: { status: 'warning', label: '工作室' },
  pro: { status: 'success', label: '专业版' },
};

export function TierBadge({ tier, className }: { tier: string; className?: string }) {
  const config = TIER_STATUS_MAP[tier] || { status: 'neutral' as StatusType, label: tier };
  return <StatusBadge status={config.status} label={config.label} className={className} />;
}
