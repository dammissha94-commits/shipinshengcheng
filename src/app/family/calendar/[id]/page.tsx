'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import {
  archiveFamilyCalendarEvent,
  canEditCalendarEvent,
  enrichCalendarEventWithOccurrence,
  getEventTypeLabel,
  getFamilyCalendarEvent,
  updateFamilyCalendarEvent,
} from '@/lib/services/calendar-service';
import type { CalendarEventDetail, CalendarEventPermission } from '@/types/service';
import type { CalendarEventType, CalendarRecurrence, Visibility } from '@/types/domain';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import { WjHeroPanel, WjPaperCard, WjScreenContent, WjSectionHeading, WjSoftNote } from '@/components/wujia/MobileDesignSystem';
import { WjButton, WjFormRow, WjInput, WjSelect, WjTextarea, WjToggle } from '@/components/wujia/WjForm';

const EVENT_TYPE_OPTIONS: { value: CalendarEventType; label: string }[] = [
  { value: 'birthday', label: '生日' },
  { value: 'anniversary', label: '纪念日' },
  { value: 'family_gathering', label: '家庭聚会' },
  { value: 'family_task', label: '家庭事项' },
];
const RECURRENCE_LABELS: Record<CalendarRecurrence, string> = {
  yearly: '每年提醒',
  monthly: '每月提醒',
  none: '仅一次',
};
const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'family', label: '家庭内可见' },
  { value: 'private', label: '仅自己可见' },
  { value: 'public', label: '公开可见' },
];
const VISIBILITY_LABELS: Record<Visibility, string> = {
  family: '家庭内可见',
  private: '仅自己可见',
  public: '公开可见',
};

interface EditForm {
  eventType: CalendarEventType;
  title: string;
  description: string;
  eventDate: string;
  visibility: Visibility;
  remindD7: boolean;
  remindD1: boolean;
  remindDay: boolean;
}

function emptyForm(): EditForm {
  return {
    eventType: 'birthday',
    title: '',
    description: '',
    eventDate: '',
    visibility: 'family',
    remindD7: true,
    remindD1: true,
    remindDay: true,
  };
}

