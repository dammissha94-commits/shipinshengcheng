/* Adapted from pure-genealogy under MIT License (https://github.com/yunfengsa/pure-genealogy). */

'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import type { EdgeTypes, Node, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Download, Loader2 } from 'lucide-react';
import type { GenealogyGraphData } from '@/lib/genealogy/graph-types';
import { layoutGenealogyGraph } from '@/lib/genealogy/graph-layout';
import { cn } from '@/lib/utils';
import { GenealogyNodeCard } from './GenealogyNodeCard';
import { GenealogyEdge } from './GenealogyEdge';
import { useExportGenealogyImage } from './useExportGenealogyImage';

interface GenealogyGraphProps {
  data: GenealogyGraphData;
  exportFileName: string;
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}

const nodeTypes: NodeTypes = {
  genealogy: GenealogyNodeCard,
};

const edgeTypes: EdgeTypes = {
  genealogy: GenealogyEdge,
};

function GenealogyGraphInner({ data, exportFileName, onSelectNode, className }: GenealogyGraphProps) {
  const layouted = useMemo(() => layoutGenealogyGraph(data, 'TB'), [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layouted.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layouted.edges);

  useEffect(() => {
    setNodes(layouted.nodes);
  }, [layouted.nodes, setNodes]);

  useEffect(() => {
    setEdges(layouted.edges);
  }, [layouted.edges, setEdges]);

  const { exportImage, isExporting, errorMessage, resetError } = useExportGenealogyImage({
    fileName: exportFileName,
  });

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onSelectNode) onSelectNode(node.id);
    },
    [onSelectNode]
  );

  return (
    <div className={cn('relative h-full w-full', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesConnectable={false}
        nodesDraggable
        edgesFocusable={false}
        minZoom={0.3}
        maxZoom={1.6}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="#E2DDD4" />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="!rounded-xl !border !border-sand !bg-cream/95 !shadow-md"
        />
      </ReactFlow>

      <button
        type="button"
        onClick={exportImage}
        disabled={isExporting || nodes.length === 0}
        className={cn(
          'absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors',
          'border-pine bg-cream text-pine hover:bg-pine hover:text-cream',
          (isExporting || nodes.length === 0) && 'pointer-events-none opacity-60'
        )}
      >
        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {isExporting ? '正在导出...' : '导出关系图'}
      </button>

      {errorMessage && (
        <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 shadow-sm">
          <button type="button" onClick={resetError} className="mr-2 text-red-700/70">
            ×
          </button>
          {errorMessage}
        </div>
      )}
    </div>
  );
}

export default function GenealogyGraph(props: GenealogyGraphProps) {
  return (
    <ReactFlowProvider>
      <GenealogyGraphInner {...props} />
    </ReactFlowProvider>
  );
}
