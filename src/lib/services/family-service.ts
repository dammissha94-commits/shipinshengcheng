import type { ActionLog, FamilyMembership, FamilySpace, PersonProfile } from '@/types/domain';
import type {
  CreateFamilySpaceInput,
  FamilyMemberStats,
  UpdateFamilySettingsInput,
  UpdateFamilySpaceInput,
} from '@/types/service';
import type { User } from '@supabase/supabase-js';
import { formatTempleName } from '@/lib/family-naming';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { canManageFamily } from '@/lib/auth/permission-service';
import {
  createSupabaseBrowserClient,
  createSupabaseServiceClient,
  hasSupabaseConfig,
} from '@/lib/supabase/client';
import type { SupabaseServiceClient } from './service-client';
import { createId, nowIso, throwServiceError } from './service-client';

const mockFamilies: FamilySpace[] = [];
const mockMemberships: FamilyMembership[] = [];
const mockPeople: PersonProfile[] = [];

type CreateFamilyRpcResult = {
  family: FamilySpace;
  membership: FamilyMembership;
  person: PersonProfile;
};

function getClient(client?: SupabaseServiceClient): SupabaseServiceClient | null {
  if (client) return client;
  return hasSupabaseConfig() ? createSupabaseServiceClient() : null;
}

function normalizeFamilySpace(family: FamilySpace): FamilySpace {
  return {
    ...family,
    displayName: family.displayName ?? family.display_name,
    ownerName: family.ownerName ?? '',
    createdAt: family.createdAt ?? family.created_at,
  };
}

async function fetchFamilySpaceById(
  resolvedClient: SupabaseServiceClient,
  familyId: string
): Promise<FamilySpace | null> {
  const result = await resolvedClient
    .from<FamilySpace>('family_spaces')
    .select('*')
    .eq('id', familyId)
    .order('created_at', { ascending: false });

  throwServiceError(result.error, 'fetch family space failed');
  return result.data?.[0] ? normalizeFamilySpace(result.data[0]) : null;
}

async function writeActionLog(
  client: SupabaseServiceClient,
  log: Omit<ActionLog, 'id' | 'created_at'>
): Promise<void> {
  const result = await client.from<ActionLog>('action_logs').insert(log).select('*').single();
  throwServiceError(result.error, 'write action log failed');
}

function createMockFamily(input: CreateFamilySpaceInput, userId: string): FamilySpace {
  const timestamp = nowIso();
  const surname = input.surname.trim();
  const displayName = input.displayName ?? formatTempleName(surname);
  const family: FamilySpace = {
    id: createId('family'),
    surname,
    name: input.name ?? displayName,
    display_name: displayName,
    founder_user_id: userId,
    family_type: input.familyType ?? 'small_family',
    visibility: input.visibility ?? 'private',
    status: 'active',
    created_at: timestamp,
    updated_at: timestamp,
    displayName,
    ownerName: input.ownerName,
    createdAt: timestamp,
  };

  mockFamilies.push(family);
  mockMemberships.push({
    id: createId('membership'),
    family_id: family.id,
    user_id: userId,
    role: 'owner',
    join_status: 'active',
    created_at: timestamp,
    updated_at: timestamp,
  });
  mockPeople.push({
    id: createId('person'),
    family_id: family.id,
    bound_user_id: userId,
    surname,
    given_name: input.ownerName,
    display_name: input.ownerName,
    gender: input.selfGender,
    birth_year: input.selfBirthYear ?? null,
    death_year: null,
    living_status: 'alive',
    claim_status: 'claimed',
    visibility: 'family',
    bio: null,
    portrait_url: null,
    created_by: userId,
    created_at: timestamp,
    updated_at: timestamp,
  });

  return family;
}

export async function createFamilySpace(
  input: CreateFamilySpaceInput,
  client?: SupabaseServiceClient,
  user?: User | null
): Promise<FamilySpace> {
  const resolvedUser = user ?? (await getCurrentUser());
  const userId = resolvedUser?.id ?? 'mock-user';
  const resolvedClient = getClient(client);

  if (!resolvedClient) {
    return createMockFamily(input, userId);
  }

  if (!resolvedUser) throw new Error('请先登录');

  const surname = input.surname.trim();
  const displayName = input.displayName ?? formatTempleName(surname);

  if (!client) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.rpc('create_family_space_with_owner', {
      p_surname: surname,
      p_owner_name: input.ownerName,
      p_self_gender: input.selfGender,
      p_self_birth_year: input.selfBirthYear ?? null,
      p_name: input.name ?? displayName,
      p_display_name: displayName,
      p_visibility: input.visibility ?? 'private',
    });

    if (error) {
      throw new Error('创建家堂失败，请稍后重试');
    }

    const result = data as CreateFamilyRpcResult;
    return normalizeFamilySpace(result.family);
  }

  const familyResult = await resolvedClient
    .from<FamilySpace>('family_spaces')
    .insert({
      surname,
      name: input.name ?? displayName,
      display_name: displayName,
      founder_user_id: resolvedUser.id,
      family_type: input.familyType ?? 'small_family',
      visibility: input.visibility ?? 'private',
      status: 'active',
    })
    .select('*')
    .single();

  throwServiceError(familyResult.error, 'create family space failed');
  const family = normalizeFamilySpace(familyResult.data!);

  const membershipResult = await resolvedClient
    .from<FamilyMembership>('family_memberships')
    .insert({
      family_id: family.id,
      user_id: resolvedUser.id,
      role: 'owner',
      join_status: 'active',
    })
    .select('*')
    .single();

  throwServiceError(membershipResult.error, 'create owner membership failed');

  const personResult = await resolvedClient
    .from<PersonProfile>('person_profiles')
    .insert({
      family_id: family.id,
      bound_user_id: resolvedUser.id,
      surname,
      given_name: input.ownerName,
      display_name: input.ownerName,
      gender: input.selfGender,
      birth_year: input.selfBirthYear ?? null,
      death_year: null,
      living_status: 'alive',
      claim_status: 'claimed',
      visibility: 'family',
      created_by: resolvedUser.id,
    })
    .select('*')
    .single();

  throwServiceError(personResult.error, 'create self person profile failed');

  await writeActionLog(resolvedClient, {
    family_id: family.id,
    actor_user_id: resolvedUser.id,
    target_type: 'family_space',
    target_id: family.id,
    action_type: 'create_family_space',
    metadata: { person_id: personResult.data!.id },
  });

  return family;
}

