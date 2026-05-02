'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { archiveFamilyCalendarEvent, canEditCalendarEvent, enrichCalendarEventWithOccurrence, getEventTypeLabel, getFamilyCalendarEvent, updateFamilyCalendarEvent } from '@/lib/services/calendar-service';
import type { CalendarEventDetail, CalendarEventPermission } from '@/types/service';
import type { CalendarEventType, CalendarRecurrence, Visibility } from '@/types/domain';
import AppHeader from '@/components/AppHeader';

const EVENT_TYPE_OPTIONS: { value: CalendarEventType; label: string }[] = [
  { value: 'birthday', label: '生日' }, { value: 'anniversary', label: '纪念日' }, { value: 'family_gathering', label: '家庭聚会' }, { value: 'family_task', label: '家庭事项' },
];
const RECURRENCE_LABELS: Record<CalendarRecurrence, string> = { yearly: '每年提醒', monthly: '每月提醒', none: '仅一次' };
const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'family', label: '家庭内可见' }, { value: 'private', label: '仅自己可见' }, { value: 'public', label: '公开可见' },
];
const VISIBILITY_LABELS: Record<Visibility, string> = { family: '家庭内可见', private: '仅自己可见', public: '公开可见' };
interface EditForm { eventType: CalendarEventType; title: string; description: string; eventDate: string; visibility: Visibility; remindD7: boolean; remindD1: boolean; remindDay: boolean; }
function emptyForm(): EditForm { return { eventType: 'birthday', title: '', description: '', eventDate: '', visibility: 'family', remindD7: true, remindD1: true, remindDay: true }; }
function buildForm(d: CalendarEventDetail): EditForm { return { eventType: d.event.event_type, title: d.event.title, description: d.event.description ?? '', eventDate: d.event.event_date, visibility: d.event.visibility, remindD7: d.event.remind_d7, remindD1: d.event.remind_d1, remindDay: d.event.remind_day }; }
function formatDate(v: string | null | undefined): string { if (!v) return '—'; const d = new Date(v); if (Number.isNaN(d.getTime())) return v; return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }); }
function formatDateTime(v: string | null | undefined): string { if (!v) return '—'; const d = new Date(v); if (Number.isNaN(d.getTime())) return v; return d.toLocaleString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function reminderLabel(d: CalendarEventDetail): string { const l = [d.event.remind_d7 ? 'D-7' : '', d.event.remind_d1 ? 'D-1' : '', d.event.remind_day ? '当天' : ''].filter(Boolean); return l.length === 0 ? '未开启提醒' : l.join(' / '); }
function sanitizeError(error: unknown, fallback: string): string { const m = error instanceof Error ? error.message : fallback; if (m.includes('Auth session missing')) return '请先登录'; if (m.includes('failed') || m.includes('violates') || m.includes('permission denied')) return fallback; return m; }

export default function FamilyCalendarEventDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params?.id ?? '';
  const [detail, setDetail] = useState<CalendarEventDetail | null>(null);
  const [permission, setPermission] = useState<CalendarEventPermission | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      if (!eventId) { setError('家庭节点不存在或已不可访问'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const result = await getFamilyCalendarEvent(eventId);
        if (!active) return;
        if (!result) { setError('家庭节点不存在或已不可访问'); setLoading(false); return; }
        const perm = await canEditCalendarEvent(result.event);
        if (!active) return;
        setDetail(result); setPermission(perm); setForm(buildForm(result));
      } catch (e) { if (!active) return; setError(sanitizeError(e, '加载家庭节点详情失败')); }
      finally { if (active) setLoading(false); }
    }
    load(); return () => { active = false; };
  }, [eventId, router]);

  const isAutoBirthday = permission?.isAutoBirthday ?? false;
  const canShowEditForm = Boolean(permission?.canEdit) && !isAutoBirthday;
  const isArchived = detail?.event.status === 'archived';
  const headerStatus = useMemo(() => detail ? (detail.event.status === 'archived' ? '已归档' : '进行中') : null, [detail]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!detail || !permission?.canEdit || !form.title.trim() || !form.eventDate) return;
    try { setSubmitting(true); setError(''); setNotice(''); const updated = await updateFamilyCalendarEvent(detail.event.id, { eventType: form.eventType, title: form.title.trim(), description: form.description.trim() || null, eventDate: form.eventDate, visibility: form.visibility, remindD7: form.remindD7, remindD1: form.remindD1, remindDay: form.remindDay }); const nd = { ...detail, event: updated }; setDetail(nd); setForm(buildForm(nd)); setShowEdit(false); setNotice('家庭节点已保存'); }
    catch (e) { setError(sanitizeError(e, '保存家庭节点失败')); }
    finally { setSubmitting(false); }
  }
  async function handleArchive() {
    if (!detail || !permission?.canArchive || isArchived) return;
    if (!window.confirm('归档后该家庭节点不再显示在家族日历列表，是否确认？')) return;
    try { setArchiving(true); setError(''); setNotice(''); const updated = await archiveFamilyCalendarEvent(detail.event.id); setDetail({ ...detail, event: updated }); setNotice('家庭节点已归档'); }
    catch (e) { setError(sanitizeError(e, '归档家庭节点失败')); }
    finally { setArchiving(false); }
  }

  if (loading) return <S><P text="加载中…" /></S>;
  if (!hasSupabaseConfig()) return <S><P text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></S>;
  if (!detail) return <S><P text={error || '家庭节点不存在或已不可访问'} footer={<div className="mt-4 grid grid-cols-2 gap-2"><Link href="/family/calendar" className="rounded-xl border border-stone-200 bg-white py-2.5 text-center text-sm font-medium text-stone-600">返回日历</Link><Link href="/family/reminders" className="rounded-xl bg-emerald-950 py-2.5 text-center text-sm font-semibold text-white">返回提醒中心</Link></div>} /></S>;

  const event = detail.event;
  const relatedPerson = detail.relatedPerson ?? detail.sourcePerson;
  const personHref = relatedPerson ? `/family/members/${relatedPerson.id}` : null;
  const personRedirectHref = permission?.redirectPersonId ? `/family/members/${permission.redirectPersonId}` : personHref;
  const occurrence = enrichCalendarEventWithOccurrence(event);
  const showNext = occurrence.isRecurringYearly && occurrence.nextOccurrenceDate !== null && occurrence.nextOccurrenceDate !== event.event_date;

  return (
    <S>
      <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {/* Header */}
        <div className="rounded-2xl bg-emerald-950 p-5 text-white">
          <p className="text-xs text-white/40 tracking-widest font-medium">家庭节点详情</p>
          <h1 className="mt-0.5 text-xl font-bold">{event.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium">{getEventTypeLabel(event.event_type)}</span>
            {headerStatus && <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${isArchived ? 'bg-white/10 text-white/60' : 'bg-amber-400/30'}`}>{headerStatus}</span>}
            {occurrence.isRecurringYearly && <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium">每年重复</span>}
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium">{occurrence.reminderBadge}</span>
            {isAutoBirthday && <span className="rounded-full bg-amber-400/40 px-2.5 py-0.5 text-[11px] font-medium">自动生日</span>}
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        {notice && <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">{notice}</p>}

        {isAutoBirthday && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-stone-800">自动生日提醒</p>
            <p className="mt-1 text-xs text-stone-500">该提醒来自家人档案中的生日信息，日期与重复规则会随家人档案自动同步。</p>
            {personRedirectHref && <Link href={personRedirectHref} className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-emerald-950 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors">前往家人档案修改生日</Link>}
          </div>
        )}

        {/* Info */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-stone-800">基础信息</h2>
          <dl className="space-y-2 text-sm">
            {[['标题',event.title],['类型',getEventTypeLabel(event.event_type)],['原始日期',formatDate(event.event_date)],['重复规则',RECURRENCE_LABELS[event.recurrence]??event.recurrence],['可见范围',VISIBILITY_LABELS[event.visibility]??event.visibility],['状态',isArchived?'已归档':'进行中'],['创建时间',formatDateTime(event.created_at)],['更新时间',formatDateTime(event.updated_at)]].map(([l,v]) => (
              <div key={l} className="flex items-start justify-between gap-3"><dt className="shrink-0 text-xs text-stone-400">{l}</dt><dd className="text-right text-sm text-stone-700">{v as string}</dd></div>
            ))}
            {showNext && <div className="flex items-start justify-between gap-3"><dt className="shrink-0 text-xs text-stone-400">下一次</dt><dd className="text-right text-sm text-emerald-700 font-medium">{formatDate(occurrence.nextOccurrenceDate)}</dd></div>}
            {event.description && <div className="pt-2"><p className="text-xs text-stone-400">说明</p><p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{event.description}</p></div>}
          </dl>
        </div>

        {/* Reminder settings */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-stone-800">提醒设置</h2>
          <div className="grid grid-cols-3 gap-2">
            {([['D-7',event.remind_d7],['D-1',event.remind_d1],['当天',event.remind_day]] as [string,boolean][]).map(([l,a]) => (
              <span key={l} className={`flex items-center justify-center rounded-xl border px-2 py-2 text-xs font-medium ${a ? 'border-emerald-950 bg-emerald-950 text-white' : 'border-stone-200 bg-white text-stone-400'}`}>{l}</span>
            ))}
          </div>
          <p className="mt-3 text-xs text-stone-400">当前提醒：{reminderLabel(detail)}</p>
        </div>

        {/* Related person */}
        {relatedPerson && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-stone-800">关联人物</h2>
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-base font-semibold text-stone-800">{relatedPerson.display_name}</p><p className="text-xs text-stone-400">家人档案</p></div>
              {personHref && <Link href={personHref} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">查看档案</Link>}
            </div>
          </div>
        )}

        {/* Edit */}
        {permission?.canEdit ? canShowEditForm ? (
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-5 py-4 flex items-center justify-between"><h2 className="text-base font-semibold text-stone-800">编辑</h2><button type="button" onClick={() => { setShowEdit((v) => !v); if (showEdit) setForm(buildForm(detail)); }} className="text-sm font-medium text-emerald-700">{showEdit ? '取消' : '展开'}</button></div>
            {showEdit && (
              <form onSubmit={handleSave} className="space-y-4 px-5 py-5">
                <SF label="类型" value={form.eventType} options={EVENT_TYPE_OPTIONS} onChange={(v) => setForm({ ...form, eventType: v })} />
                <F label="标题" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
                <F label="日期" type="date" value={form.eventDate} onChange={(v) => setForm({ ...form, eventDate: v })} required />
                <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">说明</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all" /></label>
                <SF label="可见范围" value={form.visibility} options={VISIBILITY_OPTIONS} onChange={(v) => setForm({ ...form, visibility: v })} />
                <fieldset><legend className="text-sm font-medium text-stone-700 mb-2">提醒设置</legend>
                  <div className="grid grid-cols-3 gap-2">
                    <Toggle label="D-7" checked={form.remindD7} onChange={(v) => setForm({ ...form, remindD7: v })} />
                    <Toggle label="D-1" checked={form.remindD1} onChange={(v) => setForm({ ...form, remindD1: v })} />
                    <Toggle label="当天" checked={form.remindDay} onChange={(v) => setForm({ ...form, remindDay: v })} />
                  </div></fieldset>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setShowEdit(false); setForm(buildForm(detail)); }} className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors">取消</button>
                  <button type="submit" disabled={submitting || !form.title.trim() || !form.eventDate} className="flex-1 rounded-xl bg-emerald-950 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-50 transition-all active:scale-[0.98]">{submitting ? '保存中…' : '保存修改'}</button>
                </div>
              </form>
            )}
          </div>
        ) : <div className="rounded-2xl border border-stone-200 bg-white p-4 text-xs text-stone-400">自动生日提醒不在本页直接编辑，可在家人档案修改生日。</div>
        : <div className="rounded-2xl border border-stone-200 bg-white p-4 text-xs text-stone-400">你暂无权限编辑该家庭节点。</div>}

        {/* Actions */}
        <div className="space-y-2 pb-4">
          {permission?.canArchive && !isArchived && <button type="button" onClick={handleArchive} disabled={archiving} className="w-full rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50 transition-colors">{archiving ? '归档中…' : '归档此节点'}</button>}
          <Link href="/family/calendar" className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-950 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors"><ArrowLeft size={14} />返回家族日历</Link>
        </div>
      </main>
    </S>
  );
}

function S({ children }: { children: React.ReactNode }) { return <div className="min-h-screen bg-stone-50"><AppHeader title="节点详情" backHref="/family/calendar" />{children}</div>; }
function P({ text, footer }: { text: string; footer?: React.ReactNode }) { return <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center"><p className="rounded-2xl border border-stone-200 bg-white px-4 py-5 text-sm text-stone-500 shadow-sm">{text}</p>{footer}</main>; }
function F({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">{label}{required && <span className="text-red-400"> *</span>}</span><input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all" /></label>;
}
function SF<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">{label}</span><select value={value} onChange={(e) => onChange(e.target.value as T)} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className={`flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-xs font-medium transition-all ${checked ? 'border-emerald-950 bg-emerald-950 text-white' : 'border-stone-200 bg-white text-stone-500'}`}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />{label}</label>;
}
