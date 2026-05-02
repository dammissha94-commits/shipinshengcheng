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
import AppHeader from '@/components/AppHeader';
import StatusBadge from '@/components/wujia/StatusBadge';

const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = { birthday: '生日', anniversary: '纪念日', family_gathering: '家庭聚会', family_task: '家庭事项' };
const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = { birthday: 'bg-amber-50 text-amber-700', anniversary: 'bg-emerald-50 text-emerald-700', family_gathering: 'bg-emerald-50 text-emerald-700', family_task: 'bg-stone-100 text-stone-600' };
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

  if (loading) return <C text="加载中..." />;
  if (!hasSupabaseConfig()) return <S r={null}><P text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></S>;
  if (error && !family) return <S r={null}><P text={error} /></S>;

  return (
    <S r={<button onClick={() => setShowForm((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-700 hover:bg-stone-200" aria-label="新增"><Plus size={18} strokeWidth={2.5} /></button>}>
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-5 rounded-2xl bg-emerald-950 p-5 text-white">
          <p className="text-xs text-white/40 tracking-widest font-medium">家族日历</p>
          <h1 className="mt-0.5 text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-white/55">{events.length} 个家庭节点 · 生日、纪念日与家庭事项</p>
          <Link href="/family/reminders" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors"><Bell size={14} />查看提醒中心</Link>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

        {upcomingEvents.length > 0 && (
          <div className="mb-5">
            <div className="mb-3 flex items-center gap-2.5"><div className="h-4 w-[3px] rounded-full bg-amber-500/60" /><h2 className="text-base font-semibold text-stone-800">近期提醒</h2></div>
            <div className="space-y-2">
              {upcomingEvents.map((entry) => (
                <Link key={entry.event.id} href={`/family/calendar/${entry.event.id}`}
                  className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-stone-800">{entry.event.title}</p><p className="text-xs text-stone-500">下一次：{formatDate(entry.nextOccurrenceDate)} · {reminderText(entry.event)}</p></div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-700">{entry.reminderBadge}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-5">
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-100 px-5 py-4"><h2 className="text-base font-semibold text-stone-800">新增家庭节点</h2></div>
              <div className="space-y-4 px-5 py-5">
                <SF label="类型" value={form.eventType} options={EVENT_TYPE_OPTIONS} onChange={(v) => setForm({ ...form, eventType: v })} />
                <F label="标题" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
                <F label="日期" type="date" value={form.eventDate} onChange={(v) => setForm({ ...form, eventDate: v })} required />
                <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">说明</span>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                    className="w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all" /></label>
                <SF label="重复" value={form.recurrence} options={RECURRENCE_OPTIONS} onChange={(v) => setForm({ ...form, recurrence: v })} />
                <fieldset><legend className="text-sm font-medium text-stone-700 mb-2">提醒</legend>
                  <div className="grid grid-cols-3 gap-2">
                    <Toggle label="D-7" checked={form.remindD7} onChange={(v) => setForm({ ...form, remindD7: v })} />
                    <Toggle label="D-1" checked={form.remindD1} onChange={(v) => setForm({ ...form, remindD1: v })} />
                    <Toggle label="当天" checked={form.remindDay} onChange={(v) => setForm({ ...form, remindDay: v })} />
                  </div></fieldset>
                <SF label="可见范围" value={form.visibility} options={VISIBILITY_OPTIONS} onChange={(v) => setForm({ ...form, visibility: v })} />
              </div>
              <div className="border-t border-stone-100 px-5 py-4 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors">取消</button>
                <button disabled={!form.title.trim() || !form.eventDate || submitting} className="flex-1 rounded-xl bg-emerald-950 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-50 transition-all active:scale-[0.98]">{submitting ? '保存中...' : '保存'}</button>
              </div>
            </div>
          </form>
        )}

        <div className="mb-3 flex items-center gap-2.5"><div className="h-4 w-[3px] rounded-full bg-amber-500/60" /><h2 className="text-base font-semibold text-stone-800">全部节点</h2></div>
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {TYPE_FILTERS.map((t) => (
            <button key={t.value} type="button" onClick={() => setFilter(t.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${filter === t.value ? 'bg-emerald-950 text-white' : 'border border-stone-200 bg-white text-stone-500 hover:border-stone-300'}`}>{t.label}</button>
          ))}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400"><Bell size={24} strokeWidth={1.8} /></div>
            <p className="text-base font-semibold text-stone-800">还没有日历记录</p>
            <p className="mt-1 text-sm text-stone-500">添加生日、纪念日或家庭事项</p>
            <button onClick={() => setShowForm(true)} className="mt-5 rounded-xl bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors">新增家庭节点</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const relatedPerson = people.find((p) => p.id === event.source_person_id) ?? null;
              const typeColor = EVENT_TYPE_COLORS[event.event_type] ?? 'bg-stone-100 text-stone-600';
              const occurrence = enrichCalendarEventWithOccurrence(event);
              return (
                <article key={event.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="text-base font-semibold text-stone-800">{event.title}</h3><p className="mt-1 text-xs text-stone-500">原始：{formatDate(event.event_date)} · {occurrence.reminderBadge}</p>{occurrence.isRecurringYearly && occurrence.nextOccurrenceDate !== null && occurrence.nextOccurrenceDate !== event.event_date && <p className="mt-0.5 text-xs text-emerald-700">下一次：{formatDate(occurrence.nextOccurrenceDate)}</p>}</div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${typeColor}`}>{EVENT_TYPE_LABELS[event.event_type]}</span>
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {occurrence.isRecurringYearly && <StatusBadge>每年重复</StatusBadge>}
                    {event.source_type === 'person_birthday' && <><StatusBadge variant="warning">自动生日</StatusBadge>{relatedPerson && <Link href={`/family/members/${relatedPerson.id}`} className="text-xs font-medium text-emerald-700">查看档案</Link>}</>}
                  </div>
                  {event.description && <p className="mb-3 line-clamp-2 text-sm text-stone-500">{event.description}</p>}
                  <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-3 text-xs text-stone-400">
                    <span>提醒：{reminderText(event)}</span>
                    <div className="flex shrink-0 items-center gap-3">
                      <Link href={`/family/calendar/${event.id}`} className="font-medium text-emerald-700">详情</Link>
                      <button type="button" onClick={() => handleArchive(event.id)} disabled={archivingId === event.id} className="font-medium text-stone-400 hover:text-stone-600 disabled:opacity-50">{archivingId === event.id ? '处理中...' : '归档'}</button>
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

function S({ children, r }: { children: React.ReactNode; r: React.ReactNode }) { return <div className="min-h-screen bg-stone-50"><AppHeader title="家族日历" backHref="/family" rightElement={r} />{children}</div>; }
function C({ text }: { text: string }) { return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-sm text-stone-500">{text}</p></div>; }
function P({ text }: { text: string }) { return <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 text-center"><p className="rounded-2xl border border-stone-200 bg-white px-4 py-5 text-sm text-stone-500 shadow-sm">{text}</p></main>; }
function F({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">{label}{required && <span className="text-red-400"> *</span>}</span>
    <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all" /></label>;
}
function SF<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className={`flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-xs font-medium transition-all ${checked ? 'border-emerald-950 bg-emerald-950 text-white' : 'border-stone-200 bg-white text-stone-500'}`}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />{label}</label>;
}
