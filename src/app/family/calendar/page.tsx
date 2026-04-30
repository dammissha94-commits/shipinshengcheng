'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import {
  archiveFamilyCalendarEvent,
  createFamilyCalendarEvent,
  listFamilyCalendarEvents,
} from '@/lib/services/calendar-service';
import { listFamilyMembers } from '@/lib/services/member-service';
import type {
  CalendarEventType,
  CalendarRecurrence,
  FamilyCalendarEvent,
  FamilySpace,
  PersonProfile,
  Visibility,
} from '@/types/domain';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/EmptyState';
import SectionTitle from '@/components/SectionTitle';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';

const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  birthday: '生日',
  anniversary: '纪念日',
  family_gathering: '家庭聚会',
  family_task: '家庭事项',
};

const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  birthday: 'bg-gold/15 text-gold',
  anniversary: 'bg-pine/10 text-pine',
  family_gathering: 'bg-emerald-50 text-emerald-700',
  family_task: 'bg-sand/70 text-charcoal',
};

const TYPE_FILTERS: { value: CalendarEventType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'birthday', label: '生日' },
  { value: 'anniversary', label: '纪念日' },
  { value: 'family_gathering', label: '家庭聚会' },
  { value: 'family_task', label: '家庭事项' },
];

const EVENT_TYPE_OPTIONS: { value: CalendarEventType; label: string }[] = [
  { value: 'birthday', label: '生日' },
  { value: 'anniversary', label: '纪念日' },
  { value: 'family_gathering', label: '家庭聚会' },
  { value: 'family_task', label: '家庭事项' },
];

