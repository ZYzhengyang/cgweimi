'use client';

import { useState, useCallback, FormEvent } from 'react';
import { useAuth } from '@/store/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface CommentCreateProps {
  postId: number;
  onCreated?: () => void;
}

export function CommentCreate({ postId, onCreated }: CommentCreateProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const { user, token } = useAuth();

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending || !user || !token) return;

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ postId, content: content.trim() }),
      });
      if (res.ok) {
        setContent('');
        onCreated?.();
      }
    } catch {
      // 乐观更新：失败不提示，保留内容
    } finally {
      setSending(false);
    }
  }, [content, sending, user, token, postId, onCreated]);

  if (!user) {
    return (
      <div className="mt-2 border-t border-[var(--color-border)] py-4 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          请先登录后再发表评论
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 border-t border-[var(--color-border)] py-4">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary)] overflow-hidden">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            user.username.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex flex-1 flex-col">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的评论..."
            rows={2}
            className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-colors"
            style={{ backgroundColor: 'var(--color-bg-elevated)' }}
          />
        </div>

        <button
          type="submit"
          disabled={!content.trim() || sending}
          className="flex-shrink-0 self-end rounded-full p-2 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="发送"
        >
          {sending ? (
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
