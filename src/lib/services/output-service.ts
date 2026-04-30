import type {
  ActionLog,
  FamilyOutput,
  FamilyPhoto,
  FamilySpace,
  FamilyStory,
  PersonProfile,
  PersonRelation,
  Relation,
} from '@/types/domain';
import type {
  CreateFamilyOutputInput,
  FamilyMemoryBookPreview,
  FamilyOutputPreviewData,
  FamilyStoryBookPreview,
  FamilyYearbookPreview,
  PreviewPersonItem,
  ThreeGenerationTreePreview,
  UpdateFamilyOutputInput,
} from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import {
  canCreateFamilyOutput,
  canManageFamilyMemory,
  getUserFamilyRole,
  isFamilyMember,
} from '@/lib/auth/permission-service';
import { mapProfilesToTreePersons } from '@/lib/family-view';
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

async function getFamily(familyId: string, client: SupabaseServiceClient): Promise<FamilySpace> {
  const result = await client.from<FamilySpace>('family_spaces').select('*').eq('id', familyId);
  throwServiceError(result.error, 'get family output family failed');
  const family = result.data?.[0];
  if (!family) throw new Error('未找到当前数字家堂');
  return family;
}

async function getOutput(outputId: string, client: SupabaseServiceClient): Promise<FamilyOutput> {
  const result = await client.from<FamilyOutput>('family_outputs').select('*').eq('id', outputId);
  throwServiceError(result.error, 'get family output failed');
  const output = result.data?.[0];
  if (!output) throw new Error('成果物记录不存在');
  return output;
}

function sanitizePreviewData(previewData?: FamilyOutputPreviewData): Record<string, unknown> {
  return previewData ? (previewData as Record<string, unknown>) : {};
}

function compactPeople(
  profiles: PersonProfile[],
  people: { id: string; name: string; relation: Relation; claimStatus?: string }[],
  relation: Relation
): PreviewPersonItem[] {
  return people
    .filter((person) => person.relation === relation)
    .map((person) => {
      const profile = profiles.find((item) => item.id === person.id);
      return {
        id: person.id,
        name: person.name,
        relation: person.relation,
        claimStatus: profile?.claim_status,
        livingStatus: profile?.living_status,
      };
    });
}

function recentStories(stories: FamilyStory[]) {
  return stories.slice(0, 6).map((story) => ({
    id: story.id,
    title: story.title,
    year: story.story_year,
  }));
}

function recentPhotos(photos: FamilyPhoto[]) {
  return photos.slice(0, 6).map((photo) => ({
    id: photo.id,
    title: photo.title,
    year: photo.photo_year,
  }));
}

export async function listFamilyOutputs(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyOutput[]> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return [];

  if (!(await isFamilyMember(familyId))) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyOutput>('family_outputs')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  throwServiceError(result.error, 'list family outputs failed');
  return result.data ?? [];
}

export async function createFamilyOutput(
  input: CreateFamilyOutputInput,
  client?: SupabaseServiceClient
): Promise<FamilyOutput> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');
  if (!(await canCreateFamilyOutput(input.familyId))) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyOutput>('family_outputs')
    .insert({
      family_id: input.familyId,
      creator_user_id: user.id,
      output_type: input.outputType,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'preview_ready',
      preview_data: sanitizePreviewData(input.previewData),
      generated_url: input.generatedUrl ?? null,
      visibility: input.visibility ?? 'family',
    })
    .select('*')
    .single();

  throwServiceError(result.error, 'create family output failed');

  await writeActionLog(resolvedClient, {
    family_id: input.familyId,
    actor_user_id: user.id,
    target_type: 'family_output',
    target_id: result.data!.id,
    action_type: 'create_family_output',
    metadata: { output_type: input.outputType },
  });

  return result.data!;
}

export async function updateFamilyOutput(
  outputId: string,
  input: UpdateFamilyOutputInput,
  client?: SupabaseServiceClient
): Promise<FamilyOutput> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const existing = await getOutput(outputId, resolvedClient);
  const canManage = await canManageFamilyMemory(existing.family_id);
  if (!canManage && (existing.creator_user_id !== user.id || existing.status !== 'draft')) {
    throw new Error('你暂无权限执行此操作');
  }

  const result = await resolvedClient
    .from<FamilyOutput>('family_outputs')
    .update({
      title: input.title,
      description: input.description,
      visibility: input.visibility,
      preview_data: input.previewData ? sanitizePreviewData(input.previewData) : undefined,
      status: input.status,
    })
    .eq('id', outputId)
    .select('*')
    .single();

  throwServiceError(result.error, 'update family output failed');

  await writeActionLog(resolvedClient, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'family_output',
    target_id: outputId,
    action_type: 'update_family_output',
    metadata: {},
  });

  return result.data!;
}

