import type { Gender, PersonRelation } from '@/types/domain';
import { normalizeRelationType } from './kinship-adapter';

function grandchildLabel(gender?: Gender | null): string {
  if (gender === 'male') return '孙子';
  if (gender === 'female') return '孙女';
  return '孙辈';
}

function isRelationEndpoint(relation: PersonRelation, personId: string): boolean {
  return relation.from_person_id === personId || relation.to_person_id === personId;
}

/**
 * Returns what `subjectPersonId` is to the other endpoint of this relation.
 *
 * Example:
 * - parent_of A -> B, subject A: 父亲/母亲/父母
 * - parent_of A -> B, subject B: 儿子/女儿/子女
 */
export function relationLabelForSubject(
  relation: PersonRelation,
  subjectPersonId: string,
  subjectGender?: Gender | null,
): string | null {
  if (!isRelationEndpoint(relation, subjectPersonId)) return null;

  const subjectIsFrom = relation.from_person_id === subjectPersonId;

  if (relation.relation_type === 'parent_of') {
    return subjectIsFrom
      ? normalizeRelationType('parent_of', subjectGender ?? undefined)
      : normalizeRelationType('child_of', subjectGender ?? undefined);
  }

  if (relation.relation_type === 'child_of') {
    return subjectIsFrom
      ? normalizeRelationType('child_of', subjectGender ?? undefined)
      : normalizeRelationType('parent_of', subjectGender ?? undefined);
  }

  if (relation.relation_type === 'grandparent_of') {
    return subjectIsFrom
      ? normalizeRelationType('grandparent_of', subjectGender ?? undefined)
      : grandchildLabel(subjectGender);
  }

  return normalizeRelationType(relation.relation_type, subjectGender ?? undefined);
}

export function relationLabelForOther(
  relation: PersonRelation,
  currentPersonId: string,
  otherGender?: Gender | null,
): string | null {
  if (!isRelationEndpoint(relation, currentPersonId)) return null;
  const otherPersonId =
    relation.from_person_id === currentPersonId
      ? relation.to_person_id
      : relation.from_person_id;
  return relationLabelForSubject(relation, otherPersonId, otherGender);
}
