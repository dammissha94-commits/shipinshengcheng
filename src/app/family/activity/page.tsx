'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Activity } from 'lucide-react';
import type { ActionLog, FamilySpace } from '@/types/domain';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { getFamilyActivityLogs, getActivityLabel, getActivityCategoryMeta, getActivitySummary } from '@/lib/services/activity-service';
import AppHeader from '@/components/AppHeader';
import StatusBadge from '@/components/wujia/StatusBadge';
import EmptyState from '@/components/wujia/EmptyState';

type FilterCategory = 'all' | 'member' | 'story' | 'photo' | 'calendar' | 'meeting' | 'output' | 'other';

const FILTERS: { value: FilterCategory; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'member', label: '家人' },
  { value: 'story', label: '故事' },
  { value: 'photo', label: '相册' },
  { value: 'calendar', label: '节点' },
  { value: 'meeting', label: '议事' },
  { value: 'output', label: '成果物' },
  { value: 'other', label: '其他' },
];

type TimeGroup = 'today' | 'week' | 'older';
interface GroupedLogs { group: TimeGroup; label: string; logs: ActionLog[] }

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} 小时前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} 天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getTimeGroup(iso: string): TimeGroup {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);
  if (d >= todayStart) return 'today';
  if (d >= weekStart) return 'week';
  return 'older';
}

const GROUP_LABELS: Record<TimeGroup, string> = { today: '今天', week: '本周', older: '更早' };

export default function ActivityPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        setFamily(currentFamily);
        setLogs(await getFamilyActivityLogs({ familyId: currentFamily.id, limit: 50 }));
      } catch (e) { setError(e instanceof Error ? e.message : '加载家族动态失败'); }
      finally { setLoading(false); }
    }
    load();
  }, [router]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs;
    return logs.filter((l) => getActivityLabel(l.action_type).category === filter);
  }, [logs, filter]);

  // Group filtered logs by time
  const groupedLogs = useMemo<GroupedLogs[]>(() => {
    const groups: GroupedLogs[] = [];
    let currentGroup: TimeGroup | null = null;
    for (const log of filteredLogs) {
      const g = getTimeGroup(log.created_at);
      if (g !== currentGroup) {
        currentGroup = g;
        groups.push({ group: g, label: GROUP_LABELS[g], logs: [] });
      }
      groups[groups.length - 1].logs.push(log);
    }
    return groups;
  }, [filteredLogs]);

  // Stats
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
  const todayCount = logs.filter((l) => l.created_at >= todayStart).length;
  const weekCount = logs.filter((l) => l.created_at >= weekStart).length;
  const lastUpdate = logs.length > 0 ? formatFullDate(logs[0].created_at) : null;

  if (loading) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-sm text-stone-500">加载中…</p></div>;
  }
  if (error && !family) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 text-center"><p className="text-sm text-stone-500">{error}</p></div>;
  }

  const isLowData = filteredLogs.length > 0 && filteredLogs.length <= 3;

  return (
    <div className="min-h-screen bg-stone-50">
      <AppHeader title="家族动态" backHref="/family" />

      <div className="px-4 py-5 max-w-2xl mx-auto space-y-4 sm:space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard label="全部动态" value={logs.length} />
          <StatCard label="今日" value={todayCount} />
          <StatCard label="本周" value={weekCount} />
        </div>

        {lastUpdate && (
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Clock size={13} strokeWidth={1.8} />最近更新：{lastUpdate}
          </div>
        )}

        {/* Type filter pills */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f.value
                  ? 'bg-emerald-950 text-white shadow-sm'
                  : 'border border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline or Empty */}
        {filteredLogs.length === 0 ? (
          filter === 'all' ? (
            <EmptyState
              icon={<Activity size={24} strokeWidth={1.8} />}
              title="暂无家族动态"
              description="当添加家人、记录故事、整理相册或更新家庭节点后，这里会自动汇总最近变化。"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-base font-semibold text-stone-800">该分类暂无动态</p>
              <p className="mt-1 text-sm text-stone-500">切换其他分类查看，或等待该模块产生新变化</p>
              <button onClick={() => setFilter('all')} className="mt-4 text-sm font-medium text-emerald-700">查看全部动态</button>
            </div>
          )
        ) : (
          <>
            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-[17px] sm:left-[19px] top-3 bottom-3 w-px bg-stone-200" />

              <div className="space-y-4 sm:space-y-5">
                {groupedLogs.map(({ group, label, logs: groupLogs }) => (
                  <div key={group}>
                    {/* Group header */}
                    <div className="relative flex items-center gap-3 mb-2.5 pl-2">
                      <div className={`relative z-10 flex h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white ${
                        group === 'today' ? 'bg-amber-500' : group === 'week' ? 'bg-amber-300' : 'bg-stone-300'
                      }`} />
                      <span className="text-xs font-semibold text-stone-400 tracking-wide">{label}</span>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      {groupLogs.map((log) => {
                        const { label: catLabel, category } = getActivityLabel(log.action_type);
                        const { badgeVariant, linkPrefix } = getActivityCategoryMeta(category);
                        const summary = getActivitySummary(log);
                        const hasDetailPage = category === 'member' || category === 'meeting' || category === 'calendar';
                        const detailHref = linkPrefix && log.target_id && hasDetailPage
                          ? `${linkPrefix}/${log.target_id}` : linkPrefix || null;

                        return (
                          <div key={log.id} className="relative flex gap-3 sm:gap-4 pl-2">
                            {/* Timeline dot */}
                            <div className={`relative z-10 mt-1.5 flex h-[8px] w-[8px] sm:h-[10px] sm:w-[10px] shrink-0 rounded-full border-2 border-white ${
                              category === 'member' ? 'bg-emerald-500' :
                              category === 'story' ? 'bg-amber-500' :
                              category === 'photo' ? 'bg-emerald-400' :
                              category === 'calendar' ? 'bg-amber-400' :
                              category === 'meeting' ? 'bg-stone-400' :
                              category === 'output' ? 'bg-emerald-600' :
                              'bg-stone-300'
                            }`} />

                            <div className="flex-1 pb-3 sm:pb-4">
                              {detailHref ? (
                                <Link href={detailHref}
                                  className="block rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-sm transition-all hover:border-stone-300 hover:shadow-md">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-stone-800 leading-snug">{summary}</p>
                                    <StatusBadge variant={badgeVariant}>{catLabel}</StatusBadge>
                                  </div>
                                  <p className="mt-1 text-xs text-stone-400">{formatTime(log.created_at)}</p>
                                </Link>
                              ) : (
                                <div className="rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-sm">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-stone-800 leading-snug">{summary}</p>
                                    <StatusBadge variant={badgeVariant}>{catLabel}</StatusBadge>
                                  </div>
                                  <p className="mt-1 text-xs text-stone-400">{formatTime(log.created_at)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Low-data hint card */}
            {isLowData && (
              <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Activity size={17} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-800">这里会自动记录家庭更新</p>
                    <p className="mt-0.5 text-xs text-stone-500 leading-relaxed">
                      添加家人、记录故事、整理相册、更新家庭节点或处理议事后，这里会汇总最近变化。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Back link */}
        <div className="text-center pt-2 pb-4">
          <Link href="/family" className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-400 hover:text-stone-600 transition-colors">
            <ArrowLeft size={14} />返回家堂首页
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3 sm:p-4 shadow-sm text-center">
      <p className="text-xl sm:text-2xl font-bold text-emerald-900">{value}</p>
      <p className="mt-0.5 text-[11px] sm:text-xs text-stone-400">{label}</p>
    </div>
  );
}
