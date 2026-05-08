'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Lock, MessageSquarePlus, PenLine, Trash2 } from 'lucide-react';
import StatusBadge from '@/components/wujia/StatusBadge';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import { WjHeroPanel, WjInlineStat, WjPaperCard, WjScreenContent, WjSectionHeading, WjSoftNote } from '@/components/wujia/MobileDesignSystem';
import { WjButton, WjFormRow, WjSelect, WjTextarea } from '@/components/wujia/WjForm';
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
import type { FamilyMeetingDetail, FamilyMeetingOpinionDetail, MeetingOpinionSummary, MeetingVoteSummary } from '@/types/service';

const STANCE_LABELS: Record<MeetingOpinionStance, string> = {
  agree: '同意',
  disagree: '不同意',
  neutral: '中立',
  suggestion: '建议',
  question: '提问',
};
const STANCE_TONE: Record<MeetingOpinionStance, 'success' | 'danger' | 'muted' | 'default' | 'warning'> = {
  agree: 'success',
  disagree: 'danger',
  neutral: 'muted',
  suggestion: 'default',
  question: 'warning',
};
const VOTE_OPTIONS = ['同意', '不同意', '待商量'] as const;

function sanitizeError(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : fallback;
  if (msg.includes('Auth session missing')) return '请先登录';
  if (msg.includes('failed') || msg.includes('violates') || msg.includes('permission denied')) return fallback;
  if (
    msg.includes('议事不存在') ||
    msg.includes('你已参与') ||
    msg.includes('投票提交失败') ||
    msg.includes('投票数据暂不可用') ||
    msg.includes('议事意见暂不可用') ||
    msg.includes('你暂无权限')
  )
    return msg;
  return fallback;
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

function voteCount(summary: MeetingVoteSummary, option: string): number {
  return summary.options.find((item) => item.optionText === option)?.count ?? 0;
}

function meetingTypeLabel(type: string): string {
  if (type === 'vote') return '投票';
  if (type === 'event') return '家庭会议';
  if (type === 'memorial_day') return '纪念日';
  return '通知';
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
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [opinionSubmitting, setOpinionSubmitting] = useState(false);
  const [voteSummaryError, setVoteSummaryError] = useState('');
  const [opinionLoadError, setOpinionLoadError] = useState('');
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
      setError('尚未配置 Supabase 环境变量，请先配置 .env.local');
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
        setError('你暂无权限执行此操作');
        setLoading(false);
        return;
      }
      const admin = await isFamilyAdmin(currentDetail.meeting.family_id);
      let opinionList: FamilyMeetingOpinionDetail[] = [];
      let opinionSummary: MeetingOpinionSummary | null = null;
      let opinionWarning = '';
      try {
        opinionList = await listMeetingOpinions(meetingId);
        opinionSummary = await getMeetingOpinionSummary(meetingId);
      } catch {
        opinionWarning = '议事意见暂不可用，请稍后重试。';
      }
      setDetail(currentDetail);
      setRole(familyRole);
      setIsAdmin(admin);
      setOpinions(opinionList);
      setSummary(opinionSummary);
      setOpinionLoadError(opinionWarning);
      setVoteSummaryError(currentDetail.voteSummaryError ?? '');
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
  const voteSummary: MeetingVoteSummary = detail?.voteSummary ?? {
    meetingId: meeting?.id ?? meetingId ?? '',
    totalVotes: 0,
    options: [],
    currentUserHasVoted: false,
    currentUserOption: null,
  };
  const voteWarning = voteSummaryError || detail?.voteSummaryError || '';
  const canPost = !!meeting && meeting.status === 'open' && role !== null && role !== 'viewer';
  const canVote = canPost && meeting?.meeting_type === 'vote' && !voteSummary.currentUserHasVoted;

  async function onSubmitVote(optionText: (typeof VOTE_OPTIONS)[number]) {
    if (!meeting) return;
    try {
      setVoteSubmitting(true);
      setError('');
      await submitMeetingVote({ meetingId: meeting.id, optionText });
      setMessage('投票已提交');
      await reload();
    } catch (e) {
      setError(sanitizeError(e, '投票提交失败，请检查网络或权限'));
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

  if (loading) return <CenterText text="加载中..." />;
  if (!hasSupabaseConfig()) return <Shell><PanelText text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></Shell>;
  if (!meeting) return <Shell><PanelText text={error || '议事不存在或已不可访问'} /></Shell>;

  const statusLabel = meeting.status === 'open' ? '进行中' : meeting.status === 'closed' ? '已关闭' : '已归档';

  return (
    <Shell>
      <WjScreenContent>
        {error && <p className="rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}
        {message && <p className="rounded-xl border border-[#D9E8D6] bg-[#F0F8ED] px-4 py-2.5 text-sm text-[#557B61]">{message}</p>}
        {voteWarning && <p className="rounded-xl bg-warning-light px-4 py-2.5 text-xs text-warning">{voteWarning}</p>}
        {opinionLoadError && <p className="rounded-xl bg-warning-light px-4 py-2.5 text-xs text-warning">{opinionLoadError}</p>}

        <WjHeroPanel eyebrow="FAMILY MEETING" title={meeting.title}>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#F1E5D6] px-2.5 py-1 text-[11px] font-medium text-[#5A3825]">{meetingTypeLabel(meeting.meeting_type)}</span>
            <span className="rounded-full bg-[#E8EFE7] px-2.5 py-1 text-[11px] font-medium text-[#557B61]">{statusLabel}</span>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-[#78675B]">
              发起人：{detail?.creatorDisplayName || '家人'}
            </span>
          </div>
        </WjHeroPanel>

        <WjPaperCard className="p-5">
          <WjSectionHeading title="议题内容" />
          <p className="mt-3 whitespace-pre-wrap text-[14px] leading-7 text-[#5A3524]">
            {meeting.content?.trim() || <span className="text-[#8C7768]">未填写内容</span>}
          </p>
          {meeting.event_date && <p className="mt-3 text-[12px] text-[#78675B]">议事时间：{formatTime(meeting.event_date)}</p>}
        </WjPaperCard>

        {meeting.meeting_type === 'vote' && (
          <WjPaperCard className="p-5">
            <div className="flex items-center justify-between">
              <WjSectionHeading title="家人投票" />
              <span className="text-[12px] text-[#78675B]">{voteSummary.totalVotes} 人参与</span>
            </div>

            <div className="mt-3 space-y-2.5">
              {VOTE_OPTIONS.map((option) => {
                const count = voteCount(voteSummary, option);
                const total = voteSummary.totalVotes;
                const percent = total === 0 ? 0 : Math.round((count / total) * 100);
                const selected = voteSummary.currentUserOption === option;
                const disabled = !canVote || voteSubmitting;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onSubmitVote(option)}
                    disabled={disabled}
                    className={`relative min-h-[48px] w-full overflow-hidden rounded-[15px] border px-4 text-left transition disabled:cursor-not-allowed ${
                      selected ? 'border-[#B8924E] bg-[#FBF7EF]' : 'border-[#E7D9C9] bg-white/82'
                    } ${canVote ? 'hover:border-[#8B5A3C]' : ''}`}
                  >
                    <span className="absolute inset-y-0 left-0 bg-[#F1E5D6]" style={{ width: `${percent}%` }} />
                    <span className="relative flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[15px] font-semibold text-[#3A2519]">
                        {selected && <CheckCircle2 size={16} className="text-[#8B5A3C]" />}
                        {option}
                      </span>
                      <span className="text-[13px] font-medium text-[#78675B]">
                        {count} 票 · {percent}%
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <WjSoftNote className="mt-3">
              {voteSummary.currentUserHasVoted
                ? `你已选择：${voteSummary.currentUserOption}`
                : meeting.status === 'open'
                ? '点一下即可完成表态，每人只能选择一次。'
                : '该议题已关闭，不能继续表态。'}
            </WjSoftNote>
          </WjPaperCard>
        )}

        <WjPaperCard className="p-5">
          <WjSectionHeading title="议事意见" />
          <p className="mt-1 text-[12px] text-[#78675B]">围绕议题提交看法、建议或补充说明，家庭成员可见。</p>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[12px]">
            <WjInlineStat label="总数" value={summary?.total ?? 0} />
            <WjInlineStat label="同意/反对" value={`${summary?.agree ?? 0} / ${summary?.disagree ?? 0}`} />
            <WjInlineStat label="建议/提问" value={`${summary?.suggestion ?? 0} / ${summary?.question ?? 0}`} />
          </div>

          {canPost ? (
            <form onSubmit={onCreateOpinion} className="mt-4 space-y-3 rounded-[16px] border border-[#E7D9C9] bg-[#FBF7EF] p-4">
              <div className="grid grid-cols-2 gap-2">
                <WjFormRow label="立场">
                  <WjSelect value={form.stance} onChange={(e) => setForm({ ...form, stance: e.target.value as MeetingOpinionStance })}>
                    {Object.entries(STANCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </WjSelect>
                </WjFormRow>
                <WjFormRow label="可见">
                  <WjSelect value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as MeetingOpinionVisibility })}>
                    <option value="family">家庭内可见</option>
                    <option value="private">仅自己和管理员可见</option>
                  </WjSelect>
                </WjFormRow>
              </div>
              <WjTextarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} maxLength={500} placeholder="请填写你的议事意见" />
              <div className="flex justify-end">
                <WjButton type="submit" variant="primary" disabled={!form.content.trim()} loading={opinionSubmitting}>
                  <MessageSquarePlus size={16} />
                  发表意见
                </WjButton>
              </div>
            </form>
          ) : (
            <WjSoftNote className="mt-4">
              {meeting.status === 'open' ? '你暂无权限执行此操作' : '该议题已关闭或归档，不能新增意见。'}
            </WjSoftNote>
          )}

          <div className="mt-4 space-y-3">
            {opinions.length === 0 ? (
              <p className="rounded-[15px] border border-dashed border-[#E7D9C9] bg-[#FBF7EF] py-8 text-center text-[12px] text-[#78675B]">
                近期暂无议事意见
              </p>
            ) : (
              opinions.map(({ opinion, authorDisplayName }) => {
                const isAuthor = currentUserId === opinion.author_user_id;
                const isEditing = editingId === opinion.id;
                return (
                  <article key={opinion.id} className="rounded-[16px] border border-[#E7D9C9] bg-[#FBF7EF] p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-[#5A3524]">{authorDisplayName || '家人'}</p>
                      <StatusBadge variant={STANCE_TONE[opinion.stance]}>{STANCE_LABELS[opinion.stance]}</StatusBadge>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <WjSelect value={editStance} onChange={(e) => setEditStance(e.target.value as MeetingOpinionStance)}>
                            {Object.entries(STANCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </WjSelect>
                          <WjSelect value={editVisibility} onChange={(e) => setEditVisibility(e.target.value as MeetingOpinionVisibility)}>
                            <option value="family">家庭内可见</option>
                            <option value="private">仅自己和管理员可见</option>
                          </WjSelect>
                        </div>
                        <WjTextarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} maxLength={500} />
                        <div className="flex gap-2">
                          <WjButton type="button" variant="primary" className="flex-1" onClick={() => onSaveEdit(opinion.id)}>保存</WjButton>
                          <WjButton type="button" variant="secondary" className="flex-1" onClick={() => setEditingId(null)}>取消</WjButton>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-[14px] leading-6 text-[#5A3524]">{opinion.content}</p>
                        <p className="mt-2 flex items-center gap-1 text-[11px] text-[#78675B]">
                          {formatTime(opinion.created_at)} · <Lock size={11} />
                          {opinion.visibility === 'private' ? '仅自己和管理员可见' : '家庭内可见'}
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
                                className="flex min-h-[44px] items-center gap-1 rounded-lg border border-[#E7D9C9] bg-white px-2.5 text-[12px] text-[#5A3524]"
                              >
                                <PenLine size={12} />
                                编辑
                              </button>
                              <button type="button" onClick={() => onArchive(opinion.id)} className="flex min-h-[44px] items-center gap-1 rounded-lg border border-[#E7D9C9] bg-white px-2.5 text-[12px] text-[#5A3524]">
                                <Trash2 size={12} />
                                归档
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <button type="button" onClick={() => onHide(opinion.id)} className="flex min-h-[44px] items-center gap-1 rounded-lg border border-[#E7D9C9] bg-white px-2.5 text-[12px] text-[#C26946]">
                              <Lock size={12} />
                              隐藏
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </WjPaperCard>

        <Link href="/family/meetings" className="inline-flex min-h-[44px] items-center gap-1.5 pb-4 text-[13px] font-medium text-[#78675B] hover:text-[#5A3524]">
          <ArrowLeft size={14} />
          返回议事列表
        </Link>
      </WjScreenContent>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar title="议事详情" backHref="/family/meetings" />
      {children}
    </MobilePage>
  );
}

function CenterText({ text }: { text: string }) {
  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar title="议事详情" backHref="/family/meetings" />
      <PanelText text={text} />
    </MobilePage>
  );
}

function PanelText({ text }: { text: string }) {
  return (
    <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-5 text-center">
      <p className="rounded-[15px] border border-[#E7D9C9] bg-white/82 px-4 py-5 text-sm text-[#78675B] shadow-[0_10px_28px_rgba(90,53,36,0.06)]">{text}</p>
    </main>
  );
}