export async function getCurrentFamilySpace(
  client?: SupabaseServiceClient,
  user?: User | null
): Promise<FamilySpace | null> {
  const resolvedUser = user ?? (await getCurrentUser());
  const resolvedClient = getClient(client);

  if (!resolvedClient) {
    return mockFamilies[0] ?? null;
  }

  if (!resolvedUser) throw new Error('请先登录');

  const membershipsResult = await resolvedClient
    .from<FamilyMembership>('family_memberships')
    .select('*')
    .eq('user_id', resolvedUser.id)
    .eq('join_status', 'active')
    .order('created_at', { ascending: false });

  throwServiceError(membershipsResult.error, 'get current family membership failed');
  const currentMembership = membershipsResult.data?.[0];
  if (!currentMembership) return null;

  return fetchFamilySpaceById(resolvedClient, currentMembership.family_id);
}

export async function listUserFamilySpaces(
  client?: SupabaseServiceClient,
  user?: User | null
): Promise<FamilySpace[]> {
  const resolvedUser = user ?? (await getCurrentUser());
  const resolvedClient = getClient(client);

  if (!resolvedClient) {
    return mockFamilies;
  }

  if (!resolvedUser) throw new Error('请先登录');

  const membershipsResult = await resolvedClient
    .from<FamilyMembership>('family_memberships')
    .select('*')
    .eq('user_id', resolvedUser.id)
    .eq('join_status', 'active')
    .order('created_at', { ascending: false });

  throwServiceError(membershipsResult.error, 'list user family memberships failed');

  const familyIds = Array.from(
    new Set((membershipsResult.data ?? []).map((membership) => membership.family_id))
  );

  const families = await Promise.all(
    familyIds.map((familyId) => fetchFamilySpaceById(resolvedClient, familyId))
  );

  return families.filter((family): family is FamilySpace => family !== null);
}

export async function updateFamilySpace(
  familyId: string,
  input: UpdateFamilySpaceInput,
  client?: SupabaseServiceClient
): Promise<FamilySpace> {
  const resolvedUser = await getCurrentUser();
  const resolvedClient = getClient(client);

  if (!resolvedClient) {
    const family = mockFamilies.find((item) => item.id === familyId);
    if (!family) throw new Error('update family space failed: family not found');
    family.display_name = input.displayName ?? family.display_name;
    family.displayName = family.display_name;
    family.visibility = input.visibility ?? family.visibility;
    family.updated_at = nowIso();
    return family;
  }

  if (!resolvedUser) throw new Error('请先登录');

  const result = await resolvedClient
    .from<FamilySpace>('family_spaces')
    .update({
      surname: input.surname,
      name: input.name,
      display_name: input.displayName,
      family_type: input.familyType,
      visibility: input.visibility,
      status: input.status,
    })
    .eq('id', familyId)
    .select('*')
    .single();

  throwServiceError(result.error, 'update family space failed');
  await writeActionLog(resolvedClient, {
    family_id: familyId,
    actor_user_id: resolvedUser.id,
    target_type: 'family_space',
    target_id: familyId,
    action_type: 'update_family_space',
    metadata: {},
  });

  return normalizeFamilySpace(result.data!);
}

export async function getFamilyDashboardStats(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMemberStats> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) {
    const people = mockPeople.filter((person) => person.family_id === familyId);
    return {
      totalPersons: people.length,
      claimedPersons: people.filter((person) => person.claim_status === 'claimed').length,
      unclaimedPersons: people.filter((person) => person.claim_status === 'unclaimed').length,
      alivePersons: people.filter((person) => person.living_status === 'alive').length,
      deceasedPersons: people.filter((person) => person.living_status === 'deceased').length,
    };
  }

  const result = await resolvedClient
    .from<PersonProfile>('person_profiles')
    .select('*')
    .eq('family_id', familyId);

  throwServiceError(result.error, 'get family dashboard stats failed');
  const people = result.data ?? [];

  return {
    totalPersons: people.length,
    claimedPersons: people.filter((person) => person.claim_status === 'claimed').length,
    unclaimedPersons: people.filter((person) => person.claim_status === 'unclaimed').length,
    alivePersons: people.filter((person) => person.living_status === 'alive').length,
    deceasedPersons: people.filter((person) => person.living_status === 'deceased').length,
  };
}

export async function updateFamilySettings(
  familyId: string,
  input: UpdateFamilySettingsInput,
  client?: SupabaseServiceClient
): Promise<FamilySpace> {
  const canManage = await canManageFamily(familyId);
  if (!canManage) throw new Error('当前账号无权限修改家堂设置');
  return updateFamilySpace(
    familyId,
    {
      displayName: input.displayName,
      visibility: input.visibility,
    },
    client
  );
}

export const listFamilySpacesForUser = listUserFamilySpaces;
