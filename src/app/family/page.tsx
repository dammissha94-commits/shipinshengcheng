'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, GitBranch, BookOpen, Camera, Calendar, Settings, UserPlus,
  TrendingUp, ArrowRight, Clock, Star, Edit3, MailPlus,
} from 'lucide-react';
import type { FamilySpace, PersonProfile, FamilyMeeting, FamilyStory } from '@/types/domain';
import { ensureProfile, getCurrentUser, signOut } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listThisWeekFamilyEvents, listTodayFamilyReminders, listUpcomingFamilyEvents } from '@/lib/services/calendar-service';
import { listFamilyPersons, listPersonRelations } from '@/lib/services/person-service';
import { listFamilyMeetings } from '@/lib/services/meeting-service';
import { listFamilyStories } from '@/lib/services/story-service';
import { mapProfilesToTreePersons } from '@/lib/family-view';
import { calcCompletion } from '@/lib/family-completion';
import type { FamilyReminderSummary } from '@/types/service';
import StatusBadge from '@/components/wujia/StatusBadge';

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
  const [motto, setMotto] = useState('');
  const [editingMotto, setEditingMotto] = useState(false);

  useEffect(() => {
    async function loadFamily() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        await ensureProfile(user);
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        setFamily(currentFamily);

        const [familyProfiles, familyRelations, todayR, weekR, upcoming, meetings, stories] = await Promise.all([
          listFamilyPersons(currentFamily.id), listPersonRelations(currentFamily.id),
          listTodayFamilyReminders(currentFamily.id), listThisWeekFamilyEvents(currentFamily.id),
          listUpcomingFamilyEvents(currentFamily.id, 30),
          listFamilyMeetings(currentFamily.id), listFamilyStories(currentFamily.id),
        ]);

        setProfiles(familyProfiles);
        setRecentMeetings(meetings.slice(0, 3));
        setRecentStories(stories.filter((s) => s.status === 'active').slice(0, 4));
        setCompletion(calcCompletion(mapProfilesToTreePersons(familyProfiles, familyRelations, user.id)));
        setReminderSummary({ todayCount: todayR.length, weekCount: weekR.length, monthCount: upcoming.events.length, upcoming: upcoming.events.slice(0, 3) });
      } catch (e) { setError(e instanceof Error ? e.message : '加载家堂失败'); }
      finally { setLoading(false); }
    }
    loadFamily();
  }, [router]);

  async function handleSignOut() { await signOut(); router.push(currentLoginRedirectPath()); }

  if (loading) return <C text="加载中…" />;
  if (error || !family) return <C text={error || '请先创建数字家堂'} />;

  const claimedCount = profiles.filter((p) => p.claim_status === 'claimed').length;
  const unclaimed = profiles.filter((p) => p.claim_status === 'unclaimed');
  const deceased = profiles.filter((p) => p.living_status === 'deceased');
  const hasFamily = profiles.length > 0;

  return (
    <div className="min-h-screen bg-stone-50 pb-safe">
      {/* ===== Hero Header ===== */}
      <div className="bg-emerald-950 px-5 pt-14 pb-10 text-white">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-white/40 tracking-[0.12em] font-medium">{family.surname}氏祠堂</p>
          <button onClick={handleSignOut} className="text-xs text-white/40 hover:text-white/70 transition-colors">退出</button>
        </div>
        <h1 className="text-[26px] font-bold tracking-tight">{family.displayName}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/50">
          <span>{profiles.length} 位成员</span>
          <span>{claimedCount} 人已认领</span>
          {unclaimed.length > 0 && <span>{unclaimed.length} 人待认领</span>}
        </div>
        {!hasFamily && (
          <Link href="/family/relatives/new" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors">
            <UserPlus size={16} />添加第一位家人
          </Link>
        )}
      </div>

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-5">
        {/* ===== Family Motto ===== */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={15} className="text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 tracking-wide">家风家训</span>
              </div>
              {editingMotto ? (
                <div className="space-y-2">
                  <textarea value={motto} onChange={(e) => setMotto(e.target.value)} rows={2}
                    placeholder="写下家族传承的一句话，如：诚信为本、耕读传家"
                    className="w-full resize-none rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all" />
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingMotto(false); }}
                      className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-500">取消</button>
                    <button onClick={() => setEditingMotto(false)}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">保存</button>
                  </div>
                </div>
              ) : motto ? (
                <p className="text-base text-stone-700 font-medium italic">&ldquo;{motto}&rdquo;</p>
              ) : (
                <p className="text-sm text-stone-400">从一段长辈故事中整理家风，点击右侧编辑</p>
              )}
            </div>
            <button onClick={() => setEditingMotto((v) => !v)}
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-amber-500 hover:bg-amber-100 transition-colors">
              <Edit3 size={14} />
            </button>
          </div>
        </div>

        {/* ===== Core CTAs ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <CTACard href="/family/relatives/new" icon={<UserPlus size={16} />} label="添加亲属" />
          <CTACard href="/family/tree/graph" icon={<GitBranch size={16} />} label="家族关系图" />
          <CTACard href="/family/invite" icon={<MailPlus size={16} />} label="邀请认领" sub={unclaimed.length > 0 ? `${unclaimed.length} 人待认领` : undefined} />
          <CTACard href="/family/activity" icon={<Clock size={16} />} label="家族动态" />
        </div>

        {/* ===== Unclaimed Members ===== */}
        {unclaimed.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2.5 text-sm font-semibold text-stone-500 tracking-wide">
                <span className="h-3.5 w-[3px] rounded-full bg-amber-500/60" />待认领亲属
              </h2>
              <Link href="/family/members?filter=unclaimed" className="text-xs font-medium text-amber-600 hover:text-amber-700">
                查看全部 <ArrowRight size={12} className="inline" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {unclaimed.slice(0, 4).map((p) => (
                <Link key={p.id} href={`/family/members/${p.id}`}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm text-center transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 text-base font-semibold">
                    {p.display_name.charAt(0)}
                  </div>
                  <p className="mt-2.5 truncate text-sm font-semibold text-stone-800">{p.display_name}</p>
                  <div className="mt-1.5">
                    <StatusBadge variant="warning">待认领</StatusBadge>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== Deceased Memorial ===== */}
        {deceased.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2.5 text-sm font-semibold text-stone-500 tracking-wide">
                <span className="h-3.5 w-[3px] rounded-full bg-stone-400/60" />已故亲人纪念
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {deceased.slice(0, 4).map((p) => (
                <Link key={p.id} href={`/family/members/${p.id}`}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm text-center transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-200 text-stone-500 text-base font-semibold">
                    {p.display_name.charAt(0)}
                  </div>
                  <p className="mt-2.5 truncate text-sm font-semibold text-stone-800">{p.display_name}</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {p.birth_year ? `${p.birth_year} - ${p.death_year || ''}` : ''}
                  </p>
                  <div className="mt-1.5">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">生平纪念</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== Quick Actions ===== */}
        <section>
          <h2 className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-stone-500 tracking-wide">
            <span className="h-3.5 w-[3px] rounded-full bg-amber-500/60" />常用功能
          </h2>
          <div className="grid grid-cols-4 gap-3">
            <QALink href="/family/members" icon={<Users size={18} />} label="家人" />
            <QALink href="/family/calendar" icon={<Calendar size={18} />} label="日历" />
            <QALink href="/family/stories" icon={<BookOpen size={18} />} label="故事" />
            <QALink href="/family/photos" icon={<Camera size={18} />} label="相册" />
          </div>
        </section>

        {/* ===== Recent Activity = Dual Column ===== */}
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
          <div>
            {!reminderSummary || reminderSummary.upcoming.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white px-4 py-8 text-center">
                <p className="text-sm text-stone-400">暂无近期节点</p>
                <Link href="/family/calendar" className="mt-2 inline-block text-sm font-medium text-emerald-700">去日历添加</Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-stone-200 bg-white shadow-sm divide-y divide-stone-100">
                {reminderSummary.upcoming.map((item) => (
                  <Link key={item.event.id} href={`/family/calendar/${item.event.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50 transition-colors">
                    <div className="min-w-0"><p className="truncate text-sm font-medium text-stone-800">{item.event.title}</p>
                      <p className="text-xs text-stone-500">{formatDate(item.nextOccurrenceDate ?? item.event.event_date)} · {item.typeLabel}</p></div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{item.badge}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div>
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
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== Honor Wall ===== */}
        {recentStories.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2.5 text-sm font-semibold text-stone-500 tracking-wide">
                <Star size={14} className="text-amber-500" />家族记忆
              </h2>
              <Link href="/family/stories" className="text-xs font-medium text-amber-600 hover:text-amber-700">全部</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentStories.map((story) => (
                <Link key={story.id} href="/family/stories"
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <h3 className="text-sm font-semibold text-stone-800">{story.title}</h3>
                  <p className="mt-1 text-xs text-stone-500">{story.story_year ? `${story.story_year} 年` : ''}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== Stats + Settings ===== */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/family/statistics" className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm text-center transition-all hover:-translate-y-0.5 hover:shadow-md">
            <TrendingUp size={18} className="mx-auto text-emerald-600 mb-1" />
            <p className="text-xl font-bold text-stone-800">{completion}%</p>
            <p className="text-xs text-stone-400">完整度</p>
          </Link>
          <Link href="/family/output" className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm text-center transition-all hover:-translate-y-0.5 hover:shadow-md">
            <BookOpen size={18} className="mx-auto text-emerald-600 mb-1" />
            <p className="text-xl font-bold text-stone-800">{recentStories.length}</p>
            <p className="text-xs text-stone-400">故事</p>
          </Link>
          <Link href="/family/settings" className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm text-center transition-all hover:-translate-y-0.5 hover:shadow-md">
            <Settings size={18} className="mx-auto text-stone-400 mb-1" />
            <p className="text-sm font-semibold text-stone-500 mt-1">家堂</p>
            <p className="text-xs text-stone-400">设置</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

function C({ text }: { text: string }) {
  return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-sm text-stone-500">{text}</p></div>;
}

function CTACard({ href, icon, label, sub }: { href: string; icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm text-center transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{icon}</div>
      <p className="mt-2 text-sm font-semibold text-stone-800">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-amber-600 font-medium">{sub}</p>}
    </Link>
  );
}

function QALink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md active:scale-[0.98]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{icon}</div>
      <span className="text-xs font-medium text-stone-700">{label}</span>
    </Link>
  );
}
