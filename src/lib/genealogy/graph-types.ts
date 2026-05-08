/* Adapted from pure-genealogy under MIT License (https://github.com/yunfengsa/pure-genealogy). */

import type { ClaimStatus, Gender, LivingStatus, RelationType } from '@/types/domain';

export type GenealogyClaimLabel = '已认领' | '待认领' | '有争议' | '已拒绝' | '已隐藏';
export type GenealogyLivingLabel = '健在' | '离世' | '未填写';
export type GenealogyRelationLabel = '父母关系' | '子女关系' | '配偶关系' | '兄弟姐妹关系' | '祖辈关系';
export type GenealogyNodeHighlight = 'normal' | 'selected' | 'connected' | 'dimmed';
export type GenealogyEdgeHighlight = 'normal' | 'connected' | 'dimmed';

export type GraphRelationFilter = Record<RelationType, boolean>;

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
  highlightState?: GenealogyNodeHighlight;
}

export interface GenealogyGraphEdge {
  id: string;
  source: string;
  target: string;
  relationType: RelationType;
  label: GenealogyRelationLabel;
  highlightState?: GenealogyEdgeHighlight;
}

export interface GenealogyGraphData {
  nodes: GenealogyGraphNode[];
  edges: GenealogyGraphEdge[];
}

export interface GraphHighlightState {
  selectedNodeId: string | null;
  connectedNodeIds: string[];
  connectedEdgeIds: string[];
}

export interface GraphSearchResult {
  id: string;
  label: string;
  relationHint: string | null;
}
