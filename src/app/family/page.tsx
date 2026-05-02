'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  GitBranch,
  BookOpen,
  Camera,
  Calendar,
  Settings,
  UserPlus,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import type { FamilySpace, PersonProfile, FamilyMeeting, FamilyStory } from '@/types/domain';
import { ensureProfile, getCurrentUser, signOut } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import {
  listThisWeekFamilyEvents,
  listTodayFamilyReminders,
  listUpcomingFamilyEvents,
} from '@/lib/services/calendar-service';
import { listFamilyPersons, listPersonRelations } from '@/lib/services/person-service';
import { listFamilyMeetings } from '@/lib/services/meeting-service';
import { listFamilyStories } from '@/lib/services/story-service';
import { mapProfilesToTreePersons } from '@/lib/family-view';
import { calcCompletion } from '@/lib/family-completion';
import type { FamilyReminderSummary } from '@/types/service';
import StatusBadge from '@/components/wujia/StatusBadge';
import EmptyState from '@/components/wujia/EmptyState';

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

const GENDER_LABELS: Record<string, string> = { male: '男', female: '女', unknown: '' };

export default function FamilyPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [reminderSummary, setReminderSummary] = useState<FamilyReminderSummary | null>(null);
  const [recentMeetings, setRecentMeetings] = useState<FamilyMeeting[]>([]);
  const [recentStories, setRecentStories] = useState<FamilyStory[]>([]);
  const [completion, setCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadFamily() {
      if (!hasSupabaseConfig()) {
        setError('尚未配置 Supabase 环境变量，请先配置 .env.local');
        setLoading(false);
        return;
      }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        await ensureProfile(user);
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        setFamily(currentFamily);

        const [
          familyProfiles, familyRelations,
          todayReminders, weekReminders, upcomingEvents,
          meetings, stories,
        ] = await Promise.all([
          listFamilyPersons(currentFamily.id),
          listPersonRelations(currentFamily.id),
          listTodayFamilyReminders(currentFamily.id),
          listThisWeekFamilyEvents(currentFamily.id),
          listUpcomingFamilyEvents(currentFamily.id, 30),
          listFamilyMeetings(currentFamily.id),
          listFamilyStories(currentFamily.id),
        ]);

        setProfiles(familyProfiles);
        setRecentMeetings(meetings.slice(0, 3));
        setRecentStories(stories.filter((s) => s.status === 'active').slice(0, 3));
        const persons = mapProfilesToTreePersons(familyProfiles, familyRelations, user.id);
        setCompletion(calcCompletion(persons));
        setReminderSummary({
          todayCount: todayReminders.length,
          weekCount: weekReminders.length,
          monthCount: upcomingEvents.events.length,
          upcoming: upcomingEvents.events.slice(0, 4),
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载家堂失败');
      } finally { setLoading(false); }
    }
    loadFamily();
  }, [router]);

  async function handleSignOut() { await signOut(); router.push(currentLoginRedirectPath()); }

  if (loading) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-sm text-stone-500">加载中…</p></div>;
  }
  if (error || !family) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 text-center"><p className="text-sm text-stone-500">{error || '请先创建数字家堂'}</p></div>;
  }

  const claimedCount = profiles.filter((p) => p.claim_status === 'claimed').length;
  const unclaimedCount = profiles.length - claimedCount;
  const memoryTotal = recentStories.length; // stories count as memory indicator
  const hasFamily = profiles.length > 0;

  return (
    <div className="min-h-screen bg-stone-50 pb-safe">
      {/* ===== Welcome Header ===== */}
      <div className="bg-emerald-950 px-5 pt-14 pb-10 text-white">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-white/40 tracking-[0.12em] font-medium">我的家堂</p>
          <button onClick={handleSignOut} className="text-xs text-white/40 hover:text-white/70 transition-colors">退出</button>
        </div>
        <h1 className="text-[26px] font-bold tracking-tight">{family.displayName}</h1>
        <p className="mt-1.5 text-sm text-white/50 leading-relaxed max-w-md">
          整理家人关系、家庭节点与家族记忆
        </p>
        {!hasFamily && (
          <Link href="/family/relatives/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors">
            <UserPlus size={16} />添加第一位家人
          </Link>
        )}
      </div>

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-6">
        {/* ===== Overview Cards ===== */}
        <div className="grid grid-cols-4 gap-3 -mt-12">
          <OvCard label="家人" value={profiles.length} icon={<Users size={16} />} href="/family/members" />
          <OvCard label="本月节点" value={reminderSummary?.monthCount ?? 0} icon={<Calendar size={16} />} href="/family/calendar" />
          <OvCard label="待完善" value={unclaimedCount} icon={<TrendingUp size={16} />} tone="amber" />
          <OvCard label="故事" value={memoryTotal} icon={<BookOpen size={16} />} href="/family/stories" />
        </div>

        {/* ===== Core Quick Actions ===== */}
        <section>
          <h2 className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-stone-500 tracking-wide">
            <span className="h-3.5 w-[3px] rounded-full bg-amber-500/60" />快捷操作
          </h2>
          <div className="grid grid-cols-4 gap-3">
            <QALink href="/family/relatives/new" icon={<UserPlus size={18} strokeWidth={1.8} />} label="添加家人" />
            <QALink href="/family/tree/graph" icon={<GitBranch size={18} strokeWidth={1.8} />} label="关系图" />
            <QALink href="/family/calendar" icon={<Calendar size={18} strokeWidth={1.8} />} label="家庭节点" />
            <QALink href="/family/stories" icon={<BookOpen size={18} strokeWidth={1.8} />} label="记故事" />
          </div>
        </section>

        {/* ===== My Family Preview ===== */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2.5 text-sm font-semibold text-stone-500 tracking-wide">
              <span className="h-3.5 w-[3px] rounded-full bg-amber-500/60" />我的家人
            </h2>
            <Link href="/family/members" className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
              查看全部 <ArrowRight size={12} />
            </Link>
          </div>
          {!hasFamily ? (
            <EmptyState
              icon={<Users size={24} strokeWidth={1.8} />}
              title="还没有家人档案"
              description="添加父母、配偶或子女，开始建立家族关系"
              action={<Link href="/family/relatives/new" className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors"><UserPlus size={16} />添加家人</Link>}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {profiles.slice(0, 4).map((person) => (
                <Link key={person.id} href={`/family/members/${person.id}`}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md text-center">
                  <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-base font-semibold ${
                    person.claim_status === 'claimed' ? 'bg-emerald-950 text-white' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {person.display_name.charAt(0)}
                  </div>
                  <p className="mt-2.5 truncate text-sm font-semibold text-stone-800">{person.display_name}</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {GENDER_LABELS[person.gender ?? 'unknown']}
                    {person.birth_year ? ` · ${person.birth_year}` : ''}
                  </p>
                  <div className="mt-2">
                    <StatusBadge variant={person.claim_status === 'claimed' ? 'success' : 'warning'}>
                      {person.claim_status === 'claimed' ? '已认领' : '待认领'}
                    </StatusBadge>
                  </div>
                </Link>
              ))}
              {profiles.length > 4 && (
                <Link href="/family/members"
                  className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 flex flex-col items-center justify-center p-4 text-center transition-all hover:border-stone-400 hover:bg-white">
                  <p className="text-2xl font-bold text-stone-400">+{profiles.length - 4}</p>
                  <p className="mt-1 text-xs text-stone-400">更多家人</p>
                </Link>
              )}
            </div>
          )}
        </section>

        {/* ===== Recent Activity ===== */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2.5 text-sm font-semibold text-stone-500 tracking-wide">
              <span className="h-3.5 w-[3px] rounded-full bg-amber-500/60" />最近动态
            </h2>
            <Link href="/family/activity" className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
              查看全部动态 <ArrowRight size={12} />
            </Link>
          </div>
        </section>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Reminders */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2.5 text-sm font-semibold text-stone-500 tracking-wide">
                <span className="h-3.5 w-[3px] rounded-full bg-amber-500/60" />近期节点
              </h2>
              <Link href="/family/reminders" className="text-xs font-medium text-amber-600 hover:text-amber-700">全部</Link>
            </div>
            {!reminderSummary || reminderSummary.upcoming.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white px-4 py-8 text-center">
                <p className="text-sm text-stone-400">暂无近期节点</p>
                <Link href="/family/calendar" className="mt-2 inline-block text-sm font-medium text-emerald-700">去日历添加</Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-stone-200 bg-white shadow-sm divide-y divide-stone-100">
                {reminderSummary.upcoming.map((item) => (
                  <Link key={item.event.id} href={`/family/calendar/${item.event.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-800">{item.event.title}</p>
                      <p className="text-xs text-stone-500">{formatDate(item.nextOccurrenceDate ?? item.event.event_date)} · {item.typeLabel}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{item.badge}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Meetings */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2.5 text-sm font-semibold text-stone-500 tracking-wide">
                <span className="h-3.5 w-[3px] rounded-full bg-amber-500/60" />最近议事
              </h2>
              <Link href="/family/meetings" className="text-xs font-medium text-amber-600 hover:text-amber-700">全部</Link>
            </div>
            {recentMeetings.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white px-4 py-8 text-center">
                <p className="text-sm text-stone-400">暂无议事记录</p>
                <Link href="/family/meetings" className="mt-2 inline-block text-sm font-medium text-emerald-700">发布第一条</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMeetings.map((meeting) => (
                  <Link key={meeting.id} href={`/family/meetings/${meeting.id}`}
                    className="block rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-stone-800 truncate flex-1 min-w-0">{meeting.title}</h3>
                      <StatusBadge variant={meeting.status === 'open' ? 'success' : 'muted'}>
                        {meeting.status === 'open' ? '进行中' : meeting.status === 'closed' ? '已关闭' : '已归档'}
                      </StatusBadge>
                    </div>
                    {meeting.content?.trim() && (
                      <p className="mt-1 text-xs text-stone-500 line-clamp-1">{meeting.content.trim()}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ===== Memory & Tools ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ToolCard href="/family/stories" icon={<BookOpen size={16} />} label="家族故事" sub={recentStories.length > 0 ? `${recentStories.length}+ 条` : '记录往事'} />
          <ToolCard href="/family/photos" icon={<Camera size={16} />} label="家族相册" sub="珍藏照片" />
          <ToolCard href="/family/statistics" icon={<TrendingUp size={16} />} label="数据看板" sub={`${completion}% 完整度`} />
          <ToolCard href="/family/output" icon={<BookOpen size={16} />} label="成果物" sub="沉淀资料" />
        </div>

        {/* ===== Settings (subtle) ===== */}
        <div className="text-center pt-2">
          <Link href="/family/settings"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors">
            <Settings size={13} strokeWidth={1.8} />家堂设置
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ===== Sub-components ===== */

function OvCard({ label, value, icon, href, tone = 'default' }: {
  label: string; value: number; icon: React.ReactNode; href?: string; tone?: 'default' | 'amber';
}) {
  const inner = (
    <div className={`rounded-2xl border border-stone-200 bg-white p-3 shadow-sm text-center transition-all hover:-translate-y-0.5 hover:shadow-md ${
      tone === 'amber' ? 'border-amber-200 bg-amber-50/50' : ''
    }`}>
      <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl ${
        tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'
      }`}>{icon}</div>
      <p className="text-xl font-bold text-stone-800">{value}</p>
      <p className="mt-0.5 text-[11px] text-stone-400">{label}</p>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function QALink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}
      className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md active:scale-[0.98]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{icon}</div>
      <span className="text-xs font-medium text-stone-700">{label}</span>
    </Link>
  );
}

function ToolCard({ href, icon, label, sub }: { href: string; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <Link href={href}
      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-800 truncate">{label}</p>
          <p className="text-xs text-stone-400">{sub}</p>
        </div>
      </div>
    </Link>
  );
}
