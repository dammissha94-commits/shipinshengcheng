import type { FamilyMembership } from '@/types/domain';
import type { UserFamilyRole } from '@/types/service';
import { getCurrentUser } from './auth-service';
import { createSupabaseServiceClient, hasSupabaseConfig } from '@/lib/supabase/client';
import { throwServiceError } from '@/lib/services/service-client';

export async function getUserFamilyRole(familyId: string): Promise<UserFamilyRole> {
  if (!hasSupabaseConfig()) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const client = createSupabaseServiceClient();
  const result = await client
    .from<FamilyMembership>('family_memberships')
    .select('*')
    .eq('family_id', familyId)
    .eq('user_id', user.id)
    .eq('join_status', 'active');

  throwServiceError(result.error, 'get user family role failed');
  return result.data?.[0]?.role ?? null;
}

export async function isFamilyOwner(familyId: string): Promise<boolean> {
  return (await getUserFamilyRole(familyId)) === 'owner';
}

export async function isFamilyAdmin(familyId: string): Promise<boolean> {
  const role = await getUserFamilyRole(familyId);
  return role === 'owner' || role === 'family_admin';
}

export async function isFamilyMember(familyId: string): Promise<boolean> {
  return (await getUserFamilyRole(familyId)) !== null;
}

export async function canManageFamilyMemory(familyId: string): Promise<boolean> {
  const role = await getUserFamilyRole(familyId);
  return role === 'owner' || role === 'family_admin' || role === 'memory_admin';
}

export async function canCreateFamilyOutput(familyId: string): Promise<boolean> {
  return canManageFamilyMemory(familyId);
}

export async function canCreateFamilyContent(familyId: string): Promise<boolean> {
  return isFamilyMember(familyId);
}

export async function canCreateFamilyMeeting(familyId: string): Promise<boolean> {
  return isFamilyAdmin(familyId);
}

export async function canManageFamily(familyId: string): Promise<boolean> {
  return isFamilyAdmin(familyId);
}
