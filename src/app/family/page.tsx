'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  FilePenLine,
  Folder,
  GitBranch,
  Mail,
  Network,
  ScrollText,
  UserPlus,
  Users,
  CalendarDays,
  BarChart3,
} from 'lucide-react';
import type { FamilySpace, FamilyStory, PersonProfile } from '@/types/domain';
import { ensureProfile, getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace, listUserFamilySpaces } from '@/lib/services/family-service';
import { listFamilyPersons } from '@/lib/services/person-service';
import { listFamilyStories } from '@/lib/services/story-service';
import { listFamilyCalendarEvents } from '@/lib/services/calendar-service';
import { getTodayFocus, type TodayFocus } from '@/lib/home/today-focus';
import { MobilePage } from '@/components/wujia/MobileChrome';
import {
  HomeHeader,
  LastVisitCard,
  SecondaryAction,
  TodayHero,
  ActionCard,
  HomePanel,
  MemoryPreview,
} from '@/components/home';
import EmptyState from '@/components/wujia/EmptyState';
import { FadeIn, Stagger } from '@/components/motion';
import { getFamilyActivityLogs, getActivitySummary } from '@/lib/services/activity-service';

interface HomeData {
  family: FamilySpace;
  families: FamilySpace[];
  profiles: PersonProfile[];
  storiesCount: number;
  latestStory: FamilyStory | null;
  focus: TodayFocus;
  userEmail: string;
  recentNotice: { text: string; time: string } | null;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return '刚刚';
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

export default function FamilyPage() {
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) {
        setError('no-config');
        setLoading(false);
        return;
      }
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace(currentLoginRedirectPath());
          return;
        }
        await ensureProfile(user);
        const family = await getCurrentFamilySpace(undefined, user);
        if (!family) {
          router.replace('/create');
          return;
        }

        const [profiles, stories, events, families, activityLogs] = await Promise.all([
          listFamilyPersons(family.id),
          listFamilyStories(family.id),
          listFamilyCalendarEvents(family.id).catch(() => []),
          listUserFamilySpaces(undefined, user),
          getFamilyActivityLogs({ familyId: family.id, limit: 10 }).catch(() => []),
        ]);

        const activeStories = stories.filter((s) => s.status === 'active');
        const latestStory = activeStories[0] ?? null;
        const latestActivity = activityLogs[0] ?? null;

        const focus = getTodayFocus({
          currentUserId: user.id,
          family,
          profiles,
          events,
          storiesCount: activeStories.length,
        });

        setData({
          family,
          families,
          profiles,
          storiesCount: activeStories.length,
          latestStory,
          focus,
          userEmail: user.email ?? '',
          recentNotice: latestActivity
            ? { text: getActivitySummary(latestActivity), time: relativeTime(latestActivity.created_at) }
            : null,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) return <HomeSkeleton />;
  if (error === 'no-config') return <EmptyShell text="尚未配置 Supabase 环境变量" />;
  if (error || !data) return <EmptyShell text={error || '请先创建数字家堂'} />;

  const { family, families, profiles, latestStory, focus, userEmail, recentNotice } = data;
  const claimedCount = profiles.filter((p) => p.claim_status === 'claimed').length;
  const pendingCount = profiles.filter((p) => p.claim_status === 'unclaimed').length;
  const hasMembers = profiles.length > 0;
  const familyPreview = profiles.slice(0, 5);

  // 主 CTA：只保留一个显著入口，减少认知负担
  const primaryCTA = !hasMembers
    ? {
        href: '/family/relatives/new',
        icon: <UserPlus size={28} />,
        title: '添加第一位家人',
        description: '从录入父母、配偶或子女开始，搭起家族树',
      }
    : pendingCount > 0
    ? {
        href: '/family/invite',
        icon: <Mail size={28} />,
        title: '邀请家人认领',
        description: `还有 ${pendingCount} 位家人待认领，邀请他们补全自己的资料`,
      }
    : {
        href: '/family/stories',
        icon: <FilePenLine size={28} />,
        title: '补充一段人生记忆',
        description: '从一件小事开始，把家人的故事留下来',
      };

  return (
    <MobilePage>
      <main id="main" className="relative px-[18px] pb-safe-nav pt-4">
        <HomeHeader current={family} families={families.length > 0 ? families : [family]} />

        {/* 顶部欢迎卡 — 核心入口 */}
        <FadeIn delay={0.05} className="mt-4">
          <TodayHero
            focus={focus}
            totalMembers={profiles.length}
            claimedMembers={claimedCount}
            userFallbackName={userEmail.split('@')[0] || undefined}
          />
        </FadeIn>

        {/* 今日最该做的一件事 */}
        <FadeIn delay={0.1} className="mt-4">
          <Link
            href={primaryCTA.href}
            className="group relative flex items-center gap-4 overflow-hidden rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--walnut)] to-[var(--walnut-light)] p-4 text-white shadow-warm-md transition active:scale-[0.99]"
          >
            <span aria-hidden className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/12" />
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/16 text-white">
              {primaryCTA.icon}
            </span>
            <div className="relative min-w-0 flex-1">
              <p className="text-[16px] font-bold tracking-[0.02em]">{primaryCTA.title}</p>
              <p className="mt-0.5 text-[12px] leading-5 text-white/80">{primaryCTA.description}</p>
            </div>
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
              <ChevronRight size={18} />
            </span>
          </Link>
        </FadeIn>

        {/* 三个次级入口 */}
        <Stagger className="relative z-10 mt-3" stagger={0.05} delay={0.18}>
          <div className="grid grid-cols-3 gap-2">
            <Stagger.Item>
              <SecondaryAction href="/family/tree/graph" icon={<Network size={20} />} label="家族树" tone="walnut" />
            </Stagger.Item>
            <Stagger.Item>
              <SecondaryAction href="/family/stories" icon={<ScrollText size={20} />} label="人生记忆" tone="gold" />
            </Stagger.Item>
            <Stagger.Item>
              <SecondaryAction href="/family/invite" icon={<Mail size={20} />} label="邀请认领" tone="jade" />
            </Stagger.Item>
          </div>
        </Stagger>

        {/* 家族树概览 */}
        <FadeIn delay={0.26} className="mt-4">
          <HomePanel
            icon={<GitBranch size={18} />}
            title="家族树概览"
            href="/family/tree"
          >
            {!hasMembers ? (
              <EmptyState
                title="还没有家人档案"
                description="先添加父母、配偶或子女，开始建立家族树。"
                action={<Link href="/family/relatives/new" className="wj-primary flex min-h-[44px] items-center justify-center rounded-2xl px-5 text-sm font-semibold">添加亲属</Link>}
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-md)] border border-[var(--line-1)] bg-[var(--surface-2)] p-3 text-[12px] text-[var(--ink-3)]">
                  <div>
                    已录入 <span className="font-semibold text-[var(--ink-1)]">{profiles.length}</span> 位家人
                  </div>
                  <div>
                    已认领 <span className="font-semibold text-[var(--ink-1)]">{claimedCount}</span> 位
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {familyPreview.map((p) => (
                    <Link
                      key={p.id}
                      href={`/family/members/${p.id}`}
                      className="flex flex-col items-center gap-1"
                    >
                      <span className={`flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-semibold shadow-sm ${
                        p.claim_status === 'claimed'
                          ? 'bg-[var(--walnut)] text-white'
                          : 'bg-[var(--surface-3)] text-[var(--ink-2)]'
                      }`}>
                        {p.display_name?.charAt(0) ?? '家'}
                      </span>
                      <span className="max-w-[58px] truncate text-[11px] text-[var(--ink-3)]">{p.display_name}</span>
                    </Link>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Link href="/family/tree" className="wj-primary flex min-h-[44px] flex-1 items-center justify-center rounded-2xl text-sm font-semibold">进入三代谱</Link>
                  <Link href="/family/relatives/new" className="flex min-h-[44px] flex-1 items-center justify-center rounded-2xl border border-[var(--line-1)] bg-[var(--surface-1)] text-sm font-medium text-[var(--ink-2)]">添加成员</Link>
                </div>
              </div>
            )}
          </HomePanel>
        </FadeIn>

        {/* 最近动态 / 最近记忆 */}
        <FadeIn delay={0.32} className="mt-4 space-y-4">
          {recentNotice && (
            <div className="rounded-[var(--radius-md)] border border-[var(--line-1)] bg-[var(--surface-1)] px-4 py-3 shadow-warm-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold tracking-[0.12em] text-[var(--gold)]">最近动态</p>
                  <p className="mt-1 line-clamp-2 text-[14px] text-[var(--ink-2)]">{recentNotice.text}</p>
                </div>
                <span className="text-[12px] text-[var(--ink-3)] shrink-0">{recentNotice.time}</span>
              </div>
            </div>
          )}

          {latestStory ? (
            <LastVisitCard latestStory={latestStory} />
          ) : (
            <MemoryPreview
              title="还没有家族记忆"
              meta="记录第一段故事，让家族近况开始积累。"
              tag="故事"
            />
          )}
        </FadeIn>

        {/* 底部工具区 */}
        <Stagger className="relative z-10 mt-4" stagger={0.05} delay={0.38}>
          <div className="grid grid-cols-2 gap-2">
            <Stagger.Item>
              <ActionCard href="/family/photos" icon={<Folder size={20} />} label="家族相册" tone="jade" compact />
            </Stagger.Item>
            <Stagger.Item>
              <ActionCard href="/family/statistics" icon={<BarChart3 size={20} />} label="家堂数据" tone="gold" compact />
            </Stagger.Item>
            <Stagger.Item>
              <ActionCard href="/family/activity" icon={<CalendarDays size={20} />} label="家族动态" tone="walnut" compact />
            </Stagger.Item>
            <Stagger.Item>
              <ActionCard href="/family/settings" icon={<Users size={20} />} label="家堂设置" tone="jade" compact />
            </Stagger.Item>
          </div>
        </Stagger>
      </main>
    </MobilePage>
  );
}

/**
 * HomeSkeleton — 首页骨架屏（与首页新结构对齐）
 */
function HomeSkeleton() {
  return (
    <MobilePage>
      <div className="relative space-y-4 px-[18px] pb-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="wj-skeleton h-9 w-40" />
          <div className="wj-skeleton h-12 w-36 rounded-full" />
        </div>
        <div className="wj-skeleton h-[210px] rounded-[var(--radius-xl)]" />
        <div className="wj-skeleton h-[88px] rounded-[var(--radius-md)]" />
        <div className="grid grid-cols-3 gap-2">
          <div className="wj-skeleton h-[80px] rounded-[var(--radius-md)]" />
          <div className="wj-skeleton h-[80px] rounded-[var(--radius-md)]" />
          <div className="wj-skeleton h-[80px] rounded-[var(--radius-md)]" />
        </div>
        <div className="wj-skeleton h-[210px] rounded-[var(--radius-md)]" />
        <div className="wj-skeleton h-[88px] rounded-[var(--radius-md)]" />
        <div className="grid grid-cols-2 gap-2">
          <div className="wj-skeleton h-[88px] rounded-[var(--radius-md)]" />
          <div className="wj-skeleton h-[88px] rounded-[var(--radius-md)]" />
        </div>
      </div>
    </MobilePage>
  );
}

function EmptyShell({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-2)] px-4 text-center">
      <p className="mb-3 text-sm text-[var(--ink-3)]">{text}</p>
      <Link
        href="/create"
        className="min-h-[44px] rounded-2xl bg-[var(--walnut)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.97]"
      >
        创建我的姓氏家堂
      </Link>
    </div>
  );
}
