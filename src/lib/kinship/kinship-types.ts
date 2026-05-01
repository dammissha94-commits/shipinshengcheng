import type { Gender, Relation, RelationType } from '@/types/domain';

// ---------------------------------------------------------------------------
// Kinship adapter – low-impact types layer
// This file does NOT import from relationship-ts.
// Only kinship-adapter.ts touches the third-party library.
// ---------------------------------------------------------------------------

/** Gender representation for kinship queries */
export type KinshipGender = 'male' | 'female' | 'unknown';

/** Source of a kinship lookup result */
export type KinshipSource = 'relationship-ts' | 'fallback';

/** Result from a kinship lookup */
export interface KinshipResult {
  /** Primary label (the best match) */
  label: string;
  /** Alternative labels */
  alternatives: string[];
  /** Whether the result came from relationship-ts or is a fallback */
  source: KinshipSource;
}

/** Mapping from our internal Relation to relationship-ts-compatible text */
export type RelationTextMap = Record<Relation, string>;

/** Options for getKinshipLabel */
export interface KinshipLabelOptions {
  /** The person's gender (if known) */
  gender?: Gender;
  /** When true, compute the reverse relation (what the other calls me) */
  reverse?: boolean;
  /** My gender, used in reverse lookups */
  myGender?: Gender;
}

/** Options for getRelationPathLabel */
export interface KinshipPathOptions {
  /** Chain of RelationType values */
  path: RelationType[];
  /** Genders for each node in the path (parallel array to path) */
  genders?: Gender[];
}
