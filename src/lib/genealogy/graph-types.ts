/* Adapted from pure-genealogy under MIT License (https://github.com/yunfengsa/pure-genealogy). */

import type { ClaimStatus, Gender, LivingStatus, RelationType } from '@/types/domain';

export type GenealogyClaimLabel = '已认领' | '待认领' | '有争议';
export type GenealogyLivingLabel = '在世' | '已故' | '未知';
export type GenealogyRelationLabel = '父母' | '子女' | '配偶' | '兄弟姐妹' | '祖辈';

export interface GenealogyGraphNode {
  id: string;
  label: string;
  gender: Gender | null;
  claimStatus: ClaimStatus;
  claimStatusLabel: GenealogyClaimLabel;
  livingStatus: LivingStatus;
  livingStatusLabel: GenealogyLivingLabel;
  generationLevel: number | null;
  relationHint: string | null;
  birthYear: number | null;
  deathYear: number | null;
}

export interface GenealogyGraphEdge {
  id: string;
  source: string;
  target: string;
  relationType: RelationType;
  label: GenealogyRelationLabel;
}

export interface GenealogyGraphData {
  nodes: GenealogyGraphNode[];
  edges: GenealogyGraphEdge[];
}
