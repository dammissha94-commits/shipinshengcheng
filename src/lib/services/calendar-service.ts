import type { ActionLog, FamilyCalendarEvent, PersonProfile } from '@/types/domain';
import type {
  CalendarEventDetail,
  CalendarEventPermission,
  CreateFamilyCalendarEventInput,
  FamilyReminderItem,
  UpcomingFamilyEventsResult,
  UpdateFamilyCalendarEventInput,
} from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { canManageFamilyMemory, isFamilyMember } from '@/lib/auth/permission-service';
import { createSupabaseServiceClient, hasSupabaseConfig } from '@/lib/supabase/client';
import type { SupabaseServiceClient } from './service-client';
import { throwServiceError } from './service-client';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';

const DAY_MS = 24 * 60 * 60 * 1000;

function getClient(client?: SupabaseServiceClient): SupabaseServiceClient | null {
  if (client) return client;
  return hasSupabaseConfig() ? createSupabaseServiceClient() : null;
}

function requireClient(client?: SupabaseServiceClient): SupabaseServiceClient {
  const resolvedClient = getClient(client);
  if (!resolvedClient) throw new Error(SUPABASE_FALLBACK_MESSAGE);
  return resolvedClient;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function daysUntilEvent(eventDate: string): number {
  const target = new Date(`${eventDate}T00:00:00`);
  return Math.ceil((target.getTime() - todayDate().getTime()) / DAY_MS);
}

function isWithinDays(event: FamilyCalendarEvent, daysAhead: number): boolean {
  const days = daysUntilEvent(event.event_date);
  return days >= 0 && days <= daysAhead;
}

function sortEvents(events: FamilyCalendarEvent[]): FamilyCalendarEvent[] {
  return [...events].sort((a, b) => a.event_date.localeCompare(b.event_date));
}

function toReminderItem(event: FamilyCalendarEvent): FamilyReminderItem {
  return {
    event,
    typeLabel: getEventTypeLabel(event.event_type),
    badge: getReminderBadge(event),
    daysUntil: daysUntilEvent(event.event_date),
    isAutoBirthday: event.source_type === 'person_birthday',
  };
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

async function fetchPersonProfile(
  personId: string,
  client: SupabaseServiceClient
): Promise<PersonProfile | null> {
  const result = await client
    .from<PersonProfile>('person_profiles')
    .select('*')
    .eq('id', personId);
  if (result.error) return null;
  return result.data?.[0] ?? null;
}

export async function getFamilyCalendarEvent(
  eventId: string,
  client?: SupabaseServiceClient
): Promise<CalendarEventDetail | null> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return null;

  const result = await resolvedClient
    .from<FamilyCalendarEvent>('family_calendar_events')
    .select('*')
    .eq('id', eventId);
  throwServiceError(result.error, 'get family calendar event failed');
  const event = result.data?.[0];
  if (!event) return null;

  if (!(await isFamilyMember(event.family_id))) {
    throw new Error('你暂无权限执行此操作');
  }

  const relatedPerson = event.related_person_id
    ? await fetchPersonProfile(event.related_person_id, resolvedClient)
    : null;

  let sourcePerson: PersonProfile | null = null;
  if (event.source_person_id) {
    sourcePerson =
      relatedPerson && relatedPerson.id === event.source_person_id
        ? relatedPerson
        : await fetchPersonProfile(event.source_person_id, resolvedClient);
  }

  return { event, relatedPerson, sourcePerson };
}

export async function canEditCalendarEvent(
  event: FamilyCalendarEvent
): Promise<CalendarEventPermission> {
  const isAutoBirthday = event.source_type === 'person_birthday';
  const redirectPersonId = isAutoBirthday ? event.source_person_id : null;

  const user = await getCurrentUser();
  if (!user) {
    return { canEdit: false, canArchive: false, isAutoBirthday, redirectPersonId };
  }

  if (!(await isFamilyMember(event.family_id))) {
    return { canEdit: false, canArchive: false, isAutoBirthday, redirectPersonId };
  }

  const isCreator = event.creator_user_id === user.id;
  const canManage = await canManageFamilyMemory(event.family_id);
  const allowed = isCreator || canManage;

  return {
    canEdit: allowed,
    canArchive: allowed,
    isAutoBirthday,
    redirectPersonId,
  };
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

export async function listUpcomingFamilyEvents(
  familyId: string,
  daysAhead = 30,
  client?: SupabaseServiceClient
): Promise<UpcomingFamilyEventsResult> {
  const events = await listFamilyCalendarEvents(familyId, client);
  return {
    familyId,
    daysAhead,
    events: sortEvents(events)
      .filter((event) => isWithinDays(event, daysAhead))
      .map(toReminderItem),
  };
}

export async function listTodayFamilyReminders(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyReminderItem[]> {
  const events = await listFamilyCalendarEvents(familyId, client);
  const today = todayDate();
  const todayKey = dateKey(today);
  const tomorrowKey = dateKey(addDays(today, 1));
  const sevenDaysKey = dateKey(addDays(today, 7));

  return sortEvents(events)
    .filter((event) => {
      if (event.event_date === todayKey && event.remind_day) return true;
      if (event.event_date === tomorrowKey && event.remind_d1) return true;
      if (event.event_date === sevenDaysKey && event.remind_d7) return true;
      return false;
    })
    .map(toReminderItem);
}

export async function listThisWeekFamilyEvents(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyReminderItem[]> {
  const result = await listUpcomingFamilyEvents(familyId, 7, client);
  return result.events;
}

export async function listThisMonthFamilyEvents(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyReminderItem[]> {
  const result = await listUpcomingFamilyEvents(familyId, 30, client);
  return result.events;
}

export function getReminderBadge(event: FamilyCalendarEvent): string {
  const days = daysUntilEvent(event.event_date);
  if (days === 0) return '今天';
  if (days === 1) return '明天';
  if (days === 7) return '7天后';
  if (days > 1 && days <= 7) return '本周';
  if (days > 7 && days <= 30) return '本月';
  return days > 30 ? '即将到来' : '已过期';
}

export function getEventTypeLabel(eventType: string): string {
  if (eventType === 'birthday') return '生日';
  if (eventType === 'anniversary') return '纪念日';
  if (eventType === 'family_gathering') return '家庭聚会';
  if (eventType === 'family_task') return '家庭事项';
  if (eventType === 'memorial_day') return '纪念日';
  if (eventType === 'notice') return '通知';
  if (eventType === 'event') return '活动';
  if (eventType === 'vote') return '议题';
  return '家庭节点';
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
  if (!(await isFamilyMember(existing.family_id))) throw new Error('你暂无权限执行此操作');

  const canManage = await canManageFamilyMemory(existing.family_id);
  if (existing.creator_user_id !== user.id && !canManage) throw new Error('你暂无权限执行此操作');

  if (existing.source_type === 'person_birthday') {
    if (input.eventDate !== undefined && input.eventDate !== existing.event_date) {
      throw new Error('自动生日提醒的日期请前往家人档案修改');
    }
    if (input.recurrence !== undefined && input.recurrence !== existing.recurrence) {
      throw new Error('自动生日提醒的重复规则由家人档案生日同步管理');
    }
    if (input.sourceType !== undefined && input.sourceType !== existing.source_type) {
      throw new Error('不允许修改自动生日提醒的来源类型');
    }
    if (input.sourcePersonId !== undefined && input.sourcePersonId !== existing.source_person_id) {
      throw new Error('不允许修改自动生日提醒关联的家人');
    }
  }

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

  await writeActionLog(resolvedClient, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'family_calendar_event',
    target_id: eventId,
    action_type: 'update_family_calendar_event',
    metadata: { event_type: result.data!.event_type },
  });

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
