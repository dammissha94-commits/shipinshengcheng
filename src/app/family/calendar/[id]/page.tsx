'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
import type {
  CalendarEventDetail,
  CalendarEventPermission,
} from '@/types/service';
import type {
  CalendarEventType,
  CalendarRecurrence,
  Visibility,
} from '@/types/domain';
import AppHeader from '@/components/AppHeader';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';
const NOT_FOUND_MESSAGE = '家庭节点不存在或已不可访问';

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

function buildFormFromDetail(detail: CalendarEventDetail): EditForm {
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
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function reminderLabel(detail: CalendarEventDetail): string {
  const list = [
    detail.event.remind_d7 ? 'D-7' : '',
    detail.event.remind_d1 ? 'D-1' : '',
    detail.event.remind_day ? '当天' : '',
  ].filter(Boolean);
  return list.length === 0 ? '未开启提醒' : list.join(' / ');
}

function sanitizeError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes('Auth session missing')) return '请先登录';
  if (
    message.includes('failed') ||
    message.includes('violates') ||
    message.includes('permission denied')
  ) {
    return fallback;
  }
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
        setError(SUPABASE_FALLBACK_MESSAGE);
        setLoading(false);
        return;
      }

      if (!eventId) {
        setError(NOT_FOUND_MESSAGE);
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
          setError(NOT_FOUND_MESSAGE);
          setLoading(false);
          return;
        }

        const perm = await canEditCalendarEvent(result.event);
        if (!active) return;

        setDetail(result);
        setPermission(perm);
        setForm(buildFormFromDetail(result));
      } catch (loadError) {
        if (!active) return;
        setError(sanitizeError(loadError, '加载家庭节点详情失败'));
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

  async function handleSave(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!detail || !permission?.canEdit) return;
    if (!form.title.trim() || !form.eventDate) return;

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
      const nextDetail: CalendarEventDetail = {
        ...detail,
        event: updated,
      };
      setDetail(nextDetail);
      setForm(buildFormFromDetail(nextDetail));
      setShowEdit(false);
      setNotice('家庭节点已保存');
    } catch (saveError) {
      setError(sanitizeError(saveError, '保存家庭节点失败'));
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
    } catch (archiveError) {
      setError(sanitizeError(archiveError, '归档家庭节点失败'));
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <CenteredPanel text="加载中…" />
      </Shell>
    );
  }

  if (!hasSupabaseConfig()) {
    return (
      <Shell>
        <CenteredPanel text={SUPABASE_FALLBACK_MESSAGE} />
      </Shell>
    );
  }

  if (!detail) {
    return (
      <Shell>
        <CenteredPanel
          text={error || NOT_FOUND_MESSAGE}
          footer={
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/family/calendar" className="rounded-xl border border-pine px-3 py-2.5 text-center text-sm font-semibold text-pine">
                返回家族日历
              </Link>
              <Link href="/family/reminders" className="rounded-xl bg-pine px-3 py-2.5 text-center text-sm font-semibold text-cream">
                返回提醒中心
              </Link>
            </div>
          }
        />
      </Shell>
    );
  }

  const event = detail.event;
  const relatedPerson = detail.relatedPerson ?? detail.sourcePerson;
  const showRelatedCard = Boolean(relatedPerson);
  const personHref = relatedPerson ? `/family/members/${relatedPerson.id}` : null;
  const personRedirectHref = permission?.redirectPersonId
    ? `/family/members/${permission.redirectPersonId}`
    : personHref;
  const occurrence = enrichCalendarEventWithOccurrence(event);
  const showNextOccurrenceRow =
    occurrence.isRecurringYearly &&
    occurrence.nextOccurrenceDate !== null &&
    occurrence.nextOccurrenceDate !== event.event_date;

  return (
    <Shell>
      <main className="mx-auto max-w-md space-y-4 px-4 py-6">
        <section className="rounded-2xl bg-pine p-5 text-cream">
          <p className="mb-1 text-xs tracking-wider text-cream/60">家庭节点详情</p>
          <h1 className="text-xl font-bold leading-snug">{event.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-cream/15 px-2.5 py-1 text-xs font-medium text-cream">
              {getEventTypeLabel(event.event_type)}
            </span>
            {headerStatus && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  isArchived ? 'bg-cream/10 text-cream/70' : 'bg-gold/30 text-cream'
                }`}
              >
                {headerStatus}
              </span>
            )}
            {occurrence.isRecurringYearly && (
              <span className="rounded-full bg-cream/20 px-2.5 py-1 text-xs font-medium text-cream">
                每年重复
              </span>
            )}
            <span className="rounded-full bg-cream/15 px-2.5 py-1 text-xs font-medium text-cream">
              {occurrence.reminderBadge}
            </span>
            {isAutoBirthday && (
              <span className="rounded-full bg-gold/40 px-2.5 py-1 text-xs font-medium text-cream">
                自动生日提醒
              </span>
            )}
          </div>
        </section>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {notice && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
        )}

        {isAutoBirthday && (
          <section className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
            <p className="text-sm font-semibold text-charcoal">这是一条自动生日提醒</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              该提醒来自家人档案中的生日信息，日期与重复规则会随家人档案自动同步，不建议在此页直接修改。
            </p>
            {personRedirectHref && (
              <Link
                href={personRedirectHref}
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-pine px-3 py-2.5 text-sm font-semibold text-cream"
              >
                前往家人档案修改生日
              </Link>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-sand/70 bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-pine">基础信息</h2>
          <dl className="space-y-2 text-sm">
            <InfoRow label="标题" value={event.title} />
            <InfoRow label="类型" value={getEventTypeLabel(event.event_type)} />
            <InfoRow label="原始日期" value={formatDate(event.event_date)} />
            {showNextOccurrenceRow && (
              <InfoRow label="下一次发生" value={formatDate(occurrence.nextOccurrenceDate)} />
            )}
            <InfoRow label="重复规则" value={RECURRENCE_LABELS[event.recurrence] ?? event.recurrence} />
            <InfoRow label="可见范围" value={VISIBILITY_LABELS[event.visibility] ?? event.visibility} />
            <InfoRow label="状态" value={isArchived ? '已归档' : '进行中'} />
            <InfoRow label="创建时间" value={formatDateTime(event.created_at)} />
            <InfoRow label="更新时间" value={formatDateTime(event.updated_at)} />
            {event.description && (
              <div className="pt-2">
                <p className="text-xs text-muted">说明</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">
                  {event.description}
                </p>
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-2xl border border-sand/70 bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-pine">提醒设置</h2>
          <div className="grid grid-cols-3 gap-2">
            <ReminderBadge label="D-7" active={event.remind_d7} />
            <ReminderBadge label="D-1" active={event.remind_d1} />
            <ReminderBadge label="当天" active={event.remind_day} />
          </div>
          <p className="mt-3 text-xs text-muted">当前提醒：{reminderLabel(detail)}</p>
          {isAutoBirthday && (
            <p className="mt-1 text-xs text-muted">自动生日提醒由家人档案统一管理。</p>
          )}
        </section>

        {showRelatedCard && relatedPerson && (
          <section className="rounded-2xl border border-sand/70 bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-pine">关联人物</h2>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-charcoal">
                  {relatedPerson.display_name}
                </p>
                <p className="text-xs text-muted">家人档案</p>
              </div>
              {personHref && (
                <Link
                  href={personHref}
                  className="shrink-0 rounded-xl border border-pine px-3 py-2 text-sm font-semibold text-pine"
                >
                  查看家人档案
                </Link>
              )}
            </div>
          </section>
        )}

        {permission?.canEdit ? (
          canShowEditForm ? (
            <section className="rounded-2xl border border-pine/20 bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-pine">编辑家庭节点</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowEdit((value) => !value);
                    if (showEdit) setForm(buildFormFromDetail(detail));
                  }}
                  className="text-xs font-medium text-pine"
                >
                  {showEdit ? '取消编辑' : '展开编辑'}
                </button>
              </div>
              {showEdit ? (
                <form onSubmit={handleSave} className="space-y-3">
                  <SelectField
                    label="类型"
                    value={form.eventType}
                    options={EVENT_TYPE_OPTIONS}
                    onChange={(value) => setForm({ ...form, eventType: value })}
                  />
                  <Field
                    label="标题"
                    value={form.title}
                    onChange={(value) => setForm({ ...form, title: value })}
                    required
                  />
                  <Field
                    label="日期"
                    type="date"
                    value={form.eventDate}
                    onChange={(value) => setForm({ ...form, eventDate: value })}
                    required
                  />
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-charcoal">说明</span>
                    <textarea
                      value={form.description}
                      onChange={(changeEvent) =>
                        setForm({ ...form, description: changeEvent.target.value })
                      }
                      rows={3}
                      className="w-full resize-none rounded-xl border-2 border-sand bg-cream px-3 py-2.5 text-sm focus:border-pine focus:outline-none"
                    />
                  </label>
                  <SelectField
                    label="可见范围"
                    value={form.visibility}
                    options={VISIBILITY_OPTIONS}
                    onChange={(value) => setForm({ ...form, visibility: value })}
                  />
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium text-charcoal">提醒设置</legend>
                    <div className="grid grid-cols-3 gap-2">
                      <Toggle
                        label="D-7"
                        checked={form.remindD7}
                        onChange={(value) => setForm({ ...form, remindD7: value })}
                      />
                      <Toggle
                        label="D-1"
                        checked={form.remindD1}
                        onChange={(value) => setForm({ ...form, remindD1: value })}
                      />
                      <Toggle
                        label="当天"
                        checked={form.remindDay}
                        onChange={(value) => setForm({ ...form, remindDay: value })}
                      />
                    </div>
                  </fieldset>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEdit(false);
                        setForm(buildFormFromDetail(detail));
                      }}
                      className="flex-1 rounded-xl border-2 border-sand py-2.5 text-sm font-medium text-muted"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !form.title.trim() || !form.eventDate}
                      className="flex-1 rounded-xl bg-pine py-2.5 text-sm font-semibold text-cream disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? '保存中…' : '保存修改'}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-xs text-muted">展开后可修改标题、类型、日期、说明、可见范围与提醒设置。</p>
              )}
            </section>
          ) : (
            <section className="rounded-2xl border border-sand/70 bg-card p-4 text-xs text-muted shadow-sm">
              自动生日提醒不在本页直接编辑，可在家人档案修改生日，提醒会随之同步。
            </section>
          )
        ) : (
          <section className="rounded-2xl border border-sand/70 bg-card p-4 text-xs text-muted shadow-sm">
            你暂无权限编辑该家庭节点。如需修改，请联系 owner、family_admin 或节点创建者。
          </section>
        )}

        <section className="rounded-2xl border border-sand/70 bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-pine">操作</h2>
          <div className="grid gap-2">
            {permission?.canArchive && !isArchived && (
              <button
                type="button"
                onClick={handleArchive}
                disabled={archiving}
                className="rounded-xl border border-pine px-3 py-2.5 text-sm font-semibold text-pine disabled:opacity-50"
              >
                {archiving ? '归档中…' : '归档此家庭节点'}
              </button>
            )}
            <Link
              href="/family/calendar"
              className="rounded-xl bg-pine px-3 py-2.5 text-center text-sm font-semibold text-cream"
            >
              返回家族日历
            </Link>
            <Link
              href="/family/reminders"
              className="rounded-xl border border-pine px-3 py-2.5 text-center text-sm font-semibold text-pine"
            >
              返回提醒中心
            </Link>
          </div>
        </section>
      </main>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="家庭节点详情" backHref="/family/calendar" />
      {children}
    </div>
  );
}

function CenteredPanel({ text, footer }: { text: string; footer?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="rounded-2xl border border-sand/70 bg-card px-4 py-5 text-sm text-muted shadow-sm">
        {text}
      </p>
      {footer}
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd className="text-right text-sm text-charcoal">{value}</dd>
    </div>
  );
}

function ReminderBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`flex items-center justify-center rounded-xl border px-2 py-2 text-xs font-medium ${
        active ? 'border-pine bg-pine text-cream' : 'border-sand bg-cream text-muted'
      }`}
    >
      {label}
    </span>
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
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-xs font-medium ${
        checked ? 'border-pine bg-pine text-cream' : 'border-sand bg-cream text-muted'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      {label}
    </label>
  );
}
