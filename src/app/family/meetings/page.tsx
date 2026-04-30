'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { getUserFamilyRole } from '@/lib/auth/permission-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createFamilyMeeting, listFamilyMeetings } from '@/lib/services/meeting-service';
import type { FamilyMeeting, FamilySpace, FamilyRole, MeetingType, Visibility } from '@/types/domain';
import AppHeader from '@/components/AppHeader';
import SectionTitle from '@/components/SectionTitle';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  notice: '通知',
  vote: '投票',
  event: '聚会',
  memorial_day: '纪念日',
};

const MEETING_TYPE_COLORS: Record<MeetingType, string> = {
  notice: 'bg-pine/10 text-pine',
  vote: 'bg-gold/15 text-gold',
  event: 'bg-emerald-50 text-emerald-700',
  memorial_day: 'bg-amber-50 text-amber-700',
};

const TYPE_FILTERS: { value: MeetingType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'notice', label: '通知' },
  { value: 'vote', label: '投票' },
  { value: 'event', label: '聚会' },
  { value: 'memorial_day', label: '纪念日' },
];

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'family', label: '家族可见' },
  { value: 'private', label: '仅自己' },
  { value: 'public', label: '公开' },
];

function canCreate(role: FamilyRole | null): boolean {
  return role === 'owner' || role === 'family_admin';
}

function formatDate(value: string | null): string {
  if (!value) return '日期未定';
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function MeetingCard({ meeting }: { meeting: FamilyMeeting }) {
  const typeColor = MEETING_TYPE_COLORS[meeting.meeting_type] ?? 'bg-sand text-muted';
  const statusLabel = meeting.status === 'open' ? '进行中' : meeting.status === 'closed' ? '已关闭' : '已归档';

  return (
    <article className="rounded-2xl border border-sand/70 bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug text-charcoal">{meeting.title}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${typeColor}`}>
          {MEETING_TYPE_LABELS[meeting.meeting_type]}
        </span>
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed text-muted">{meeting.content?.trim() || '暂无内容'}</p>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted/70">
        <span>{formatDate(meeting.event_date)}</span>
        <span className={meeting.status === 'open' ? 'text-pine' : 'text-muted'}>{statusLabel}</span>
      </div>
    </article>
  );
}

export default function MeetingsPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [role, setRole] = useState<FamilyRole | null>(null);
  const [meetings, setMeetings] = useState<FamilyMeeting[]>([]);
  const [filter, setFilter] = useState<MeetingType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    meetingType: 'notice' as MeetingType,
    title: '',
    content: '',
    eventDate: '',
    visibility: 'family' as Visibility,
  });

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

        const [records, currentRole] = await Promise.all([
          listFamilyMeetings(currentFamily.id),
          getUserFamilyRole(currentFamily.id),
        ]);
        setFamily(currentFamily);
        setMeetings(records);
        setRole(currentRole);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载家族议事失败');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const filteredMeetings = useMemo(
    () => (filter === 'all' ? meetings : meetings.filter((meeting) => meeting.meeting_type === filter)),
    [filter, meetings]
  );
  const canCreateMeeting = canCreate(role);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!family || !form.title.trim()) return;

    if (!canCreateMeeting) {
      setError('你暂无权限执行此操作');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const meeting = await createFamilyMeeting({
        familyId: family.id,
        meetingType: form.meetingType,
        title: form.title.trim(),
        content: form.content.trim() || null,
        eventDate: form.eventDate || null,
        visibility: form.visibility,
      });
      setMeetings((current) => [meeting, ...current]);
      setForm({ meetingType: 'notice', title: '', content: '', eventDate: '', visibility: 'family' });
      setShowForm(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '发布议题失败');
    } finally {
      setSubmitting(false);
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
        canCreateMeeting ? (
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-pine transition-colors hover:bg-sand"
            aria-label="新增议题"
          >
            <PlusIcon />
          </button>
        ) : null
      }
    >
      <main className="mx-auto max-w-md px-4 py-6">
        <div className="mb-5 rounded-2xl bg-pine p-5 text-cream">
          <p className="mb-1 text-xs tracking-wider text-cream/60">家族议事</p>
          <h1 className="text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-cream/70">{meetings.length} 条议题</p>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {!canCreateMeeting && (
          <p className="mb-4 rounded-xl border border-sand/70 bg-card px-3 py-2 text-xs text-muted">
            普通成员可查看家族议事，新增和关闭议题由家堂管理员处理。
          </p>
        )}

        {showForm && canCreateMeeting && (
          <form onSubmit={handleSubmit} className="mb-5 space-y-3 rounded-2xl border border-pine/20 bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold text-pine">发布一条家族议题</p>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-charcoal">类型</span>
              <select
                value={form.meetingType}
                onChange={(event) => setForm({ ...form, meetingType: event.target.value as MeetingType })}
                className="w-full rounded-xl border-2 border-sand bg-cream px-3 py-2.5 text-sm focus:border-pine focus:outline-none"
              >
                {TYPE_FILTERS.filter((item) => item.value !== 'all').map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <Field label="标题" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-charcoal">内容</span>
              <textarea
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                rows={4}
                className="w-full resize-none rounded-xl border-2 border-sand bg-cream px-3 py-2.5 text-sm focus:border-pine focus:outline-none"
              />
            </label>
            <Field label="日期" type="date" value={form.eventDate} onChange={(value) => setForm({ ...form, eventDate: value })} />
            <VisibilitySelect value={form.visibility} onChange={(value) => setForm({ ...form, visibility: value })} />
            <FormActions submitting={submitting} disabled={!form.title.trim()} onCancel={() => setShowForm(false)} />
          </form>
        )}

        <SectionTitle title="议题列表" subtitle="家族通知、家庭事项、聚会安排与纪念日提醒" />
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

        {filteredMeetings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand bg-card px-4 py-12 text-center text-sm text-muted">
            暂无{filter !== 'all' ? MEETING_TYPE_LABELS[filter] : ''}议题
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMeetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)}
          </div>
        )}
      </main>
    </Shell>
  );
}

function Shell({ children, rightElement }: { children: React.ReactNode; rightElement: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="家族议事" backHref="/family" rightElement={rightElement} />
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

function VisibilitySelect({ value, onChange }: { value: Visibility; onChange: (value: Visibility) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-charcoal">可见范围</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Visibility)}
        className="w-full rounded-xl border-2 border-sand bg-cream px-3 py-2.5 text-sm focus:border-pine focus:outline-none"
      >
        {VISIBILITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
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
        {submitting ? '发布中...' : '发布'}
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
