import type { ActionLog, PersonProfile, PersonRelation } from '@/types/domain';
import type { CreatePersonProfileInput, CreatePersonRelationInput } from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { createSupabaseServiceClient, hasSupabaseConfig } from '@/lib/supabase/client';
import type { SupabaseServiceClient } from './service-client';
import { createId, nowIso, throwServiceError } from './service-client';

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
  const result = await client.from<ActionLog>('action_logs').insert(log).select('*').single();
  throwServiceError(result.error, 'write action log failed');
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

  if (!user) throw new Error('请先登录');

  const result = await resolvedClient
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

  throwServiceError(result.error, 'create person profile failed');
  await writeActionLog(resolvedClient, {
    family_id: input.familyId,
    actor_user_id: user.id,
    target_type: 'person_profile',
    target_id: result.data!.id,
    action_type: 'create_person_profile',
    metadata: {},
  });

  return result.data!;
}

export async function listFamilyPersons(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<PersonProfile[]> {
  const resolvedClient = getClient(client);

  if (!resolvedClient) {
    return mockPeople.filter((person) => person.family_id === familyId);
  }

  const result = await resolvedClient
    .from<PersonProfile>('person_profiles')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true });

  throwServiceError(result.error, 'list family persons failed');
  return result.data ?? [];
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

  if (!user) throw new Error('请先登录');

  const result = await resolvedClient
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

  throwServiceError(result.error, 'create person relation failed');
  await writeActionLog(resolvedClient, {
    family_id: input.familyId,
    actor_user_id: user.id,
    target_type: 'person_relation',
    target_id: result.data!.id,
    action_type: 'create_person_relation',
    metadata: {
      from_person_id: input.fromPersonId,
      to_person_id: input.toPersonId,
      relation_type: input.relationType,
    },
  });

  return result.data!;
}

export async function listPersonRelations(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<PersonRelation[]> {
  const resolvedClient = getClient(client);

  if (!resolvedClient) {
    return mockRelations.filter((relation) => relation.family_id === familyId);
  }

  const result = await resolvedClient
    .from<PersonRelation>('person_relations')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true });

  throwServiceError(result.error, 'list person relations failed');
  return result.data ?? [];
}

export async function claimPersonProfile(
  personId: string,
  client?: SupabaseServiceClient
): Promise<PersonProfile> {
  const user = await getCurrentUser();
  const resolvedClient = getClient(client);

  if (!resolvedClient) {
    const person = mockPeople.find((item) => item.id === personId);
    if (!person) throw new Error('claim person profile failed: person not found');
    person.bound_user_id = user?.id ?? 'mock-user';
    person.claim_status = 'claimed';
    person.updated_at = nowIso();
    return person;
  }

  if (!user) throw new Error('请先登录');

  const result = await resolvedClient
    .from<PersonProfile>('person_profiles')
    .update({
      bound_user_id: user.id,
      claim_status: 'claimed',
    })
    .eq('id', personId)
    .select('*')
    .single();

  throwServiceError(result.error, 'claim person profile failed');
  await writeActionLog(resolvedClient, {
    family_id: result.data!.family_id,
    actor_user_id: user.id,
    target_type: 'person_profile',
    target_id: personId,
    action_type: 'claim_person_profile',
    metadata: {},
  });

  return result.data!;
}

export const listPersonProfiles = listFamilyPersons;
