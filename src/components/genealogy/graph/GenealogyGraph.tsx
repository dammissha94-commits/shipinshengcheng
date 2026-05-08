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
  useReactFlow,
} from '@xyflow/react';
import type { EdgeTypes, Node, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Download, Loader2 } from 'lucide-react';
import type { GenealogyGraphData } from '@/lib/genealogy/graph-types';
import { layoutGenealogyGraph } from '@/lib/genealogy/graph-layout';
import { buildHighlightState } from '@/lib/genealogy/graph-utils';
import { cn } from '@/lib/utils';
import { GenealogyNodeCard } from './GenealogyNodeCard';
import { GenealogyEdge } from './GenealogyEdge';
import { useExportGenealogyImage } from './useExportGenealogyImage';

interface GenealogyGraphProps {
  data: GenealogyGraphData;
  exportFileName: string;
  selectedNodeId?: string | null;
  fitViewSignal?: number;
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}

const nodeTypes: NodeTypes = {
  genealogy: GenealogyNodeCard,
};

const edgeTypes: EdgeTypes = {
  genealogy: GenealogyEdge,
};

function GenealogyGraphInner({
  data,
  exportFileName,
  selectedNodeId = null,
  fitViewSignal = 0,
  onSelectNode,
  className,
}: GenealogyGraphProps) {
  const { fitView, setCenter } = useReactFlow();
  const highlight = useMemo(() => buildHighlightState(selectedNodeId, data.edges), [selectedNodeId, data.edges]);
  const layouted = useMemo(() => layoutGenealogyGraph(data, 'TB', highlight), [data, highlight]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layouted.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layouted.edges);

  useEffect(() => {
    setNodes(layouted.nodes);
  }, [layouted.nodes, setNodes]);

  useEffect(() => {
    setEdges(layouted.edges);
  }, [layouted.edges, setEdges]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const node = layouted.nodes.find((item) => item.id === selectedNodeId);
    if (!node) return;
    setCenter(node.position.x + 84, node.position.y + 48, { duration: 420, zoom: 1.05 });
  }, [layouted.nodes, selectedNodeId, setCenter]);

  useEffect(() => {
    if (fitViewSignal <= 0) return;
    fitView({ padding: 0.25, duration: 420 });
  }, [fitView, fitViewSignal]);

  const { exportImage, isExporting, errorMessage, successMessage, resetError } = useExportGenealogyImage({
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
        panOnDrag
        zoomOnPinch
        zoomOnScroll
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
          'absolute right-3 top-3 z-20 flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium shadow-sm transition-colors',
          'border-pine bg-cream text-pine hover:bg-pine hover:text-cream',
          (isExporting || nodes.length === 0) && 'pointer-events-none opacity-60'
        )}
      >
        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {isExporting ? '正在生成关系图' : '导出 PNG'}
      </button>

      {(errorMessage || successMessage) && (
        <div
          className={cn(
            'absolute left-3 top-3 z-30 max-w-[calc(100%-8rem)] rounded-full border px-3 py-1.5 text-xs shadow-sm flex items-center',
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-[#F0E6D5] text-var(--walnut-light)'
          )}
        >
          <button type="button" onClick={resetError} className="mr-2 flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/10" aria-label="关闭提示">
            x
          </button>
          {errorMessage || successMessage}
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
