'use client';

import { useState, useEffect, useCallback } from 'react';
import { Comment, CommentData } from './Comment';
import { CommentCreate } from './CommentCreate';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface CommentsProps {
  postId: number;
}

export function Comments({ postId }: CommentsProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/comments?postId=${postId}`);
      if (!res.ok) throw new Error('加载评论失败');
      const data = await res.json();
      // Handle both array and wrapped response
      const list = Array.isArray(data) ? data : data.list || data.comments || [];
      setComments(list);
      setError(null);
    } catch (e: any) {
      setError(e.message || '加载评论失败');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleCreated = useCallback(() => {
    fetchComments();
  }, [fetchComments]);

  if (loading) {
    return (
      <div className="py-4 text-center">
        <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">加载评论中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">{error}</p>
        <button
          onClick={fetchComments}
          className="mt-2 text-xs text-[var(--color-primary)] hover:underline"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col divide-y divide-[var(--color-border)]">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <Comment
              key={comment.id}
              {...comment}
              postId={postId}
              onRefresh={fetchComments}
            />
          ))
        ) : (
          <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">
            暂无评论，来抢沙发吧
          </p>
        )}
      </div>
      <CommentCreate postId={postId} onCreated={handleCreated} />
    </div>
  );
}
