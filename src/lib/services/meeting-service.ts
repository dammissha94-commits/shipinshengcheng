import { getCurrentUser } from '@/lib/auth/auth-service';
import {
  canCreateFamilyMeeting,
  getUserFamilyRole,
  isFamilyAdmin,
  isFamilyMember,
} from '@/lib/auth/permission-service';
import { createSupabaseServiceClient, hasSupabaseConfig } from '@/lib/supabase/client';
import type { ActionLog, FamilyMeeting, FamilyMeetingOpinion, FamilyMeetingVote, Profile } from '@/types/domain';
import type {
  CreateFamilyMeetingInput,
  CreateMeetingOpinionInput,
  FamilyMeetingDetail,
  FamilyMeetingOpinionDetail,
  FamilyMeetingPermission,
  MeetingOpinionSummary,
  MeetingVoteSummary,
  SubmitMeetingVoteInput,
  UpdateFamilyMeetingInput,
  UpdateMeetingOpinionInput,
} from '@/types/service';
import type { SupabaseServiceClient } from './service-client';
import { throwServiceError } from './service-client';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';
const NO_PERMISSION_MESSAGE = '你暂无权限执行此操作';
const LOGIN_REQUIRED_MESSAGE = '请先登录';

function getClient(client?: SupabaseServiceClient): SupabaseServiceClient | null {
  if (client) return client;
  return hasSupabaseConfig() ? createSupabaseServiceClient() : null;
}

function requireClient(client?: SupabaseServiceClient): SupabaseServiceClient {
  const resolved = getClient(client);
  if (!resolved) throw new Error(SUPABASE_FALLBACK_MESSAGE);
  return resolved;
}

async function writeActionLog(
  client: SupabaseServiceClient,
  log: Omit<ActionLog, 'id' | 'created_at'>
): Promise<void> {
  const result = await client.from<ActionLog>('action_logs').insert(log).select('*').single();
  throwServiceError(result.error, 'write action log failed');
}

async function getMeeting(meetingId: string, client: SupabaseServiceClient): Promise<FamilyMeeting> {
  const result = await client.from<FamilyMeeting>('family_meetings').select('*').eq('id', meetingId);
  throwServiceError(result.error, 'get family meeting failed');
  const meeting = result.data?.[0];
  if (!meeting) throw new Error('议事不存在或已不可访问');
  return meeting;
}

async function getOpinion(opinionId: string, client: SupabaseServiceClient): Promise<FamilyMeetingOpinion> {
  const result = await client
    .from<FamilyMeetingOpinion>('family_meeting_opinions')
    .select('*')
    .eq('id', opinionId);
  throwServiceError(result.error, 'get meeting opinion failed');
  const opinion = result.data?.[0];
  if (!opinion) throw new Error('议事意见不存在或已不可访问');
  return opinion;
}

async function fetchProfile(userId: string, client: SupabaseServiceClient): Promise<Profile | null> {
  const result = await client.from<Profile>('profiles').select('*').eq('id', userId);
  if (result.error) return null;
  return result.data?.[0] ?? null;
}

function sanitizeError(error: unknown, fallback: string): never {
  const message = error instanceof Error ? error.message : fallback;
  if (
    message.includes('failed') ||
    message.includes('violates') ||
    message.includes('permission denied') ||
    message.includes('duplicate key')
  ) {
    throw new Error(fallback);
  }
  throw new Error(message);
}

function normalizeOpinionContent(content: string): string {
  const normalized = content.trim();
  if (!normalized) throw new Error('请先填写意见内容');
  if (normalized.length > 500) throw new Error('意见内容不能超过 500 字');
  return normalized;
}

async function canManageMeeting(meeting: FamilyMeeting, userId: string): Promise<boolean> {
  if (meeting.creator_user_id === userId) return true;
  return isFamilyAdmin(meeting.family_id);
}

async function canManageOpinion(opinion: FamilyMeetingOpinion, userId: string): Promise<boolean> {
  if (opinion.author_user_id === userId) return true;
  return isFamilyAdmin(opinion.family_id);
}

