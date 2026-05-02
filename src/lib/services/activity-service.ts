import type { ActionLog } from '@/types/domain';
import { createSupabaseServiceClient, hasSupabaseConfig } from '@/lib/supabase/client';
import type { SupabaseServiceClient } from './service-client';
import { throwServiceError } from './service-client';

function getClient(client?: SupabaseServiceClient): SupabaseServiceClient | null {
  if (client) return client;
  return hasSupabaseConfig() ? createSupabaseServiceClient() : null;
}

export interface ActivityQueryParams {
  familyId: string;
  limit?: number;
}

/**
 * Read-only query: fetch recent action_logs for a family.
 * Does NOT write, edit, or delete any data.
 */
export async function getFamilyActivityLogs(
  params: ActivityQueryParams,
  client?: SupabaseServiceClient
): Promise<ActionLog[]> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return [];

  const limit = Math.min(params.limit ?? 50, 100);

  const result = await resolvedClient
    .from<ActionLog>('action_logs')
    .select('*')
    .eq('family_id', params.familyId)
    .order('created_at', { ascending: false });

  throwServiceError(result.error, 'read activity logs failed');
  return (result.data ?? []).slice(0, limit);
}

/** Map action_type → human-readable label and category */
export function getActivityLabel(
  actionType: string
): { label: string; category: 'member' | 'story' | 'photo' | 'calendar' | 'meeting' | 'output' | 'invite' | 'other' } {
  if (actionType.includes('person_profile') || actionType.includes('person_relation') || actionType.includes('claim_person')) {
    return { label: '家人', category: 'member' };
  }
  if (actionType.includes('story')) {
    return { label: '故事', category: 'story' };
  }
  if (actionType.includes('photo')) {
    return { label: '相册', category: 'photo' };
  }
  if (actionType.includes('calendar') || actionType.includes('birthday')) {
    return { label: '节点', category: 'calendar' };
  }
  if (actionType.includes('meeting') || actionType.includes('vote') || actionType.includes('opinion')) {
    return { label: '议事', category: 'meeting' };
  }
  if (actionType.includes('output')) {
    return { label: '成果物', category: 'output' };
  }
  if (actionType.includes('invite')) {
    return { label: '邀请', category: 'invite' };
  }
  return { label: '更新', category: 'other' };
}

/** Map category → StatusBadge variant and link prefix */
export function getActivityCategoryMeta(category: ReturnType<typeof getActivityLabel>['category']): {
  badgeVariant: 'success' | 'warning' | 'muted' | 'default' | 'danger';
  linkPrefix?: string;
} {
  switch (category) {
    case 'member':
      return { badgeVariant: 'success', linkPrefix: '/family/members' };
    case 'story':
      return { badgeVariant: 'warning', linkPrefix: '/family/stories' };
    case 'photo':
      return { badgeVariant: 'default', linkPrefix: '/family/photos' };
    case 'calendar':
      return { badgeVariant: 'warning', linkPrefix: '/family/calendar' };
    case 'meeting':
      return { badgeVariant: 'default', linkPrefix: '/family/meetings' };
    case 'output':
      return { badgeVariant: 'success', linkPrefix: '/family/output' };
    case 'invite':
      return { badgeVariant: 'muted', linkPrefix: '/family/invite' };
    default:
      return { badgeVariant: 'muted' };
  }
}

/** Build a human-readable summary line from an ActionLog entry */
export function getActivitySummary(log: ActionLog): string {
  const action = log.action_type;
  if (action === 'create_person_profile') return '添加了新的家人档案';
  if (action === 'update_person_profile') return '更新了家人资料';
  if (action === 'update_person_birthdate') return '修改了家人生日信息';
  if (action === 'claim_person_profile') return '认领了家人档案';
  if (action === 'create_person_relation') return '添加了亲属关系';
  if (action === 'create_family_story') return '记录了新的家族故事';
  if (action === 'archive_family_story') return '归档了家族故事';
  if (action === 'create_family_photo') return '添加了新的照片记录';
  if (action === 'archive_family_photo') return '归档了照片记录';
  if (action === 'create_family_meeting') return '发起了新的家族议事';
  if (action === 'update_family_meeting') return '更新了议事内容';
  if (action === 'close_family_meeting') return '关闭了家族议事';
  if (action === 'archive_family_meeting') return '归档了家族议事';
  if (action === 'submit_meeting_vote') return '参与了议事投票';
  if (action === 'create_meeting_opinion') return '发表了议事意见';
  if (action === 'update_meeting_opinion') return '修改了议事意见';
  if (action === 'create_family_calendar_event') return '添加了家庭节点';
  if (action === 'update_family_calendar_event') return '更新了家庭节点';
  if (action === 'archive_family_calendar_event') return '归档了家庭节点';
  if (action === 'create_person_birthday_event') return '同步了生日提醒';
  if (action === 'create_family_output') return '生成了新的成果物';
  if (action === 'archive_family_output') return '归档了成果物';
  if (action === 'create_family_space') return '创建了数字家堂';
  if (action === 'update_family_space') return '更新了家堂设置';
  if (action === 'create_invite_token') return '生成了邀请链接';
  return '家堂有新的变化';
}
