'use client';

import { useState, useCallback, memo } from 'react';
import { useAuth } from '@/store/authStore';
import { CommentCreate } from './CommentCreate';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface CommentData {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    avatar?: string | null;
  };
  likes: number;
  liked: boolean;
  replies: number;
  parentId?: number | null;
  repliesShown?: boolean;
}

interface CommentProps extends CommentData {
  postId: number;
  depth?: number;
  onRefresh: () => void;
}

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

export const Comment = memo(function Comment({
  id: commentId,
  content,
  createdAt,
  user: author,
  likes: initialLikes,
  liked: initialLiked,
  replies: initialReplies,
  parentId,
  postId,
  depth = 0,
  onRefresh,
}: CommentProps) {
  const { user, token } = useAuth();
  const isOwn = user?.id === author.id;

  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const toggleLike = useCallback(async () => {
    if (!token) return;
    const prev = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount(c => liked ? c - 1 : c + 1);

    try {
      if (!liked) {
        await fetch(`${API_BASE}/comments/${commentId}/like`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`${API_BASE}/comments/${commentId}/like`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      setLiked(prev);
      setLikeCount(prevCount);
    }
  }, [liked, likeCount, commentId, token]);

  const handleDelete = useCallback(async () => {
    if (!token || !confirm('确定删除这条评论？')) return;
    try {
      await fetch(`${API_BASE}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onRefresh();
    } catch {}
  }, [commentId, token, onRefresh]);

  const maxDepth = 2;
  const isReply = depth > 0;

  return (
    <div
      className={`flex gap-3 py-3 ${isReply ? 'ml-10 border-l-2 border-[var(--color-border)] pl-4' : ''}`}
      style={isReply ? { borderLeftColor: 'var(--color-border)' } : undefined}
    >
      {/* Avatar */}
      <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary)] overflow-hidden">
        {author.avatar ? (
          <img src={author.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          author.username.charAt(0).toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header: name + time */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {author.username}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {timeAgo(createdAt)}
          </span>
        </div>

        {/* Content */}
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed break-words">
          {content}
        </p>

        {/* Actions: like, reply, delete */}
        <div className="flex items-center gap-3 mt-2">
          {/* Like button */}
          <button
            onClick={toggleLike}
            className={`inline-flex items-center gap-1 text-xs transition-colors ${
              liked
                ? 'text-red-400'
                : 'text-[var(--color-text-muted)] hover:text-red-400'
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>

          {/* Reply button */}
          {depth < maxDepth && token && (
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 17 4 12 9 7" />
                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
              回复
            </button>
          )}

          {/* Delete (own comment) */}
          {isOwn && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              删除
            </button>
          )}

          {/* Show replies toggle */}
          {initialReplies > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
              {showReplies ? '收起回复' : `查看 ${initialReplies} 条回复`}
            </button>
          )}
        </div>

        {/* Reply input */}
        {showReplyInput && (
          <div className="mt-2">
            <CommentCreate
              postId={postId}
              onCreated={() => {
                setShowReplyInput(false);
                setShowReplies(true);
                onRefresh();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
});
