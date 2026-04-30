'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileText,
  Network,
  PieChart,
  Users,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { Card, buttonVariants } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import {
  getFamilyCompletionScore,
  getFamilyStatistics,
} from '@/lib/services/statistics-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { FamilySpace } from '@/types/domain';
import type { FamilyCompletionScore, FamilyStatistics } from '@/types/service';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

function sanitizeError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (/auth session missing/i.test(message)) return '请先登录';
  if (/permission|denied|forbidden|权限/i.test(message)) return '你暂无权限执行此操作';
  if (/failed|violates|duplicate key/i.test(message)) return fallback;
  return message;
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export default function FamilyStatisticsPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [statistics, setStatistics] = useState<FamilyStatistics | null>(null);
  const [completion, setCompletion] = useState<FamilyCompletionScore | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStatistics() {
      if (!hasSupabaseConfig()) {
        setError(SUPABASE_FALLBACK_MESSAGE);
        setState('error');
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

        const [familyStatistics, completionScore] = await Promise.all([
          getFamilyStatistics(currentFamily.id),
          getFamilyCompletionScore(currentFamily.id),
        ]);

        setFamily(currentFamily);
        setStatistics(familyStatistics);
        setCompletion(completionScore);
        setState(familyStatistics.totalPersons === 0 ? 'empty' : 'ready');
      } catch (loadError) {
        setError(sanitizeError(loadError, '加载家堂数据看板失败'));
        setState('error');
      }
    }

    loadStatistics();
  }, [router]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <p className="text-sm text-muted">加载中...</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <PageShell>
        <CenteredPanel text={error || '加载家堂数据看板失败'} />
      </PageShell>
    );
  }

  if (state === 'empty' || !family || !statistics || !completion) {
    return (
      <PageShell>
        <main className="mx-auto max-w-md px-4 py-6">
          <Card className="border-sand bg-card p-6 text-center">
            <p className="text-sm text-muted">暂无可统计的家人档案，请先添加亲属。</p>
            <Link
              href="/family/relatives/new"
              className={cn(buttonVariants({ variant: 'primary' }), 'mt-4 w-full')}
            >
              添加亲属
            </Link>
          </Card>
        </main>
      </PageShell>
    );
  }

  const claimRate = percent(statistics.claimedPersons, statistics.totalPersons);
  const memoryTotal = statistics.totalStories + statistics.totalPhotos + statistics.totalMeetings;

  return (
    <PageShell>
      <main className="mx-auto max-w-md space-y-4 px-4 py-6">
        <Card className="overflow-hidden border-pine/10 bg-pine text-cream">
          <div className="p-5">
            <p className="text-xs tracking-wider text-cream/60">家堂数据看板</p>
            <h1 className="mt-1 text-xl font-bold">{family.displayName ?? family.display_name}</h1>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <HeroMetric label="总人数" value={statistics.totalPersons} />
              <HeroMetric label="已认领" value={statistics.claimedPersons} />
              <HeroMetric label="完整度" value={`${completion.score}%`} />
            </div>
            <ProgressBar value={completion.score} className="mt-4 bg-cream/20" fillClassName="bg-gold" />
          </div>
        </Card>

        <section className="grid grid-cols-2 gap-3">
          <MetricCard icon={<Users size={18} />} label="待认领人数" value={statistics.unclaimedPersons} />
          <MetricCard icon={<Network size={18} />} label="关系总数" value={statistics.totalRelations} />
          <MetricCard icon={<FileText size={18} />} label="家族记忆" value={memoryTotal} />
          <MetricCard icon={<CalendarDays size={18} />} label="家庭节点" value={statistics.totalCalendarEvents} />
        </section>

        <Card className="border-sand bg-card p-4">
          <SectionHeader icon={<Users size={16} />} title="家人档案统计" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniStat label="在世" value={statistics.alivePersons} />
            <MiniStat label="已故" value={statistics.deceasedPersons} />
            <MiniStat label="未知" value={statistics.unknownLivingPersons} />
          </div>
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-muted">
              <span>已认领 / 待认领</span>
              <span>{claimRate}%</span>
            </div>
            <StackedBar
              first={statistics.claimedPersons}
              second={statistics.unclaimedPersons}
              total={statistics.totalPersons}
            />
          </div>
        </Card>

        <Card className="border-sand bg-card p-4">
          <SectionHeader icon={<Network size={16} />} title="关系完整度" />
          <div className="mt-3 space-y-3">
            <RelationRow label="父母 / 子女关系" value={statistics.parentRelations} total={statistics.totalRelations} />
            <RelationRow label="配偶关系" value={statistics.spouseRelations} total={statistics.totalRelations} />
            <RelationRow label="兄弟姐妹关系" value={statistics.siblingRelations} total={statistics.totalRelations} />
            <RelationRow label="祖辈关系" value={statistics.grandparentRelations} total={statistics.totalRelations} />
          </div>
        </Card>

        <Card className="border-sand bg-card p-4">
          <SectionHeader icon={<PieChart size={16} />} title="家族记忆统计" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniStat label="家族故事" value={statistics.totalStories} />
            <MiniStat label="相册记录" value={statistics.totalPhotos} />
            <MiniStat label="家族议事" value={statistics.totalMeetings} />
            <MiniStat label="议事意见" value={statistics.totalMeetingOpinions} />
            <MiniStat label="投票记录" value={statistics.totalMeetingVotes} />
            <MiniStat label="成果物" value={statistics.totalOutputs} />
          </div>
        </Card>

        <Card className="border-sand bg-card p-4">
          <SectionHeader icon={<CalendarDays size={16} />} title="家庭节点统计" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniStat label="日历事件" value={statistics.totalCalendarEvents} />
            <MiniStat label="生日提醒" value={statistics.birthdayEvents} />
            <MiniStat label="未来 30 天" value={statistics.upcomingEvents} />
          </div>
        </Card>

        <Card className="border-sand bg-card p-4">
          <SectionHeader icon={<CheckCircle2 size={16} />} title="家堂完整度" />
          <div className="mt-3 rounded-2xl bg-cream p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-charcoal">当前完成度</span>
              <span className="font-semibold text-pine">{completion.score}%</span>
            </div>
            <ProgressBar value={completion.score} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {completion.completedItems.slice(0, 6).map((item) => (
              <span key={item} className="rounded-full bg-pine/10 px-2.5 py-1 text-xs text-pine">
                {item}
              </span>
            ))}
          </div>
        </Card>

        <Card className="border-gold/30 bg-gold/10 p-4">
          <SectionHeader icon={<BarChart3 size={16} />} title="下一步建议" />
          {completion.nextSuggestions.length === 0 ? (
            <p className="mt-3 rounded-xl bg-card px-3 py-3 text-sm text-muted">
              当前家堂资料已经比较完整，可以继续整理家族故事和成果物。
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {completion.nextSuggestions.map((suggestion) => (
                <SuggestionItem key={suggestion} text={suggestion} />
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-2 pb-4">
          <Link href="/family/tree/graph" className={cn(buttonVariants({ variant: 'secondary' }), 'text-xs')}>
            查看关系图
          </Link>
          <Link href="/family/output" className={cn(buttonVariants({ variant: 'primary' }), 'text-xs')}>
            生成成果物
          </Link>
        </div>
      </main>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="家堂数据看板" backHref="/family" />
      {children}
    </div>
  );
}

function CenteredPanel({ text }: { text: string }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 text-center">
      <p className="rounded-2xl border border-sand/70 bg-card px-4 py-5 text-sm text-muted shadow-sm">{text}</p>
    </main>
  );
}

function HeroMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-cream/10 px-3 py-2">
      <p className="text-xs text-cream/60">{label}</p>
      <p className="mt-1 text-lg font-bold text-cream">{value}</p>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="border-sand bg-card p-4">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-pine/10 text-pine">
        {icon}
      </div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-charcoal">{value}</p>
    </Card>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pine/10 text-pine">{icon}</span>
      <h2 className="text-sm font-semibold text-charcoal">{title}</h2>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-cream px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-charcoal">{value}</p>
    </div>
  );
}

function ProgressBar({
  value,
  className,
  fillClassName,
}: {
  value: number;
  className?: string;
  fillClassName?: string;
}) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-sand', className)}>
      <div className={cn('h-full rounded-full bg-pine', fillClassName)} style={{ width: `${value}%` }} />
    </div>
  );
}

function StackedBar({ first, second, total }: { first: number; second: number; total: number }) {
  const firstWidth = percent(first, total);
  const secondWidth = percent(second, total);
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-sand">
      <div className="bg-pine" style={{ width: `${firstWidth}%` }} />
      <div className="bg-gold" style={{ width: `${secondWidth}%` }} />
    </div>
  );
}

function RelationRow({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium text-charcoal">{value}</span>
      </div>
      <ProgressBar value={percent(value, total)} />
    </div>
  );
}

function SuggestionItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm text-charcoal">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs text-gold">
        !
      </span>
      {text}
    </div>
  );
}
