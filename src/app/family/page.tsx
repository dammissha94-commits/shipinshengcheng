'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  GitBranch,
  BookOpen,
  Camera,
  MessageSquare,
  Calendar,
  Bell,
  BarChart3,
  Settings,
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

const QUICK_ACTIONS = [
  { label: '家人', href: '/family/members', icon: <Users size={18} strokeWidth={1.8} /> },
  { label: '家谱', href: '/family/tree', icon: <GitBranch size={18} strokeWidth={1.8} /> },
  { label: '故事', href: '/family/stories', icon: <BookOpen size={18} strokeWidth={1.8} /> },
  { label: '相册', href: '/family/photos', icon: <Camera size={18} strokeWidth={1.8} /> },
  { label: '议事', href: '/family/meetings', icon: <MessageSquare size={18} strokeWidth={1.8} /> },
  { label: '日历', href: '/family/calendar', icon: <Calendar size={18} strokeWidth={1.8} /> },
  { label: '提醒', href: '/family/reminders', icon: <Bell size={18} strokeWidth={1.8} /> },
  { label: '看板', href: '/family/statistics', icon: <BarChart3 size={18} strokeWidth={1.8} /> },
];

function StatCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const inner = (
    <div className="rounded-xl bg-white border border-stone-200 px-4 py-3 text-center">
      <p className="text-2xl font-bold text-emerald-900">{value}</p>
      <p className="mt-0.5 text-xs text-stone-500">{label}</p>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

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
        if (!user) {
          router.replace(currentLoginRedirectPath());
          return;
        }
        await ensureProfile(user);
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) {
          router.replace('/create');
          return;
        }
        setFamily(currentFamily);

        const [
          familyProfiles,
          familyRelations,
          todayReminders,
          weekReminders,
          upcomingEvents,
          meetings,
          stories,
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
          upcoming: upcomingEvents.events.slice(0, 3),
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载家堂失败');
      } finally {
        setLoading(false);
      }
    }

    loadFamily();
  }, [router]);

  async function handleSignOut() {
    await signOut();
    router.push(currentLoginRedirectPath());
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-sm text-stone-500">加载中…</p>
      </div>
    );
  }

  if (error || !family) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 text-center">
        <p className="text-sm text-stone-500">{error || '请先创建数字家堂'}</p>
      </div>
    );
  }

  const claimedCount = profiles.filter((p) => p.claim_status === 'claimed').length;
  const unclaimedCount = profiles.length - claimedCount;

  return (
    <div className="min-h-screen bg-stone-50 pb-safe">
      {/* Header */}
      <div className="bg-emerald-950 px-5 pt-14 pb-9 text-white">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-white/40 tracking-widest font-medium">数字家堂</p>
          <button
            onClick={handleSignOut}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            退出
          </button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{family.displayName}</h1>
        <p className="mt-1 text-sm text-white/50">
          {profiles.length} 位成员 · 完成度 {completion}%
        </p>
      </div>

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 -mt-10">
          <StatCard label="成员" value={profiles.length} href="/family/members" />
          <StatCard label="已认领" value={claimedCount} />
          <StatCard label="待认领" value={unclaimedCount} />
          <StatCard label="提醒" value={reminderSummary?.todayCount ?? 0} href="/family/reminders" />
        </div>

        {/* Quick actions */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-stone-500 tracking-wide">快捷入口</h2>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  {action.icon}
                </div>
                <span className="text-xs font-medium text-stone-700">{action.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Reminders */}
        {reminderSummary && (reminderSummary.upcoming.length > 0 || reminderSummary.todayCount > 0) && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-500 tracking-wide">近期提醒</h2>
              <Link href="/family/reminders" className="text-xs font-medium text-amber-600 hover:text-amber-700">
                查看全部
              </Link>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm divide-y divide-stone-100">
              {reminderSummary.upcoming.map((item) => (
                <Link
                  key={item.event.id}
                  href={`/family/calendar/${item.event.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-800">{item.event.title}</p>
                    <p className="text-xs text-stone-500">
                      {formatDate(item.nextOccurrenceDate ?? item.event.event_date)} · {item.typeLabel}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {item.badge}
                  </span>
                </Link>
              ))}
              {reminderSummary.upcoming.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-stone-400">暂无近期提醒</p>
              )}
            </div>
          </section>
        )}

        {/* Recent meetings */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-500 tracking-wide">最近议事</h2>
            <Link href="/family/meetings" className="text-xs font-medium text-amber-600 hover:text-amber-700">
              查看全部 <ArrowRight size={12} className="inline ml-0.5" />
            </Link>
          </div>
          {recentMeetings.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-8 text-center">
              <p className="text-sm text-stone-400">暂无议事记录</p>
              <Link
                href="/family/meetings"
                className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                发布第一条议事
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMeetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/family/meetings/${meeting.id}`}
                  className="block rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-stone-800 truncate">{meeting.title}</h3>
                      <p className="mt-0.5 text-xs text-stone-500 line-clamp-1">
                        {meeting.content?.trim() || '暂无内容'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      {meeting.status === 'open' ? '进行中' : meeting.status === 'closed' ? '已关闭' : '已归档'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent stories */}
        {recentStories.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-500 tracking-wide">最近故事</h2>
              <Link href="/family/stories" className="text-xs font-medium text-amber-600 hover:text-amber-700">
                查看全部
              </Link>
            </div>
            <div className="space-y-3">
              {recentStories.map((story) => (
                <Link
                  key={story.id}
                  href={`/family/stories`}
                  className="block rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
                >
                  <h3 className="text-sm font-semibold text-stone-800">{story.title}</h3>
                  {story.story_year && (
                    <p className="mt-1 text-xs text-stone-500">{story.story_year} 年</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Output & Settings */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/family/output"
            className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
          >
            成果物
          </Link>
          <Link
            href="/family/settings"
            className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50"
          >
            <Settings size={15} strokeWidth={1.8} />
            家堂设置
          </Link>
        </div>
      </div>
    </div>
  );
}