const RECURRENCE_OPTIONS: { value: CalendarRecurrence; label: string }[] = [
  { value: 'yearly', label: '每年提醒' },
  { value: 'monthly', label: '每月提醒' },
  { value: 'none', label: '仅一次' },
];

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'family', label: '家庭内可见' },
  { value: 'private', label: '仅自己可见' },
  { value: 'public', label: '公开可见' },
];

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function daysUntil(value: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(`${value}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function relativeLabel(value: string): string {
  const days = daysUntil(value);
  if (days === 0) return '今天';
  if (days > 0) return `D-${days}`;
  return `已过 ${Math.abs(days)} 天`;
}

function reminderText(event: FamilyCalendarEvent): string {
  const reminders = [
    event.remind_d7 ? 'D-7' : '',
    event.remind_d1 ? 'D-1' : '',
    event.remind_day ? '当天' : '',
  ].filter(Boolean);
  return reminders.length > 0 ? reminders.join(' / ') : '未开启提醒';
}

function sanitizeError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes('Auth session missing')) return '请先登录';
  if (message.includes('failed') || message.includes('violates') || message.includes('permission denied')) {
    return fallback;
  }
  return message;
}

export default function FamilyCalendarPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [events, setEvents] = useState<FamilyCalendarEvent[]>([]);
  const [people, setPeople] = useState<PersonProfile[]>([]);
  const [filter, setFilter] = useState<CalendarEventType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [archivingId, setArchivingId] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    eventType: 'birthday' as CalendarEventType,
    title: '',
    description: '',
    eventDate: '',
    recurrence: 'yearly' as CalendarRecurrence,
    remindD7: true,
    remindD1: true,
    remindDay: true,
    visibility: 'family' as Visibility,
  });

  async function reload(currentFamily: FamilySpace) {
    const records = await listFamilyCalendarEvents(currentFamily.id);
    setEvents(records);
  }

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

        const [records, familyPeople] = await Promise.all([
          listFamilyCalendarEvents(currentFamily.id),
          listFamilyMembers(currentFamily.id),
        ]);
        setFamily(currentFamily);
        setEvents(records);
        setPeople(familyPeople);
      } catch (loadError) {
        setError(sanitizeError(loadError, '加载家族日历失败'));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const filteredEvents = useMemo(
    () => (filter === 'all' ? events : events.filter((event) => event.event_type === filter)),
    [events, filter]
  );

  const upcomingEvents = useMemo(
    () => events.filter((event) => daysUntil(event.event_date) >= 0).slice(0, 3),
    [events]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!family || !form.title.trim() || !form.eventDate) return;

    try {
      setSubmitting(true);
      setError('');
      const record = await createFamilyCalendarEvent({
        familyId: family.id,
        eventType: form.eventType,
        title: form.title.trim(),
        description: form.description.trim() || null,
        eventDate: form.eventDate,
        recurrence: form.recurrence,
        remindD7: form.remindD7,
        remindD1: form.remindD1,
        remindDay: form.remindDay,
        visibility: form.visibility,
      });
      setEvents((current) => [...current, record].sort((a, b) => a.event_date.localeCompare(b.event_date)));
      setForm({
        eventType: 'birthday',
        title: '',
        description: '',
        eventDate: '',
        recurrence: 'yearly',
        remindD7: true,
        remindD1: true,
        remindDay: true,
        visibility: 'family',
      });
      setShowForm(false);
    } catch (submitError) {
      setError(sanitizeError(submitError, '保存家族日历失败'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(eventId: string) {
    if (!family) return;

    try {
      setArchivingId(eventId);
      setError('');
      await archiveFamilyCalendarEvent(eventId);
      await reload(family);
    } catch (archiveError) {
      setError(sanitizeError(archiveError, '归档日历记录失败'));
    } finally {
      setArchivingId('');
    }
  }

  if (loading) return <CenteredText text="加载中..." />;

  if (!hasSupabaseConfig()) {
    return <Shell rightElement={null}><CenteredPanel text={SUPABASE_FALLBACK_MESSAGE} /></Shell>;
  }

  if (error && !family) {
    return <Shell rightElement={null}><CenteredPanel text={error} /></Shell>;
  }

  return (
    <Shell
      rightElement={
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-pine transition-colors hover:bg-sand"
          aria-label="新增日历记录"
        >
          <PlusIcon />
        </button>
      }
    >
      <main className="mx-auto max-w-md px-4 py-6">
        <div className="mb-5 rounded-2xl bg-pine p-5 text-cream">
          <p className="mb-1 text-xs tracking-wider text-cream/60">家族日历</p>
          <h1 className="text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-cream/70">
            {events.length} 个家庭节点 · 生日、纪念日与家庭事项集中提醒
          </p>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {upcomingEvents.length > 0 && (
          <section className="mb-6">
            <SectionTitle title="近期提醒" subtitle="按日历日期自动排序" />
            <div className="grid gap-2">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-xl border border-gold/25 bg-gold/10 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-charcoal">{event.title}</p>
                    <p className="text-xs text-muted">{formatDate(event.event_date)} · {reminderText(event)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-gold">
                    {relativeLabel(event.event_date)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-2xl border border-pine/20 bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold text-pine">新增家庭节点</p>
            <SelectField label="类型" value={form.eventType} options={EVENT_TYPE_OPTIONS} onChange={(value) => setForm({ ...form, eventType: value })} />
            <Field label="标题" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
            <Field label="日期" type="date" value={form.eventDate} onChange={(value) => setForm({ ...form, eventDate: value })} required />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-charcoal">说明</span>
              <textarea
                value={form.description}
                onChange={(changeEvent) => setForm({ ...form, description: changeEvent.target.value })}
                rows={3}
                className="w-full resize-none rounded-xl border-2 border-sand bg-cream px-3 py-2.5 text-sm focus:border-pine focus:outline-none"
              />
            </label>
            <SelectField label="重复" value={form.recurrence} options={RECURRENCE_OPTIONS} onChange={(value) => setForm({ ...form, recurrence: value })} />
            <ReminderToggles
              remindD7={form.remindD7}
              remindD1={form.remindD1}
              remindDay={form.remindDay}
              onChange={(patch) => setForm({ ...form, ...patch })}
            />
            <SelectField label="可见范围" value={form.visibility} options={VISIBILITY_OPTIONS} onChange={(value) => setForm({ ...form, visibility: value })} />
            <FormActions submitting={submitting} disabled={!form.title.trim() || !form.eventDate} onCancel={() => setShowForm(false)} />
          </form>
        )}

        <section>
          <SectionTitle title="全部家庭节点" subtitle="生日、纪念日、家庭聚会和家庭事项" />
          <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
            {TYPE_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  filter === item.value ? 'bg-pine text-cream' : 'border border-sand bg-card text-muted'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon />}
              title="还没有日历记录"
              description="先添加一个生日、纪念日或家庭事项，系统会保存提醒设置。"
              action={{ label: '新增家庭节点', onClick: () => setShowForm(true) }}
            />
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <CalendarEventCard
                  key={event.id}
                  event={event}
                  relatedPerson={people.find((person) => person.id === event.source_person_id) ?? null}
                  archiving={archivingId === event.id}
                  onArchive={() => handleArchive(event.id)}
                />
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 rounded-2xl border border-sand/70 bg-card p-4">
          <p className="text-sm font-semibold text-charcoal">可记录的家庭节点</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            可把春节团圆、清明踏青、重阳敬老、家庭聚餐等节点记录为纪念日或家庭聚会，便于提前安排和提醒。
          </p>
        </div>
      </main>
    </Shell>
  );
}

function CalendarEventCard({
  event,
  relatedPerson,
  archiving,
  onArchive,
}: {
  event: FamilyCalendarEvent;
  relatedPerson: PersonProfile | null;
  archiving: boolean;
  onArchive: () => void;
}) {
  const typeColor = EVENT_TYPE_COLORS[event.event_type] ?? 'bg-sand/70 text-charcoal';

  return (
    <article className="rounded-2xl border border-sand/70 bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug text-charcoal">{event.title}</h3>
          <p className="mt-1 text-xs text-muted">{formatDate(event.event_date)} · {relativeLabel(event.event_date)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${typeColor}`}>
          {EVENT_TYPE_LABELS[event.event_type]}
        </span>
      </div>
      {event.source_type === 'person_birthday' && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">
            自动生日提醒
          </span>
          {relatedPerson && (
            <>
              <span className="text-xs text-muted">关联：{relatedPerson.display_name}</span>
              <Link href={`/family/members/${relatedPerson.id}`} className="text-xs font-medium text-pine">
                查看家人档案
              </Link>
            </>
          )}
        </div>
      )}
      {event.description && <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-muted">{event.description}</p>}
      <div className="flex items-center justify-between gap-3 border-t border-sand/60 pt-3 text-xs text-muted">
        <span>提醒：{reminderText(event)}</span>
        <button type="button" onClick={onArchive} disabled={archiving} className="shrink-0 font-medium text-pine disabled:opacity-50">
          {archiving ? '处理中...' : '归档'}
        </button>
      </div>
    </article>
  );
}

