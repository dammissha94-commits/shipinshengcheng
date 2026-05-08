'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Bell } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { archiveFamilyCalendarEvent, createFamilyCalendarEvent, enrichCalendarEventWithOccurrence, listFamilyCalendarEvents, sortEventsByNextOccurrence } from '@/lib/services/calendar-service';
import { listFamilyMembers } from '@/lib/services/member-service';
import type { CalendarEventType, CalendarRecurrence, FamilyCalendarEvent, FamilySpace, PersonProfile, Visibility } from '@/types/domain';
import StatusBadge from '@/components/wujia/StatusBadge';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import PageHero from '@/components/wujia/PageHero';
import PageSkeleton from '@/components/ui/PageSkeleton';
import EmptyState from '@/components/wujia/EmptyState';
import { NoCalendarIllustration } from '@/components/illustrations';
import { WjFormRow, WjInput, WjSelect, WjTextarea, WjToggle, WjButton } from '@/components/wujia/WjForm';
import { getDateMarkers } from '@/lib/date/lunar';

const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = { birthday: '生日', anniversary: '纪念日', family_gathering: '家庭聚会', family_task: '家庭事项' };
const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = { birthday: 'bg-warning-light text-warning', anniversary: 'bg-[var(--surface-3)] text-[var(--walnut-light)]', family_gathering: 'bg-[var(--surface-3)] text-[var(--jade)]', family_task: 'bg-[var(--surface-2)] text-[var(--ink-2)]' };
const TYPE_FILTERS: { value: CalendarEventType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' }, { value: 'birthday', label: '生日' }, { value: 'anniversary', label: '纪念日' }, { value: 'family_gathering', label: '家庭聚会' }, { value: 'family_task', label: '家庭事项' },
];
const EVENT_TYPE_OPTIONS: { value: CalendarEventType; label: string }[] = [
  { value: 'birthday', label: '生日' }, { value: 'anniversary', label: '纪念日' }, { value: 'family_gathering', label: '家庭聚会' }, { value: 'family_task', label: '家庭事项' },
];
const RECURRENCE_OPTIONS: { value: CalendarRecurrence; label: string }[] = [
  { value: 'yearly', label: '每年提醒' }, { value: 'monthly', label: '每月提醒' }, { value: 'none', label: '仅一次' },
];
const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'family', label: '家庭内可见' }, { value: 'private', label: '仅自己可见' }, { value: 'public', label: '公开可见' },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return value ?? '—';
  return target.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}
