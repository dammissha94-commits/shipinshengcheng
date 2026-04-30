/* Adapted from pure-genealogy under MIT License (https://github.com/yunfengsa/pure-genealogy). */

import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import { Position } from '@xyflow/react';
import type {
  GenealogyEdgeHighlight,
  GenealogyGraphData,
  GenealogyGraphEdge,
  GenealogyGraphNode,
  GenealogyNodeHighlight,
  GraphHighlightState,
} from './graph-types';

export const NODE_WIDTH = 168;
export const NODE_HEIGHT = 96;

const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 90;

export type GenealogyLayoutDirection = 'TB' | 'LR';

export interface LayoutResult {
  nodes: Array<Node<GenealogyGraphNode & { [key: string]: unknown }>>;
  edges: Edge[];
}

const HIERARCHY_TYPES = new Set(['parent_of', 'child_of', 'grandparent_of']);
const SAME_LEVEL_TYPES = new Set(['spouse_of', 'sibling_of']);

const EDGE_STYLE_BY_TYPE: Record<string, { stroke: string; dasharray?: string }> = {
  parent_of: { stroke: '#1E3A2F' },
  child_of: { stroke: '#1E3A2F' },
  grandparent_of: { stroke: '#9E8448', dasharray: '6 4' },
  spouse_of: { stroke: '#C4AA6A', dasharray: '2 4' },
  sibling_of: { stroke: '#7A746E', dasharray: '4 4' },
};

function resolveNodeHighlight(nodeId: string, highlight?: GraphHighlightState): GenealogyNodeHighlight {
  if (!highlight?.selectedNodeId) return 'normal';
  if (highlight.selectedNodeId === nodeId) return 'selected';
  if (highlight.connectedNodeIds.includes(nodeId)) return 'connected';
  return 'dimmed';
}

function resolveEdgeHighlight(edgeId: string, highlight?: GraphHighlightState): GenealogyEdgeHighlight {
  if (!highlight?.selectedNodeId) return 'normal';
  return highlight.connectedEdgeIds.includes(edgeId) ? 'connected' : 'dimmed';
}

function buildEdgeStyle(relationType: string, highlightState: GenealogyEdgeHighlight) {
  const config = EDGE_STYLE_BY_TYPE[relationType] ?? { stroke: '#7A746E' };
  const isConnected = highlightState === 'connected';
  const isDimmed = highlightState === 'dimmed';

  return {
    stroke: config.stroke,
    strokeWidth: isConnected ? 3 : 1.6,
    strokeDasharray: config.dasharray,
    opacity: isDimmed ? 0.16 : isConnected ? 1 : 0.82,
  };
}

export function layoutGenealogyGraph(
  data: GenealogyGraphData,
  direction: GenealogyLayoutDirection = 'TB',
  highlight?: GraphHighlightState
): LayoutResult {
  if (!data.nodes.length) {
    return { nodes: [], edges: [] };
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: HORIZONTAL_GAP,
    ranksep: VERTICAL_GAP,
  });

  data.nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  const layoutEdges: GenealogyGraphEdge[] = [];
  data.edges.forEach((edge) => {
    if (HIERARCHY_TYPES.has(edge.relationType)) {
      const source = edge.relationType === 'child_of' ? edge.target : edge.source;
      const target = edge.relationType === 'child_of' ? edge.source : edge.target;
      dagreGraph.setEdge(source, target, { weight: edge.relationType === 'grandparent_of' ? 1 : 2 });
    }
    layoutEdges.push(edge);
  });

  dagre.layout(dagreGraph);

  const targetPosition = direction === 'LR' ? Position.Left : Position.Top;
  const sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;

  const nodes: LayoutResult['nodes'] = data.nodes.map((node) => {
    const positioned = dagreGraph.node(node.id);
    const x = (positioned?.x ?? 0) - NODE_WIDTH / 2;
    const y = (positioned?.y ?? 0) - NODE_HEIGHT / 2;
    const highlightState = resolveNodeHighlight(node.id, highlight);

    return {
      id: node.id,
      type: 'genealogy',
      position: { x, y },
      targetPosition,
      sourcePosition,
      data: { ...node, highlightState },
    };
  });

  const edges: Edge[] = layoutEdges.map((edge) => {
    const isSameLevel = SAME_LEVEL_TYPES.has(edge.relationType);
    const highlightState = resolveEdgeHighlight(edge.id, highlight);

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'genealogy',
      animated: highlightState === 'connected',
      data: {
        relationType: edge.relationType,
        label: edge.label,
        isSameLevel,
        highlightState,
      },
      style: buildEdgeStyle(edge.relationType, highlightState),
    };
  });

  return { nodes, edges };
}
