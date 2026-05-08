'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, Clock } from 'lucide-react';
import type { ActionLog, FamilySpace } from '@/types/domain';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { getActivityCategoryMeta, getActivityLabel, getActivitySummary, getFamilyActivityLogs } from '@/lib/services/activity-service';
import StatusBadge from '@/components/wujia/StatusBadge';
import WjTimeline from '@/components/wujia/WjTimeline';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import { WjHeroPanel, WjInlineStat, WjPaperCard, WjScreenContent, WjSoftNote } from '@/components/wujia/MobileDesignSystem';

type FilterCategory = 'all' | 'member' | 'story' | 'photo' | 'calendar' | 'meeting' | 'output' | 'other';

const FILTERS: { value: FilterCategory; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'member', label: '家人' },
  { value: 'story', label: '故事' },
  { value: 'photo', label: '相册' },
  { value: 'calendar', label: '节点' },
  { value: 'meeting', label: '议事' },
  { value: 'output', label: '档案' },
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
        setFamily(currentFamily);
        setLogs(await getFamilyActivityLogs({ familyId: currentFamily.id, limit: 50 }));
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载家族动态失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs;
    return logs.filter((log) => getActivityLabel(log.action_type).category === filter);
  }, [logs, filter]);

  const groupedLogs = useMemo<GroupedLogs[]>(() => {
    const groups: GroupedLogs[] = [];
    let currentGroup: TimeGroup | null = null;
    for (const log of filteredLogs) {
      const group = getTimeGroup(log.created_at);
      if (group !== currentGroup) {
        currentGroup = group;
        groups.push({ group, label: GROUP_LABELS[group], logs: [] });
      }
      groups[groups.length - 1].logs.push(log);
    }
    return groups;
  }, [filteredLogs]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
  const todayCount = logs.filter((log) => log.created_at >= todayStart).length;
  const weekCount = logs.filter((log) => log.created_at >= weekStart).length;
  const lastUpdate = logs.length > 0 ? formatFullDate(logs[0].created_at) : null;
  const isLowData = filteredLogs.length > 0 && filteredLogs.length <= 3;

  if (loading) return <Shell><PanelText text="加载家族动态中..." /></Shell>;
  if (error && !family) return <Shell><PanelText text={error} /></Shell>;

  return (
    <Shell>
      <WjScreenContent>
        <WjHeroPanel
          eyebrow="FAMILY ACTIVITY"
          title="家族动态"
          description="自动记录家人、故事、相册、日历和议事的最近变化，方便回看家堂更新脉络。"
        />

        <div className="grid grid-cols-3 gap-2">
          <WjInlineStat label="全部动态" value={logs.length} />
          <WjInlineStat label="今日" value={todayCount} />
          <WjInlineStat label="本周" value={weekCount} />
        </div>

        {lastUpdate && (
          <div className="flex items-center gap-2 text-xs text-[#78675B]">
            <Clock size={13} strokeWidth={1.8} />
            最近更新：{lastUpdate}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`flex min-h-[44px] shrink-0 items-center rounded-full px-4 text-xs font-medium transition-all ${
                filter === item.value
                  ? 'bg-[#5A3825] text-white shadow-[0_10px_22px_rgba(90,53,36,0.16)]'
                  : 'border border-[#E7D9C9] bg-white/82 text-[#78675B] hover:border-[#C8A46B] hover:text-[#5A3524]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {filteredLogs.length === 0 ? (
          <WjPaperCard className="p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F1E5D6] text-[#9B6A37]">
              <Activity size={24} />
            </div>
            <h2 className="mt-4 text-[18px] font-semibold text-[#2A1D16]">
              {filter === 'all' ? '暂无家族动态' : '该分类暂无动态'}
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[#78675B]">
              添加家人、记录故事、整理相册或更新家庭节点后，这里会自动汇总最近变化。
            </p>
            {filter !== 'all' && (
              <button type="button" onClick={() => setFilter('all')} className="mt-4 min-h-[44px] text-sm font-medium text-[#5A3825]">
                查看全部动态
              </button>
            )}
          </WjPaperCard>
        ) : (
          <>
            <WjPaperCard className="p-4">
              <WjTimeline>
                {groupedLogs.map(({ group, label, logs: groupLogs }) => (
                  <React.Fragment key={group}>
                    {groupLogs.map((log, index) => {
                      const isFirst = index === 0;
                      const { label: categoryLabel, category } = getActivityLabel(log.action_type);
                      const { badgeVariant, linkPrefix } = getActivityCategoryMeta(category);
                      const summary = getActivitySummary(log);
                      const hasDetailPage = category === 'member' || category === 'meeting' || category === 'calendar';
                      const detailHref = linkPrefix && log.target_id && hasDetailPage ? `${linkPrefix}/${log.target_id}` : linkPrefix || null;
                      const toneMap: Record<string, 'gold' | 'gold-light' | 'terracotta' | 'jade' | 'walnut'> = {
                        member: 'gold-light',
                        story: 'gold',
                        photo: 'jade',
                        calendar: 'gold-light',
                        meeting: 'walnut',
                        output: 'walnut',
                      };
                      const groupDotClass = group === 'today' ? 'bg-[#C57945]' : group === 'week' ? 'bg-[#D8B97E]' : 'bg-[#D4BB91]';

                      return (
                        <WjTimeline.Item
                          key={log.id}
                          groupLabel={isFirst ? label : undefined}
                          groupDotClass={groupDotClass}
                          tone={toneMap[category] ?? 'gold-light'}
                          title={detailHref ? <Link href={detailHref} className="hover:underline">{summary}</Link> : summary}
                          meta={<StatusBadge variant={badgeVariant}>{categoryLabel}</StatusBadge>}
                        >
                          <p className="mt-1 text-xs text-[#78675B]">{formatTime(log.created_at)}</p>
                        </WjTimeline.Item>
                      );
                    })}
                  </React.Fragment>
                ))}
              </WjTimeline>
            </WjPaperCard>

            {isLowData && (
              <WjSoftNote>
                这里会自动记录家堂更新。随着家人认领、故事补充、相册整理和议事推进，动态会逐渐丰富。
              </WjSoftNote>
            )}
          </>
        )}

        <div className="pb-4 text-center">
          <Link href="/family" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-[#78675B] hover:text-[#5A3524]">
            <ArrowLeft size={14} />
            返回家堂首页
          </Link>
        </div>
      </WjScreenContent>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar title="家族动态" />
      {children}
    </MobilePage>
  );
}

function PanelText({ text }: { text: string }) {
  return (
    <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-5 text-center">
      <p className="rounded-[15px] border border-[#E7D9C9] bg-white/82 px-4 py-5 text-sm text-[#78675B] shadow-[0_10px_28px_rgba(90,53,36,0.06)]">{text}</p>
    </main>
  );
}
