import type { ActionLog, FamilyMembership, PersonProfile, PersonRelation } from '@/types/domain';
import type {
  FamilyMemberStats,
  ListFamilyMembersFilter,
  PersonRelationSummary,
  UpdatePersonBirthdateInput,
  UpdatePersonProfileInput,
} from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { canManageFamily } from '@/lib/auth/permission-service';
import { createSupabaseServiceClient, hasSupabaseConfig } from '@/lib/supabase/client';
import type { SupabaseServiceClient } from './service-client';
import { throwServiceError } from './service-client';

function getClient(client?: SupabaseServiceClient): SupabaseServiceClient | null {
  if (client) return client;
  return hasSupabaseConfig() ? createSupabaseServiceClient() : null;
}

async function writeActionLog(
  client: SupabaseServiceClient,
  log: Omit<ActionLog, 'id' | 'created_at'>
): Promise<void> {
  const result = await client.from<ActionLog>('action_logs').insert(log).select('*').single();
  throwServiceError(result.error, 'write action log failed');
}

export async function listFamilyMembers(
  familyId: string,
  filter: ListFamilyMembersFilter = {},
  client?: SupabaseServiceClient
): Promise<PersonProfile[]> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return [];

  let query = resolvedClient.from<PersonProfile>('person_profiles').select('*').eq('family_id', familyId);
  if (filter.claimStatus) query = query.eq('claim_status', filter.claimStatus);
  if (filter.livingStatus) query = query.eq('living_status', filter.livingStatus);

  const result = await query.order('created_at', { ascending: true });
  throwServiceError(result.error, 'list family members failed');
  return result.data ?? [];
}

export async function listFamilyMemberships(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMembership[]> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return [];

  const result = await resolvedClient
    .from<FamilyMembership>('family_memberships')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true });

  throwServiceError(result.error, 'list family memberships failed');
  return result.data ?? [];
}

export async function getPersonProfile(
  personId: string,
  client?: SupabaseServiceClient
): Promise<PersonProfile | null> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return null;

  const result = await resolvedClient.from<PersonProfile>('person_profiles').select('*').eq('id', personId);
  throwServiceError(result.error, 'get person profile failed');
  return result.data?.[0] ?? null;
}

export async function updatePersonProfile(
  personId: string,
  input: UpdatePersonProfileInput,
  client?: SupabaseServiceClient
): Promise<PersonProfile> {
  const resolvedClient = getClient(client);
  const user = await getCurrentUser();
  if (!resolvedClient) {
    throw new Error('尚未配置 Supabase 环境变量，请先配置 .env.local');
  }
  if (!user) throw new Error('请先登录');

  const existing = await getPersonProfile(personId, resolvedClient);
  if (!existing) throw new Error('家人档案不存在');

  const canManage = await canManageFamily(existing.family_id);
  const isBoundUser = existing.bound_user_id === user.id;
  if (!canManage && !isBoundUser) throw new Error('你暂无权限执行此操作');

  const updateValues: Partial<PersonProfile> = canManage
    ? {
        surname: input.surname,
        given_name: input.givenName,
        display_name: input.displayName,
        gender: input.gender,
        birth_year: input.birthYear,
        death_year: input.deathYear,
        living_status: input.livingStatus,
        visibility: input.visibility,
        bio: input.bio,
        portrait_url: input.portraitUrl,
      }
    : {
        bio: input.bio,
        portrait_url: input.portraitUrl,
      };

  const result = await resolvedClient
    .from<PersonProfile>('person_profiles')
    .update(updateValues)
    .eq('id', personId)
    .select('*')
    .single();

  throwServiceError(result.error, 'update person profile failed');
  await writeActionLog(resolvedClient, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'person_profile',
    target_id: personId,
    action_type: 'update_person_profile',
    metadata: {},
  });

  return result.data!;
}

function normalizeBirthdate(input: UpdatePersonBirthdateInput): Partial<PersonProfile> {
  const birthYear = input.birthYear ?? null;
  const birthMonth = input.birthMonth ?? null;
  const birthDay = input.birthDay ?? null;

  if (birthMonth !== null && (birthMonth < 1 || birthMonth > 12)) {
    throw new Error('出生月份需填写 1-12');
  }

  if (birthDay !== null && (birthDay < 1 || birthDay > 31)) {
    throw new Error('出生日期需填写 1-31');
  }

  const birthDatePrecision =
    input.birthDatePrecision ??
    (birthYear && birthMonth && birthDay
      ? 'full_date'
      : birthMonth && birthDay
      ? 'month_day'
      : birthYear
      ? 'year_only'
      : 'unknown');

  return {
    birth_year: birthYear,
    birth_month: birthMonth,
    birth_day: birthDay,
    birth_date_precision: birthDatePrecision,
  };
}

