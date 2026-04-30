import type { Gender, Person, PersonProfile, PersonRelation, Relation } from '@/types/domain';

export function profileToPerson(profile: PersonProfile, relation: Relation): Person {
  return {
    id: profile.id,
    familyId: profile.family_id,
    name: profile.display_name,
    relation,
    gender: profile.gender ?? 'unknown',
    birthYear: profile.birth_year ?? undefined,
    claimStatus: profile.claim_status,
    visibility: profile.visibility,
  };
}

function grandparentRelation(gender: Gender | null, used: Set<Relation>): Relation {
  const candidates: Relation[] =
    gender === 'female'
      ? ['grandmother_paternal', 'grandmother_maternal']
      : ['grandfather_paternal', 'grandfather_maternal'];
  return candidates.find((candidate) => !used.has(candidate)) ?? candidates[0];
}

export function mapProfilesToTreePersons(
  profiles: PersonProfile[],
  relations: PersonRelation[],
  currentUserId: string
): Person[] {
  const selfProfile =
    profiles.find((profile) => profile.bound_user_id === currentUserId && profile.claim_status === 'claimed') ??
    profiles.find((profile) => profile.bound_user_id === currentUserId);

  if (!selfProfile) return [];

  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  const usedRelations = new Set<Relation>(['self']);
  const people: Person[] = [profileToPerson(selfProfile, 'self')];

  for (const relation of relations) {
    let targetProfile: PersonProfile | undefined;
    let uiRelation: Relation | null = null;

    if (relation.relation_type === 'parent_of' && relation.to_person_id === selfProfile.id) {
      targetProfile = byId.get(relation.from_person_id);
      uiRelation = targetProfile?.gender === 'female' ? 'mother' : 'father';
    } else if (relation.relation_type === 'parent_of' && relation.from_person_id === selfProfile.id) {
      targetProfile = byId.get(relation.to_person_id);
      uiRelation = 'child';
    } else if (relation.relation_type === 'spouse_of') {
      const spouseId =
        relation.from_person_id === selfProfile.id ? relation.to_person_id : relation.from_person_id;
      targetProfile = byId.get(spouseId);
      uiRelation = 'spouse';
    } else if (relation.relation_type === 'sibling_of') {
      const siblingId =
        relation.from_person_id === selfProfile.id ? relation.to_person_id : relation.from_person_id;
      targetProfile = byId.get(siblingId);
      uiRelation = 'sibling';
    } else if (relation.relation_type === 'grandparent_of' && relation.to_person_id === selfProfile.id) {
      targetProfile = byId.get(relation.from_person_id);
      uiRelation = grandparentRelation(targetProfile?.gender ?? null, usedRelations);
    }

    if (!targetProfile || !uiRelation) continue;
    usedRelations.add(uiRelation);
    people.push(profileToPerson(targetProfile, uiRelation));
  }

  return people;
}

export function getSelfProfile(profiles: PersonProfile[], currentUserId: string): PersonProfile | null {
  return (
    profiles.find((profile) => profile.bound_user_id === currentUserId && profile.claim_status === 'claimed') ??
    profiles.find((profile) => profile.bound_user_id === currentUserId) ??
    null
  );
}
