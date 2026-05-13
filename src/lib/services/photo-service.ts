import type { ActionLog, FamilyPhoto } from '@/types/domain';
import type { CreateFamilyPhotoInput, UpdateFamilyPhotoInput } from '@/types/service';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth/auth-service';
import {
  canCreateFamilyContent,
  canManageFamilyMemory,
  getUserFamilyRole,
} from '@/lib/auth/permission-service';
import { createSupabaseServiceClient, hasSupabaseConfig } from '@/lib/supabase/client';
import type { SupabaseServiceClient } from './service-client';
import { throwServiceError } from './service-client';

type FamilyPhotoStorageClient = SupabaseServiceClient &
  Pick<SupabaseClient, 'storage'>;

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';
const FAMILY_PHOTOS_BUCKET = 'family-photos';
const PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60;

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

function extractFamilyPhotoStoragePath(value: string | null): string | null {
  const rawValue = value?.trim();
  if (!rawValue) return null;

  if (!/^https?:\/\//i.test(rawValue)) {
    return rawValue.replace(/^\/+/, '');
  }

  try {
    const url = new URL(rawValue);
    const markers = [
      `/storage/v1/object/public/${FAMILY_PHOTOS_BUCKET}/`,
      `/storage/v1/object/sign/${FAMILY_PHOTOS_BUCKET}/`,
    ];
    const matchedMarker = markers.find((marker) => url.pathname.includes(marker));

    if (!matchedMarker) return null;

    const [, rawPath = ''] = url.pathname.split(matchedMarker);
    return decodeURIComponent(rawPath).replace(/^\/+/, '') || null;
  } catch {
    return null;
  }
}

async function createSignedFamilyPhotoUrl(
  client: SupabaseServiceClient,
  value: string | null
): Promise<string | null> {
  const storagePath = extractFamilyPhotoStoragePath(value);
  if (!storagePath) return value;

  const storageClient = client as FamilyPhotoStorageClient;
  const result = await storageClient.storage
    .from(FAMILY_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, PHOTO_SIGNED_URL_TTL_SECONDS);

  if (result.error) return null;
  return result.data?.signedUrl ?? null;
}

async function withSignedPhotoUrl(
  photo: FamilyPhoto,
  client: SupabaseServiceClient
): Promise<FamilyPhoto> {
  return {
    ...photo,
    image_url: await createSignedFamilyPhotoUrl(client, photo.image_url),
  };
}

async function withSignedPhotoUrls(
  photos: FamilyPhoto[],
  client: SupabaseServiceClient
): Promise<FamilyPhoto[]> {
  return Promise.all(photos.map((photo) => withSignedPhotoUrl(photo, client)));
}

async function getPhoto(photoId: string, client: SupabaseServiceClient): Promise<FamilyPhoto> {
  const result = await client.from<FamilyPhoto>('family_photos').select('*').eq('id', photoId);
  throwServiceError(result.error, 'get family photo failed');
  const photo = result.data?.[0];
  if (!photo) throw new Error('家族相册记录不存在');
  return photo;
}

export async function listFamilyPhotos(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<FamilyPhoto[]> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return [];

  const result = await resolvedClient
    .from<FamilyPhoto>('family_photos')
    .select('*')
    .eq('family_id', familyId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  throwServiceError(result.error, 'list family photos failed');
  return withSignedPhotoUrls(result.data ?? [], resolvedClient);
}

export async function createFamilyPhoto(
  input: CreateFamilyPhotoInput,
  client?: SupabaseServiceClient
): Promise<FamilyPhoto> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');
  if (!(await canCreateFamilyContent(input.familyId))) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyPhoto>('family_photos')
    .insert({
      family_id: input.familyId,
      uploader_user_id: user.id,
      title: input.title,
      description: input.description ?? null,
      photo_year: input.photoYear ?? null,
      image_url: input.imageUrl ?? null,
      related_person_ids: normalizeRelatedPersonIds(input.relatedPersonIds),
      visibility: input.visibility ?? 'family',
      status: 'active',
    })
    .select('*')
    .single();

  throwServiceError(result.error, 'create family photo failed');

  await writeActionLog(resolvedClient, {
    family_id: input.familyId,
    actor_user_id: user.id,
    target_type: 'family_photo',
    target_id: result.data!.id,
    action_type: 'create_family_photo',
    metadata: {},
  });

  return withSignedPhotoUrl(result.data!, resolvedClient);
}

export async function updateFamilyPhoto(
  photoId: string,
  input: UpdateFamilyPhotoInput,
  client?: SupabaseServiceClient
): Promise<FamilyPhoto> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const existing = await getPhoto(photoId, resolvedClient);
  const canManage = await canManageFamilyMemory(existing.family_id);
  if (existing.uploader_user_id !== user.id && !canManage) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyPhoto>('family_photos')
    .update({
      title: input.title,
      description: input.description,
      photo_year: input.photoYear,
      image_url: input.imageUrl,
      related_person_ids: input.relatedPersonIds
        ? normalizeRelatedPersonIds(input.relatedPersonIds)
        : undefined,
      visibility: input.visibility,
      status: input.status,
    })
    .eq('id', photoId)
    .select('*')
    .single();

  throwServiceError(result.error, 'update family photo failed');
  return withSignedPhotoUrl(result.data!, resolvedClient);
}

export async function archiveFamilyPhoto(
  photoId: string,
  client?: SupabaseServiceClient
): Promise<FamilyPhoto> {
  const resolvedClient = requireClient(client);
  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const existing = await getPhoto(photoId, resolvedClient);
  const role = await getUserFamilyRole(existing.family_id);
  const canManage =
    existing.uploader_user_id === user.id ||
    role === 'owner' ||
    role === 'family_admin' ||
    role === 'memory_admin';
  if (!canManage) throw new Error('你暂无权限执行此操作');

  const result = await resolvedClient
    .from<FamilyPhoto>('family_photos')
    .update({ status: 'archived' })
    .eq('id', photoId)
    .select('*')
    .single();

  throwServiceError(result.error, 'archive family photo failed');

  await writeActionLog(resolvedClient, {
    family_id: existing.family_id,
    actor_user_id: user.id,
    target_type: 'family_photo',
    target_id: photoId,
    action_type: 'archive_family_photo',
    metadata: {},
  });

  return withSignedPhotoUrl(result.data!, resolvedClient);
}
