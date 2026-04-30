/* Adapted from pure-genealogy under MIT License (https://github.com/yunfengsa/pure-genealogy). */

import type { ClaimStatus, LivingStatus, PersonProfile, PersonRelation, RelationType } from '@/types/domain';
import type {
  GenealogyClaimLabel,
  GenealogyGraphData,
  GenealogyGraphEdge,
  GenealogyGraphNode,
  GenealogyLivingLabel,
  GenealogyRelationLabel,
} from './graph-types';

const CLAIM_LABELS: Record<ClaimStatus, GenealogyClaimLabel> = {
  claimed: '已认领',
  unclaimed: '待认领',
  disputed: '有争议',
};

const LIVING_LABELS: Record<LivingStatus, GenealogyLivingLabel> = {
  alive: '在世',
  deceased: '已故',
  unknown: '未知',
};

const RELATION_LABELS: Record<RelationType, GenealogyRelationLabel> = {
  parent_of: '父母关系',
  child_of: '子女关系',
  spouse_of: '配偶关系',
  sibling_of: '兄弟姐妹关系',
  grandparent_of: '祖辈关系',
};

function deriveGenerationLevels(
  personIds: string[],
  relations: PersonRelation[]
): Map<string, number> {
  const levels = new Map<string, number>();
  const childrenByParent = new Map<string, Set<string>>();
  const parentsByChild = new Map<string, Set<string>>();
  const allowed = new Set(personIds);

  function pushPair(map: Map<string, Set<string>>, key: string, value: string) {
    const existing = map.get(key);
    if (existing) existing.add(value);
    else map.set(key, new Set([value]));
  }

  for (const relation of relations) {
    if (relation.status !== 'active') continue;
    if (!allowed.has(relation.from_person_id) || !allowed.has(relation.to_person_id)) continue;

    if (relation.relation_type === 'parent_of') {
      pushPair(childrenByParent, relation.from_person_id, relation.to_person_id);
      pushPair(parentsByChild, relation.to_person_id, relation.from_person_id);
    } else if (relation.relation_type === 'child_of') {
      pushPair(childrenByParent, relation.to_person_id, relation.from_person_id);
      pushPair(parentsByChild, relation.from_person_id, relation.to_person_id);
    } else if (relation.relation_type === 'grandparent_of') {
      pushPair(childrenByParent, relation.from_person_id, `__grand__${relation.to_person_id}`);
    }
  }

  const roots = personIds.filter((id) => !parentsByChild.has(id));
  const queue: Array<{ id: string; level: number }> = (roots.length > 0 ? roots : personIds.slice(0, 1)).map(
    (id) => ({ id, level: 0 })
  );

  const visited = new Set<string>();
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) {
      const existing = levels.get(id);
      if (existing !== undefined && existing <= level) continue;
    }
    visited.add(id);
    levels.set(id, Math.max(levels.get(id) ?? level, level));

    const children = childrenByParent.get(id);
    if (!children) continue;
    children.forEach((rawChildId) => {
      const isGrand = rawChildId.startsWith('__grand__');
      const childId = isGrand ? rawChildId.slice('__grand__'.length) : rawChildId;
      const childLevel = isGrand ? level + 2 : level + 1;
      const known = levels.get(childId);
      if (known === undefined || known < childLevel) {
        queue.push({ id: childId, level: childLevel });
      }
    });
  }

  for (const id of personIds) {
    if (!levels.has(id)) levels.set(id, 0);
  }

  return levels;
}

function buildRelationHint(profile: PersonProfile): string | null {
  const segments: string[] = [];
  if (profile.gender === 'male') segments.push('男');
  else if (profile.gender === 'female') segments.push('女');
  if (profile.living_status === 'deceased') segments.push('已故');
  else if (profile.living_status === 'alive') segments.push('在世');
  return segments.length > 0 ? segments.join(' · ') : null;
}

export function buildGenealogyGraphData(
  persons: PersonProfile[],
  relations: PersonRelation[]
): GenealogyGraphData {
  if (!persons.length) {
    return { nodes: [], edges: [] };
  }

  const personIds = persons.map((person) => person.id);
  const personSet = new Set(personIds);
  const generationLevels = deriveGenerationLevels(personIds, relations);

  const nodes: GenealogyGraphNode[] = persons.map((person) => ({
    id: person.id,
    label: person.display_name,
    gender: person.gender ?? null,
    claimStatus: person.claim_status,
    claimStatusLabel: CLAIM_LABELS[person.claim_status] ?? '待认领',
    livingStatus: person.living_status,
    livingStatusLabel: LIVING_LABELS[person.living_status] ?? '未知',
    generationLevel: generationLevels.get(person.id) ?? null,
    relationHint: buildRelationHint(person),
    birthYear: person.birth_year,
    deathYear: person.death_year,
  }));

  const seen = new Set<string>();
  const edges: GenealogyGraphEdge[] = [];

  for (const relation of relations) {
    if (relation.status !== 'active') continue;
    if (!personSet.has(relation.from_person_id) || !personSet.has(relation.to_person_id)) continue;

    const key = `${relation.relation_type}:${relation.from_person_id}->${relation.to_person_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    edges.push({
      id: relation.id,
      source: relation.from_person_id,
      target: relation.to_person_id,
      relationType: relation.relation_type,
      label: RELATION_LABELS[relation.relation_type] ?? '父母关系',
    });
  }

  return { nodes, edges };
}
