'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, CalendarDays, CheckCircle2, FileText, Network, PieChart, Users } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
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

  if (state === 'loading') return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-sm text-stone-500">加载中...</p></div>;
  if (state === 'error') return <S><P text={error || '加载失败'} /></S>;
  if (state === 'empty' || !family || !statistics || !completion) return <S><main className="max-w-lg mx-auto px-4 py-6"><div className="rounded-2xl border border-stone-200 bg-white p-6 text-center"><p className="text-sm text-stone-500">暂无可统计的家人档案，请先添加亲属。</p><Link href="/family/relatives/new" className="mt-4 inline-flex rounded-xl bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors">添加亲属</Link></div></main></S>;

  const claimRate = percent(statistics.claimedPersons, statistics.totalPersons);
  const memoryTotal = statistics.totalStories + statistics.totalPhotos + statistics.totalMeetings;

  return (
    <S>
      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
        {/* Header */}
        <div className="rounded-2xl bg-emerald-950 p-5 text-white">
          <p className="text-xs text-white/40 tracking-widest font-medium">家堂数据看板</p>
          <h1 className="mt-0.5 text-xl font-bold">{family.displayName ?? family.display_name}</h1>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <HM label="总人数" value={statistics.totalPersons} />
            <HM label="已认领" value={statistics.claimedPersons} />
            <HM label="完整度" value={`${completion.score}%`} />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${completion.score}%` }} /></div>
        </div>

        {(statistics.warnings?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-700">部分统计项暂不可用</p><ul className="mt-2 space-y-1 text-xs text-stone-500">{statistics.warnings?.map((w) => <li key={w}>{w}</li>)}</ul></div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <MC icon={<Users size={18} />} label="待认领人数" value={statistics.unclaimedPersons} />
          <MC icon={<Network size={18} />} label="关系总数" value={statistics.totalRelations} />
          <MC icon={<FileText size={18} />} label="家族记忆" value={memoryTotal} />
          <MC icon={<CalendarDays size={18} />} label="家庭节点" value={statistics.totalCalendarEvents} />
        </div>

        <SC title={<><Users size={16} />家人档案统计</>}>
          <div className="grid grid-cols-3 gap-2">
            <MS label="在世" value={statistics.alivePersons} /><MS label="已故" value={statistics.deceasedPersons} /><MS label="未知" value={statistics.unknownLivingPersons} />
          </div>
          <div className="mt-4"><div className="mb-1 flex items-center justify-between text-xs text-stone-500"><span>已认领 / 待认领</span><span>{claimRate}%</span></div><div className="flex h-3 overflow-hidden rounded-full bg-stone-200"><div className="bg-emerald-950" style={{ width: `${percent(statistics.claimedPersons, statistics.totalPersons)}%` }} /><div className="bg-amber-500" style={{ width: `${percent(statistics.unclaimedPersons, statistics.totalPersons)}%` }} /></div></div>
        </SC>

        <SC title={<><Network size={16} />关系完整度</>}>
          <div className="space-y-3">
            {[['父母/子女关系',statistics.parentRelations],['配偶关系',statistics.spouseRelations],['兄弟姐妹关系',statistics.siblingRelations],['祖辈关系',statistics.grandparentRelations]].map(([l,v]) => (
              <div key={l as string}><div className="mb-1 flex items-center justify-between text-xs"><span className="text-stone-500">{l as string}</span><span className="font-medium text-stone-700">{v as number}</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${percent(v as number, statistics.totalRelations)}%` }} /></div></div>
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
            <MS label="成果物" value={statistics.totalOutputs} />
          </div>
        </SC>

        <SC title={<><CalendarDays size={16} />节点统计</>}>
          <div className="grid grid-cols-3 gap-2">
            <MS label="日历事件" value={statistics.totalCalendarEvents} /><MS label="生日提醒" value={statistics.birthdayEvents} /><MS label="未来30天" value={statistics.upcomingEvents} />
          </div>
        </SC>

        <SC title={<><CheckCircle2 size={16} />完整度</>}>
          <div className="rounded-xl bg-stone-50 p-4">
            <div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-stone-700">当前完成度</span><span className="font-semibold text-emerald-700">{completion.score}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${completion.score}%` }} /></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {completion.completedItems.slice(0, 6).map((item) => <span key={item} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">{item}</span>)}
          </div>
        </SC>

        <SC title={<><BarChart3 size={16} />下一步建议</>} className="border-amber-200 bg-amber-50">
          {completion.nextSuggestions.length === 0 ? <p className="rounded-xl bg-white px-4 py-3 text-sm text-stone-500">当前家堂资料已经比较完整。</p>
            : <div className="space-y-2">{completion.nextSuggestions.map((s) => <div key={s} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm text-stone-700"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">!</span>{s}</div>)}</div>}
        </SC>

        <div className="grid grid-cols-2 gap-2 pb-4">
          <Link href="/family/tree/graph" className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"><Network size={14} />查看关系图</Link>
          <Link href="/family/output" className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-950 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors"><FileText size={14} />生成成果物</Link>
        </div>
      </main>
    </S>
  );
}

function S({ children }: { children: React.ReactNode }) { return <div className="min-h-screen bg-stone-50"><AppHeader title="数据看板" backHref="/family" />{children}</div>; }
function P({ text }: { text: string }) { return <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 text-center"><p className="rounded-2xl border border-stone-200 bg-white px-4 py-5 text-sm text-stone-500 shadow-sm">{text}</p></main>; }
function HM({ label, value }: { label: string; value: number | string }) { return <div className="rounded-2xl bg-white/10 px-3 py-2"><p className="text-xs text-white/50">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>; }
function MC({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"><div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{icon}</div><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-xl font-bold text-stone-800">{value}</p></div>;
}
function SC({ title, children, className }: { title: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-stone-200 bg-white p-4 shadow-sm', className)}><div className="flex items-center gap-2 mb-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">{title}</span></div>{children}</div>;
}
function MS({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-stone-50 px-3 py-2"><p className="text-xs text-stone-400">{label}</p><p className="mt-1 text-lg font-semibold text-stone-700">{value}</p></div>; }
