import type { RelationType } from '@/types/domain';
import type {
  GenealogyGraphEdge,
  GenealogyGraphNode,
  GraphHighlightState,
  GraphRelationFilter,
  GraphSearchResult,
} from './graph-types';

export const DEFAULT_GRAPH_RELATION_FILTERS: GraphRelationFilter = {
  parent_of: true,
  child_of: true,
  spouse_of: true,
  sibling_of: true,
  grandparent_of: true,
};

export const GRAPH_RELATION_FILTER_LABELS: Record<RelationType, string> = {
  parent_of: '父母关系',
  child_of: '子女关系',
  spouse_of: '配偶关系',
  sibling_of: '兄弟姐妹关系',
  grandparent_of: '祖辈关系',
};

export function searchGraphNodes(
  nodes: GenealogyGraphNode[],
  keyword: string
): GraphSearchResult[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return [];

  return nodes
    .filter((node) => node.label.toLowerCase().includes(normalized))
    .slice(0, 8)
    .map((node) => ({
      id: node.id,
      label: node.label,
      relationHint: node.relationHint,
    }));
}

export function getConnectedNodeIds(nodeId: string, edges: GenealogyGraphEdge[]): string[] {
  const nodeIds = new Set<string>();
  for (const edge of edges) {
    if (edge.source === nodeId) nodeIds.add(edge.target);
    if (edge.target === nodeId) nodeIds.add(edge.source);
  }
  return Array.from(nodeIds);
}

export function getConnectedEdgeIds(nodeId: string, edges: GenealogyGraphEdge[]): string[] {
  return edges
    .filter((edge) => edge.source === nodeId || edge.target === nodeId)
    .map((edge) => edge.id);
}

export function filterGraphEdgesByRelation(
  edges: GenealogyGraphEdge[],
  filters: GraphRelationFilter
): GenealogyGraphEdge[] {
  return edges.filter((edge) => {
    if (edge.relationType === 'parent_of' || edge.relationType === 'child_of') {
      return filters.parent_of && filters.child_of;
    }
    return filters[edge.relationType];
  });
}

export function buildHighlightState(
  selectedNodeId: string | null,
  edges: GenealogyGraphEdge[]
): GraphHighlightState {
  if (!selectedNodeId) {
    return {
      selectedNodeId: null,
      connectedNodeIds: [],
      connectedEdgeIds: [],
    };
  }

  return {
    selectedNodeId,
    connectedNodeIds: getConnectedNodeIds(selectedNodeId, edges),
    connectedEdgeIds: getConnectedEdgeIds(selectedNodeId, edges),
  };
}

export function isDefaultRelationFilter(filters: GraphRelationFilter): boolean {
  return Object.entries(DEFAULT_GRAPH_RELATION_FILTERS).every(
    ([key, value]) => filters[key as RelationType] === value
  );
}
