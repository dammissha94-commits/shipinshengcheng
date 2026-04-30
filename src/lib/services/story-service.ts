import type { ActionLog, FamilyStory } from '@/types/domain';
import type { CreateFamilyStoryInput, UpdateFamilyStoryInput } from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import {
  canCreateFamilyContent,
  canManageFamilyMemory,
  getUserFamilyRole,
} from '@/lib/auth/permission-service';
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

function normalizeRelatedPersonIds(value: string[] | undefined): string[] {
  return Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean)));
}

async function getStory(storyId: string, client: SupabaseServiceClient): Promise<FamilyStory> {
  const result = await client.from<FamilyStory>('family_stories').select('*').eq('id', storyId);
  throwServiceError(result.error, 'get family story failed');
  const story = result.data?.[0];
  if (!story) throw new Error('家族故事不存在');
  return story;
}

export async function listFamilyStories(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyStory[]> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return [];

  const result = await resolvedClient
    .from<FamilyStory>('family_stories')
    .select('*')
    .eq('family_id', familyId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  throwServiceError(result.error, 'list family stories failed');
  return result.data ?? [];
}

export async function createFamilyStory(
  input: CreateFamilyStoryInput,
  client?: SupabaseServiceClient
): Promise<FamilyStory> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');
  if (!(await canCreateFamilyContent(input.familyId))) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyStory>('family_stories')
    .insert({
      family_id: input.familyId,
      author_user_id: user.id,
      title: input.title,
      content: input.content ?? null,
      story_year: input.storyYear ?? null,
      related_person_ids: normalizeRelatedPersonIds(input.relatedPersonIds),
      visibility: input.visibility ?? 'family',
      status: 'active',
    })
    .select('*')
    .single();

  throwServiceError(result.error, 'create family story failed');

  await writeActionLog(resolvedClient, {
    family_id: input.familyId,
    actor_user_id: user.id,
    target_type: 'family_story',
    target_id: result.data!.id,
    action_type: 'create_family_story',
    metadata: {},
  });

  return result.data!;
}

export async function updateFamilyStory(
  storyId: string,
  input: UpdateFamilyStoryInput,
  client?: SupabaseServiceClient
): Promise<FamilyStory> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const existing = await getStory(storyId, resolvedClient);
  const canManage = await canManageFamilyMemory(existing.family_id);
  if (existing.author_user_id !== user.id && !canManage) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyStory>('family_stories')
    .update({
      title: input.title,
      content: input.content,
      story_year: input.storyYear,
      related_person_ids: input.relatedPersonIds
        ? normalizeRelatedPersonIds(input.relatedPersonIds)
        : undefined,
      visibility: input.visibility,
      status: input.status,
    })
    .eq('id', storyId)
    .select('*')
    .single();

  throwServiceError(result.error, 'update family story failed');
  return result.data!;
}

export async function archiveFamilyStory(
  storyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyStory> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const existing = await getStory(storyId, resolvedClient);
  const role = await getUserFamilyRole(existing.family_id);
  const canManage =
    existing.author_user_id === user.id ||
    role === 'owner' ||
    role === 'family_admin' ||
    role === 'memory_admin';
  if (!canManage) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyStory>('family_stories')
    .update({ status: 'archived' })
    .eq('id', storyId)
    .select('*')
    .single();

  throwServiceError(result.error, 'archive family story failed');

  await writeActionLog(resolvedClient, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'family_story',
    target_id: storyId,
    action_type: 'archive_family_story',
    metadata: {},
  });

  return result.data!;
}