export async function listFamilyMeetings(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMeeting[]> {
  const resolved = getClient(client);
  if (!resolved) return [];

  const result = await resolved
    .from<FamilyMeeting>('family_meetings')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  throwServiceError(result.error, 'list family meetings failed');
  return result.data ?? [];
}

export async function createFamilyMeeting(
  input: CreateFamilyMeetingInput,
  client?: SupabaseServiceClient
): Promise<FamilyMeeting> {
  const resolved = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error(LOGIN_REQUIRED_MESSAGE);
  if (!(await canCreateFamilyMeeting(input.familyId))) throw new Error(NO_PERMISSION_MESSAGE);

  const result = await resolved
    .from<FamilyMeeting>('family_meetings')
    .insert({
      family_id: input.familyId,
      creator_user_id: user.id,
      meeting_type: input.meetingType,
      title: input.title,
      content: input.content ?? null,
      event_date: input.eventDate ?? null,
      status: 'open',
      visibility: input.visibility ?? 'family',
    })
    .select('*')
    .single();

  throwServiceError(result.error, 'create family meeting failed');
  const meeting = result.data!;

  await writeActionLog(resolved, {
    family_id: input.familyId,
    actor_user_id: user.id,
    target_type: 'family_meeting',
    target_id: meeting.id,
    action_type: 'create_family_meeting',
    metadata: { meeting_type: input.meetingType },
  });

  return meeting;
}

export async function updateFamilyMeeting(
  meetingId: string,
  input: UpdateFamilyMeetingInput,
  client?: SupabaseServiceClient
): Promise<FamilyMeeting> {
  const resolved = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error(LOGIN_REQUIRED_MESSAGE);

  const existing = await getMeeting(meetingId, resolved);
  if (existing.status === 'archived') throw new Error('已归档议题不可编辑');
  if (!(await canManageMeeting(existing, user.id))) throw new Error(NO_PERMISSION_MESSAGE);

  const result = await resolved
    .from<FamilyMeeting>('family_meetings')
    .update({
      meeting_type: input.meetingType,
      title: input.title,
      content: input.content,
      event_date: input.eventDate,
      status: input.status,
      visibility: input.visibility,
    })
    .eq('id', meetingId)
    .select('*')
    .single();

  throwServiceError(result.error, 'update family meeting failed');
  const meeting = result.data!;

  await writeActionLog(resolved, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'family_meeting',
    target_id: meetingId,
    action_type: 'update_family_meeting',
    metadata: { meeting_type: meeting.meeting_type },
  });

  return meeting;
}

export async function closeFamilyMeeting(
  meetingId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMeeting> {
  const resolved = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error(LOGIN_REQUIRED_MESSAGE);

  const existing = await getMeeting(meetingId, resolved);
  if (!(await canManageMeeting(existing, user.id))) throw new Error(NO_PERMISSION_MESSAGE);

  const result = await resolved
    .from<FamilyMeeting>('family_meetings')
    .update({ status: 'closed' })
    .eq('id', meetingId)
    .select('*')
    .single();

  throwServiceError(result.error, 'close family meeting failed');
  const meeting = result.data!;

  await writeActionLog(resolved, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'family_meeting',
    target_id: meetingId,
    action_type: 'close_family_meeting',
    metadata: {},
  });

  return meeting;
}

export async function archiveFamilyMeeting(
  meetingId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMeeting> {
  const resolved = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error(LOGIN_REQUIRED_MESSAGE);

  const existing = await getMeeting(meetingId, resolved);
  if (!(await canManageMeeting(existing, user.id))) throw new Error(NO_PERMISSION_MESSAGE);

  const result = await resolved
    .from<FamilyMeeting>('family_meetings')
    .update({ status: 'archived' })
    .eq('id', meetingId)
    .select('*')
    .single();

  throwServiceError(result.error, 'archive family meeting failed');
  const meeting = result.data!;

  await writeActionLog(resolved, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'family_meeting',
    target_id: meetingId,
    action_type: 'archive_family_meeting',
    metadata: {},
  });

  return meeting;
}

