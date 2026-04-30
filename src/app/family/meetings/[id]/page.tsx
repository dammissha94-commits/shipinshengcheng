'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { getUserFamilyRole, isFamilyAdmin } from '@/lib/auth/permission-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import {
  archiveMeetingOpinion,
  createMeetingOpinion,
  getFamilyMeeting,
  getMeetingOpinionSummary,
  hideMeetingOpinion,
  listMeetingOpinions,
  submitMeetingVote,
  updateMeetingOpinion,
} from '@/lib/services/meeting-service';
import type { FamilyRole, MeetingOpinionStance, MeetingOpinionVisibility } from '@/types/domain';
import type {
  FamilyMeetingDetail,
  FamilyMeetingOpinionDetail,
  MeetingOpinionSummary,
  MeetingVoteSummary,
} from '@/types/service';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';
const NO_PERMISSION_MESSAGE = '你暂无权限执行此操作';

const STANCE_LABELS: Record<MeetingOpinionStance, string> = {
  agree: '同意',
  disagree: '不同意',
  neutral: '中立',
  suggestion: '建议',
  question: '提问',
};

function sanitizeError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes('Auth session missing')) return '请先登录';
  if (message.includes('failed') || message.includes('violates') || message.includes('permission denied')) {
    return fallback;
  }
  return message;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const meetingId = params?.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [detail, setDetail] = useState<FamilyMeetingDetail | null>(null);
  const [role, setRole] = useState<FamilyRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [opinions, setOpinions] = useState<FamilyMeetingOpinionDetail[]>([]);
  const [summary, setSummary] = useState<MeetingOpinionSummary | null>(null);
  const [voteText, setVoteText] = useState('');
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [opinionSubmitting, setOpinionSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStance, setEditStance] = useState<MeetingOpinionStance>('neutral');
  const [editContent, setEditContent] = useState('');
  const [editVisibility, setEditVisibility] = useState<MeetingOpinionVisibility>('family');
  const [form, setForm] = useState({
    stance: 'neutral' as MeetingOpinionStance,
    content: '',
    visibility: 'family' as MeetingOpinionVisibility,
  });

  async function reload() {
    if (!meetingId) {
      setError('议事不存在');
      setLoading(false);
      return;
    }
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
      setCurrentUserId(user.id);

      const currentDetail = await getFamilyMeeting(meetingId);
      if (!currentDetail) {
        setError('议事不存在或已不可访问');
        setLoading(false);
        return;
      }

      const familyRole = await getUserFamilyRole(currentDetail.meeting.family_id);
      if (!familyRole) {
        setError(NO_PERMISSION_MESSAGE);
        setLoading(false);
        return;
      }

      const [opinionList, opinionSummary, admin] = await Promise.all([
        listMeetingOpinions(meetingId),
        getMeetingOpinionSummary(meetingId),
        isFamilyAdmin(currentDetail.meeting.family_id),
      ]);

      setDetail(currentDetail);
      setRole(familyRole);
      setIsAdmin(admin);
      setOpinions(opinionList);
      setSummary(opinionSummary);
    } catch (e) {
      setError(sanitizeError(e, '加载议事详情失败'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const meeting = detail?.meeting;
  const voteSummary: MeetingVoteSummary | null = detail?.voteSummary ?? null;
  const canPost = !!meeting && meeting.status === 'open' && role !== null && role !== 'viewer';

  async function onSubmitVote(event: React.FormEvent) {
    event.preventDefault();
    if (!meeting || !voteText.trim()) return;
    try {
      setVoteSubmitting(true);
      setError('');
      await submitMeetingVote({ meetingId: meeting.id, optionText: voteText.trim() });
      setMessage('投票已提交');
      setVoteText('');
      await reload();
    } catch (e) {
      setError(sanitizeError(e, '提交投票失败'));
    } finally {
      setVoteSubmitting(false);
    }
  }

  async function onCreateOpinion(event: React.FormEvent) {
    event.preventDefault();
    if (!meeting) return;
    try {
      setOpinionSubmitting(true);
      setError('');
      await createMeetingOpinion({
        meetingId: meeting.id,
        stance: form.stance,
        content: form.content,
        visibility: form.visibility,
      });
      setForm({ stance: 'neutral', content: '', visibility: 'family' });
      setMessage('议事意见已提交');
      await reload();
    } catch (e) {
      setError(sanitizeError(e, '提交议事意见失败'));
    } finally {
      setOpinionSubmitting(false);
    }
  }

  async function onArchive(opinionId: string) {
    try {
      setError('');
      await archiveMeetingOpinion(opinionId);
      setMessage('意见已归档');
      await reload();
    } catch (e) {
      setError(sanitizeError(e, '归档失败'));
    }
  }

  async function onHide(opinionId: string) {
    try {
      setError('');
      await hideMeetingOpinion(opinionId);
      setMessage('意见已隐藏');
      await reload();
    } catch (e) {
      setError(sanitizeError(e, '隐藏失败'));
    }
  }

  async function onSaveEdit(opinionId: string) {
    try {
      setError('');
      await updateMeetingOpinion(opinionId, {
        stance: editStance,
        content: editContent,
        visibility: editVisibility,
      });
      setEditingId(null);
      setMessage('意见已更新');
      await reload();
    } catch (e) {
      setError(sanitizeError(e, '更新失败'));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sm text-muted">加载中...</p>
      </div>
    );
  }

  if (!hasSupabaseConfig()) {
    return (
      <div className="min-h-screen bg-cream">
        <AppHeader title="议事详情" backHref="/family/meetings" />
        <main className="mx-auto max-w-md px-4 py-6">
          <p className="rounded-2xl border border-sand/70 bg-card px-4 py-5 text-sm text-muted text-center">
            {SUPABASE_FALLBACK_MESSAGE}
          </p>
        </main>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-cream">
        <AppHeader title="议事详情" backHref="/family/meetings" />
        <main className="mx-auto max-w-md px-4 py-6">
          <p className="rounded-2xl border border-sand/70 bg-card px-4 py-5 text-sm text-muted text-center">
            {error || '议事不存在'}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="议事详情" backHref="/family/meetings" />
      <main className="mx-auto max-w-md px-4 py-6 space-y-4">
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

        <section className="rounded-2xl border border-sand/70 bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-charcoal">{meeting.title}</h1>
            <span className="rounded-full bg-pine/10 px-2.5 py-1 text-xs text-pine">
              {meeting.status === 'open' ? '进行中' : meeting.status === 'closed' ? '已关闭' : '已归档'}
            </span>
          </div>
          <p className="text-sm text-muted">{meeting.content?.trim() || '暂无议题内容'}</p>
          <p className="mt-2 text-xs text-muted">
            发起人：{detail?.creatorDisplayName || '家人'} ·
            {meeting.event_date ? ` ${formatTime(meeting.event_date)}` : ' 日期未设置'}
          </p>
        </section>

        {meeting.meeting_type === 'vote' && voteSummary && (
          <section className="rounded-2xl border border-sand/70 bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold text-pine">投票区</h2>
            <p className="mb-2 text-xs text-muted">已投票 {voteSummary.totalVotes} 人</p>
            <div className="space-y-2">
              {voteSummary.options.length === 0 ? (
                <p className="text-sm text-muted">暂无投票记录</p>
              ) : (
                voteSummary.options.map((item) => (
                  <div key={item.optionText} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2 text-sm">
                    <span>{item.optionText}</span>
                    <span>{item.count}</span>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={onSubmitVote} className="mt-3 space-y-2">
              <input
                value={voteText}
                onChange={(event) => setVoteText(event.target.value)}
                placeholder="填写你的投票选项"
                className="w-full rounded-xl border border-sand px-3 py-2 text-sm"
              />
              <button
                disabled={!voteText.trim() || voteSubmitting || meeting.status !== 'open'}
                className="w-full rounded-xl bg-pine py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
              >
                {voteSubmitting ? '提交中...' : '提交投票'}
              </button>
            </form>
          </section>
        )}

        <section className="rounded-2xl border border-sand/70 bg-card p-4">
          <h2 className="mb-1 text-sm font-semibold text-pine">议事意见</h2>
          <p className="mb-3 text-xs text-muted">围绕议题提交看法、建议或异议说明（500 字以内）</p>

          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-cream px-2 py-2">
              <p className="text-muted">总数</p>
              <p className="font-semibold text-charcoal">{summary?.total ?? 0}</p>
            </div>
            <div className="rounded-lg bg-cream px-2 py-2">
              <p className="text-muted">同意/反对</p>
              <p className="font-semibold text-charcoal">{summary?.agree ?? 0}/{summary?.disagree ?? 0}</p>
            </div>
            <div className="rounded-lg bg-cream px-2 py-2">
              <p className="text-muted">建议/提问</p>
              <p className="font-semibold text-charcoal">{summary?.suggestion ?? 0}/{summary?.question ?? 0}</p>
            </div>
          </div>

          {canPost ? (
            <form onSubmit={onCreateOpinion} className="mb-4 space-y-2 rounded-xl border border-pine/20 bg-cream p-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.stance}
                  onChange={(event) => setForm({ ...form, stance: event.target.value as MeetingOpinionStance })}
                  className="rounded-lg border border-sand px-2 py-2 text-sm"
                >
                  {Object.entries(STANCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select
                  value={form.visibility}
                  onChange={(event) => setForm({ ...form, visibility: event.target.value as MeetingOpinionVisibility })}
                  className="rounded-lg border border-sand px-2 py-2 text-sm"
                >
                  <option value="family">家庭内可见</option>
                  <option value="private">仅自己和管理员可见</option>
                </select>
              </div>
              <textarea
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                rows={4}
                maxLength={500}
                placeholder="请填写你的议事意见"
                className="w-full resize-none rounded-lg border border-sand px-3 py-2 text-sm"
              />
              <button
                disabled={!form.content.trim() || opinionSubmitting}
                className="w-full rounded-xl bg-pine py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
              >
                {opinionSubmitting ? '提交中...' : '发表意见'}
              </button>
            </form>
          ) : (
            <p className="mb-4 rounded-lg bg-sand/40 px-3 py-2 text-xs text-muted">
              {meeting.status === 'open' ? NO_PERMISSION_MESSAGE : '该议题已关闭或归档，不能新增意见'}
            </p>
          )}

          {opinions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-sand px-3 py-6 text-center text-sm text-muted">近期暂无议事意见</p>
          ) : (
            <div className="space-y-3">
              {opinions.map(({ opinion, authorDisplayName }) => {
                const isAuthor = currentUserId === opinion.author_user_id;
                const isEditing = editingId === opinion.id;
                return (
                  <article key={opinion.id} className="rounded-xl border border-sand/70 bg-cream p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-charcoal">{authorDisplayName || '家人'}</p>
                      <span className="rounded-full bg-pine/10 px-2 py-0.5 text-xs text-pine">{STANCE_LABELS[opinion.stance]}</span>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={editStance}
                            onChange={(event) => setEditStance(event.target.value as MeetingOpinionStance)}
                            className="rounded-lg border border-sand px-2 py-2 text-sm"
                          >
                            {Object.entries(STANCE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          <select
                            value={editVisibility}
                            onChange={(event) => setEditVisibility(event.target.value as MeetingOpinionVisibility)}
                            className="rounded-lg border border-sand px-2 py-2 text-sm"
                          >
                            <option value="family">家庭内可见</option>
                            <option value="private">仅自己和管理员可见</option>
                          </select>
                        </div>
                        <textarea
                          value={editContent}
                          onChange={(event) => setEditContent(event.target.value)}
                          rows={3}
                          maxLength={500}
                          className="w-full resize-none rounded-lg border border-sand px-3 py-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => onSaveEdit(opinion.id)} className="flex-1 rounded-lg bg-pine py-2 text-xs font-semibold text-cream">保存</button>
                          <button type="button" onClick={() => setEditingId(null)} className="flex-1 rounded-lg border border-sand py-2 text-xs text-muted">取消</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-sm text-charcoal">{opinion.content}</p>
                        <p className="mt-2 text-xs text-muted">
                          {formatTime(opinion.created_at)} · {opinion.visibility === 'private' ? '仅自己和管理员可见' : '家庭内可见'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {isAuthor && opinion.status === 'active' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(opinion.id);
                                  setEditStance(opinion.stance);
                                  setEditContent(opinion.content);
                                  setEditVisibility(opinion.visibility);
                                }}
                                className="rounded-lg border border-sand px-2 py-1 text-xs text-muted"
                              >
                                编辑
                              </button>
                              <button type="button" onClick={() => onArchive(opinion.id)} className="rounded-lg border border-sand px-2 py-1 text-xs text-muted">
                                归档
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <button type="button" onClick={() => onHide(opinion.id)} className="rounded-lg border border-sand px-2 py-1 text-xs text-muted">
                              隐藏
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <Link href="/family/meetings" className="block pb-4 text-sm font-medium text-pine">
          返回议事列表
        </Link>
      </main>
    </div>
  );
}
