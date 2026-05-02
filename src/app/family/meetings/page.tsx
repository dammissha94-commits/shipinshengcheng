'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { getUserFamilyRole } from '@/lib/auth/permission-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createFamilyMeeting, listFamilyMeetings } from '@/lib/services/meeting-service';
import type { FamilyMeeting, FamilyRole, FamilySpace, MeetingType, Visibility } from '@/types/domain';
import AppHeader from '@/components/AppHeader';
import SectionTitle from '@/components/SectionTitle';
import { Card, Input } from '@/components/ui';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';
const NO_PERMISSION_MESSAGE = '你暂无权限执行此操作';

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  notice: '通知',
  vote: '投票',
  event: '家庭聚会',
  memorial_day: '纪念日',
};

const TYPE_FILTERS: { value: MeetingType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'notice', label: '通知' },
  { value: 'vote', label: '投票' },
  { value: 'event', label: '家庭聚会' },
  { value: 'memorial_day', label: '纪念日' },
];

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'family', label: '家庭内可见' },
  { value: 'private', label: '仅自己可见' },
  { value: 'public', label: '公开可见' },
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

function sanitizeError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes('Auth session missing')) return '请先登录';
  if (message.includes('failed') || message.includes('violates') || message.includes('permission denied')) {
    return fallback;
  }
  return message;
}

function meetingStatusLabel(status: FamilyMeeting['status']): string {
  if (status === 'open') return '进行中';
  if (status === 'closed') return '已关闭';
  return '已归档';
}

function MeetingCard({ meeting }: { meeting: FamilyMeeting }) {
  return (
    <Link href={`/family/meetings/${meeting.id}`} className="block">
      <article className="rounded-2xl border border-sand/60 bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-md">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 text-[16px] font-semibold text-charcoal">{meeting.title}</h3>
          <span className="shrink-0 rounded-full bg-pine/10 px-2.5 py-0.5 text-[11px] font-medium text-pine">
            {MEETING_TYPE_LABELS[meeting.meeting_type]}
          </span>
        </div>
        <p className="line-clamp-3 text-[14px] leading-relaxed text-muted">{meeting.content?.trim() || '暂无内容'}</p>
        <div className="mt-3 flex items-center justify-between text-[12px] text-muted/70">
          <span>{formatDate(meeting.event_date)}</span>
          <span>{meetingStatusLabel(meeting.status)}</span>
        </div>
      </article>
    </Link>
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
      } catch (err) {
        setError(sanitizeError(err, '加载家族议事失败'));
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
      setError(NO_PERMISSION_MESSAGE);
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const created = await createFamilyMeeting({
        familyId: family.id,
        meetingType: form.meetingType,
        title: form.title.trim(),
        content: form.content.trim() || null,
        eventDate: form.eventDate || null,
        visibility: form.visibility,
      });
      setMeetings((current) => [created, ...current]);
      setForm({ meetingType: 'notice', title: '', content: '', eventDate: '', visibility: 'family' });
      setShowForm(false);
    } catch (err) {
      setError(sanitizeError(err, '发布议题失败'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <p className="text-sm text-muted">加载中...</p>
      </div>
    );
  }

  if (!hasSupabaseConfig()) {
    return (
      <Shell rightElement={null}>
        <CenteredPanel text={SUPABASE_FALLBACK_MESSAGE} />
      </Shell>
    );
  }

  if (error && !family) {
    return (
      <Shell rightElement={null}>
        <CenteredPanel text={error} />
      </Shell>
    );
  }

  return (
    <Shell
      rightElement={
        canCreateMeeting ? (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-pine hover:bg-sand"
            aria-label="新增议题"
          >
            <MessageSquarePlus size={17} />
          </button>
        ) : null
      }
    >
      <main className="mx-auto max-w-md px-4 py-6">
        <div className="mb-5 rounded-2xl bg-pine p-5 text-cream">
          <p className="mb-1 text-xs text-cream/70">家族议事</p>
          <h1 className="text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-cream/80">{meetings.length} 条议题</p>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {!canCreateMeeting && (
          <p className="mb-4 rounded-xl border border-sand/70 bg-card px-3 py-2 text-xs text-muted">
            你可以查看议题并在详情页发表议事意见；新增和管理议题由家堂管理员处理。
          </p>
        )}

        {showForm && canCreateMeeting && (
          <form onSubmit={handleSubmit} className="mb-5 space-y-3">
            <Card className="border-pine/20 p-4">
              <p className="mb-3 text-[15px] font-semibold text-pine">发布一条家族议题</p>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[14px] font-medium text-charcoal">类型</span>
                  <select
                    value={form.meetingType}
                    onChange={(event) => setForm({ ...form, meetingType: event.target.value as MeetingType })}
                    className="w-full rounded-xl border-2 border-sand bg-card px-4 py-3 text-[15px] text-charcoal transition-all duration-200 focus:border-pine focus:outline-none focus:shadow-[0_0_0_3px_rgba(30,58,47,0.08)]"
                  >
                    {TYPE_FILTERS.filter((item) => item.value !== 'all').map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="标题" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
                <label className="block">
                  <span className="mb-1.5 block text-[14px] font-medium text-charcoal">内容</span>
                  <textarea
                    value={form.content}
                    onChange={(event) => setForm({ ...form, content: event.target.value })}
                    rows={4}
                    className="w-full resize-none rounded-xl border-2 border-sand bg-card px-4 py-3 text-[15px] text-charcoal placeholder:text-muted/50 transition-all duration-200 focus:border-pine focus:outline-none focus:shadow-[0_0_0_3px_rgba(30,58,47,0.08)]"
                  />
                </label>
                <Field
                  label="日期"
                  type="date"
                  value={form.eventDate}
                  onChange={(value) => setForm({ ...form, eventDate: value })}
                />
                <VisibilitySelect
                  value={form.visibility}
                  onChange={(value) => setForm({ ...form, visibility: value })}
                />
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 rounded-xl border-2 border-sand bg-card py-2.5 text-[15px] font-medium text-muted transition-colors hover:bg-sand/30 active:scale-[0.98]"
                  >
                    取消
                  </button>
                  <button
                    disabled={!form.title.trim() || submitting}
                    className="flex-1 rounded-xl bg-pine py-2.5 text-[15px] font-semibold text-cream shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-all duration-200 hover:bg-pine-light disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                  >
                    {submitting ? '发布中...' : '发布'}
                  </button>
                </div>
              </div>
            </Card>
          </form>
        )}

        <SectionTitle title="议题列表" subtitle="通知、投票、家庭聚会与纪念日议题" />
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {TYPE_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ${
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
            {filteredMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
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
      <span className="mb-1.5 block text-[14px] font-medium text-charcoal">{label}</span>
      <Input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function VisibilitySelect({ value, onChange }: { value: Visibility; onChange: (value: Visibility) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium text-charcoal">可见范围</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Visibility)}
        className="w-full rounded-xl border-2 border-sand bg-card px-4 py-3 text-[15px] text-charcoal transition-all duration-200 focus:border-pine focus:outline-none focus:shadow-[0_0_0_3px_rgba(30,58,47,0.08)]"
      >
        {VISIBILITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