export async function listMeetingVotes(
  meetingId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMeetingVote[]> {
  const resolved = getClient(client);
  if (!resolved) return [];

  const meeting = await getMeeting(meetingId, resolved);
  if (!(await isFamilyMember(meeting.family_id))) throw new Error(NO_PERMISSION_MESSAGE);

  const result = await resolved
    .from<FamilyMeetingVote>('family_meeting_votes')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true });

  throwServiceError(result.error, 'list meeting votes failed');
  return result.data ?? [];
}

export async function getMeetingVoteSummary(
  meetingId: string,
  client?: SupabaseServiceClient
): Promise<MeetingVoteSummary> {
  const resolved = getClient(client);
  if (!resolved) {
    return {
      meetingId,
      totalVotes: 0,
      options: [],
      currentUserHasVoted: false,
      currentUserOption: null,
    };
  }

  const votes = await listMeetingVotes(meetingId, resolved);
  const user = await getCurrentUser();
  const counts = new Map<string, number>();
  let currentUserOption: string | null = null;

  for (const vote of votes) {
    counts.set(vote.option_text, (counts.get(vote.option_text) ?? 0) + 1);
    if (user && vote.voter_user_id === user.id) currentUserOption = vote.option_text;
  }

  const options = Array.from(counts.entries())
    .map(([optionText, count]) => ({ optionText, count }))
    .sort((a, b) => b.count - a.count);

  return {
    meetingId,
    totalVotes: votes.length,
    options,
    currentUserHasVoted: currentUserOption !== null,
    currentUserOption,
  };
}

export async function submitMeetingVote(
  input: SubmitMeetingVoteInput,
  client?: SupabaseServiceClient
): Promise<FamilyMeetingVote> {
  const resolved = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error(LOGIN_REQUIRED_MESSAGE);

  const optionText = input.optionText.trim();
  if (!optionText) throw new Error('请选择投票选项');

  const meeting = await getMeeting(input.meetingId, resolved);
  if (!(await isFamilyMember(meeting.family_id))) throw new Error(NO_PERMISSION_MESSAGE);
  if (meeting.meeting_type !== 'vote') throw new Error('当前议事不是投票议题');
  if (meeting.status !== 'open') throw new Error('该议题已不可投票');

  const existing = await resolved
    .from<FamilyMeetingVote>('family_meeting_votes')
    .select('*')
    .eq('meeting_id', meeting.id)
    .eq('voter_user_id', user.id);
  throwServiceError(existing.error, 'check existing meeting vote failed');
  if ((existing.data ?? []).length > 0) {
    throw new Error('你已投票，不能重复提交');
  }

  const result = await resolved
    .from<FamilyMeetingVote>('family_meeting_votes')
    .insert({
      meeting_id: meeting.id,
      family_id: meeting.family_id,
      voter_user_id: user.id,
      option_text: optionText,
    })
    .select('*')
    .single();

  throwServiceError(result.error, 'submit meeting vote failed');
  const vote = result.data!;

  await writeActionLog(resolved, {
    family_id: meeting.family_id,
    actor_user_id: user.id,
    target_type: 'family_meeting_vote',
    target_id: vote.id,
    action_type: 'submit_meeting_vote',
    metadata: { meeting_id: meeting.id, option_text: optionText },
  });

  return vote;
}

