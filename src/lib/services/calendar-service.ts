import type { ActionLog, FamilyCalendarEvent } from '@/types/domain';
import type {
  CreateFamilyCalendarEventInput,
  UpdateFamilyCalendarEventInput,
} from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { canManageFamilyMemory, isFamilyMember } from '@/lib/auth/permission-service';
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

async function getCalendarEvent(
  eventId: string,
  client: SupabaseServiceClient
): Promise<FamilyCalendarEvent> {
  const result = await client
    .from<FamilyCalendarEvent>('family_calendar_events')
    .select('*')
    .eq('id', eventId);
  throwServiceError(result.error, 'get family calendar event failed');
  const event = result.data?.[0];
  if (!event) throw new Error('家族日历记录不存在');
  return event;
}

export async function listFamilyCalendarEvents(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyCalendarEvent[]> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return [];

  if (!(await isFamilyMember(familyId))) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyCalendarEvent>('family_calendar_events')
    .select('*')
    .eq('family_id', familyId)
    .eq('status', 'active')
    .order('event_date', { ascending: true });

  throwServiceError(result.error, 'list family calendar events failed');
  return result.data ?? [];
}

export async function createFamilyCalendarEvent(
  input: CreateFamilyCalendarEventInput,
  client?: SupabaseServiceClient
): Promise<FamilyCalendarEvent> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');
  if (!(await isFamilyMember(input.familyId))) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyCalendarEvent>('family_calendar_events')
    .insert({
      family_id: input.familyId,
      creator_user_id: user.id,
      related_person_id: input.relatedPersonId ?? null,
      event_type: input.eventType,
      title: input.title,
      description: input.description ?? null,
      event_date: input.eventDate,
      recurrence: input.recurrence ?? 'yearly',
      remind_d7: input.remindD7 ?? true,
      remind_d1: input.remindD1 ?? true,
      remind_day: input.remindDay ?? true,
      visibility: input.visibility ?? 'family',
      status: 'active',
    })
    .select('*')
    .single();

  throwServiceError(result.error, 'create family calendar event failed');

  await writeActionLog(resolvedClient, {
    family_id: input.familyId,
    actor_user_id: user.id,
    target_type: 'family_calendar_event',
    target_id: result.data!.id,
    action_type: 'create_family_calendar_event',
    metadata: { event_type: input.eventType },
  });

  return result.data!;
}

export async function updateFamilyCalendarEvent(
  eventId: string,
  input: UpdateFamilyCalendarEventInput,
  client?: SupabaseServiceClient
): Promise<FamilyCalendarEvent> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const existing = await getCalendarEvent(eventId, resolvedClient);
  const canManage = await canManageFamilyMemory(existing.family_id);
  if (existing.creator_user_id !== user.id && !canManage) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyCalendarEvent>('family_calendar_events')
    .update({
      related_person_id: input.relatedPersonId,
      event_type: input.eventType,
      title: input.title,
      description: input.description,
      event_date: input.eventDate,
      recurrence: input.recurrence,
      remind_d7: input.remindD7,
      remind_d1: input.remindD1,
      remind_day: input.remindDay,
      visibility: input.visibility,
      status: input.status,
    })
    .eq('id', eventId)
    .select('*')
    .single();

  throwServiceError(result.error, 'update family calendar event failed');
  return result.data!;
}

export async function archiveFamilyCalendarEvent(
  eventId: string,
  client?: SupabaseServiceClient
): Promise<FamilyCalendarEvent> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const existing = await getCalendarEvent(eventId, resolvedClient);
  const canManage = await canManageFamilyMemory(existing.family_id);
  if (existing.creator_user_id !== user.id && !canManage) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyCalendarEvent>('family_calendar_events')
    .update({ status: 'archived' })
    .eq('id', eventId)
    .select('*')
    .single();

  throwServiceError(result.error, 'archive family calendar event failed');

  await writeActionLog(resolvedClient, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'family_calendar_event',
    target_id: eventId,
    action_type: 'archive_family_calendar_event',
    metadata: { event_type: existing.event_type },
  });

  return result.data!;
}
