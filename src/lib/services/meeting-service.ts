import type {
  ActionLog,
  FamilyMeeting,
  FamilyMeetingVote,
  Profile,
} from '@/types/domain';
import type {
  CreateFamilyMeetingInput,
  FamilyMeetingDetail,
  FamilyMeetingPermission,
  MeetingVoteSummary,
  SubmitMeetingVoteInput,
  UpdateFamilyMeetingInput,
} from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import {
  canCreateFamilyMeeting,
  isFamilyAdmin,
  isFamilyMember,
} from '@/lib/auth/permission-service';
import { createSupabaseServiceClient, hasSupabaseConfig } from '@/lib/supabase/client';
import type { SupabaseServiceClient } from './service-client';
import { throwServiceError } from './service-client';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';

function getClient(client?: SupabaseServiceClient): SupabaseServiceClient | null {
  if (client) return client;
  return hasSupabaseConfig() ? createSupabaseServiceClient() : null;
}

function requireClient(client?: SupabaseServiceClient): SupabaseServiceClient {
  const resolvedClient = getClient(client);
  if (!resolvedClient) throw new Error(SUPABASE_FALLBACK_MESSAGE);
  return resolvedClient;
}

async function writeActionLog(
  client: SupabaseServiceClient,
  log: Omit<ActionLog, 'id' | 'created_at'>
): Promise<void> {
  const result = await client.from<ActionLog>('action_logs').insert(log).select('*').single();
  throwServiceError(result.error, 'write action log failed');
}

async function getMeeting(
  meetingId: string,
  client: SupabaseServiceClient
): Promise<FamilyMeeting> {
  const result = await client.from<FamilyMeeting>('family_meetings').select('*').eq('id', meetingId);
  throwServiceError(result.error, 'get family meeting failed');
  const meeting = result.data?.[0];
  if (!meeting) throw new Error('议事不存在或已不可访问');
  return meeting;
}

async function fetchProfile(
  userId: string,
  client: SupabaseServiceClient
): Promise<Profile | null> {
  const result = await client.from<Profile>('profiles').select('*').eq('id', userId);
  if (result.error) return null;
  return result.data?.[0] ?? null;
}

async function canManageThisMeeting(
  meeting: FamilyMeeting,
  userId: string
): Promise<boolean> {
  if (meeting.creator_user_id === userId) return true;
  return isFamilyAdmin(meeting.family_id);
}

export async function listFamilyMeetings(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMeeting[]> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return [];

  const result = await resolvedClient
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
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');
  if (!(await canCreateFamilyMeeting(input.familyId))) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
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

  await writeActionLog(resolvedClient, {
    family_id: input.familyId,
    actor_user_id: user.id,
    target_type: 'family_meeting',
    target_id: result.data!.id,
    action_type: 'create_family_meeting',
    metadata: { meeting_type: input.meetingType },
  });

  return result.data!;
}

export async function updateFamilyMeeting(
  meetingId: string,
  input: UpdateFamilyMeetingInput,
  client?: SupabaseServiceClient
): Promise<FamilyMeeting> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const existing = await getMeeting(meetingId, resolvedClient);
  if (existing.status === 'archived') throw new Error('已归档议事不可编辑');
  if (!(await canManageThisMeeting(existing, user.id))) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
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

  await writeActionLog(resolvedClient, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'family_meeting',
    target_id: meetingId,
    action_type: 'update_family_meeting',
    metadata: { meeting_type: result.data!.meeting_type },
  });

  return result.data!;
}

export async function closeFamilyMeeting(
  meetingId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMeeting> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const existing = await getMeeting(meetingId, resolvedClient);
  if (!(await canManageThisMeeting(existing, user.id))) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyMeeting>('family_meetings')
    .update({ status: 'closed' })
    .eq('id', meetingId)
    .select('*')
    .single();

  throwServiceError(result.error, 'close family meeting failed');

  await writeActionLog(resolvedClient, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'family_meeting',
    target_id: meetingId,
    action_type: 'close_family_meeting',
    metadata: {},
  });

  return result.data!;
}

