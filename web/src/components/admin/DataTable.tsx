'use client';

import React from 'react';

// ─── 类型定义 ────────────────────────────────────────

interface Column<T> {
  key: string;
  header: string;
  cell: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  loadingRows?: number;
  className?: string;
  /** 行样式类名工厂 */
  rowClassName?: (item: T, index: number) => string;
}

// ─── 组件 ────────────────────────────────────────────

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField = 'id',
  onRowClick,
  emptyMessage = '暂无数据',
  loading = false,
  loadingRows = 5,
  className = '',
  rowClassName,
}: DataTableProps<T>) {
  // ── 加载骨架 ──
  if (loading) {
    return (
      <div className={`rounded-xl border border-[var(--color-border)] overflow-hidden ${className}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-bg-elevated)]/50 border-b border-[var(--color-border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left py-3 px-4 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wider ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: loadingRows }).map((_, i) => (
              <tr key={i} className="border-b border-[var(--color-border)]/30">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4">
                    <div className="h-4 bg-[var(--color-text)]/10 rounded animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── 空状态 ──
  if (data.length === 0) {
    return (
      <div className={`rounded-xl border border-[var(--color-border)] ${className}`}>
        <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
          <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // ── 数据表格 ──
  return (
    <div className={`rounded-xl border border-[var(--color-border)] overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-bg-elevated)]/50 border-b border-[var(--color-border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left py-3 px-4 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wider ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => {
              const key = (keyField in item) ? String(item[keyField]) : idx;
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(item)}
                  className={[
                    'border-b border-[var(--color-border)]/30 last:border-b-0',
                    'transition-colors duration-150',
                    onRowClick ? 'cursor-pointer hover:bg-[var(--color-primary)]/5' : '',
                    rowClassName ? rowClassName(item, idx) : '',
                  ].filter(Boolean).join(' ')}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3 px-4 text-[var(--color-text-secondary)] ${col.className || ''}`}
                    >
                      {col.cell(item, idx)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