function buildForm(detail: CalendarEventDetail): EditForm {
  return {
    eventType: detail.event.event_type,
    title: detail.event.title,
    description: detail.event.description ?? '',
    eventDate: detail.event.event_date,
    visibility: detail.event.visibility,
    remindD7: detail.event.remind_d7,
    remindD1: detail.event.remind_d1,
    remindDay: detail.event.remind_day,
  };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '未填写';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '未填写';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function reminderLabel(detail: CalendarEventDetail): string {
  const labels = [
    detail.event.remind_d7 ? '提前 7 天' : '',
    detail.event.remind_d1 ? '提前 1 天' : '',
    detail.event.remind_day ? '当天' : '',
  ].filter(Boolean);
  return labels.length === 0 ? '未开启提醒' : labels.join(' / ');
}

function sanitizeError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes('Auth session missing')) return '请先登录';
  if (message.includes('failed') || message.includes('violates') || message.includes('permission denied')) return fallback;
  return message;
}

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
      if (!hasSupabaseConfig()) {
        setError('尚未配置 Supabase 环境变量，请先配置 .env.local');
        setLoading(false);
        return;
      }
      if (!eventId) {
        setError('家庭节点不存在或已不可访问');
        setLoading(false);
        return;
      }
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace(currentLoginRedirectPath());
          return;
        }
        const result = await getFamilyCalendarEvent(eventId);
        if (!active) return;
        if (!result) {
          setError('家庭节点不存在或已不可访问');
          setLoading(false);
          return;
        }
        const perm = await canEditCalendarEvent(result.event);
        if (!active) return;
        setDetail(result);
        setPermission(perm);
        setForm(buildForm(result));
      } catch (e) {
        if (!active) return;
        setError(sanitizeError(e, '加载家庭节点详情失败'));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [eventId, router]);

  const isAutoBirthday = permission?.isAutoBirthday ?? false;
  const canShowEditForm = Boolean(permission?.canEdit) && !isAutoBirthday;
  const isArchived = detail?.event.status === 'archived';
  const headerStatus = useMemo(() => {
    if (!detail) return null;
    return detail.event.status === 'archived' ? '已归档' : '进行中';
  }, [detail]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!detail || !permission?.canEdit || !form.title.trim() || !form.eventDate) return;
    try {
      setSubmitting(true);
      setError('');
      setNotice('');
      const updated = await updateFamilyCalendarEvent(detail.event.id, {
        eventType: form.eventType,
        title: form.title.trim(),
        description: form.description.trim() || null,
        eventDate: form.eventDate,
        visibility: form.visibility,
        remindD7: form.remindD7,
        remindD1: form.remindD1,
        remindDay: form.remindDay,
      });
      const nextDetail = { ...detail, event: updated };
      setDetail(nextDetail);
      setForm(buildForm(nextDetail));
      setShowEdit(false);
      setNotice('家庭节点已保存');
    } catch (e) {
      setError(sanitizeError(e, '保存家庭节点失败'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!detail || !permission?.canArchive || isArchived) return;
    if (!window.confirm('归档后该家庭节点不再显示在家族日历列表，是否确认？')) return;
    try {
      setArchiving(true);
      setError('');
      setNotice('');
      const updated = await archiveFamilyCalendarEvent(detail.event.id);
      setDetail({ ...detail, event: updated });
      setNotice('家庭节点已归档');
    } catch (e) {
      setError(sanitizeError(e, '归档家庭节点失败'));
    } finally {
      setArchiving(false);
    }
  }

  if (loading) return <Shell><PanelText text="加载中..." /></Shell>;
  if (!hasSupabaseConfig()) return <Shell><PanelText text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></Shell>;
  if (!detail) {
    return (
      <Shell>
        <PanelText
          text={error || '家庭节点不存在或已不可访问'}
          footer={
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/family/calendar" className="flex min-h-[44px] items-center justify-center rounded-[14px] border border-[#E7D9C9] bg-white text-sm font-medium text-[#5A3524]">返回日历</Link>
              <Link href="/family/reminders" className="flex min-h-[44px] items-center justify-center rounded-[14px] bg-[#5A3825] text-sm font-semibold text-white">提醒中心</Link>
            </div>
          }
        />
      </Shell>
    );
  }

  const event = detail.event;
  const relatedPerson = detail.relatedPerson ?? detail.sourcePerson;
  const personHref = relatedPerson ? `/family/members/${relatedPerson.id}` : null;
  const personRedirectHref = permission?.redirectPersonId ? `/family/members/${permission.redirectPersonId}` : personHref;
  const occurrence = enrichCalendarEventWithOccurrence(event);
  const showNext = occurrence.isRecurringYearly && occurrence.nextOccurrenceDate !== null && occurrence.nextOccurrenceDate !== event.event_date;

  return (
    <Shell>
      <WjScreenContent>
        <WjHeroPanel eyebrow="CALENDAR EVENT" title={event.title}>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#F1E5D6] px-2.5 py-1 text-[11px] font-medium text-[#5A3825]">{getEventTypeLabel(event.event_type)}</span>
            {headerStatus && <span className="rounded-full bg-[#E8EFE7] px-2.5 py-1 text-[11px] font-medium text-[#557B61]">{headerStatus}</span>}
            {occurrence.isRecurringYearly && <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-[#78675B]">每年重复</span>}
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-[#78675B]">{occurrence.reminderBadge}</span>
            {isAutoBirthday && <span className="rounded-full bg-[#F8E9C6] px-2.5 py-1 text-[11px] font-medium text-[#9B6A37]">自动生日</span>}
          </div>
        </WjHeroPanel>

        {error && <p className="rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}
        {notice && <p className="rounded-xl border border-[#D9E8D6] bg-[#F0F8ED] px-4 py-2.5 text-sm text-[#557B61]">{notice}</p>}

        {isAutoBirthday && (
          <WjPaperCard className="p-4">
            <p className="text-sm font-semibold text-[#2A1D16]">自动生日提醒</p>
            <p className="mt-1 text-[12px] leading-5 text-[#78675B]">该提醒来自家人档案中的生日信息，日期与重复规则会随家人档案自动同步。</p>
            {personRedirectHref && (
              <Link href={personRedirectHref} className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-[14px] bg-[#5A3825] text-sm font-semibold text-white">
                前往家人档案修改生日
              </Link>
            )}
          </WjPaperCard>
        )}

        <WjPaperCard className="p-5">
          <WjSectionHeading title="基础信息" />
          <dl className="mt-3 space-y-2 text-sm">
            {[
              ['标题', event.title],
              ['类型', getEventTypeLabel(event.event_type)],
              ['原始日期', formatDate(event.event_date)],
              ['重复规则', RECURRENCE_LABELS[event.recurrence] ?? event.recurrence],
              ['可见范围', VISIBILITY_LABELS[event.visibility] ?? event.visibility],
              ['状态', isArchived ? '已归档' : '进行中'],
              ['创建时间', formatDateTime(event.created_at)],
              ['更新时间', formatDateTime(event.updated_at)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-xs text-[#78675B]">{label}</dt>
                <dd className="text-right text-sm text-[#5A3524]">{value}</dd>
              </div>
            ))}
            {showNext && (
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-xs text-[#78675B]">下一次</dt>
                <dd className="text-right text-sm font-medium text-[#5A3825]">{formatDate(occurrence.nextOccurrenceDate)}</dd>
              </div>
            )}
            {event.description && (
              <div className="pt-2">
                <p className="text-xs text-[#78675B]">说明</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#5A3524]">{event.description}</p>
              </div>
            )}
          </dl>
        </WjPaperCard>

        <WjPaperCard className="p-5">
          <WjSectionHeading title="提醒设置" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([['D-7', event.remind_d7], ['D-1', event.remind_d1], ['当天', event.remind_day]] as [string, boolean][]).map(([label, active]) => (
              <span key={label} className={`flex items-center justify-center rounded-[13px] border px-2 py-2 text-xs font-medium ${active ? 'border-[#5A3825] bg-[#5A3825] text-white' : 'border-[#E7D9C9] bg-[#FBF7EF] text-[#78675B]'}`}>
                {label}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-[#78675B]">当前提醒：{reminderLabel(detail)}</p>
        </WjPaperCard>

        {relatedPerson && (
          <WjPaperCard className="p-5">
            <WjSectionHeading title="关联人物" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[#2A1D16]">{relatedPerson.display_name}</p>
                <p className="text-[12px] text-[#78675B]">家人档案</p>
              </div>
              {personHref && (
                <Link href={personHref} className="flex min-h-[44px] items-center rounded-[14px] border border-[#E7D9C9] bg-white px-3 text-sm font-medium text-[#5A3524]">
                  查看档案
                </Link>
              )}
            </div>
          </WjPaperCard>
        )}

        {permission?.canEdit ? (
          canShowEditForm ? (
            <WjPaperCard className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#EEE3D6] px-5 py-4">
                <h2 className="text-base font-semibold text-[#2A1D16]">编辑节点</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowEdit((value) => !value);
                    if (showEdit) setForm(buildForm(detail));
                  }}
                  className="min-h-[44px] text-sm font-medium text-[#5A3825]"
                >
                  {showEdit ? '取消' : '展开'}
                </button>
              </div>
              {showEdit && (
                <form onSubmit={handleSave} className="space-y-4 px-5 py-5">
                  <WjFormRow label="类型">
                    <WjSelect value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value as CalendarEventType })}>
                      {EVENT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </WjSelect>
                  </WjFormRow>
                  <WjFormRow label="标题" required>
                    <WjInput required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </WjFormRow>
                  <WjFormRow label="日期" required>
                    <WjInput type="date" required value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
                  </WjFormRow>
                  <WjFormRow label="说明">
                    <WjTextarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </WjFormRow>
                  <WjFormRow label="可见范围">
                    <WjSelect value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as Visibility })}>
                      {VISIBILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </WjSelect>
                  </WjFormRow>
                  <fieldset>
                    <legend className="mb-2 text-[14px] font-medium text-[#5A3524]">提醒设置</legend>
                    <div className="space-y-2">
                      <ToggleRow label="提前 7 天" checked={form.remindD7} onChange={(value) => setForm({ ...form, remindD7: value })} />
                      <ToggleRow label="提前 1 天" checked={form.remindD1} onChange={(value) => setForm({ ...form, remindD1: value })} />
                      <ToggleRow label="当天提醒" checked={form.remindDay} onChange={(value) => setForm({ ...form, remindDay: value })} />
                    </div>
                  </fieldset>
                  <div className="flex gap-3 pt-1">
                    <WjButton type="button" variant="secondary" size="lg" className="flex-1" onClick={() => { setShowEdit(false); setForm(buildForm(detail)); }}>取消</WjButton>
                    <WjButton type="submit" variant="primary" size="lg" className="flex-1" disabled={!form.title.trim() || !form.eventDate} loading={submitting}>保存修改</WjButton>
                  </div>
                </form>
              )}
            </WjPaperCard>
          ) : (
            <WjSoftNote>自动生日提醒不在本页直接编辑，可在家人档案修改生日。</WjSoftNote>
          )
        ) : (
          <WjSoftNote>你暂无权限编辑该家庭节点。</WjSoftNote>
        )}

        <div className="space-y-2 pb-4">
          {permission?.canArchive && !isArchived && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={archiving}
              className="min-h-[44px] w-full rounded-[14px] border border-[#E7D9C9] bg-white/82 text-sm font-medium text-[#5A3524] transition-colors disabled:opacity-50"
            >
              {archiving ? '归档中...' : '归档此节点'}
            </button>
          )}
          <Link href="/family/calendar" className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[14px] bg-[#5A3825] text-sm font-semibold text-white">
            <ArrowLeft size={14} />
            返回家族日历
          </Link>
        </div>
      </WjScreenContent>
    </Shell>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-[15px] border border-[#E7D9C9] bg-[#FBF7EF] px-4 py-2.5">
      <span className="text-[14px] text-[#5A3524]">{label}</span>
      <WjToggle checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar title="节点详情" backHref="/family/calendar" />
      {children}
    </MobilePage>
  );
}

function PanelText({ text, footer }: { text: string; footer?: React.ReactNode }) {
  return (
    <main className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
      <div className="rounded-[15px] border border-[#E7D9C9] bg-white/82 px-4 py-5 text-sm text-[#78675B] shadow-[0_10px_28px_rgba(90,53,36,0.06)]">
        <CalendarDays className="mx-auto mb-3 text-[#9B6A37]" size={24} />
        {text}
      </div>
      {footer}
    </main>
  );
}
