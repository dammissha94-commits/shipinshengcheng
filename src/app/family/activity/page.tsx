'use client';

import { useEffect, useState } from 'react';
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffH < 24) return `${diffH} 小时前`;
  if (diffD < 7) return `${diffD} 天前`;

  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ActivityPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) {
        setError('尚未配置 Supabase 环境变量，请先配置 .env.local');
        setLoading(false);
        return;
      }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        setFamily(currentFamily);

        const activityLogs = await getFamilyActivityLogs({ familyId: currentFamily.id, limit: 50 });
        setLogs(activityLogs);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载家族动态失败');
      } finally { setLoading(false); }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-sm text-stone-500">加载中…</p>
      </div>
    );
  }
  if (error && !family) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 text-center">
        <p className="text-sm text-stone-500">{error}</p>
      </div>
    );
  }

  // Stats
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
  const todayCount = logs.filter((l) => l.created_at >= todayStart).length;
  const weekCount = logs.filter((l) => l.created_at >= weekStart).length;
  const lastUpdate = logs.length > 0 ? formatFullDate(logs[0].created_at) : null;

  return (
    <div className="min-h-screen bg-stone-50">
      <AppHeader title="家族动态" backHref="/family" />

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">
        {/* Overview cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="全部动态" value={logs.length} />
          <StatCard label="今日" value={todayCount} />
          <StatCard label="本周" value={weekCount} />
        </div>

        {lastUpdate && (
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Clock size={13} strokeWidth={1.8} />
            最近更新：{lastUpdate}
          </div>
        )}

        {/* Timeline */}
        {logs.length === 0 ? (
          <EmptyState
            icon={<Activity size={24} strokeWidth={1.8} />}
            title="暂无家族动态"
            description="当添加家人、记录故事、整理相册或更新家庭节点后，这里会自动汇总最近变化。"
          />
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-stone-200" />

            <div className="space-y-1">
              {logs.map((log) => {
                const { label, category } = getActivityLabel(log.action_type);
                const { badgeVariant, linkPrefix } = getActivityCategoryMeta(category);
                const summary = getActivitySummary(log);
                const detailHref = linkPrefix && log.target_id
                  ? `${linkPrefix}/${log.target_id}`
                  : linkPrefix || null;

                return (
                  <div key={log.id} className="relative flex gap-4 pl-2">
                    {/* Timeline dot */}
                    <div className={`relative z-10 mt-1.5 flex h-[10px] w-[10px] shrink-0 rounded-full border-2 border-white ${
                      category === 'member' ? 'bg-emerald-500' :
                      category === 'story' ? 'bg-amber-500' :
                      category === 'photo' ? 'bg-emerald-400' :
                      category === 'calendar' ? 'bg-amber-400' :
                      category === 'meeting' ? 'bg-stone-400' :
                      category === 'output' ? 'bg-emerald-600' :
                      'bg-stone-300'
                    }`} />

                    {/* Content card */}
                    <div className="flex-1 pb-4">
                      {detailHref ? (
                        <Link href={detailHref}
                          className="block rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm transition-all hover:border-stone-300 hover:shadow-md">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-stone-800">{summary}</p>
                            <StatusBadge variant={badgeVariant}>{label}</StatusBadge>
                          </div>
                          <p className="text-xs text-stone-400">{formatTime(log.created_at)}</p>
                        </Link>
                      ) : (
                        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-stone-800">{summary}</p>
                            <StatusBadge variant={badgeVariant}>{label}</StatusBadge>
                          </div>
                          <p className="text-xs text-stone-400">{formatTime(log.created_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm text-center">
      <p className="text-2xl font-bold text-emerald-900">{value}</p>
      <p className="mt-0.5 text-xs text-stone-400">{label}</p>
    </div>
  );
}