export async function archiveFamilyOutput(
  outputId: string,
  client?: SupabaseServiceClient
): Promise<FamilyOutput> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const existing = await getOutput(outputId, resolvedClient);
  const role = await getUserFamilyRole(existing.family_id);
  const canManage =
    existing.creator_user_id === user.id ||
    role === 'owner' ||
    role === 'family_admin' ||
    role === 'memory_admin';
  if (!canManage) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyOutput>('family_outputs')
    .update({ status: 'archived' })
    .eq('id', outputId)
    .select('*')
    .single();

  throwServiceError(result.error, 'archive family output failed');

  await writeActionLog(resolvedClient, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'family_output',
    target_id: outputId,
    action_type: 'archive_family_output',
    metadata: { output_type: existing.output_type },
  });

  return result.data!;
}

export async function generateThreeGenerationTreePreview(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<ThreeGenerationTreePreview> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');
  if (!(await isFamilyMember(familyId))) throw new Error('你暂无权限执行此操作');

  const [family, personsResult, relationsResult] = await Promise.all([
    getFamily(familyId, resolvedClient),
    resolvedClient
      .from<PersonProfile>('person_profiles')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true }),
    resolvedClient
      .from<PersonRelation>('person_relations')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true }),
  ]);

  throwServiceError(personsResult.error, 'generate tree preview persons failed');
  throwServiceError(relationsResult.error, 'generate tree preview relations failed');

  const profiles = personsResult.data ?? [];
  const relations = (relationsResult.data ?? []).filter((relation) => relation.status === 'active');
  const people = mapProfilesToTreePersons(profiles, relations, user.id);
  const selfAndSiblings = [
    ...compactPeople(profiles, people, 'self'),
    ...compactPeople(profiles, people, 'spouse'),
    ...compactPeople(profiles, people, 'sibling'),
  ];

  return {
    familyId,
    familyName: family.display_name,
    surname: family.surname,
    totalPersons: profiles.length,
    claimedPersons: profiles.filter((person) => person.claim_status === 'claimed').length,
    unclaimedPersons: profiles.filter((person) => person.claim_status !== 'claimed').length,
    alivePersons: profiles.filter((person) => person.living_status === 'alive').length,
    deceasedPersons: profiles.filter((person) => person.living_status === 'deceased').length,
    relationCount: relations.length,
    generations: {
      grandparents: [
        ...compactPeople(profiles, people, 'grandfather_paternal'),
        ...compactPeople(profiles, people, 'grandmother_paternal'),
        ...compactPeople(profiles, people, 'grandfather_maternal'),
        ...compactPeople(profiles, people, 'grandmother_maternal'),
      ],
      parents: [
        ...compactPeople(profiles, people, 'father'),
        ...compactPeople(profiles, people, 'mother'),
      ],
      selfAndSiblings,
      children: compactPeople(profiles, people, 'child'),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function generateFamilyMemoryBookPreview(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyMemoryBookPreview> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');
  if (!(await isFamilyMember(familyId))) throw new Error('你暂无权限执行此操作');

  const [family, storiesResult, photosResult] = await Promise.all([
    getFamily(familyId, resolvedClient),
    resolvedClient
      .from<FamilyStory>('family_stories')
      .select('*')
      .eq('family_id', familyId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    resolvedClient
      .from<FamilyPhoto>('family_photos')
      .select('*')
      .eq('family_id', familyId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ]);

  throwServiceError(storiesResult.error, 'generate memory preview stories failed');
  throwServiceError(photosResult.error, 'generate memory preview photos failed');

  const stories = storiesResult.data ?? [];
  const photos = photosResult.data ?? [];

  return {
    familyId,
    familyName: family.display_name,
    surname: family.surname,
    storyCount: stories.length,
    photoCount: photos.length,
    recentStories: recentStories(stories),
    recentPhotos: recentPhotos(photos),
    generatedAt: new Date().toISOString(),
  };
}

export async function generateFamilyStoryBookPreview(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyStoryBookPreview> {
  const memoryPreview = await generateFamilyMemoryBookPreview(familyId, client);
  return {
    familyId,
    familyName: memoryPreview.familyName,
    surname: memoryPreview.surname,
    storyCount: memoryPreview.storyCount,
    storyTitles: memoryPreview.recentStories.map((story) => story.title),
    generatedAt: new Date().toISOString(),
  };
}

export async function generateFamilyYearbookPreview(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyYearbookPreview> {
  const resolvedClient = requireClient(client);
  const [memoryPreview, personsResult] = await Promise.all([
    generateFamilyMemoryBookPreview(familyId, resolvedClient),
    resolvedClient.from<PersonProfile>('person_profiles').select('*').eq('family_id', familyId),
  ]);

  throwServiceError(personsResult.error, 'generate yearbook preview persons failed');

  return {
    familyId,
    familyName: memoryPreview.familyName,
    surname: memoryPreview.surname,
    year: new Date().getFullYear(),
    personCount: personsResult.data?.length ?? 0,
    storyCount: memoryPreview.storyCount,
    photoCount: memoryPreview.photoCount,
    generatedAt: new Date().toISOString(),
  };
}
