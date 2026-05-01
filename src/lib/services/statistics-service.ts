import { getCurrentUser } from '@/lib/auth/auth-service';
import { isFamilyMember } from '@/lib/auth/permission-service';
import { createSupabaseServiceClient, hasSupabaseConfig } from '@/lib/supabase/client';
import type {
  FamilyCalendarEvent,
  FamilyMeeting,
  FamilyMeetingOpinion,
  FamilyMeetingVote,
  FamilyOutput,
  FamilyPhoto,
  FamilyStory,
  PersonProfile,
  PersonRelation,
} from '@/types/domain';
import type {
  ContentDistribution,
  FamilyCompletionScore,
  FamilyStatistics,
  RelationDistribution,
} from '@/types/service';
import type { SupabaseServiceClient } from './service-client';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';
const NO_PERMISSION_MESSAGE = '你暂无权限执行此操作';

interface StatisticsSourceData {
  persons: PersonProfile[];
  relations: PersonRelation[];
  stories: FamilyStory[];
  photos: FamilyPhoto[];
  meetings: FamilyMeeting[];
  votes: FamilyMeetingVote[];
  opinions: FamilyMeetingOpinion[];
  events: FamilyCalendarEvent[];
  outputs: FamilyOutput[];
  warnings: string[];
}

function getClient(client?: SupabaseServiceClient): SupabaseServiceClient | null {
  if (client) return client;
  return hasSupabaseConfig() ? createSupabaseServiceClient() : null;
}

function requireClient(client?: SupabaseServiceClient): SupabaseServiceClient {
  const resolved = getClient(client);
  if (!resolved) throw new Error(SUPABASE_FALLBACK_MESSAGE);
  return resolved;
}

async function assertFamilyMember(familyId: string): Promise<void> {
  if (!(await isFamilyMember(familyId))) {
    throw new Error(NO_PERMISSION_MESSAGE);
  }
}

