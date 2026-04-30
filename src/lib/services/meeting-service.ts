import type { ActionLog, FamilyMeeting } from '@/types/domain';
import type { CreateFamilyMeetingInput, UpdateFamilyMeetingInput } from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { canCreateFamilyMeeting } from '@/lib/auth/permission-service';
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
  if (!meeting) throw new Error('家族议事不存在');
  return meeting;
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
  if (!(await canCreateFamilyMeeting(existing.family_id))) throw new Error('你暂无权限执行此操作');

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
  if (!(await canCreateFamilyMeeting(existing.family_id))) throw new Error('你暂无权限执行此操作');

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
