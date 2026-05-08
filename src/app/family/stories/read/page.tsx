'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listFamilyStories } from '@/lib/services/story-service';
import type { FamilySpace, FamilyStory } from '@/types/domain';
import { MobilePage, MobileStatusBar } from '@/components/wujia/MobileChrome';

export default function StoryReadPageWrapper() {
  return (
    <Suspense fallback={<CenteredText text="加载故事中..." />}>
      <StoryReadPage />
    </Suspense>
  );
}

function StoryReadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stories, setStories] = useState<FamilyStory[]>([]);
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const indexParam = Number(searchParams?.get('index') ?? '0');
  const [index, setIndex] = useState<number>(Number.isFinite(indexParam) ? Math.max(0, indexParam) : 0);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) {
        setError('尚未配置 Supabase 环境变量，请先配置 .env.local');
        setLoading(false);
        return;
      }
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace(currentLoginRedirectPath());
          return;
        }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) {
          router.replace('/create');
          return;
        }
        const records = await listFamilyStories(currentFamily.id);
        const active = records
          .filter((story) => story.status === 'active')
          .sort((a, b) => {
            const ay = a.story_year ?? 0;
            const by = b.story_year ?? 0;
            if (ay !== by) return ay - by;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
        setFamily(currentFamily);
        setStories(active);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载家族故事失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const safeIndex = useMemo(() => Math.min(Math.max(0, index), Math.max(0, stories.length - 1)), [index, stories.length]);
  const current = stories[safeIndex];
  const total = stories.length;
  const progress = total > 0 ? ((safeIndex + 1) / total) * 100 : 0;

  function go(delta: 1 | -1) {
    if (total === 0) return;
    const next = safeIndex + delta;
    if (next < 0 || next >= total) return;
    setDirection(delta);
    setIndex(next);
    const url = new URL(window.location.href);
    url.searchParams.set('index', String(next));
    window.history.replaceState({}, '', url.toString());
  }

  if (loading) return <CenteredText text="加载故事中..." />;
  if (error || !family) return <CenteredText text={error || '请先创建数字家堂'} />;
  if (total === 0) {
    return (
      <MobilePage withBottomNav={false}>
        <MobileStatusBar />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F1E5D6] text-[#9B6A37]">
            <BookOpen size={28} />
          </div>
          <h1 className="mt-5 text-[22px] font-bold text-[#2A1D16]">还没有家族故事</h1>
        <p className="mt-2 text-[13px] leading-6 text-[#78675B]">先去“人生记忆”添加几段故事，再回来进入连读模式。</p>
          <Link href="/family/stories" className="mt-6 flex min-h-[44px] items-center rounded-[14px] bg-[#5A3825] px-5 text-sm font-semibold text-white">
            去记录第一条故事
          </Link>
        </div>
      </MobilePage>
    );
  }

  return (
    <MobilePage withBottomNav={false}>
      <MobileStatusBar />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-[var(--surface-2)]/85 px-5 backdrop-blur-md">
          <Link href="/family/stories" className="flex h-11 w-11 items-center justify-center rounded-full text-[#5A3524] hover:bg-[#F1E5D6]" aria-label="退出连读">
            <X size={22} />
          </Link>
          <div className="flex flex-col items-center">
            <span className="text-[12px] tracking-[0.18em] text-[#8C7768]">连读模式</span>
            <span className="text-[14px] font-semibold text-[#2A1D16]">{safeIndex + 1} / {total}</span>
          </div>
          <div className="w-11" />
        </header>

        <div className="px-5">
          <div className="h-1 overflow-hidden rounded-full bg-[#EBDDC0]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#B8924E] to-[#8B5A3C]"
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            />
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden px-5 py-6">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.article
              key={current.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 40 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) go(1);
                else if (info.offset.x > 60) go(-1);
              }}
              className="mx-auto h-full w-full overflow-y-auto rounded-[22px] border border-[#E7D9C9] bg-white/86 p-6 shadow-[0_14px_34px_rgba(90,53,36,0.08)] backdrop-blur"
            >
              <header className="mb-5 border-b border-[#EEE3D6] pb-4">
                <p className="text-[12px] tracking-[0.16em] text-[#8C7768]">
                  {current.story_year ? `${current.story_year} 年` : '岁月里'} · {family.surname}氏家堂
                </p>
                <h1 className="mt-2 font-serif text-[28px] font-bold leading-tight text-[#2A1D16]">{current.title}</h1>
              </header>

              <div className="space-y-4 text-[16px] leading-[1.95] text-[#5A3524]">
                {(current.content?.split(/\n+/) ?? ['这段故事尚未记录正文。']).map((para, i) => (
                  <p key={i} className="indent-[2em]">{para}</p>
                ))}
              </div>

              <footer className="mt-8 flex items-center justify-between border-t border-[#EEE3D6] pt-4 text-[12px] text-[#78675B]">
                <span>记于 {new Date(current.created_at).toLocaleDateString('zh-CN')}</span>
                <span>{current.related_person_ids?.length ?? 0} 位家人相关</span>
              </footer>
            </motion.article>
          </AnimatePresence>
        </div>

        <nav className="sticky bottom-0 z-20 flex items-center justify-between border-t border-[#E7D9C9] bg-[var(--surface-2)]/90 px-5 py-3 backdrop-blur-md" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={safeIndex === 0}
            className="flex min-h-[48px] items-center gap-2 rounded-full border border-[#E7D9C9] bg-white/86 px-5 text-[14px] font-medium text-[#5A3524] transition-colors disabled:opacity-40"
          >
            <ChevronLeft size={18} /> 上一篇
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={safeIndex >= total - 1}
            className="flex min-h-[48px] items-center gap-2 rounded-full bg-[#5A3825] px-5 text-[14px] font-semibold text-white shadow-[0_10px_22px_rgba(90,53,36,0.18)] transition active:scale-[0.97] disabled:opacity-40"
          >
            下一篇 <ChevronRight size={18} />
          </button>
        </nav>
      </div>
    </MobilePage>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <MobilePage withBottomNav={false}>
      <MobileStatusBar />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 text-center">
        <p className="rounded-[15px] border border-[#E7D9C9] bg-white/82 px-4 py-5 text-sm text-[#78675B] shadow-[0_10px_28px_rgba(90,53,36,0.06)]">{text}</p>
      </div>
    </MobilePage>
  );
}
