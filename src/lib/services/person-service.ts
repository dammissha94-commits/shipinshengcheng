import type { ActionLog, PersonProfile, PersonRelation } from '@/types/domain';
import type { CreatePersonProfileInput, CreatePersonRelationInput } from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { createSupabaseServiceClient, hasSupabaseConfig } from '@/lib/supabase/client';
import type { SupabaseServiceClient } from './service-client';
import { createId, nowIso } from './service-client';
import { ServiceError, handleServiceError } from './ServiceError';

const mockPeople: PersonProfile[] = [];
const mockRelations: PersonRelation[] = [];

function getClient(client?: SupabaseServiceClient): SupabaseServiceClient | null {
  if (client) return client;
  return hasSupabaseConfig() ? createSupabaseServiceClient() : null;
}

async function writeActionLog(
  client: SupabaseServiceClient,
  log: Omit<ActionLog, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await client.from<ActionLog>('action_logs').insert(log).select('*').single();
  if (error) throw handleServiceError(error, 'person-service/writeActionLog');
}

function toPersonProfile(input: CreatePersonProfileInput, userId: string): PersonProfile {
  const timestamp = nowIso();

  return {
    id: createId('person'),
    family_id: input.familyId,
    bound_user_id: null,
    surname: input.surname ?? null,
    given_name: input.givenName ?? null,
    display_name: input.displayName,
    gender: input.gender ?? null,
    birth_year: input.birthYear ?? null,
    birth_month: null,
    birth_day: null,
    birth_date_precision: input.birthYear ? 'year_only' : 'unknown',
    death_year: input.deathYear ?? null,
    living_status: input.livingStatus ?? 'alive',
    claim_status: 'unclaimed',
    visibility: input.visibility ?? 'family',
    bio: input.bio ?? null,
    portrait_url: input.portraitUrl ?? null,
    created_by: userId,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function createPersonProfile(
  input: CreatePersonProfileInput,
  client?: SupabaseServiceClient
): Promise<PersonProfile> {
  const user = await getCurrentUser();
  const userId = user?.id ?? 'mock-user';
  const resolvedClient = getClient(client);

  if (!resolvedClient) {
    const person = toPersonProfile(input, userId);
    mockPeople.push(person);
    return person;
  }

  if (!user) {
    throw new ServiceError('PERMISSION_DENIED', '请先登录', null, 401);
  }

  try {
    const { data, error } = await resolvedClient
      .from<PersonProfile>('person_profiles')
      .insert({
        family_id: input.familyId,
        bound_user_id: null,
        surname: input.surname ?? null,
        given_name: input.givenName ?? null,
        display_name: input.displayName,
        gender: input.gender ?? null,
        birth_year: input.birthYear ?? null,
        death_year: input.deathYear ?? null,
        living_status: input.livingStatus ?? 'alive',
        claim_status: 'unclaimed',
        visibility: input.visibility ?? 'family',
        bio: input.bio ?? null,
        portrait_url: input.portraitUrl ?? null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) throw handleServiceError(error, 'person-service/createPersonProfile');
    if (!data) throw new ServiceError('DATABASE_ERROR', '创建家人档案失败：无返回数据');

    await writeActionLog(resolvedClient, {
      family_id: input.familyId,
      actor_user_id: user.id,
      target_type: 'person_profile',
      target_id: data.id,
      action_type: 'create_person_profile',
      metadata: {},
    });

    return data;
  } catch (error) {
    throw handleServiceError(error, 'person-service/createPersonProfile');
  }
}

export interface PaginationOptions {
  page?: number;        // 页码（从 0 开始）
  pageSize?: number;    // 每页数量（默认 50）
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export async function listFamilyPersons(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<PersonProfile[]> {
  const result = await listFamilyPersonsPaginated(familyId, client);
  return result.data;
}

export async function listFamilyPersonsPaginated(
  familyId: string,
  client?: SupabaseServiceClient,
  pagination?: PaginationOptions
): Promise<PaginatedResult<PersonProfile>> {
  const resolvedClient = getClient(client);
  const page = pagination?.page ?? 0;
  const pageSize = pagination?.pageSize ?? 50;

  if (!resolvedClient) {
    const filtered = mockPeople.filter((person) => person.family_id === familyId);
    const start = page * pageSize;
    const end = start + pageSize;
    return {
      data: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize,
      hasMore: end < filtered.length,
    };
  }

  try {
    // 使用 as any 绕过类型检查，因为 Supabase 运行时确实支持 { count: 'exact' } 选项
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = (resolvedClient as any)
      .from('person_profiles')
      .select('*', { count: 'exact' })
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    const { data, error, count } = await query;

    if (error) throw handleServiceError(error, 'person-service/listFamilyPersonsPaginated');
    
    const total = count ?? 0;
    return {
      data: data ?? [],
      total,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < total,
    };
  } catch (error) {
    throw handleServiceError(error, 'person-service/listFamilyPersonsPaginated');
  }
}

export async function createPersonRelation(
  input: CreatePersonRelationInput,
  client?: SupabaseServiceClient
): Promise<PersonRelation> {
  const user = await getCurrentUser();
  const userId = user?.id ?? 'mock-user';
  const timestamp = nowIso();
  const resolvedClient = getClient(client);

  if (!resolvedClient) {
    const relation: PersonRelation = {
      id: createId('relation'),
      family_id: input.familyId,
      from_person_id: input.fromPersonId,
      to_person_id: input.toPersonId,
      relation_type: input.relationType,
      is_primary: input.isPrimary ?? true,
      status: 'active',
      created_by: userId,
      confirmed_by: null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    mockRelations.push(relation);
    return relation;
  }

  if (!user) {
    throw new ServiceError('PERMISSION_DENIED', '请先登录', null, 401);
  }

  try {
    const { data, error } = await resolvedClient
      .from<PersonRelation>('person_relations')
      .insert({
        family_id: input.familyId,
        from_person_id: input.fromPersonId,
        to_person_id: input.toPersonId,
        relation_type: input.relationType,
        is_primary: input.isPrimary ?? true,
        status: 'active',
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) throw handleServiceError(error, 'person-service/createPersonRelation');
    if (!data) throw new ServiceError('DATABASE_ERROR', '创建关系失败：无返回数据');

    await writeActionLog(resolvedClient, {
      family_id: input.familyId,
      actor_user_id: user.id,
      target_type: 'person_relation',
      target_id: data.id,
      action_type: 'create_person_relation',
      metadata: {
        from_person_id: input.fromPersonId,
        to_person_id: input.toPersonId,
        relation_type: input.relationType,
      },
    });

    return data;
  } catch (error) {
    throw handleServiceError(error, 'person-service/createPersonRelation');
  }
}

export async function listPersonRelations(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<PersonRelation[]> {
  const result = await listPersonRelationsPaginated(familyId, client);
  return result.data;
}

export async function listPersonRelationsPaginated(
  familyId: string,
  client?: SupabaseServiceClient,
  pagination?: PaginationOptions
): Promise<PaginatedResult<PersonRelation>> {
  const resolvedClient = getClient(client);
  const page = pagination?.page ?? 0;
  const pageSize = pagination?.pageSize ?? 50;

  if (!resolvedClient) {
    const filtered = mockRelations.filter((relation) => relation.family_id === familyId);
    const start = page * pageSize;
    const end = start + pageSize;
    return {
      data: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize,
      hasMore: end < filtered.length,
    };
  }

  try {
    // 使用 as any 绕过类型检查，因为 Supabase 运行时确实支持 { count: 'exact' } 选项
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = (resolvedClient as any)
      .from('person_relations')
      .select('*', { count: 'exact' })
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    const { data, error, count } = await query;

    if (error) throw handleServiceError(error, 'person-service/listPersonRelationsPaginated');
    
    const total = count ?? 0;
    return {
      data: data ?? [],
      total,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < total,
    };
  } catch (error) {
    throw handleServiceError(error, 'person-service/listPersonRelationsPaginated');
  }
}

export async function claimPersonProfile(
  personId: string,
  client?: SupabaseServiceClient
): Promise<PersonProfile> {
  const user = await getCurrentUser();
  const resolvedClient = getClient(client);

  if (!resolvedClient) {
    const person = mockPeople.find((item) => item.id === personId);
    if (!person) {
      throw new ServiceError('NOT_FOUND', '家人档案不存在', null, 404);
    }
    person.bound_user_id = user?.id ?? 'mock-user';
    person.claim_status = 'claimed';
    person.updated_at = nowIso();
    return person;
  }

  if (!user) {
    throw new ServiceError('PERMISSION_DENIED', '请先登录', null, 401);
  }

  try {
    const { data, error } = await resolvedClient
      .from<PersonProfile>('person_profiles')
      .update({
        bound_user_id: user.id,
        claim_status: 'claimed',
        updated_at: nowIso(),
      })
      .eq('id', personId)
      .select('*')
      .single();

    if (error) throw handleServiceError(error, 'person-service/claimPersonProfile');
    if (!data) throw new ServiceError('NOT_FOUND', '家人档案不存在', null, 404);

    await writeActionLog(resolvedClient, {
      family_id: data.family_id,
      actor_user_id: user.id,
      target_type: 'person_profile',
      target_id: personId,
      action_type: 'claim_person_profile',
      metadata: {},
    });

    return data;
  } catch (error) {
    throw handleServiceError(error, 'person-service/claimPersonProfile');
  }
}

export const listPersonProfiles = listFamilyPersons;
