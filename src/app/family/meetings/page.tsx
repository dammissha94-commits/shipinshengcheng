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
import StatusBadge from '@/components/wujia/StatusBadge';

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

  if (loading) return <C text="加载中..." />;
  if (!hasSupabaseConfig()) return <S r={null}><P text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></S>;
  if (error && !family) return <S r={null}><P text={error} /></S>;

  return (
    <S r={canCreateMeeting ? <button onClick={() => setShowForm((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-full text-#8D6E63 hover:bg-stone-200" aria-label="新增议题"><MessageSquarePlus size={17} /></button> : null}>
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-5 rounded-2xl bg-#5A3524 p-5 text-white">
          <p className="text-xs text-white/40 tracking-widest font-medium">家族议事</p>
          <h1 className="mt-0.5 text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-white/55">{meetings.length} 条议题</p>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

        {!canCreateMeeting && (
          <p className="mb-4 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs text-stone-500">你可以查看议题并在详情页发表意见；新增和管理议题由家堂管理员处理。</p>
        )}

        {showForm && canCreateMeeting && (
          <form onSubmit={handleSubmit} className="mb-5">
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-100 px-5 py-4"><h2 className="text-base font-semibold text-stone-800">发布一条家族议题</h2></div>
              <div className="space-y-4 px-5 py-5">
                <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">类型</span>
                  <select value={form.meetingType} onChange={(e) => setForm({ ...form, meetingType: e.target.value as MeetingType })}
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all">
                    {TYPE_FILTERS.filter((t) => t.value !== 'all').map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                </label>
                <F label="标题" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
                <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">内容</span>
                  <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4}
                    className="w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all" />
                </label>
                <F label="日期" type="date" value={form.eventDate} onChange={(v) => setForm({ ...form, eventDate: v })} />
                <VS value={form.visibility} onChange={(v) => setForm({ ...form, visibility: v })} />
              </div>
              <div className="border-t border-stone-100 px-5 py-4 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-medium text-stone-500 hover:bg-[#F8F1E7] transition-colors">取消</button>
                <button disabled={!form.title.trim() || submitting} className="flex-1 rounded-xl bg-#5A3524 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E disabled:opacity-50 transition-all active:scale-[0.98]">{submitting ? '发布中...' : '发布'}</button>
              </div>
            </div>
          </form>
        )}

        <div className="mb-3 flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-amber-500/60" />
          <h2 className="text-base font-semibold text-stone-800">议题列表</h2>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto">
          {TYPE_FILTERS.map((t) => (
            <button key={t.value} type="button" onClick={() => setFilter(t.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                filter === t.value ? 'bg-#5A3524 text-white' : 'border border-stone-200 bg-white text-stone-500 hover:border-stone-300'
              }`}>{t.label}</button>
          ))}
        </div>

        {filteredMeetings.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-12 text-center text-sm text-stone-400">暂无{filter !== 'all' ? MEETING_TYPE_LABELS[filter] : ''}议题</div>
        ) : (
          <div className="space-y-3">
            {filteredMeetings.map((meeting) => (
              <Link key={meeting.id} href={`/family/meetings/${meeting.id}`} className="block">
                <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h3 className="min-w-0 flex-1 text-base font-semibold text-stone-800">{meeting.title}</h3>
                    <StatusBadge>{MEETING_TYPE_LABELS[meeting.meeting_type]}</StatusBadge>
                  </div>
                  <p className="line-clamp-3 text-sm text-stone-500">{meeting.content?.trim() || '暂无内容'}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-stone-400">
                    <span>{formatDate(meeting.event_date)}</span>
                    <span className={`${meeting.status === 'open' ? 'text-#8B5A3C' : meeting.status === 'closed' ? 'text-stone-500' : 'text-stone-400'} font-medium`}>{meetingStatusLabel(meeting.status)}</span>
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
  return <div className="min-h-screen bg-[#F8F1E7]"><AppHeader title="家族议事" backHref="/family" rightElement={r} />{children}</div>;
}
function C({ text }: { text: string }) {
  return <div className="min-h-screen bg-[#F8F1E7] flex items-center justify-center"><p className="text-sm text-stone-500">{text}</p></div>;
}
function P({ text }: { text: string }) {
  return <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 text-center"><p className="rounded-2xl border border-stone-200 bg-white px-4 py-5 text-sm text-stone-500 shadow-sm">{text}</p></main>;
}
function F({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">{label}{required && <span className="text-red-400"> *</span>}</span>
    <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all" /></label>;
}
function VS({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  return <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">可见范围</span>
    <select value={value} onChange={(e) => onChange(e.target.value as Visibility)}
      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all">
      {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
