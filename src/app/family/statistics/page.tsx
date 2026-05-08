'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, CalendarDays, CheckCircle2, FileText, Network, PieChart, Users } from 'lucide-react';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { getFamilyCompletionScore, getFamilyStatistics } from '@/lib/services/statistics-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { FamilySpace } from '@/types/domain';
import type { FamilyCompletionScore, FamilyStatistics } from '@/types/service';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

function sanitizeError(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : fallback;
  if (/auth session missing/i.test(msg)) return '请先登录';
  if (/permission|denied|forbidden|权限/i.test(msg)) return '你暂无权限执行此操作';
  if (/failed|violates|does not exist|could not find/i.test(msg)) return fallback;
  return fallback;
}
function percent(value: number, total: number): number { if (total <= 0) return 0; return Math.round((value / total) * 100); }

export default function FamilyStatisticsPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [statistics, setStatistics] = useState<FamilyStatistics | null>(null);
  const [completion, setCompletion] = useState<FamilyCompletionScore | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setState('error'); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        const [familyStatistics, completionScore] = await Promise.all([getFamilyStatistics(currentFamily.id), getFamilyCompletionScore(currentFamily.id)]);
        setFamily(currentFamily); setStatistics(familyStatistics); setCompletion(completionScore);
        setState(familyStatistics.totalPersons === 0 ? 'empty' : 'ready');
      } catch (e) { setError(sanitizeError(e, '加载家堂数据看板失败')); setState('error'); }
    }
    load();
  }, [router]);

  if (state === 'loading') return <div className="wj-page flex min-h-screen items-center justify-center"><p className="text-sm text-[var(--ink-3)]">加载中...</p></div>;
  if (state === 'error') return <S><P text={error || '加载失败'} /></S>;
  if (state === 'empty' || !family || !statistics || !completion) return <S><main className="relative z-10 px-5 pb-6"><div className="rounded-[15px] border border-[#E7D9C9] bg-white/82 p-6 text-center shadow-[0_10px_28px_rgba(90,53,36,0.06)]"><p className="text-sm text-[#78675B]">暂无可统计的家人档案，请先添加亲属。</p><Link href="/family/relatives/new" className="mt-4 inline-flex min-h-[44px] items-center rounded-[13px] bg-[#5A3825] px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(90,53,36,0.18)]">添加亲属</Link></div></main></S>;

  const claimRate = percent(statistics.claimedPersons, statistics.totalPersons);
  const memoryTotal = statistics.totalStories + statistics.totalPhotos + statistics.totalMeetings;

  return (
    <S>
      <main className="relative z-10 space-y-4 px-5 pb-6">
        <section className="overflow-hidden rounded-[15px] border border-[#E7D9C9] bg-white/76 p-5 shadow-[0_10px_28px_rgba(90,53,36,0.07)]">
          <p className="text-[13px] font-medium tracking-[0.18em] text-[#9B6A37]">家堂数据看板</p>
          <h1 className="mt-1 text-[24px] font-bold text-[#2A1D16]">{family.displayName ?? family.display_name}</h1>
          <p className="mt-2 text-[13px] leading-6 text-[#78675B]">把家人、关系、记忆与家庭节点整理成可理解的数据概览。</p>
          <div className="grid grid-cols-3 gap-2">
            <HM label="总人数" value={statistics.totalPersons} />
            <HM label="已认领" value={statistics.claimedPersons} />
            <HM label="完整度" value={`${completion.score}%`} />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#EFE6D8]">
            <div
              className="h-full rounded-full bg-[#C57945] transition-all duration-500"
              style={{ width: `${completion.score}%` }}
            />
          </div>
        </section>

        {(statistics.warnings?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-warning-light bg-warning-light p-4"><p className="text-sm font-semibold text-warning">部分统计项暂不可用</p><ul className="mt-2 space-y-1 text-xs text-[var(--ink-3)]">{statistics.warnings?.map((w) => <li key={w}>{w}</li>)}</ul></div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <MC icon={<Users size={18} />} label="待认领人数" value={statistics.unclaimedPersons} />
          <MC icon={<Network size={18} />} label="关系总数" value={statistics.totalRelations} />
          <MC icon={<FileText size={18} />} label="家族记忆" value={memoryTotal} />
          <MC icon={<CalendarDays size={18} />} label="家庭节点" value={statistics.totalCalendarEvents} />
        </div>

        <SC title={<><Users size={16} />家人档案统计</>}>
          <div className="grid grid-cols-3 gap-2">
        <MS label="健在" value={statistics.alivePersons} /><MS label="离世" value={statistics.deceasedPersons} /><MS label="未填写" value={statistics.unknownLivingPersons} />
          </div>
          <div className="mt-4"><div className="mb-1 flex items-center justify-between text-xs text-[var(--ink-3)]"><span>已认领 / 待认领</span><span>{claimRate}%</span></div><div className="flex h-3 overflow-hidden rounded-full bg-[var(--line-1)]"><div className="bg-[var(--walnut)]" style={{ width: `${percent(statistics.claimedPersons, statistics.totalPersons)}%` }} /><div className="bg-[var(--warning)]" style={{ width: `${percent(statistics.unclaimedPersons, statistics.totalPersons)}%` }} /></div></div>
        </SC>

        <SC title={<><Network size={16} />关系完整度</>}>
          <div className="space-y-3">
            {[['父母/子女关系',statistics.parentRelations],['配偶关系',statistics.spouseRelations],['兄弟姐妹关系',statistics.siblingRelations],['祖辈关系',statistics.grandparentRelations]].map(([l,v]) => (
              <div key={l as string}><div className="mb-1 flex items-center justify-between text-xs"><span className="text-[var(--ink-3)]">{l as string}</span><span className="font-medium text-[var(--ink-2)]">{v as number}</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--line-1)]"><div className="h-full rounded-full bg-[var(--walnut-light)]" style={{ width: `${percent(v as number, statistics.totalRelations)}%` }} /></div></div>
            ))}
          </div>
        </SC>

        <SC title={<><PieChart size={16} />记忆统计</>}>
          <div className="grid grid-cols-2 gap-2">
            <MS label="家族故事" value={statistics.totalStories} />
            <MS label="相册记录" value={statistics.totalPhotos} />
            <MS label="家族议事" value={statistics.totalMeetings} />
            <MS label="议事意见" value={statistics.totalMeetingOpinions} />
            <MS label="投票记录" value={statistics.totalMeetingVotes} />
            <MS label="家堂档案" value={statistics.totalOutputs} />
          </div>
        </SC>

        <SC title={<><CalendarDays size={16} />节点统计</>}>
          <div className="grid grid-cols-3 gap-2">
            <MS label="日历事件" value={statistics.totalCalendarEvents} /><MS label="生日提醒" value={statistics.birthdayEvents} /><MS label="未来30天" value={statistics.upcomingEvents} />
          </div>
        </SC>

        <SC title={<><CheckCircle2 size={16} />完整度</>}>
          <div className="rounded-xl bg-[var(--surface-2)] p-4">
            <div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-[var(--ink-2)]">当前完成度</span><span className="font-semibold text-[var(--walnut-light)]">{completion.score}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--line-1)]"><div className="h-full rounded-full bg-[var(--walnut-light)]" style={{ width: `${completion.score}%` }} /></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {completion.completedItems.slice(0, 6).map((item) => <span key={item} className="rounded-full bg-[var(--surface-3)] px-2.5 py-1 text-xs text-[var(--walnut-light)]">{item}</span>)}
          </div>
        </SC>

        <SC title={<><BarChart3 size={16} />下一步建议</>} className="border-warning-light bg-warning-light">
          {completion.nextSuggestions.length === 0 ? <p className="rounded-xl bg-white px-4 py-3 text-sm text-[var(--ink-3)]">当前家堂资料已经比较完整。</p>
            : <div className="space-y-2">{completion.nextSuggestions.map((s) => <div key={s} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm text-[var(--ink-2)]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning-light text-xs font-semibold text-warning">!</span>{s}</div>)}</div>}
        </SC>

        <div className="grid grid-cols-2 gap-2 pb-4">
          <Link href="/family/tree/graph" className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line-1)] bg-white min-h-[44px] text-sm font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] transition-colors"><Network size={14} />查看关系图</Link>
          <Link href="/family/output" className="wj-primary flex items-center justify-center gap-1.5 rounded-xl min-h-[44px] text-sm font-semibold"><FileText size={14} />整理档案</Link>
        </div>
      </main>
    </S>
  );
}

