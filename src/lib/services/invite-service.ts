import type { ActionLog, InviteStatus, InviteToken, PersonProfile } from '@/types/domain';
import type { ClaimInviteResult, CreateInviteTokenInput, InviteWithPerson } from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import {
  createSupabaseBrowserClient,
  createSupabaseServiceClient,
  hasSupabaseConfig,
} from '@/lib/supabase/client';
import type { SupabaseServiceClient } from './service-client';
import { createId, nowIso, throwServiceError } from './service-client';

export interface PendingInviteTarget {
  person: PersonProfile;
  invite: InviteToken | null;
}

const mockInvites: InviteToken[] = [];
const mockPeople: PersonProfile[] = [];

type InviteRpcResult = {
  invite: InviteToken;
  family: InviteWithPerson['family'];
  person: PersonProfile;
};

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

function createTokenValue(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function defaultExpiresAt(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString();
}

export async function createInviteToken(
  input: CreateInviteTokenInput,
  client?: SupabaseServiceClient
): Promise<InviteToken> {
  const user = await getCurrentUser();
  const userId = user?.id ?? 'mock-user';
  const timestamp = nowIso();
  const token = createTokenValue();
  const expiresAt = input.expiresAt ?? defaultExpiresAt();
  const resolvedClient = getClient(client);

  if (!resolvedClient) {
    const invite: InviteToken = {
      id: createId('invite'),
      family_id: input.familyId,
      inviter_user_id: userId,
      invitee_person_id: input.inviteePersonId,
      token,
      invite_type: input.inviteType ?? 'claim_person',
      status: 'pending',
      expires_at: expiresAt,
      claimed_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    mockInvites.push(invite);
    return invite;
  }

  if (!user) throw new Error('请先登录');

  const result = await resolvedClient
    .from<InviteToken>('invite_tokens')
    .insert({
      family_id: input.familyId,
      inviter_user_id: user.id,
      invitee_person_id: input.inviteePersonId,
      token,
      invite_type: input.inviteType ?? 'claim_person',
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  throwServiceError(result.error, 'create invite token failed');
  await writeActionLog(resolvedClient, {
    family_id: input.familyId,
    actor_user_id: user.id,
    target_type: 'invite_token',
    target_id: result.data!.id,
    action_type: 'create_invite_token',
    metadata: { invitee_person_id: input.inviteePersonId },
  });

  return result.data!;
}

export async function getInviteByToken(token: string): Promise<InviteWithPerson> {
  if (!hasSupabaseConfig()) {
    throw new Error('尚未配置 Supabase 环境变量，请先配置 .env.local');
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('get_invite_claim_context', {
    p_token: token,
  });

  if (error) throw new Error('邀请链接暂时不可用，请稍后重试');

  const result = data as InviteRpcResult;
  return {
    invite: result.invite,
    family: {
      ...result.family,
      displayName: result.family.displayName ?? result.family.display_name,
      ownerName: result.family.ownerName ?? '',
      createdAt: result.family.createdAt ?? result.family.created_at,
    },
    person: result.person,
  };
}

export async function claimInviteToken(token: string): Promise<ClaimInviteResult> {
  if (!hasSupabaseConfig()) {
    throw new Error('尚未配置 Supabase 环境变量，请先配置 .env.local');
  }

  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('claim_invite_token', {
    p_token: token,
  });

  if (error) throw new Error('认领失败，请稍后重试');

  const result = data as InviteRpcResult;
  return {
    invite: result.invite,
    family: {
      ...result.family,
      displayName: result.family.displayName ?? result.family.display_name,
      ownerName: result.family.ownerName ?? '',
      createdAt: result.family.createdAt ?? result.family.created_at,
    },
    person: result.person,
  };
}

export async function listPendingInvites(
  familyId: string,
  client?: SupabaseServiceClient
): Promise<PendingInviteTarget[]> {
  const resolvedClient = getClient(client);

  if (!resolvedClient) {
    return mockPeople
      .filter((person) => person.family_id === familyId && person.claim_status === 'unclaimed')
      .map((person) => ({
        person,
        invite:
          mockInvites.find(
            (invite) => invite.invitee_person_id === person.id && invite.status === 'pending'
          ) ?? null,
      }));
  }

  const peopleResult = await resolvedClient
    .from<PersonProfile>('person_profiles')
    .select('*')
    .eq('family_id', familyId)
    .eq('claim_status', 'unclaimed')
    .order('created_at', { ascending: true });

  throwServiceError(peopleResult.error, 'list unclaimed persons failed');

  const invitesResult = await resolvedClient
    .from<InviteToken>('invite_tokens')
    .select('*')
    .eq('family_id', familyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  throwServiceError(invitesResult.error, 'list pending invites failed');
  const invites = invitesResult.data ?? [];

  return (peopleResult.data ?? []).map((person) => ({
    person,
    invite: invites.find((invite) => invite.invitee_person_id === person.id) ?? null,
  }));
}

export async function markInviteClaimed(
  token: string,
  client?: SupabaseServiceClient
): Promise<InviteToken> {
  return updateInviteStatus(token, 'claimed', client);
}

export async function revokeInviteToken(tokenId: string): Promise<void> {
  void tokenId;
  throw new Error('revokeInviteToken is reserved for the next permission stage');
}

export async function updateInviteStatus(
  token: string,
  status: InviteStatus,
  client?: SupabaseServiceClient
): Promise<InviteToken> {
  const claimedAt = status === 'claimed' ? nowIso() : null;
  const resolvedClient = getClient(client);

  if (!resolvedClient) {
    const invite = mockInvites.find((item) => item.token === token || item.id === token);
    if (!invite) throw new Error('update invite status failed: invite not found');
    invite.status = status;
    invite.claimed_at = claimedAt;
    invite.updated_at = nowIso();
    return invite;
  }

  const result = await resolvedClient
    .from<InviteToken>('invite_tokens')
    .update({
      status,
      claimed_at: claimedAt,
    })
    .eq('token', token)
    .select('*')
    .single();

  throwServiceError(result.error, 'update invite status failed');
  return result.data!;
}

/** P0-A: Reject an invite — marks token as rejected and person as rejected */
export async function rejectInviteToken(
  token: string,
  client?: SupabaseServiceClient
): Promise<void> {
  const resolvedClient = getClient(client);
  if (!resolvedClient) return;

  const inviteResult = await resolvedClient
    .from<InviteToken>('invite_tokens')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending');

  throwServiceError(inviteResult.error, 'reject invite failed');
  const invite = (inviteResult.data ?? [])[0];
  if (!invite || !invite.invitee_person_id) throw new Error('邀请链接无效或已过期');

  const user = await getCurrentUser();
  if (!user) throw new Error('请先登录');

  // Mark invite as rejected
  await resolvedClient
    .from<InviteToken>('invite_tokens')
    .update({ status: 'rejected' })
    .eq('id', invite.id)
    .select('*');

  // Mark person as rejected
  await resolvedClient
    .from<PersonProfile>('person_profiles')
    .update({ claim_status: 'rejected', updated_at: nowIso() })
    .eq('id', invite.invitee_person_id)
    .eq('claim_status', 'unclaimed')
    .select('*');

  // Log
  await resolvedClient.from<ActionLog>('action_logs').insert({
    family_id: invite.family_id,
    actor_user_id: user.id,
    target_type: 'invite_token',
    target_id: invite.id,
    action_type: 'reject_invite_token',
    metadata: { person_id: invite.invitee_person_id },
  });
}

export const listInviteTokens = listPendingInvites;
