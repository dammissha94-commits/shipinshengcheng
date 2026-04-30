'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import {
  listThisMonthFamilyEvents,
  listThisWeekFamilyEvents,
  listTodayFamilyReminders,
  listUpcomingFamilyEvents,
} from '@/lib/services/calendar-service';
import { listFamilyMembers } from '@/lib/services/member-service';
import type { FamilyReminderItem } from '@/types/service';
import type { FamilySpace, PersonProfile } from '@/types/domain';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/EmptyState';
import SectionTitle from '@/components/SectionTitle';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return value ?? '—';
  return target.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function sanitizeError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes('Auth session missing')) return '请先登录';
  if (message.includes('failed') || message.includes('violates') || message.includes('permission denied')) {
    return fallback;
  }
  return message;
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
        setError(SUPABASE_FALLBACK_MESSAGE);
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
      } catch (loadError) {
        setError(sanitizeError(loadError, '加载家庭节点提醒失败'));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  if (loading) return <CenteredText text="加载中..." />;

  if (!hasSupabaseConfig()) {
    return <Shell><CenteredPanel text={SUPABASE_FALLBACK_MESSAGE} /></Shell>;
  }

  if (error && !family) {
    return <Shell><CenteredPanel text={error} /></Shell>;
  }

  const totalCount = todayItems.length + weekItems.length + monthItems.length;
  const hasAny = todayItems.length > 0 || weekItems.length > 0 || monthItems.length > 0 || upcomingItems.length > 0;

  return (
    <Shell>
      <main className="mx-auto max-w-md px-4 py-6">
        <div className="mb-5 rounded-2xl bg-pine p-5 text-cream">
          <p className="mb-1 text-xs tracking-wider text-cream/60">家庭节点提醒</p>
          <h1 className="text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-cream/70">{totalCount} 条近期提醒 · 只做站内展示</p>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mb-5 grid grid-cols-2 gap-3">
          <Link href="/family/calendar" className="rounded-xl bg-pine px-3 py-3 text-center text-sm font-semibold text-cream">
            去家族日历添加
          </Link>
          <Link href="/family/members" className="rounded-xl border border-pine px-3 py-3 text-center text-sm font-semibold text-pine">
            查看家人成员
          </Link>
        </div>

        {!hasAny ? (
          <EmptyState
            icon={<BellIcon />}
            title="近期暂无家庭节点提醒"
            description="可以去家族日历添加生日、纪念日、家庭聚会或家庭事项。"
          />
        ) : (
          <div className="space-y-6">
            <ReminderSection title="今日提醒" items={todayItems} people={people} />
            <ReminderSection title="本周提醒" items={weekItems} people={people} />
            <ReminderSection title="本月提醒" items={monthItems} people={people} />
            <ReminderSection title="即将到来" items={upcomingItems} people={people} />
          </div>
        )}
      </main>
    </Shell>
  );
}

function ReminderSection({
  title,
  items,
  people,
}: {
  title: string;
  items: FamilyReminderItem[];
  people: PersonProfile[];
}) {
  return (
    <section>
      <SectionTitle title={title} subtitle={`${items.length} 条家庭节点`} />
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand bg-card px-4 py-8 text-center text-sm text-muted">
          暂无{title}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ReminderCard
              key={`${title}-${item.event.id}`}
              item={item}
              relatedPerson={people.find((person) => person.id === item.event.source_person_id) ?? null}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ReminderCard({
  item,
  relatedPerson,
}: {
  item: FamilyReminderItem;
  relatedPerson: PersonProfile | null;
}) {
  const showNextLine =
    item.isRecurringYearly &&
    item.nextOccurrenceDate !== null &&
    item.nextOccurrenceDate !== item.event.event_date;

  return (
    <article className="rounded-2xl border border-sand/70 bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug text-charcoal">{item.event.title}</h3>
          <p className="mt-1 text-xs text-muted">
            原始：{formatDate(item.event.event_date)} · {item.typeLabel}
          </p>
          {showNextLine && (
            <p className="mt-0.5 text-xs text-pine">下一次：{formatDate(item.nextOccurrenceDate)}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-pine/10 px-2.5 py-1 text-xs font-medium text-pine">
          {item.badge}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {item.isRecurringYearly && (
          <span className="rounded-full bg-pine/10 px-2.5 py-1 text-xs font-medium text-pine">
            每年重复
          </span>
        )}
        {item.isAutoBirthday && (
          <span className="rounded-full bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">
            自动生日提醒
          </span>
        )}
        {relatedPerson && (
          <Link href={`/family/members/${relatedPerson.id}`} className="text-xs font-medium text-pine">
            查看家人档案
          </Link>
        )}
        <Link href={`/family/calendar/${item.event.id}`} className="ml-auto text-xs font-medium text-pine">
          查看详情
        </Link>
      </div>
    </article>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="家庭节点提醒" backHref="/family" />
      {children}
    </div>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 text-center">
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

function CenteredPanel({ text }: { text: string }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 text-center">
      <p className="rounded-2xl border border-sand/70 bg-card px-4 py-5 text-sm text-muted shadow-sm">{text}</p>
    </main>
  );
}

function BellIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
