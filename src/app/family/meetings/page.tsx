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
import StatusBadge from '@/components/wujia/StatusBadge';
import PageSkeleton from '@/components/ui/PageSkeleton';
import EmptyState from '@/components/wujia/EmptyState';
import { NoMeetingsIllustration } from '@/components/illustrations';
import { WjFormRow, WjInput, WjSelect, WjTextarea, WjButton } from '@/components/wujia/WjForm';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';

const MEETING_TYPE_LABELS: Record<MeetingType, string> = { notice: '通知', vote: '投票', event: '家庭聚会', memorial_day: '纪念日' };
const TYPE_FILTERS: { value: MeetingType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' }, { value: 'notice', label: '通知' }, { value: 'vote', label: '投票' }, { value: 'event', label: '家庭聚会' }, { value: 'memorial_day', label: '纪念日' },
];
const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'family', label: '家庭内可见' }, { value: 'private', label: '仅自己可见' }, { value: 'public', label: '公开可见' },
];

function canCreate(role: FamilyRole | null) { return role === 'owner' || role === 'family_admin'; }
function formatDate(value: string | null): string {
  if (!value) return '日期未定';
  return new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}
function sanitizeError(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : fallback;
  if (msg.includes('Auth session missing')) return '请先登录';
  if (msg.includes('failed') || msg.includes('violates') || msg.includes('permission denied')) return fallback;
  return msg;
}
function meetingStatusLabel(status: FamilyMeeting['status']): string {
  if (status === 'open') return '进行中'; if (status === 'closed') return '已关闭'; return '已归档';
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
  const [form, setForm] = useState({ meetingType: 'notice' as MeetingType, title: '', content: '', eventDate: '', visibility: 'family' as Visibility });

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        const [records, currentRole] = await Promise.all([listFamilyMeetings(currentFamily.id), getUserFamilyRole(currentFamily.id)]);
        setFamily(currentFamily); setMeetings(records); setRole(currentRole);
      } catch (err) { setError(sanitizeError(err, '加载家族议事失败')); }
      finally { setLoading(false); }
    }
    load();
  }, [router]);

  const filteredMeetings = useMemo(() => filter === 'all' ? meetings : meetings.filter((m) => m.meeting_type === filter), [filter, meetings]);
  const canCreateMeeting = canCreate(role);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!family || !form.title.trim()) return;
    if (!canCreateMeeting) { setError('你暂无权限执行此操作'); return; }
    try {
      setSubmitting(true); setError('');
      const created = await createFamilyMeeting({ familyId: family.id, meetingType: form.meetingType, title: form.title.trim(), content: form.content.trim() || null, eventDate: form.eventDate || null, visibility: form.visibility });
      setMeetings((c) => [created, ...c]);
      setForm({ meetingType: 'notice', title: '', content: '', eventDate: '', visibility: 'family' }); setShowForm(false);
    } catch (err) { setError(sanitizeError(err, '发布议题失败')); }
    finally { setSubmitting(false); }
  }

  if (loading) return <PageSkeleton title="家族议事" backHref="/family" cards={3} withStats={false} withSearch={false} />;
  if (!hasSupabaseConfig()) return <S r={null}><P text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></S>;
  if (error && !family) return <S r={null}><P text={error} /></S>;

  return (
    <S r={canCreateMeeting ? <button onClick={() => setShowForm((v) => !v)} className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--walnut-light)] hover:bg-[var(--surface-3)]" aria-label="新增议题"><MessageSquarePlus size={17} /></button> : null}>
      <main className="relative z-10 space-y-5 px-5 pb-6">
        <section className="rounded-[15px] border border-[#E7D9C9] bg-white/72 p-5 shadow-[0_10px_28px_rgba(90,53,36,0.06)]">
          <p className="text-[13px] font-medium tracking-[0.18em] text-[#9B6A37]">家族议事</p>
          <h1 className="mt-1 text-[24px] font-bold text-[#2A1D16]">{family?.displayName ?? '家族议事'}</h1>
          <p className="mt-1 text-[14px] text-[#8A7465]">{meetings.length} 条议题 · 只在家族内部讨论</p>
        </section>

        {error && <p className="mb-4 rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}

        {!canCreateMeeting && (
          <p className="mb-4 rounded-xl border border-[var(--line-1)] bg-white px-4 py-2.5 text-xs text-[var(--ink-3)]">你可以查看议题并在详情页发表意见；新增和管理议题由家堂管理员处理。</p>
        )}

        {showForm && canCreateMeeting && (
          <form onSubmit={handleSubmit} className="mb-5">
            <div className="rounded-[15px] border border-[#E7D9C9] bg-white/82 shadow-[0_10px_28px_rgba(90,53,36,0.06)]">
              <div className="border-b border-[var(--surface-2)] px-5 py-4"><h2 className="text-base font-semibold text-[var(--ink-1)]">发布一条家族议题</h2></div>
              <div className="space-y-4 px-5 py-5">
                <WjFormRow label="类型">
                  <WjSelect value={form.meetingType} onChange={(e) => setForm({ ...form, meetingType: e.target.value as MeetingType })}>
                    {TYPE_FILTERS.filter((t) => t.value !== 'all').map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </WjSelect>
                </WjFormRow>
                <WjFormRow label="标题" required>
                  <WjInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </WjFormRow>
                <WjFormRow label="内容">
                  <WjTextarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} />
                </WjFormRow>
                <WjFormRow label="日期">
                  <WjInput type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
                </WjFormRow>
                <WjFormRow label="可见范围">
                  <WjSelect value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as Visibility })}>
                    {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </WjSelect>
                </WjFormRow>
              </div>
              <div className="border-t border-[var(--surface-2)] px-5 py-4 flex gap-3">
                <WjButton type="button" variant="secondary" onClick={() => setShowForm(false)}>取消</WjButton>
                <WjButton type="submit" disabled={!form.title.trim() || submitting}>{submitting ? '发布中...' : '发布'}</WjButton>
              </div>
            </div>
          </form>
        )}

        <div className="mb-3 flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-[var(--warning)]/60" />
              <h2 className="text-base font-semibold text-[#2A1D16]">议题列表</h2>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto">
          {TYPE_FILTERS.map((t) => (
            <button key={t.value} type="button" onClick={() => setFilter(t.value)}
              className={`shrink-0 rounded-full px-3.5 min-h-[44px] flex items-center text-xs font-medium transition-all ${
                filter === t.value ? 'bg-[#5A3524] text-white' : 'bg-[#F4EBDD] text-[#8A7465]'
              }`}>{t.label}</button>
          ))}
        </div>

        {filteredMeetings.length === 0 ? (
          <EmptyState
            illustration={filter === 'all' ? <NoMeetingsIllustration /> : undefined}
            title={filter === 'all' ? '还没有议题' : `暂无${MEETING_TYPE_LABELS[filter]}议题`}
            description={filter === 'all' ? '由家堂管理员发起家庭聚会、纪念日或投票' : '尝试其他类型筛选'}
          />
        ) : (
          <div className="space-y-3">
            {filteredMeetings.map((meeting) => (
              <Link key={meeting.id} href={`/family/meetings/${meeting.id}`} className="block">
                <article className="rounded-[13px] border border-[#E7D9C9] bg-white/86 p-4 shadow-[0_8px_20px_rgba(90,53,36,0.05)] transition active:scale-[0.99]">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h3 className="min-w-0 flex-1 text-base font-semibold text-[#2A1D16]">{meeting.title}</h3>
                    <StatusBadge>{MEETING_TYPE_LABELS[meeting.meeting_type]}</StatusBadge>
                  </div>
                  <p className="line-clamp-3 text-sm text-[#8A7465]">{meeting.content?.trim() || '暂无内容'}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-[#8A7465]">
                    <span>{formatDate(meeting.event_date)}</span>
                    <span className={`${meeting.status === 'open' ? 'text-[var(--walnut)]' : meeting.status === 'closed' ? 'text-[var(--ink-3)]' : 'text-[var(--ink-3)]'} font-medium`}>{meetingStatusLabel(meeting.status)}</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>
    </S>
  );
}

function S({ children, r }: { children: React.ReactNode; r: React.ReactNode }) {
  return <MobilePage><MobileStatusBar /><MobileTopBar title="家族议事" right={r} />{children}</MobilePage>;
}
function P({ text }: { text: string }) {
  return <main className="flex min-h-[70vh] items-center justify-center px-5 text-center"><p className="rounded-[15px] border border-[#E7D9C9] bg-white/82 px-4 py-5 text-sm text-[#8A7465]">{text}</p></main>;
}