function reminderText(event: FamilyCalendarEvent): string {
  const r = [event.remind_d7 ? 'D-7' : '', event.remind_d1 ? 'D-1' : '', event.remind_day ? '当天' : ''].filter(Boolean);
  return r.length > 0 ? r.join(' / ') : '未开启提醒';
}
function sanitizeError(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : fallback;
  if (msg.includes('Auth session missing')) return '请先登录';
  if (msg.includes('failed') || msg.includes('violates') || msg.includes('permission denied')) return fallback;
  return fallback;
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
  const [form, setForm] = useState({ eventType: 'birthday' as CalendarEventType, title: '', description: '', eventDate: '', recurrence: 'yearly' as CalendarRecurrence, remindD7: true, remindD1: true, remindDay: true, visibility: 'family' as Visibility });

  async function reload(currentFamily: FamilySpace) { setEvents(await listFamilyCalendarEvents(currentFamily.id)); }

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        const [records, familyPeople] = await Promise.all([listFamilyCalendarEvents(currentFamily.id), listFamilyMembers(currentFamily.id)]);
        setFamily(currentFamily); setEvents(records); setPeople(familyPeople);
      } catch (e) { setError(sanitizeError(e, '加载家族日历失败')); }
      finally { setLoading(false); }
    }
    load();
  }, [router]);

  const sortedEvents = useMemo(() => sortEventsByNextOccurrence(events), [events]);
  const filteredEvents = useMemo(() => filter === 'all' ? sortedEvents : sortedEvents.filter((e) => e.event_type === filter), [sortedEvents, filter]);
  const upcomingEvents = useMemo(() => sortedEvents.map((e) => enrichCalendarEventWithOccurrence(e)).filter((e) => e.daysUntil !== null && e.daysUntil >= 0 && e.daysUntil <= 30).slice(0, 3), [sortedEvents]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!family || !form.title.trim() || !form.eventDate) return;
    try {
      setSubmitting(true); setError('');
      const record = await createFamilyCalendarEvent({ familyId: family.id, eventType: form.eventType, title: form.title.trim(), description: form.description.trim() || null, eventDate: form.eventDate, recurrence: form.recurrence, remindD7: form.remindD7, remindD1: form.remindD1, remindDay: form.remindDay, visibility: form.visibility });
      setEvents((c) => [...c, record].sort((a, b) => a.event_date.localeCompare(b.event_date)));
      setForm({ eventType: 'birthday', title: '', description: '', eventDate: '', recurrence: 'yearly', remindD7: true, remindD1: true, remindDay: true, visibility: 'family' }); setShowForm(false);
    } catch (e) { setError(sanitizeError(e, '保存失败')); }
    finally { setSubmitting(false); }
  }
  async function handleArchive(eventId: string) {
    if (!family) return;
    try { setArchivingId(eventId); setError(''); await archiveFamilyCalendarEvent(eventId); await reload(family); }
    catch (e) { setError(sanitizeError(e, '归档失败')); }
    finally { setArchivingId(''); }
  }

  if (loading) return <PageSkeleton title="家族日历" backHref="/family" cards={4} withStats={false} withSearch={false} />;
  if (!hasSupabaseConfig()) return <S r={null}><P text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></S>;
  if (error && !family) return <S r={null}><P text={error} /></S>;

  const todayMarkers = getDateMarkers(new Date());
  const todayMarkerLabel = todayMarkers.length > 0 ? `今日：${todayMarkers.map((m) => m.name).join(' · ')}` : null;

  return (
    <S r={<button onClick={() => setShowForm((v) => !v)} className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--walnut-light)] hover:bg-[var(--surface-2)]" aria-label="新增"><Plus size={18} strokeWidth={2.5} /></button>}>
      <main className="relative z-10 space-y-5 px-5 pb-6">
        <PageHero
          eyebrow="家族日历"
          title={family?.displayName ?? '家族日历'}
          subtitle={`${events.length} 个家庭节点${todayMarkerLabel ? ' · ' + todayMarkerLabel : ''}`}
        />

        {error && <p className="rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}

        {/* 近期提醒 — 真实数据，不再是假日历 */}
        <section className="rounded-[var(--radius-md)] border border-[var(--line-1)] bg-[var(--surface-1)] p-4 shadow-warm-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[var(--ink-1)]">近期提醒</h2>
            <Link href="/family/reminders" className="min-h-[44px] flex items-center text-[13px] text-[var(--ink-3)]">查看全部</Link>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map((entry) => (
                <Link
                  key={entry.event.id}
                  href={`/family/calendar/${entry.event.id}`}
                  className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--line-1)] bg-[var(--surface-2)] px-3 py-3 transition active:scale-[0.99]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-3)] text-[var(--gold)]">
                    <Bell size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[var(--ink-1)]">{entry.event.title}</p>
                    <p className="text-[12px] text-[var(--ink-3)]">{formatDate(entry.nextOccurrenceDate)}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-[var(--surface-3)] px-2 py-1 text-[12px] text-[var(--jade)]">{entry.reminderBadge}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-5 text-center text-sm text-[var(--ink-3)]">近期暂无提醒</p>
          )}
        </section>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-5">
            <div className="wj-card-solid overflow-hidden rounded-[28px]">
              <div className="border-b border-[var(--surface-2)] px-5 py-4"><h2 className="text-base font-semibold text-[var(--ink-1)]">新增家庭节点</h2></div>
              <div className="space-y-4 px-5 py-5">
                <WjFormRow label="类型">
                  <WjSelect value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value as CalendarEventType })}>
                    {EVENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </WjSelect>
                </WjFormRow>
                <WjFormRow label="标题" required>
                  <WjInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </WjFormRow>
                <WjFormRow label="日期" required>
                  <WjInput type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required />
                </WjFormRow>
                <WjFormRow label="说明">
                  <WjTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </WjFormRow>
                <WjFormRow label="重复">
                  <WjSelect value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as CalendarRecurrence })}>
                    {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </WjSelect>
                </WjFormRow>
                <fieldset><legend className="text-sm font-medium text-[var(--ink-2)] mb-2">提醒</legend>
                  <div className="grid grid-cols-3 gap-2">
                    <WjFormRow label="D-7">
                      <WjToggle checked={form.remindD7} onChange={(v) => setForm({ ...form, remindD7: v })} />
                    </WjFormRow>
                    <WjFormRow label="D-1">
                      <WjToggle checked={form.remindD1} onChange={(v) => setForm({ ...form, remindD1: v })} />
                    </WjFormRow>
                    <WjFormRow label="当天">
                      <WjToggle checked={form.remindDay} onChange={(v) => setForm({ ...form, remindDay: v })} />
                    </WjFormRow>
                  </div></fieldset>
                <WjFormRow label="可见范围">
                  <WjSelect value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as Visibility })}>
                    {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </WjSelect>
                </WjFormRow>
              </div>
              <div className="border-t border-[var(--surface-2)] px-5 py-4 flex gap-3">
                <WjButton type="button" variant="secondary" onClick={() => setShowForm(false)}>取消</WjButton>
                <WjButton type="submit" disabled={!form.title.trim() || !form.eventDate || submitting}>{submitting ? '保存中...' : '保存'}</WjButton>
              </div>
            </div>
          </form>
        )}

        <div className="mb-3 flex items-center gap-2.5"><div className="h-4 w-[3px] rounded-full bg-[var(--walnut-light)]" /><h2 className="text-[17px] font-semibold text-[var(--ink-1)]">全部节点</h2></div>
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {TYPE_FILTERS.map((t) => (
            <button key={t.value} type="button" onClick={() => setFilter(t.value)}
              className={`shrink-0 min-h-[44px] px-4 flex items-center text-xs font-medium transition-all ${filter === t.value ? 'bg-[var(--walnut)] text-white' : 'border border-[var(--line-1)] bg-white text-[var(--ink-3)] hover:border-[var(--line-2)]'}`}>{t.label}</button>
          ))}
        </div>

        {filteredEvents.length === 0 ? (
          <EmptyState
            illustration={<NoCalendarIllustration />}
            title="还没有日历记录"
            description="添加生日、纪念日或家庭事项"
            action={<button onClick={() => setShowForm(true)} className="wj-primary rounded-2xl px-5 min-h-[44px] text-sm font-semibold transition-colors">新增家庭节点</button>}
          />
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const relatedPerson = people.find((p) => p.id === event.source_person_id) ?? null;
              const typeColor = EVENT_TYPE_COLORS[event.event_type] ?? 'bg-[var(--surface-2)] text-[var(--ink-2)]';
              const occurrence = enrichCalendarEventWithOccurrence(event);
              return (
                <article key={event.id} className="rounded-[13px] border border-[var(--line-1)] bg-white/86 p-4 shadow-[0_8px_20px_rgba(90,53,36,0.05)]">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="text-base font-semibold text-[var(--ink-1)]">{event.title}</h3><p className="mt-1 text-xs text-[var(--ink-3)]">原始：{formatDate(event.event_date)} · {occurrence.reminderBadge}</p>{occurrence.isRecurringYearly && occurrence.nextOccurrenceDate !== null && occurrence.nextOccurrenceDate !== event.event_date && <p className="mt-0.5 text-xs text-[var(--walnut-light)]">下一次：{formatDate(occurrence.nextOccurrenceDate)}</p>}</div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${typeColor}`}>{EVENT_TYPE_LABELS[event.event_type]}</span>
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {occurrence.isRecurringYearly && <StatusBadge>每年重复</StatusBadge>}
                    {event.source_type === 'person_birthday' && <><StatusBadge variant="warning">自动生日</StatusBadge>{relatedPerson && <Link href={`/family/members/${relatedPerson.id}`} className="text-xs font-medium text-[var(--walnut-light)]">查看档案</Link>}</>}
                  </div>
                  {event.description && <p className="mb-3 line-clamp-2 text-sm text-[var(--ink-3)]">{event.description}</p>}
                  <div className="flex items-center justify-between gap-3 border-t border-[var(--surface-2)] pt-3 text-xs text-[var(--ink-3)]">
                    <span>提醒：{reminderText(event)}</span>
                    <div className="flex shrink-0 items-center gap-3">
                      <Link href={`/family/calendar/${event.id}`} className="min-h-[44px] flex items-center px-2 font-medium text-[var(--walnut-light)]">详情</Link>
                      <button type="button" onClick={() => handleArchive(event.id)} disabled={archivingId === event.id} className="min-h-[44px] px-2 font-medium text-[var(--ink-3)] hover:text-[var(--ink-2)] disabled:opacity-50">{archivingId === event.id ? '处理中...' : '归档'}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </S>
  );
}

function S({ children, r }: { children: React.ReactNode; r: React.ReactNode }) { return <MobilePage><MobileStatusBar /><MobileTopBar title="家族日历" right={r} />{children}</MobilePage>; }
function P({ text }: { text: string }) { return <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 text-center"><p className="rounded-2xl border border-[var(--line-1)] bg-white px-4 py-5 text-sm text-[var(--ink-3)] shadow-sm">{text}</p></main>; }