async function loadStatisticsSourceData(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<StatisticsSourceData> {
  const resolved = requireClient(client);
  await assertFamilyMember(familyId);
  const warnings: string[] = [];

  async function safeLoadRows<T>(
    table: string,
    warningLabel: string
  ): Promise<T[]> {
    const result = await resolved.from<T>(table).select('*').eq('family_id', familyId);
    if (result.error) {
      warnings.push(`统计项「${warningLabel}」暂不可用，请先执行对应 migration。`);
      return [];
    }
    return result.data ?? [];
  }

  const [persons, relations, stories, photos, meetings, votes, opinions, events, outputs] =
    await Promise.all([
      safeLoadRows<PersonProfile>('person_profiles', '家人档案'),
      safeLoadRows<PersonRelation>('person_relations', '亲属关系'),
      safeLoadRows<FamilyStory>('family_stories', '家族故事'),
      safeLoadRows<FamilyPhoto>('family_photos', '家族相册'),
      safeLoadRows<FamilyMeeting>('family_meetings', '家族议事'),
      safeLoadRows<FamilyMeetingVote>('family_meeting_votes', '议事投票'),
      safeLoadRows<FamilyMeetingOpinion>('family_meeting_opinions', '议事意见'),
      safeLoadRows<FamilyCalendarEvent>('family_calendar_events', '家族日历'),
      safeLoadRows<FamilyOutput>('family_outputs', '成果物预览'),
    ]);

  const activeMeetings = meetings.filter((meeting) => meeting.status !== 'archived');
  const activeMeetingIds = new Set(activeMeetings.map((meeting) => meeting.id));
  const activeOpinions = opinions.filter((opinion) => opinion.status === 'active');

  return {
    persons,
    relations: relations.filter((relation) => relation.status === 'active'),
    stories: stories.filter((story) => story.status === 'active'),
    photos: photos.filter((photo) => photo.status === 'active'),
    meetings: activeMeetings,
    votes: votes.filter((vote) => activeMeetingIds.has(vote.meeting_id)),
    opinions: activeOpinions,
    events: events.filter((event) => event.status === 'active'),
    outputs: outputs.filter((output) => output.status !== 'archived'),
    warnings,
  };
}

function countRelations(relations: PersonRelation[]): RelationDistribution {
  return relations.reduce<RelationDistribution>(
    (summary, relation) => {
      summary[relation.relation_type] += 1;
      return summary;
    },
    {
      parent_of: 0,
      child_of: 0,
      spouse_of: 0,
      sibling_of: 0,
      grandparent_of: 0,
    }
  );
}

function getNextEventDate(event: FamilyCalendarEvent, now: Date): Date | null {
  const eventDate = new Date(`${event.event_date}T00:00:00`);
  if (Number.isNaN(eventDate.getTime())) return null;
  if (event.recurrence !== 'yearly') return eventDate;

  const next = new Date(now.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

function isUpcomingEvent(event: FamilyCalendarEvent, now: Date): boolean {
  const eventDate = getNextEventDate(event, now);
  if (!eventDate) return false;
  const diff = eventDate.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.ceil(diff / 86_400_000);
  return days >= 0 && days <= 30;
}

function countContent(data: StatisticsSourceData): ContentDistribution {
  return {
    stories: data.stories.length,
    photos: data.photos.length,
    meetings: data.meetings.length,
    calendarEvents: data.events.length,
    outputs: data.outputs.length,
  };
}

function buildCompletionScore(data: StatisticsSourceData, currentUserId: string | null): FamilyCompletionScore {
  const relationCounts = countRelations(data.relations);
  const birthdayEvents = data.events.filter((event) => event.event_type === 'birthday');
  const hasSelf = currentUserId
    ? data.persons.some((person) => person.bound_user_id === currentUserId)
    : data.persons.length > 0;
  const invitedClaimedMembers = currentUserId
    ? data.persons.filter((person) => person.bound_user_id && person.bound_user_id !== currentUserId).length
    : data.persons.filter((person) => person.bound_user_id).length;

  const checks: Array<{ label: string; passed: boolean; suggestion: string }> = [
    { label: '已有本人档案', passed: hasSelf, suggestion: '补充本人档案' },
    {
      label: '已有父母信息',
      passed: relationCounts.parent_of + relationCounts.child_of > 0,
      suggestion: '继续补充父母信息',
    },
    {
      label: '已有配偶或子女关系',
      passed: relationCounts.spouse_of > 0 || relationCounts.parent_of + relationCounts.child_of > 1,
      suggestion: '补充配偶或子女信息',
    },
    { label: '已有 5 位以上家人', passed: data.persons.length >= 5, suggestion: '继续添加家人档案' },
    { label: '已有 3 条以上关系', passed: data.relations.length >= 3, suggestion: '继续补充家族关系' },
    { label: '已有家族故事', passed: data.stories.length > 0, suggestion: '添加家族故事' },
    { label: '已有相册记录', passed: data.photos.length > 0, suggestion: '添加老照片' },
    { label: '已有生日提醒', passed: birthdayEvents.length > 0, suggestion: '创建生日提醒' },
    { label: '已有亲属认领', passed: invitedClaimedMembers > 0, suggestion: '邀请亲属认领' },
    { label: '已有成果物预览', passed: data.outputs.length > 0, suggestion: '生成三代谱预览' },
  ];

  const completedItems = checks.filter((item) => item.passed).map((item) => item.label);
  const missingItems = checks.filter((item) => !item.passed).map((item) => item.label);
  const nextSuggestions = checks.filter((item) => !item.passed).map((item) => item.suggestion).slice(0, 6);

  return {
    score: Math.round((completedItems.length / checks.length) * 100),
    completedItems,
    missingItems,
    nextSuggestions,
  };
}

export async function getFamilyStatistics(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyStatistics> {
  const data = await loadStatisticsSourceData(familyId, client);
  const relationCounts = countRelations(data.relations);
  const now = new Date();

  return {
    totalPersons: data.persons.length,
    claimedPersons: data.persons.filter((person) => person.claim_status === 'claimed').length,
    unclaimedPersons: data.persons.filter((person) => person.claim_status !== 'claimed').length,
    alivePersons: data.persons.filter((person) => person.living_status === 'alive').length,
    deceasedPersons: data.persons.filter((person) => person.living_status === 'deceased').length,
    unknownLivingPersons: data.persons.filter((person) => person.living_status === 'unknown').length,
    totalRelations: data.relations.length,
    parentRelations: relationCounts.parent_of + relationCounts.child_of,
    spouseRelations: relationCounts.spouse_of,
    siblingRelations: relationCounts.sibling_of,
    grandparentRelations: relationCounts.grandparent_of,
    totalStories: data.stories.length,
    totalPhotos: data.photos.length,
    totalMeetings: data.meetings.length,
    openMeetings: data.meetings.filter((meeting) => meeting.status === 'open').length,
    closedMeetings: data.meetings.filter((meeting) => meeting.status === 'closed').length,
    totalMeetingVotes: data.votes.length,
    totalMeetingOpinions: data.opinions.length,
    totalCalendarEvents: data.events.length,
    birthdayEvents: data.events.filter((event) => event.event_type === 'birthday').length,
    upcomingEvents: data.events.filter((event) => isUpcomingEvent(event, now)).length,
    totalOutputs: data.outputs.length,
    warnings: data.warnings,
  };
}

export async function getFamilyCompletionScore(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyCompletionScore> {
  const user = await getCurrentUser();
  const data = await loadStatisticsSourceData(familyId, client);
  return {
    ...buildCompletionScore(data, user?.id ?? null),
    warnings: data.warnings,
  };
}

export async function getRelationDistribution(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<RelationDistribution> {
  const data = await loadStatisticsSourceData(familyId, client);
  return countRelations(data.relations);
}

export async function getContentDistribution(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<ContentDistribution> {
  const data = await loadStatisticsSourceData(familyId, client);
  return countContent(data);
}