export async function archiveFamilyMeeting(
  meetingId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMeeting> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const existing = await getMeeting(meetingId, resolvedClient);
  if (!(await canManageThisMeeting(existing, user.id))) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyMeeting>('family_meetings')
    .update({ status: 'archived' })
    .eq('id', meetingId)
    .select('*')
    .single();

  throwServiceError(result.error, 'archive family meeting failed');

  await writeActionLog(resolvedClient, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'family_meeting',
    target_id: meetingId,
    action_type: 'archive_family_meeting',
    metadata: {},
  });

  return result.data!;
}

export async function listMeetingVotes(
  meetingId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMeetingVote[]> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return [];

  const meeting = await getMeeting(meetingId, resolvedClient);
  if (!(await isFamilyMember(meeting.family_id))) {
    throw new Error('你暂无权限执行此操作');
  }

  const result = await resolvedClient
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
  const resolvedClient = getClient(client);
  if (!resolvedClient) {
    return {
      meetingId,
      totalVotes: 0,
      options: [],
      currentUserHasVoted: false,
      currentUserOption: null,
    };
  }

  const votes = await listMeetingVotes(meetingId, resolvedClient);
  const user = await getCurrentUser();

  const counts = new Map<string, number>();
  let currentUserOption: string | null = null;
  for (const vote of votes) {
    counts.set(vote.option_text, (counts.get(vote.option_text) ?? 0) + 1);
    if (user && vote.voter_user_id === user.id) {
      currentUserOption = vote.option_text;
    }
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
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const optionText = input.optionText.trim();
  if (!optionText) throw new Error('请选择投票选项');

  const meeting = await getMeeting(input.meetingId, resolvedClient);
  if (!(await isFamilyMember(meeting.family_id))) throw new Error('你暂无权限执行此操作');
  if (meeting.meeting_type !== 'vote') throw new Error('当前议事不是投票议题');
  if (meeting.status !== 'open') throw new Error('该投票议题已不可投票');

  const existingVote = await resolvedClient
    .from<FamilyMeetingVote>('family_meeting_votes')
    .select('*')
    .eq('meeting_id', meeting.id)
    .eq('voter_user_id', user.id);
  throwServiceError(existingVote.error, 'check existing vote failed');
  if ((existingVote.data ?? []).length > 0) {
    throw new Error('你已对该议题投过票，无法重复提交');
  }

  const result = await resolvedClient
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

  await writeActionLog(resolvedClient, {
    family_id: meeting.family_id,
    actor_user_id: user.id,
    target_type: 'family_meeting_vote',
    target_id: result.data!.id,
    action_type: 'submit_meeting_vote',
    metadata: { meeting_id: meeting.id, option_text: optionText },
  });

  return result.data!;
}

export async function getFamilyMeeting(
  meetingId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMeetingDetail | null> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return null;

  const result = await resolvedClient
    .from<FamilyMeeting>('family_meetings')
    .select('*')
    .eq('id', meetingId);
  throwServiceError(result.error, 'get family meeting failed');
  const meeting = result.data?.[0];
  if (!meeting) return null;

  if (!(await isFamilyMember(meeting.family_id))) {
    throw new Error('你暂无权限执行此操作');
  }

  let creatorDisplayName: string | null = null;
  if (meeting.creator_user_id) {
    const creator = await fetchProfile(meeting.creator_user_id, resolvedClient);
    creatorDisplayName = creator?.display_name ?? null;
  }

  let voteSummary: MeetingVoteSummary | null = null;
  if (meeting.meeting_type === 'vote') {
    voteSummary = await getMeetingVoteSummary(meeting.id, resolvedClient);
  }

  return { meeting, creatorDisplayName, voteSummary };
}

export async function getMeetingPermission(
  meeting: FamilyMeeting
): Promise<FamilyMeetingPermission> {
  const noop: FamilyMeetingPermission = {
    canEdit: false,
    canClose: false,
    canArchive: false,
    canVote: false,
  };

  const user = await getCurrentUser();
  if (!user) return noop;

  if (!(await isFamilyMember(meeting.family_id))) return noop;

  const isManager = await canManageThisMeeting(meeting, user.id);
  const writable = isManager && meeting.status !== 'archived';
  const canVote = meeting.meeting_type === 'vote' && meeting.status === 'open';

  return {
    canEdit: writable,
    canClose: isManager && meeting.status === 'open',
    canArchive: isManager && meeting.status !== 'archived',
    canVote,
  };
}
