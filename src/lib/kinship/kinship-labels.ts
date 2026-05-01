import type { Gender, Relation, RelationType } from '@/types/domain';
import { getRelationLabel } from '@/types/domain';
import type { RelationTextMap } from './kinship-types';

// ---------------------------------------------------------------------------
// Label mappings & fallback logic
// This file does NOT import from relationship-ts.
// Only kinship-adapter.ts touches the third-party library.
// ---------------------------------------------------------------------------

// ---- Relation → relationship-ts-compatible text ---------------------------

/** Map our internal Relation values to relationship-ts-compatible text */
export const RELATION_TO_TEXT: RelationTextMap = {
  self: '自己',
  father: '爸爸',
  mother: '妈妈',
  spouse: '配偶',
  child: '子女',
  sibling: '兄弟姐妹',
  grandfather_paternal: '爷爷',
  grandmother_paternal: '奶奶',
  grandfather_maternal: '外公',
  grandmother_maternal: '外婆',
};

/**
 * Map a Relation + optional gender to a gender-specific text
 * for relationship-ts queries.
 */
export function relationToText(relation: Relation, gender?: Gender): string {
  if (relation === 'spouse') {
    if (gender === 'male') return '丈夫';
    if (gender === 'female') return '妻子';
    return '配偶';
  }
  if (relation === 'child') {
    if (gender === 'male') return '儿子';
    if (gender === 'female') return '女儿';
    return '子女';
  }
  if (relation === 'sibling') {
    if (gender === 'male') return '兄弟';
    if (gender === 'female') return '姐妹';
    return '兄弟姐妹';
  }
  return RELATION_TO_TEXT[relation] ?? '家人';
}

// ---- Gender conversion ---------------------------------------------------

/**
 * Convert our Gender to relationship-ts sex code.
 * 1 = male, 0 = female, undefined = unknown.
 */
export function genderToSex(gender: Gender): number {
  if (gender === 'male') return 1;
  if (gender === 'female') return 0;
  return -1;
}

// ---- Fallback functions ---------------------------------------------------

/**
 * Fallback: delegates to existing getRelationLabel.
 * Used when relationship-ts cannot produce a result.
 */
export function fallbackLabel(relation: Relation, gender?: Gender): string {
  return getRelationLabel(relation, gender);
}

/**
 * Conservative label for a RelationType when gender is unknown.
 *
 * Key fallback rules (per task requirements):
 * - sibling_of without gender → "兄弟姐妹"
 * - grandparent_of without gender → "祖辈"
 * - Other cases → reasonable generic label
 */
export function conservativeRelationTypeLabel(
  relationType: RelationType,
  gender?: Gender,
): string {
  switch (relationType) {
    case 'parent_of':
      if (gender === 'male') return '父亲';
      if (gender === 'female') return '母亲';
      return '父母';
    case 'child_of':
      if (gender === 'male') return '儿子';
      if (gender === 'female') return '女儿';
      return '子女';
    case 'spouse_of':
      if (gender === 'male') return '丈夫';
      if (gender === 'female') return '妻子';
      return '配偶';
    case 'sibling_of':
      if (gender === 'male') return '兄弟';
      if (gender === 'female') return '姐妹';
      // fallback: 无性别字段时返回“兄弟姐妹”
      return '兄弟姐妹';
    case 'grandparent_of':
      if (gender === 'male') return '祖父';
      if (gender === 'female') return '祖母';
      // fallback: 无性别字段时返回“祖辈”
      return '祖辈';
    default:
      return '家人';
  }
}

/**
 * Map a RelationType to a broad category label (used for relation-path building).
 */
export function relationTypeToGenericText(relationType: RelationType): string {
  switch (relationType) {
    case 'parent_of':
      return '父母';
    case 'child_of':
      return '子女';
    case 'spouse_of':
      return '配偶';
    case 'sibling_of':
      return '兄弟姐妹';
    case 'grandparent_of':
      return '祖辈';
    default:
      return '家人';
  }
}
