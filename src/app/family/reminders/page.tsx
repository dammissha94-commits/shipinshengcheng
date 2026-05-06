'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Calendar } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listThisMonthFamilyEvents, listThisWeekFamilyEvents, listTodayFamilyReminders, listUpcomingFamilyEvents } from '@/lib/services/calendar-service';
import { listFamilyMembers } from '@/lib/services/member-service';
import type { FamilyReminderItem } from '@/types/service';
import type { FamilySpace, PersonProfile } from '@/types/domain';
import AppHeader from '@/components/AppHeader';
import StatusBadge from '@/components/wujia/StatusBadge';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return value ?? '—';
  return target.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}
function sanitizeError(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : fallback;
  if (msg.includes('Auth session missing')) return '请先登录';
  if (msg.includes('failed') || msg.includes('violates') || msg.includes('permission denied')) return fallback;
  return msg;
}

export default function FamilyRemindersPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [people, setPeople] = useState<PersonProfile[]>([]);
  const [todayItems, setTodayItems] = useState<FamilyReminderItem[]>([]);
  const [weekItems, setWeekItems] = useState<FamilyReminderItem[]>([]);
  const [monthItems, setMonthItems] = useState<FamilyReminderItem[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<FamilyReminderItem[]>([]);
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
        const [today, week, month, upcoming, familyPeople] = await Promise.all([
          listTodayFamilyReminders(currentFamily.id), listThisWeekFamilyEvents(currentFamily.id),
          listThisMonthFamilyEvents(currentFamily.id), listUpcomingFamilyEvents(currentFamily.id, 30),
          listFamilyMembers(currentFamily.id),
        ]);
        setFamily(currentFamily); setTodayItems(today); setWeekItems(week); setMonthItems(month); setUpcomingItems(upcoming.events.slice(0, 8)); setPeople(familyPeople);
      } catch (e) { setError(sanitizeError(e, '加载提醒失败')); }
      finally { setLoading(false); }
    }
    load();
  }, [router]);

  if (loading) return <C text="加载中..." />;
  if (!hasSupabaseConfig()) return <S><P text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></S>;
  if (error && !family) return <S><P text={error} /></S>;

  const totalCount = todayItems.length + weekItems.length + monthItems.length;
  const hasAny = todayItems.length > 0 || weekItems.length > 0 || monthItems.length > 0 || upcomingItems.length > 0;

  return (
    <S>
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-5 rounded-2xl bg-#5A3524 p-5 text-white">
          <p className="text-xs text-white/40 tracking-widest font-medium">家庭节点提醒</p>
          <h1 className="mt-0.5 text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-white/55">{totalCount} 条近期提醒</p>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

        <div className="mb-5 grid grid-cols-2 gap-3">
          <Link href="/family/calendar" className="flex items-center justify-center gap-2 rounded-xl bg-#5A3524 py-3 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E transition-colors"><Calendar size={15} />去日历添加</Link>
          <Link href="/family/members" className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 hover:bg-[#F8F1E7] transition-colors">查看家人</Link>
        </div>

        {!hasAny ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400"><Bell size={24} strokeWidth={1.8} /></div>
            <p className="text-base font-semibold text-stone-800">近期暂无提醒</p>
            <p className="mt-1 text-sm text-stone-500">去家族日历添加生日、纪念日或家庭事项</p>
          </div>
        ) : (
          <div className="space-y-6">
            <RS title="今日提醒" items={todayItems} people={people} />
            <RS title="本周提醒" items={weekItems} people={people} />
            <RS title="本月提醒" items={monthItems} people={people} />
            <RS title="即将到来" items={upcomingItems} people={people} />
          </div>
        )}
      </main>
    </S>
  );
}

function RS({ title, items, people }: { title: string; items: FamilyReminderItem[]; people: PersonProfile[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5"><div className="h-4 w-[3px] rounded-full bg-amber-500/60" /><h2 className="text-base font-semibold text-stone-800">{title}</h2><span className="text-xs text-stone-400">{items.length}</span></div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-10 text-center text-sm text-stone-400">暂无{title}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const relatedPerson = people.find((p) => p.id === item.event.source_person_id) ?? null;
            const showNext = item.isRecurringYearly && item.nextOccurrenceDate !== null && item.nextOccurrenceDate !== item.event.event_date;
            return (
              <article key={`${title}-${item.event.id}`} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="text-base font-semibold text-stone-800">{item.event.title}</h3><p className="mt-1 text-xs text-stone-500">原始：{formatDate(item.event.event_date)} · {item.typeLabel}</p>{showNext && <p className="mt-0.5 text-xs text-#8D6E63">下一次：{formatDate(item.nextOccurrenceDate)}</p>}</div>
                  <StatusBadge>{item.badge}</StatusBadge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.isRecurringYearly && <StatusBadge>每年重复</StatusBadge>}
                  {item.isAutoBirthday && <StatusBadge variant="warning">自动生日</StatusBadge>}
                  {relatedPerson && <Link href={`/family/members/${relatedPerson.id}`} className="text-xs font-medium text-#8D6E63">查看档案</Link>}
                  <Link href={`/family/calendar/${item.event.id}`} className="ml-auto text-xs font-medium text-#8D6E63">详情</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function S({ children }: { children: React.ReactNode }) { return <div className="min-h-screen bg-[#F8F1E7]"><AppHeader title="提醒中心" backHref="/family" />{children}</div>; }
function C({ text }: { text: string }) { return <div className="min-h-screen bg-[#F8F1E7] flex items-center justify-center"><p className="text-sm text-stone-500">{text}</p></div>; }
function P({ text }: { text: string }) { return <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 text-center"><p className="rounded-2xl border border-stone-200 bg-white px-4 py-5 text-sm text-stone-500 shadow-sm">{text}</p></main>; }
