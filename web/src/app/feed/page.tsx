'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Posts from '@/components/Posts';
import { useAuth } from '@/store/authStore';
import { getCategories } from '@/lib/communityApi';

const QUICK_CATEGORIES = [
  { name: '全部', icon: '🔥' },
  { name: '原画', icon: '🎨' },
  { name: '模型', icon: '🎭' },
  { name: '动作', icon: '🏃' },
  { name: '特效', icon: '💥' },
  { name: '场景', icon: '🏞️' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const fabVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
  hover: { scale: 1.08 },
  tap: { scale: 0.95 },
};

export default function FeedPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [showFab, setShowFab] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const onScroll = () => setShowFab(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    getCategories().then(r => {
      if (r.data) setCategories(r.data.slice(0, 5));
    }).catch(() => {});
  }, []);

  const goCompose = useCallback(() => router.push('/compose'), [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <main className="flex items-center justify-center min-h-[80vh]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-elevated)]/50 via-[var(--color-bg)] to-[var(--color-bg)] pointer-events-none" />
        <motion.div className="relative w-full px-4 sm:px-6 lg:px-8" variants={fadeUp} initial="hidden" animate="visible">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
              <span className="text-xs font-medium text-[var(--color-primary)] tracking-wider uppercase">CG Creator Community</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4">
              <span className="text-gradient-bayc">社区动态</span>
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto leading-relaxed">
              发现 CG 创作者的精彩作品，分享你的创作灵感
            </p>
          </div>

          <div className="flex justify-center gap-8 sm:gap-12 mb-10">
            {[{ value: '1,141', label: '作品' },{ value: '15', label: '创作者' },{ value: '5', label: '分类' }].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tabular-nums">{s.value}</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_CATEGORIES.map(cat => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat.name
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)] shadow-lg shadow-[var(--color-primary)]/20 scale-105'
                    : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                }`}
              >
                <span className="mr-1.5">{cat.icon}</span>{cat.name}
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Main */}
      <main className="w-full px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <Posts type="feed" />
          </div>

          <aside className="hidden lg:block space-y-6">
            <div className="rounded-2xl p-5 border border-[var(--color-border)]" style={{ backgroundColor: 'var(--color-bg-card)' }}>
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">📢 关于社区</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                CG微米是一个面向 CG 创作者的社区平台。分享你的 3D 模型、原画、动画作品，与全球创作者交流。
              </p>
            </div>

            <div className="rounded-2xl p-5 border border-[var(--color-border)]" style={{ backgroundColor: 'var(--color-bg-card)' }}>
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">🔥 热门分类</h3>
              <div className="space-y-2">
                {categories.map((cat: any) => (
                  <button key={cat.id} onClick={() => router.push(`/products?category=${cat.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors group">
                    <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text)]">{cat.name}</span>
                    <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded-full">{cat.count || 0}</span>
                  </button>
                ))}
              </div>
            </div>

            {!isAuthenticated && (
              <div className="rounded-2xl p-6 text-center border border-dashed border-[var(--color-primary)]/30"
                style={{ backgroundColor: 'var(--color-primary)' + '08' }}>
                <div className="text-3xl mb-3">🚀</div>
                <h3 className="font-bold text-[var(--color-text)] mb-2">加入 CG 社区</h3>
                <p className="text-xs text-[var(--color-text-muted)] mb-4">分享你的作品，与创作者交流</p>
                <button onClick={() => router.push('/register')}
                  className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] hover:opacity-90 text-[var(--color-primary-text)] font-bold text-sm transition-all">
                  立即注册
                </button>
                <button onClick={() => router.push('/login')}
                  className="w-full py-2 mt-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] text-sm transition-colors">
                  已有账号？登录
                </button>
              </div>
            )}
          </aside>
        </div>
      </main>

      <motion.button onClick={goCompose} variants={fabVariants} initial="hidden"
        animate={showFab ? 'visible' : 'hidden'} whileHover="hover" whileTap="tap"
        className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-text)] flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/30 hover:opacity-90 transition-all"
        aria-label="发布动态">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </motion.button>

      <Footer />
    </div>
  );
}