export async function listMeetingOpinions(
  meetingId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMeetingOpinionDetail[]> {
  const resolved = requireClient(client);
  const meeting = await getMeeting(meetingId, resolved);
  if (!(await isFamilyMember(meeting.family_id))) throw new Error(NO_PERMISSION_MESSAGE);

  const result = await resolved
    .from<FamilyMeetingOpinion>('family_meeting_opinions')
    .select('*')
    .eq('meeting_id', meetingId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  throwServiceError(result.error, 'list meeting opinions failed');
  const opinions = result.data ?? [];

  return Promise.all(
    opinions.map(async (opinion) => {
      const author =
        opinion.author_user_id !== null ? await fetchProfile(opinion.author_user_id, resolved) : null;
      return {
        opinion,
        authorDisplayName: author?.display_name ?? null,
      };
    })
  );
}

export async function createMeetingOpinion(
  input: CreateMeetingOpinionInput,
  client?: SupabaseServiceClient
): Promise<FamilyMeetingOpinion> {
  const resolved = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error(LOGIN_REQUIRED_MESSAGE);

  const meeting = await getMeeting(input.meetingId, resolved);
  if (!(await isFamilyMember(meeting.family_id))) throw new Error(NO_PERMISSION_MESSAGE);

  const role = await getUserFamilyRole(meeting.family_id);
  if (role === 'viewer') throw new Error(NO_PERMISSION_MESSAGE);
  if (meeting.status === 'archived' || meeting.status === 'closed') {
    throw new Error('当前议题已关闭，暂不支持新增意见');
  }

  const result = await resolved
    .from<FamilyMeetingOpinion>('family_meeting_opinions')
    .insert({
      family_id: meeting.family_id,
      meeting_id: meeting.id,
      author_user_id: user.id,
      stance: input.stance ?? 'neutral',
      content: normalizeOpinionContent(input.content),
      status: 'active',
      visibility: input.visibility ?? 'family',
    })
    .select('*')
    .single();

  throwServiceError(result.error, 'create meeting opinion failed');
  const opinion = result.data!;

  await writeActionLog(resolved, {
    family_id: meeting.family_id,
    actor_user_id: user.id,
    target_type: 'family_meeting_opinion',
    target_id: opinion.id,
    action_type: 'create_meeting_opinion',
    metadata: { meeting_id: meeting.id, stance: opinion.stance },
  });

  return opinion;
}

export async function updateMeetingOpinion(
  opinionId: string,
  input: UpdateMeetingOpinionInput,
  client?: SupabaseServiceClient
): Promise<FamilyMeetingOpinion> {
  const resolved = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error(LOGIN_REQUIRED_MESSAGE);

  const opinion = await getOpinion(opinionId, resolved);
  if (!(await isFamilyMember(opinion.family_id))) throw new Error(NO_PERMISSION_MESSAGE);

  const isAdmin = await isFamilyAdmin(opinion.family_id);
  const isAuthor = opinion.author_user_id === user.id;
  if (!isAdmin && !isAuthor) throw new Error(NO_PERMISSION_MESSAGE);
  if (!isAdmin && opinion.status !== 'active') throw new Error('该意见当前不可编辑');

  const updateValues: Partial<FamilyMeetingOpinion> = {};
  if (input.stance !== undefined) updateValues.stance = input.stance;
  if (input.visibility !== undefined) updateValues.visibility = input.visibility;
  if (input.content !== undefined) updateValues.content = normalizeOpinionContent(input.content);
  if (input.status !== undefined) {
    if (!isAdmin && input.status !== 'archived') {
      throw new Error('你暂无权限修改该字段');
    }
    updateValues.status = input.status;
  }

  const result = await resolved
    .from<FamilyMeetingOpinion>('family_meeting_opinions')
    .update(updateValues)
    .eq('id', opinionId)
    .select('*')
    .single();

  throwServiceError(result.error, 'update meeting opinion failed');
  const updated = result.data!;

  await writeActionLog(resolved, {
    family_id: opinion.family_id,
    actor_user_id: user.id,
    target_type: 'family_meeting_opinion',
    target_id: opinion.id,
    action_type: 'update_meeting_opinion',
    metadata: { meeting_id: opinion.meeting_id, status: updated.status },
  });

  return updated;
}

export async function hideMeetingOpinion(
  opinionId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMeetingOpinion> {
  const resolved = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error(LOGIN_REQUIRED_MESSAGE);

  const opinion = await getOpinion(opinionId, resolved);
  if (!(await isFamilyAdmin(opinion.family_id))) throw new Error(NO_PERMISSION_MESSAGE);

  const result = await resolved
    .from<FamilyMeetingOpinion>('family_meeting_opinions')
    .update({ status: 'hidden' })
    .eq('id', opinionId)
    .select('*')
    .single();

  throwServiceError(result.error, 'hide meeting opinion failed');
  const updated = result.data!;

  await writeActionLog(resolved, {
    family_id: opinion.family_id,
    actor_user_id: user.id,
    target_type: 'family_meeting_opinion',
    target_id: opinion.id,
    action_type: 'hide_meeting_opinion',
    metadata: { meeting_id: opinion.meeting_id },
  });

  return updated;
}

export async function archiveMeetingOpinion(
  opinionId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMeetingOpinion> {
  const resolved = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error(LOGIN_REQUIRED_MESSAGE);

  const opinion = await getOpinion(opinionId, resolved);
  if (!(await canManageOpinion(opinion, user.id))) throw new Error(NO_PERMISSION_MESSAGE);

  const result = await resolved
    .from<FamilyMeetingOpinion>('family_meeting_opinions')
    .update({ status: 'archived' })
    .eq('id', opinionId)
    .select('*')
    .single();

  throwServiceError(result.error, 'archive meeting opinion failed');
  const updated = result.data!;

  await writeActionLog(resolved, {
    family_id: opinion.family_id,
    actor_user_id: user.id,
    target_type: 'family_meeting_opinion',
    target_id: opinion.id,
    action_type: 'archive_meeting_opinion',
    metadata: { meeting_id: opinion.meeting_id },
  });

  return updated;
}

export async function getMeetingOpinionSummary(
  meetingId: string,
  client?: SupabaseServiceClient
): Promise<MeetingOpinionSummary> {
  const resolved = getClient(client);
  if (!resolved) {
    return {
      meetingId,
      total: 0,
      agree: 0,
      disagree: 0,
      neutral: 0,
      suggestion: 0,
      question: 0,
    };
  }

  const opinions = await listMeetingOpinions(meetingId, resolved);
  const summary: MeetingOpinionSummary = {
    meetingId,
    total: opinions.length,
    agree: 0,
    disagree: 0,
    neutral: 0,
    suggestion: 0,
    question: 0,
  };

  for (const item of opinions) {
    if (item.opinion.stance === 'agree') summary.agree += 1;
    if (item.opinion.stance === 'disagree') summary.disagree += 1;
    if (item.opinion.stance === 'neutral') summary.neutral += 1;
    if (item.opinion.stance === 'suggestion') summary.suggestion += 1;
    if (item.opinion.stance === 'question') summary.question += 1;
  }

  return summary;
}

export async function getFamilyMeeting(
  meetingId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMeetingDetail | null> {
  const resolved = getClient(client);
  if (!resolved) return null;

  try {
    const result = await resolved.from<FamilyMeeting>('family_meetings').select('*').eq('id', meetingId);
    throwServiceError(result.error, 'get family meeting failed');
    const meeting = result.data?.[0];
    if (!meeting) return null;

    if (!(await isFamilyMember(meeting.family_id))) throw new Error(NO_PERMISSION_MESSAGE);

    let creatorDisplayName: string | null = null;
    if (meeting.creator_user_id) {
      const creator = await fetchProfile(meeting.creator_user_id, resolved);
      creatorDisplayName = creator?.display_name ?? null;
    }

    let voteSummary: MeetingVoteSummary | null = null;
    if (meeting.meeting_type === 'vote') {
      voteSummary = await getMeetingVoteSummary(meeting.id, resolved);
    }

    return { meeting, creatorDisplayName, voteSummary };
  } catch (error) {
    sanitizeError(error, '加载议事详情失败');
  }
}

export async function getMeetingPermission(meeting: FamilyMeeting): Promise<FamilyMeetingPermission> {
  const fallback: FamilyMeetingPermission = {
    canEdit: false,
    canClose: false,
    canArchive: false,
    canVote: false,
  };

  const user = await getCurrentUser();
  if (!user) return fallback;
  if (!(await isFamilyMember(meeting.family_id))) return fallback;

  const isManager = await canManageMeeting(meeting, user.id);
  const writable = isManager && meeting.status !== 'archived';
  const canVote = meeting.meeting_type === 'vote' && meeting.status === 'open';

  return {
    canEdit: writable,
    canClose: isManager && meeting.status === 'open',
    canArchive: isManager && meeting.status !== 'archived',
    canVote,
  };
}
