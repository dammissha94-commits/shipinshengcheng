// ---------------------------------------------------------------------------
// kinship-adapter.ts — THE ONLY FILE that imports from relationship-ts.
//
// All business pages and other lib modules MUST go through this adapter.
// Do NOT import relationship-ts anywhere else in the project.
// ---------------------------------------------------------------------------

import relationship from 'relationship-ts';
import type { Gender, Relation, RelationType } from '@/types/domain';
import type { KinshipResult } from './kinship-types';
import {
  relationToText,
  genderToSex,
  fallbackLabel,
  conservativeRelationTypeLabel,
  relationTypeToGenericText,
} from './kinship-labels';

// ---- Types ---------------------------------------------------------------

type RelationshipInput = Parameters<typeof relationship>[0];
type RelationshipOptions = Exclude<RelationshipInput, string>;
type RelationshipSex = NonNullable<RelationshipOptions['sex']>;

// ---- Helpers -------------------------------------------------------------

/**
 * Convert the local Gender type into the relationship-ts Sex type.
 *
 * relationship-ts has its own Sex type, so do not expose raw number here.
 */
function toRelationshipSex(gender?: Gender): RelationshipSex {
  const sex = gender ? genderToSex(gender) : -1;
  return sex as RelationshipSex;
}

/**
 * Safely call the relationship-ts library.
 * Returns a string[] on success, or null if anything throws/returns unexpected.
 */
function safeRelationship(options: RelationshipOptions): string[] | null {
  try {
    const raw: unknown = relationship(options);
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.filter(
        (item): item is string => typeof item === 'string' && item.length > 0,
      );
    }
    if (typeof raw === 'string' && raw.length > 0) {
      return [raw];
    }
    return null;
  } catch {
    return null;
  }
}

function buildResult(
  result: string[] | null,
  fallback: string,
): KinshipResult {
  if (result && result.length > 0) {
    return {
      label: result[0],
      alternatives: result.slice(1),
      source: 'relationship-ts',
    };
  }
  return {
    label: fallback,
    alternatives: [],
    source: 'fallback',
  };
}

// ---- Public API ----------------------------------------------------------

/**
 * Get a kinship label for a given Relation.
 *
 * Uses relationship-ts for enhanced Chinese kinship terms when possible.
 * Falls back to the existing getRelationLabel() when relationship-ts
 * cannot produce a result or throws an error.
 *
 * @param relation - The internal Relation code (e.g. 'father', 'sibling')
 * @param gender   - The person's gender, if known
 *
 * @example
 *   getKinshipLabel('father')           // => { label: '父亲', source: 'relationship-ts' }
 *   getKinshipLabel('sibling', 'male')  // => { label: '兄弟', source: 'relationship-ts' }
 *   getKinshipLabel('spouse', 'female') // => { label: '妻子', source: 'relationship-ts' }
 */
export function getKinshipLabel(
  relation: Relation,
  gender?: Gender,
): KinshipResult {
  const fallback = fallbackLabel(relation, gender);
  const text = relationToText(relation, gender);

  const result = safeRelationship({ text });
  return buildResult(result, fallback);
}

/**
 * Get the reverse kinship label — what the other person would call me.
 *
 * @param relation  - My relation to the other person
 * @param myGender  - My own gender (affects reverse lookup)
 *
 * @example
 *   getReverseKinshipLabel('child', 'male')  // => '儿子' (I am someone's son)
 *   getReverseKinshipLabel('father', 'male') // => '父亲' (what my child calls me)
 */
export function getReverseKinshipLabel(
  relation: Relation,
  myGender?: Gender,
): KinshipResult {
  const fallback = fallbackLabel(relation);
  const text = relationToText(relation);
  const sex = toRelationshipSex(myGender);

  const result = safeRelationship({ text, reverse: true, sex });
  return buildResult(result, fallback);
}

/**
 * Get a label for a relation path (chain of relations).
 *
 * For example: a path of [grandparent_of, child_of] from Ego means
 * "my grandparent's child" → hopefully "uncle/aunt".
 *
 * @param path    - Ordered list of RelationType values forming the path
 * @param genders - Parallel array of genders for each node in the path
 *
 * @example
 *   getRelationPathLabel({ path: ['parent_of', 'parent_of'] })
 *   // => { label: '祖辈', ... } or '爷爷奶奶' with genders
 */
export function getRelationPathLabel(path: RelationType[]): KinshipResult {
  if (path.length === 0) {
    return {
      label: '自己',
      alternatives: [],
      source: 'fallback',
    };
  }

  // Build the text chain: "A的B的C"
  const pathText = path.map((rt) => relationTypeToGenericText(rt)).join('的');

  try {
    const result = safeRelationship({ text: pathText });
    if (result) {
      return buildResult(result, pathText);
    }
    // relationship-ts couldn't resolve — return the conservative path text
    return {
      label: pathText,
      alternatives: [],
      source: 'fallback',
    };
  } catch {
    return {
      label: pathText,
      alternatives: [],
      source: 'fallback',
    };
  }
}

/**
 * Normalize a RelationType into a human-readable Chinese label.
 *
 * Uses conservative labels:
 * - sibling_of without gender → "兄弟姐妹"
 * - grandparent_of without gender → "祖辈"
 *
 * @param relationType - The database RelationType code
 * @param gender       - Gender hint, if available from related PersonProfile
 */
export function normalizeRelationType(
  relationType: RelationType,
  gender?: Gender,
): string {
  return conservativeRelationTypeLabel(relationType, gender);
}