function S({ children }: { children: React.ReactNode }) { return <MobilePage><MobileStatusBar /><MobileTopBar title="数据看板" />{children}</MobilePage>; }
function P({ text }: { text: string }) { return <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-5 text-center"><p className="rounded-[15px] border border-[#E7D9C9] bg-white/82 px-4 py-5 text-sm text-[#78675B] shadow-[0_10px_28px_rgba(90,53,36,0.06)]">{text}</p></main>; }
function HM({ label, value }: { label: string; value: number | string }) { return <div className="rounded-[13px] border border-[#E7D9C9] bg-white/72 px-3 py-2"><p className="text-xs text-[#8C7768]">{label}</p><p className="mt-1 text-lg font-bold text-[#3A2519]">{value}</p></div>; }
function MC({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-[15px] border border-[#E7D9C9] bg-white/82 p-4 shadow-[0_10px_28px_rgba(90,53,36,0.06)]"><div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#F1E5D6] text-[#9B6A37]">{icon}</div><p className="text-xs text-[#78675B]">{label}</p><p className="mt-1 text-xl font-bold text-[#2A1D16]">{value}</p></div>;
}
function SC({ title, children, className }: { title: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-[15px] border border-[#E7D9C9] bg-white/82 p-4 shadow-[0_10px_28px_rgba(90,53,36,0.06)]', className)}><div className="mb-3 flex items-center gap-2 text-[16px] font-semibold text-[#2A1D16]"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F1E5D6] text-[#9B6A37]">{title}</span></div>{children}</div>;
}
function MS({ label, value }: { label: string; value: number }) { return <div className="rounded-[13px] border border-[#EEE3D6] bg-[#FBF7EF] px-3 py-2"><p className="text-xs text-[#78675B]">{label}</p><p className="mt-1 text-lg font-semibold text-[#3A2519]">{value}</p></div>; }
