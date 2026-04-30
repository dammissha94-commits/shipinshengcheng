import type { ActionLog, FamilyCalendarEvent, PersonProfile } from '@/types/domain';
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
      source_type: input.sourceType ?? 'manual',
      source_person_id: input.sourcePersonId ?? null,
      source_key: input.sourceKey ?? null,
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
      source_type: input.sourceType,
      source_person_id: input.sourcePersonId,
      source_key: input.sourceKey,
    })
    .eq('id', eventId)
    .select('*')
    .single();

  throwServiceError(result.error, 'update family calendar event failed');
  return result.data!;
}

async function getPersonProfile(
  personId: string,
  client: SupabaseServiceClient
): Promise<PersonProfile> {
  const result = await client.from<PersonProfile>('person_profiles').select('*').eq('id', personId);
  throwServiceError(result.error, 'get birthday person profile failed');
  const person = result.data?.[0];
  if (!person) throw new Error('家人档案不存在');
  return person;
}

async function getBirthdayEvent(
  person: PersonProfile,
  client: SupabaseServiceClient
): Promise<FamilyCalendarEvent | null> {
  const result = await client
    .from<FamilyCalendarEvent>('family_calendar_events')
    .select('*')
    .eq('family_id', person.family_id)
    .eq('source_type', 'person_birthday')
    .eq('source_person_id', person.id)
    .eq('source_key', 'birthday');

  throwServiceError(result.error, 'get person birthday event failed');
  return result.data?.[0] ?? null;
}

function nextBirthdayDate(month: number, day: number, birthYear: number | null): string {
  const today = new Date();
  let year = birthYear && birthYear > today.getFullYear() ? birthYear : today.getFullYear();
  const candidate = new Date(year, month - 1, day);
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (candidate.getTime() < todayOnly.getTime()) year += 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export async function syncPersonBirthdayEvent(
  personId: string,
  client?: SupabaseServiceClient
): Promise<FamilyCalendarEvent | null> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const person = await getPersonProfile(personId, resolvedClient);
  if (!(await isFamilyMember(person.family_id))) throw new Error('你暂无权限执行此操作');

  if (!person.birth_month || !person.birth_day) {
    await unsyncPersonBirthdayEvent(personId, resolvedClient);
    return null;
  }

  const existing = await getBirthdayEvent(person, resolvedClient);
  const eventDate = nextBirthdayDate(person.birth_month, person.birth_day, person.birth_year);
  const title = `${person.display_name}生日`;
  const eventValues: Partial<FamilyCalendarEvent> = {
    family_id: person.family_id,
    creator_user_id: user.id,
    related_person_id: person.id,
    event_type: 'birthday',
    title,
    description: '由家人档案生日信息自动同步',
    event_date: eventDate,
    recurrence: 'yearly',
    remind_d7: true,
    remind_d1: true,
    remind_day: true,
    visibility: 'family',
    status: 'active',
    source_type: 'person_birthday',
    source_person_id: person.id,
    source_key: 'birthday',
  };

  const result = existing
    ? await resolvedClient
        .from<FamilyCalendarEvent>('family_calendar_events')
        .update(eventValues)
        .eq('id', existing.id)
        .select('*')
        .single()
    : await resolvedClient
        .from<FamilyCalendarEvent>('family_calendar_events')
        .insert(eventValues)
        .select('*')
        .single();

  throwServiceError(result.error, 'sync person birthday event failed');

  await writeActionLog(resolvedClient, {
    family_id: person.family_id,
    actor_user_id: user.id,
    target_type: 'family_calendar_event',
    target_id: result.data!.id,
    action_type: existing ? 'update_person_birthday_event' : 'create_person_birthday_event',
    metadata: { person_id: person.id },
  });

  return result.data!;
}

export async function unsyncPersonBirthdayEvent(
  personId: string,
  client?: SupabaseServiceClient
): Promise<FamilyCalendarEvent | null> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const person = await getPersonProfile(personId, resolvedClient);
  if (!(await isFamilyMember(person.family_id))) throw new Error('你暂无权限执行此操作');
  const existing = await getBirthdayEvent(person, resolvedClient);
  if (!existing || existing.status === 'archived') return existing;

  const result = await resolvedClient
    .from<FamilyCalendarEvent>('family_calendar_events')
    .update({ status: 'archived' })
    .eq('id', existing.id)
    .select('*')
    .single();

  throwServiceError(result.error, 'unsync person birthday event failed');

  await writeActionLog(resolvedClient, {
    family_id: person.family_id,
    actor_user_id: user.id,
    target_type: 'family_calendar_event',
    target_id: existing.id,
    action_type: 'archive_person_birthday_event',
    metadata: { person_id: person.id },
  });

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