export async function updatePersonBirthdate(
  personId: string,
  input: UpdatePersonBirthdateInput,
  client?: SupabaseServiceClient
): Promise<PersonProfile> {
  const resolvedClient = getClient(client);
  const user = await getCurrentUser();
  if (!resolvedClient) {
    throw new Error('尚未配置 Supabase 环境变量，请先配置 .env.local');
  }
  if (!user) throw new Error('请先登录');

  const existing = await getPersonProfile(personId, resolvedClient);
  if (!existing) throw new Error('家人档案不存在');

  const canManage = await canManageFamily(existing.family_id);
  const isBoundUser = existing.bound_user_id === user.id;
  if (!canManage && !isBoundUser) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<PersonProfile>('person_profiles')
    .update(normalizeBirthdate(input))
    .eq('id', personId)
    .select('*')
    .single();

  throwServiceError(result.error, 'update person birthdate failed');
  await writeActionLog(resolvedClient, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'person_profile',
    target_id: personId,
    action_type: 'update_person_birthdate',
    metadata: {},
  });

  return result.data!;
}

export function getPersonBirthdayLabel(person: PersonProfile): string {
  if (person.birth_date_precision === 'unknown') return '未填写';
  if (person.birth_date_precision === 'year_only') {
    return person.birth_year ? `${person.birth_year}年` : '未填写';
  }
  if (person.birth_date_precision === 'month_day') {
    return person.birth_month && person.birth_day
      ? `${person.birth_month}月${person.birth_day}日`
      : '未填写';
  }
  if (person.birth_date_precision === 'full_date') {
    return person.birth_year && person.birth_month && person.birth_day
      ? `${person.birth_year}年${person.birth_month}月${person.birth_day}日`
      : '未填写';
  }
  return '未填写';
}

export async function getPersonRelationsForPerson(
  personId: string,
  client?: SupabaseServiceClient
): Promise<PersonRelation[]> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return [];

  const profile = await getPersonProfile(personId, resolvedClient);
  if (!profile) return [];

  const result = await resolvedClient
    .from<PersonRelation>('person_relations')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('created_at', { ascending: true });

  throwServiceError(result.error, 'get person relations failed');
  return (result.data ?? []).filter(
    (relation) => relation.from_person_id === personId || relation.to_person_id === personId
  );
}

export async function getPersonRelationSummaries(
  personId: string,
  client?: SupabaseServiceClient
): Promise<PersonRelationSummary[]> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return [];

  const relations = await getPersonRelationsForPerson(personId, resolvedClient);
  const profile = await getPersonProfile(personId, resolvedClient);
  if (!profile) return [];
  const people = await listFamilyMembers(profile.family_id, {}, resolvedClient);

  return relations.map((relation) => {
    const otherId = relation.from_person_id === personId ? relation.to_person_id : relation.from_person_id;
    const otherPerson = people.find((person) => person.id === otherId) ?? null;
    return {
      relation,
      otherPerson,
      label: relationLabel(relation, personId),
    };
  });
}

export async function getFamilyMemberStats(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMemberStats> {
  const people = await listFamilyMembers(familyId, {}, client);
  return {
    totalPersons: people.length,
    claimedPersons: people.filter((person) => person.claim_status === 'claimed').length,
    unclaimedPersons: people.filter((person) => person.claim_status === 'unclaimed').length,
    alivePersons: people.filter((person) => person.living_status === 'alive').length,
    deceasedPersons: people.filter((person) => person.living_status === 'deceased').length,
  };
}

export function relationLabel(relation: PersonRelation, currentPersonId: string): string {
  if (relation.relation_type === 'parent_of') {
    return relation.from_person_id === currentPersonId ? '子女' : '父母';
  }
  if (relation.relation_type === 'spouse_of') return '配偶';
  if (relation.relation_type === 'sibling_of') return '兄弟姐妹';
  if (relation.relation_type === 'grandparent_of') {
    return relation.from_person_id === currentPersonId ? '孙辈' : '祖辈';
  }
  return '家族关系';
}

export const listFamilyPersons = listFamilyMembers;
export const listPersonRelations = getPersonRelationsForPerson;
export const listPersonProfiles = listFamilyMembers;
