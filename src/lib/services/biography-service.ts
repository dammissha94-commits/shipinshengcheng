import type { ActionLog } from '@/types/domain';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { createSupabaseServiceClient, hasSupabaseConfig } from '@/lib/supabase/client';
import type { SupabaseServiceClient } from './service-client';
import { throwServiceError } from './service-client';

export interface BiographyRecord {
  id: string;
  person_id: string;
  family_id: string;
  title: string;
  content: string;
  event_year: number | null;
  event_month: number | null;
  event_day: number | null;
  location: string | null;
  image_url: string | null;
  audio_url: string | null;
  visibility: BiographyVisibility;
  recorded_by: string | null;
  relationship_to_person: string | null;
  authorization: BiographyAuthorization;
  is_modifiable_by_subject: boolean;
  created_at: string;
  updated_at: string;
}

export type BiographyVisibility = 'private' | 'direct_family' | 'branch_family' | 'family' | 'admin_only';
export type BiographyAuthorization = 'self' | 'authorized' | 'pending' | 'deceased_manager';

export interface CreateBiographyInput {
  personId: string;
  familyId: string;
  title: string;
  content: string;
  eventYear?: number | null;
  eventMonth?: number | null;
  eventDay?: number | null;
  location?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  visibility?: BiographyVisibility;
  relationshipToPerson?: string | null;
  authorization?: BiographyAuthorization;
  isModifiableBySubject?: boolean;
}

function getClient(client?: SupabaseServiceClient): SupabaseServiceClient | null {
  if (client) return client;
  return hasSupabaseConfig() ? createSupabaseServiceClient() : null;
}

/** List biography records for a person */
export async function listBiographyRecords(
  personId: string,
  client?: SupabaseServiceClient
): Promise<BiographyRecord[]> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return [];

  const result = await resolvedClient
    .from<BiographyRecord>('biography_records')
    .select('*')
    .eq('person_id', personId)
    .order('event_year', { ascending: false })
    .order('event_month', { ascending: false })
    .order('event_day', { ascending: false })
    .order('created_at', { ascending: false });

  throwServiceError(result.error, 'list biography records failed');
  return result.data ?? [];
}

/** Create a biography record */
export async function createBiographyRecord(
  input: CreateBiographyInput,
  client?: SupabaseServiceClient
): Promise<BiographyRecord> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) throw new Error('尚未配置 Supabase 环境变量，请先配置 .env.local');

  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const record = {
    person_id: input.personId,
    family_id: input.familyId,
    title: input.title,
    content: input.content,
    event_year: input.eventYear ?? null,
    event_month: input.eventMonth ?? null,
    event_day: input.eventDay ?? null,
    location: input.location ?? null,
    image_url: input.imageUrl ?? null,
    audio_url: input.audioUrl ?? null,
    visibility: input.visibility ?? 'family',
    recorded_by: user.id,
    relationship_to_person: input.relationshipToPerson ?? null,
    authorization: input.authorization ?? 'authorized',
    is_modifiable_by_subject: input.isModifiableBySubject ?? true,
  };

  const insertResult = await resolvedClient
    .from<BiographyRecord>('biography_records')
    .insert(record as unknown as Partial<BiographyRecord>)
    .select('*');

  throwServiceError(insertResult.error, 'create biography record failed');
  const created = insertResult.data;
  if (!created) throw new Error('创建生平记录失败');

  // Log action (fire-and-forget)
  resolvedClient.from<ActionLog>('action_logs').insert({
    family_id: input.familyId,
    actor_user_id: user.id,
    target_type: 'biography_record',
    target_id: (created as BiographyRecord).id,
    action_type: 'create_biography_record',
    metadata: { person_id: input.personId },
  } as unknown as Partial<ActionLog>);

  return created as unknown as BiographyRecord;
}

/** Soft-delete: update the record to be hidden */
export async function deleteBiographyRecord(
  recordId: string,
  client?: SupabaseServiceClient
): Promise<void> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) throw new Error('尚未配置 Supabase 环境变量');

  const result = await resolvedClient
    .from<BiographyRecord>('biography_records')
    .update({ visibility: 'admin_only' as BiographyVisibility } as Partial<BiographyRecord>)
    .eq('id', recordId)
    .select('*');

  throwServiceError(result.error, 'delete biography record failed');
}

// --- Display helpers ---

export const VISIBILITY_LABELS: Record<BiographyVisibility, string> = {
  private: '仅自己',
  direct_family: '直系亲属',
  branch_family: '本支亲属',
  family: '全家族可见',
  admin_only: '管理员可见',
};

export const AUTH_LABELS: Record<BiographyAuthorization, string> = {
  self: '本人录入',
  authorized: '亲属代录',
  pending: '待确认',
  deceased_manager: '近亲属管理',
};

export function formatEventDate(record: BiographyRecord): string {
  const y = record.event_year;
  const m = record.event_month;
  const d = record.event_day;
  if (!y) return '时间未填';
  if (!m) return `${y} 年`;
  if (!d) return `${y} 年 ${m} 月`;
  return `${y} 年 ${m} 月 ${d} 日`;
}
