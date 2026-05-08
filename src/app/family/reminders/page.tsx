'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Users } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listThisMonthFamilyEvents, listThisWeekFamilyEvents, listTodayFamilyReminders, listUpcomingFamilyEvents } from '@/lib/services/calendar-service';
import { listFamilyMembers } from '@/lib/services/member-service';
import type { FamilyReminderItem } from '@/types/service';
import type { FamilySpace, PersonProfile } from '@/types/domain';
import StatusBadge from '@/components/wujia/StatusBadge';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import { WjHeroPanel, WjPaperCard, WjScreenContent, WjSectionHeading, WjSoftNote } from '@/components/wujia/MobileDesignSystem';

function formatDate(value: string | null | undefined): string {
  if (!value) return '未填写';
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return value ?? '未填写';
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
        const [today, week, month, upcoming, familyPeople] = await Promise.all([
          listTodayFamilyReminders(currentFamily.id),
          listThisWeekFamilyEvents(currentFamily.id),
          listThisMonthFamilyEvents(currentFamily.id),
          listUpcomingFamilyEvents(currentFamily.id, 30),
          listFamilyMembers(currentFamily.id),
        ]);
        setFamily(currentFamily);
        setTodayItems(today);
        setWeekItems(week);
        setMonthItems(month);
        setUpcomingItems(upcoming.events.slice(0, 8));
        setPeople(familyPeople);
      } catch (e) {
        setError(sanitizeError(e, '加载提醒失败'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) return <S><P text="加载提醒中..." /></S>;
  if (!hasSupabaseConfig()) return <S><P text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></S>;
  if (error && !family) return <S><P text={error} /></S>;

  const totalCount = todayItems.length + weekItems.length + monthItems.length;
  const hasAny = todayItems.length > 0 || weekItems.length > 0 || monthItems.length > 0 || upcomingItems.length > 0;

  return (
    <S>
      <WjScreenContent>
        <WjHeroPanel
          eyebrow="FAMILY REMINDERS"
          title={family?.displayName ?? '家庭提醒'}
          description={`${totalCount} 条近期提醒，把生日、纪念日和家庭节点整理在一起。`}
        />

        {error && <p className="rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Link href="/family/calendar" className="flex min-h-[52px] items-center justify-center gap-2 rounded-[15px] bg-[#5A3825] text-sm font-semibold text-white shadow-[0_10px_22px_rgba(90,53,36,0.18)]">
            <Calendar size={16} /> 去日历添加
          </Link>
          <Link href="/family/members" className="flex min-h-[52px] items-center justify-center gap-2 rounded-[15px] border border-[#E7D9C9] bg-white/82 text-sm font-medium text-[#5A3524] shadow-[0_10px_28px_rgba(90,53,36,0.05)]">
            <Users size={16} /> 查看家人
          </Link>
        </div>

        {!hasAny ? (
          <WjPaperCard className="p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F1E5D6] text-[#9B6A37]">
              <Calendar size={24} />
            </div>
            <h2 className="mt-4 text-[18px] font-semibold text-[#2A1D16]">近期暂无提醒</h2>
            <p className="mt-2 text-[13px] leading-6 text-[#78675B]">去家族日历添加生日、纪念日或家庭事项，提醒中心会自动汇总展示。</p>
            <Link href="/family/calendar" className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-[14px] bg-[#5A3825] px-5 text-sm font-semibold text-white">
              去日历添加
            </Link>
          </WjPaperCard>
        ) : (
          <div className="space-y-6">
            <ReminderSection title="今日提醒" items={todayItems} people={people} />
            <ReminderSection title="本周提醒" items={weekItems} people={people} />
            <ReminderSection title="本月提醒" items={monthItems} people={people} />
            <ReminderSection title="即将到来" items={upcomingItems} people={people} />
          </div>
        )}
      </WjScreenContent>
    </S>
  );
}

function ReminderSection({ title, items, people }: { title: string; items: FamilyReminderItem[]; people: PersonProfile[] }) {
  return (
    <section>
      <WjSectionHeading title={title} count={items.length} />
      {items.length === 0 ? (
        <WjSoftNote className="text-center">暂无{title}</WjSoftNote>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const relatedPerson = people.find((p) => p.id === item.event.source_person_id) ?? null;
            const showNext = item.isRecurringYearly && item.nextOccurrenceDate !== null && item.nextOccurrenceDate !== item.event.event_date;
            return (
              <article key={`${title}-${item.event.id}`} className="rounded-[15px] border border-[#E7D9C9] bg-white/82 p-4 shadow-[0_10px_28px_rgba(90,53,36,0.06)]">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-semibold text-[#2A1D16]">{item.event.title}</h3>
                    <p className="mt-1 text-xs text-[#78675B]">原始：{formatDate(item.event.event_date)} · {item.typeLabel}</p>
                    {showNext && <p className="mt-0.5 text-xs text-[#8B5A3C]">下一次：{formatDate(item.nextOccurrenceDate)}</p>}
                  </div>
                  <StatusBadge>{item.badge}</StatusBadge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.isRecurringYearly && <StatusBadge>每年重复</StatusBadge>}
                  {item.isAutoBirthday && <StatusBadge variant="warning">自动生日</StatusBadge>}
                  {relatedPerson && (
                    <Link href={`/family/members/${relatedPerson.id}`} className="flex min-h-[44px] items-center text-xs font-medium text-[#8B5A3C]">
                      查看档案
                    </Link>
                  )}
                  <Link href={`/family/calendar/${item.event.id}`} className="ml-auto flex min-h-[44px] items-center text-xs font-medium text-[#8B5A3C]">
                    详情
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function S({ children }: { children: React.ReactNode }) {
  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar title="提醒中心" />
      {children}
    </MobilePage>
  );
}

function P({ text }: { text: string }) {
  return (
    <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-5 text-center">
      <p className="rounded-[15px] border border-[#E7D9C9] bg-white/82 px-4 py-5 text-sm text-[#78675B] shadow-[0_10px_28px_rgba(90,53,36,0.06)]">{text}</p>
    </main>
  );
}
