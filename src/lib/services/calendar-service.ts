import type { ActionLog, FamilyCalendarEvent, PersonProfile } from '@/types/domain';
import type {
  CalendarEventDetail,
  CalendarEventOccurrence,
  CalendarEventPermission,
  CalendarEventWithOccurrence,
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

function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateOnly(value: string | null | undefined): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(year, month - 1, day);
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
    return null;
  }
  return { year, month, day };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Feb 29 is mapped to Feb 28 in non-leap years; lunar/leap-month logic is intentionally out of scope.
function adjustMonthDayForYear(year: number, month: number, day: number): { month: number; day: number } {
  if (month === 2 && day === 29 && !isLeapYear(year)) return { month: 2, day: 28 };
  return { month, day };
}

function formatDateOnly(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getNextOccurrenceDate(
  event: FamilyCalendarEvent,
  referenceDate: Date = todayLocal()
): string | null {
  const parsed = parseDateOnly(event.event_date);
  if (!parsed) return null;

  if (event.recurrence !== 'yearly') {
    return formatDateOnly(parsed.year, parsed.month, parsed.day);
  }

  const ref = startOfLocalDay(referenceDate);
  for (let offset = 0; offset <= 1; offset += 1) {
    const year = ref.getFullYear() + offset;
    const adj = adjustMonthDayForYear(year, parsed.month, parsed.day);
    const candidate = new Date(year, adj.month - 1, adj.day);
    if (candidate.getTime() >= ref.getTime()) {
      return formatDateOnly(year, adj.month, adj.day);
    }
  }
  return null;
}

export function getDaysUntilOccurrence(
  event: FamilyCalendarEvent,
  referenceDate: Date = todayLocal()
): number | null {
  const next = getNextOccurrenceDate(event, referenceDate);
  if (!next) return null;
  const parsed = parseDateOnly(next);
  if (!parsed) return null;
  const target = new Date(parsed.year, parsed.month - 1, parsed.day);
  const ref = startOfLocalDay(referenceDate);
  return Math.round((target.getTime() - ref.getTime()) / DAY_MS);
}

function reminderBadgeFromDays(days: number | null): string {
  if (days === null) return '日期无效';
  if (days < 0) return '已过期';
  if (days === 0) return '今天';
  if (days === 1) return '明天';
  if (days === 7) return '7天后';
  if (days >= 2 && days <= 6) return '本周';
  if (days >= 8 && days <= 30) return '本月';
  return '即将到来';
}

export function enrichCalendarEventWithOccurrence(
  event: FamilyCalendarEvent,
  referenceDate: Date = todayLocal()
): CalendarEventWithOccurrence {
  const ref = startOfLocalDay(referenceDate);
  const nextOccurrenceDate = getNextOccurrenceDate(event, ref);
  const daysUntil = getDaysUntilOccurrence(event, ref);
  const original = parseDateOnly(event.event_date);
  const isPastOriginalDate = original
    ? new Date(original.year, original.month - 1, original.day).getTime() < ref.getTime()
    : false;

  return {
    event,
    nextOccurrenceDate,
    daysUntil,
    reminderBadge: reminderBadgeFromDays(daysUntil),
    isRecurringYearly: event.recurrence === 'yearly',
    isPastOriginalDate,
  };
}

export function getCalendarEventOccurrence(
  event: FamilyCalendarEvent,
  referenceDate: Date = todayLocal()
): CalendarEventOccurrence {
  const enriched = enrichCalendarEventWithOccurrence(event, referenceDate);
  return {
    nextOccurrenceDate: enriched.nextOccurrenceDate,
    daysUntil: enriched.daysUntil,
    reminderBadge: enriched.reminderBadge,
    isRecurringYearly: enriched.isRecurringYearly,
    isPastOriginalDate: enriched.isPastOriginalDate,
  };
}

export function sortEventsByNextOccurrence(
  events: FamilyCalendarEvent[],
  referenceDate: Date = todayLocal()
): FamilyCalendarEvent[] {
  const ref = startOfLocalDay(referenceDate);
  return [...events].sort((a, b) => {
    const aNext = getNextOccurrenceDate(a, ref);
    const bNext = getNextOccurrenceDate(b, ref);
    if (!aNext && !bNext) return 0;
    if (!aNext) return 1;
    if (!bNext) return -1;
    return aNext.localeCompare(bNext);
  });
}

function toReminderItem(event: FamilyCalendarEvent, referenceDate: Date = todayLocal()): FamilyReminderItem {
  const enriched = enrichCalendarEventWithOccurrence(event, referenceDate);
  return {
    event,
    typeLabel: getEventTypeLabel(event.event_type),
    badge: enriched.reminderBadge,
    daysUntil: enriched.daysUntil,
    nextOccurrenceDate: enriched.nextOccurrenceDate,
    isRecurringYearly: enriched.isRecurringYearly,
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
  const today = todayLocal();
  const items = sortEventsByNextOccurrence(events, today)
    .map((event) => toReminderItem(event, today))
    .filter((item) => item.daysUntil !== null && item.daysUntil >= 0 && item.daysUntil <= daysAhead);

  return { familyId, daysAhead, events: items };
}

export async function listTodayFamilyReminders(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyReminderItem[]> {
  const events = await listFamilyCalendarEvents(familyId, client);
  const today = todayLocal();

  return sortEventsByNextOccurrence(events, today)
    .map((event) => toReminderItem(event, today))
    .filter((item) => {
      const days = item.daysUntil;
      if (days === null) return false;
      if (days === 0 && item.event.remind_day) return true;
      if (days === 1 && item.event.remind_d1) return true;
      if (days === 7 && item.event.remind_d7) return true;
      return false;
    });
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

export function getReminderBadge(
  event: FamilyCalendarEvent,
  referenceDate: Date = todayLocal()
): string {
  return reminderBadgeFromDays(getDaysUntilOccurrence(event, referenceDate));
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