function Shell({ children, rightElement }: { children: React.ReactNode; rightElement: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="家族日历" backHref="/family" rightElement={rightElement} />
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

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-charcoal">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border-2 border-sand bg-cream px-3 py-2.5 text-sm focus:border-pine focus:outline-none"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-charcoal">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-xl border-2 border-sand bg-cream px-3 py-2.5 text-sm focus:border-pine focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function ReminderToggles({
  remindD7,
  remindD1,
  remindDay,
  onChange,
}: {
  remindD7: boolean;
  remindD1: boolean;
  remindDay: boolean;
  onChange: (value: Partial<{ remindD7: boolean; remindD1: boolean; remindDay: boolean }>) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-charcoal">提醒</legend>
      <div className="grid grid-cols-3 gap-2">
        <Toggle label="D-7" checked={remindD7} onChange={(value) => onChange({ remindD7: value })} />
        <Toggle label="D-1" checked={remindD1} onChange={(value) => onChange({ remindD1: value })} />
        <Toggle label="当天" checked={remindDay} onChange={(value) => onChange({ remindDay: value })} />
      </div>
    </fieldset>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className={`flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-xs font-medium ${
      checked ? 'border-pine bg-pine text-cream' : 'border-sand bg-cream text-muted'
    }`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="sr-only" />
      {label}
    </label>
  );
}

function FormActions({
  submitting,
  disabled,
  onCancel,
}: {
  submitting: boolean;
  disabled: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onCancel} className="flex-1 rounded-xl border-2 border-sand py-2.5 text-sm font-medium text-muted">
        取消
      </button>
      <button disabled={disabled || submitting} className="flex-1 rounded-xl bg-pine py-2.5 text-sm font-semibold text-cream disabled:cursor-not-allowed disabled:opacity-50">
        {submitting ? '保存中...' : '保存'}
      </button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
