'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, LocateFixed, Network, RotateCcw, Search, Users, X } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { Card, buttonVariants } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import {
  DEFAULT_GRAPH_RELATION_FILTERS,
  GRAPH_RELATION_FILTER_LABELS,
  filterGraphEdgesByRelation,
  isDefaultRelationFilter,
  searchGraphNodes,
} from '@/lib/genealogy/graph-utils';
import { buildGenealogyGraphData } from '@/lib/genealogy/graph-adapter';
import { cn } from '@/lib/utils';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listFamilyPersons, listPersonRelations } from '@/lib/services/person-service';
import type { FamilySpace, RelationType } from '@/types/domain';
import type { GenealogyGraphData, GraphRelationFilter, GraphSearchResult } from '@/lib/genealogy/graph-types';

const GenealogyGraph = dynamic(() => import('@/components/genealogy/graph/GenealogyGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-cream/60 text-sm text-muted">
      正在加载关系图...
    </div>
  ),
});

type LoadState = 'loading' | 'ready' | 'error' | 'empty';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';
const RELATION_FILTERS: RelationType[] = [
  'parent_of',
  'child_of',
  'spouse_of',
  'sibling_of',
  'grandparent_of',
];

export default function GenealogyGraphPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [graphData, setGraphData] = useState<GenealogyGraphData>({ nodes: [], edges: [] });
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeLabel, setSelectedNodeLabel] = useState('');
  const [fitViewSignal, setFitViewSignal] = useState(0);
  const [relationFilters, setRelationFilters] = useState<GraphRelationFilter>(DEFAULT_GRAPH_RELATION_FILTERS);

  useEffect(() => {
    async function loadGraph() {
      if (!hasSupabaseConfig()) {
        setErrorMessage(SUPABASE_FALLBACK_MESSAGE);
        setState('error');
        return;
      }

      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace(currentLoginRedirectPath());
          return;
        }

        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) {
          router.replace('/create');
          return;
        }

        const [profiles, relations] = await Promise.all([
          listFamilyPersons(currentFamily.id),
          listPersonRelations(currentFamily.id),
        ]);

        setFamily(currentFamily);
        setGraphData(buildGenealogyGraphData(profiles, relations));
        setState(profiles.length === 0 ? 'empty' : 'ready');
      } catch (error) {
        const message = error instanceof Error ? error.message : '加载家族关系图失败';
        if (/auth session missing/i.test(message)) {
          router.replace(currentLoginRedirectPath());
          return;
        }
        if (/permission|denied|forbidden|权限/i.test(message)) {
          setErrorMessage('你暂无权限执行此操作');
        } else {
          setErrorMessage('加载家族关系图失败，请稍后重试');
        }
        setState('error');
      }
    }

    loadGraph();
  }, [router]);

  const exportFileName = useMemo(() => {
    if (!family) return '家族关系图.png';
    return `${family.displayName ?? family.display_name ?? '我的数字家堂'}-家族关系图.png`;
  }, [family]);

  const searchResults = useMemo(
    () => searchGraphNodes(graphData.nodes, searchKeyword),
    [graphData.nodes, searchKeyword]
  );

  const filteredEdges = useMemo(
    () => filterGraphEdgesByRelation(graphData.edges, relationFilters),
    [graphData.edges, relationFilters]
  );

  const visibleGraphData = useMemo<GenealogyGraphData>(
    () => ({
      nodes: graphData.nodes,
      edges: filteredEdges,
    }),
    [filteredEdges, graphData.nodes]
  );

  const hasNoVisibleEdges = state === 'ready' && graphData.edges.length > 0 && filteredEdges.length === 0;

  function selectSearchResult(result: GraphSearchResult) {
    setSelectedNodeId(result.id);
    setSelectedNodeLabel(result.label);
    setFitViewSignal((value) => value + 1);
  }

  function handleSearchChange(value: string) {
    setSearchKeyword(value);
    if (!value.trim()) {
      setSelectedNodeId(null);
      setSelectedNodeLabel('');
    }
  }

  function toggleRelationFilter(relationType: RelationType) {
    setRelationFilters((current) => ({
      ...current,
      [relationType]: !current[relationType],
    }));
  }

  function clearHighlight() {
    setSelectedNodeId(null);
    setSelectedNodeLabel('');
    setSearchKeyword('');
  }

  function resetFilters() {
    setRelationFilters(DEFAULT_GRAPH_RELATION_FILTERS);
  }

  function handleGraphNodeSelect(nodeId: string) {
    const node = graphData.nodes.find((item) => item.id === nodeId);
    setSelectedNodeId(nodeId);
    setSelectedNodeLabel(node?.label ?? '');
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <AppHeader title="家族关系图" backHref="/family/tree" />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-4">
        <Card className="overflow-hidden border-pine/10 bg-pine text-cream">
          <div className="p-4">
            <p className="text-xs tracking-wider text-cream/60">家族关系图</p>
            <h1 className="mt-1 text-lg font-bold">
              {family ? family.displayName ?? family.display_name : '加载中...'}
            </h1>
            <p className="mt-1 text-xs text-cream/70">
              {graphData.nodes.length} 位家人 · {filteredEdges.length}/{graphData.edges.length} 条关系
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Link href="/family/tree" className={cn(buttonVariants({ variant: 'secondary' }), 'gap-2 text-xs')}>
            <Network size={14} />
            返回三代谱
          </Link>
          <Link href="/family/members" className={cn(buttonVariants({ variant: 'primary' }), 'gap-2 text-xs')}>
            <Users size={14} />
            成员列表
          </Link>
        </div>

        {state === 'ready' && (
          <Card className="space-y-3 border-sand bg-card p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
              <input
                value={searchKeyword}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="搜索家人姓名"
                className="w-full rounded-xl border border-sand bg-cream py-2.5 pl-9 pr-9 text-sm text-charcoal outline-none focus:border-pine"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={clearHighlight}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-sand"
                  aria-label="清空搜索"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {searchKeyword.trim() && (
              <div className="rounded-xl border border-sand bg-cream p-2">
                {searchResults.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-muted">未找到相关家人</p>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => selectSearchResult(result)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-charcoal hover:bg-card"
                      >
                        <span>
                          <span className="font-medium">{result.label}</span>
                          {result.relationHint && <span className="ml-2 text-xs text-muted">{result.relationHint}</span>}
                        </span>
                        <LocateFixed size={14} className="text-pine" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedNodeId && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-pine/5 px-3 py-2 text-sm">
                <span className="text-pine">已定位到：{selectedNodeLabel || '家人'}</span>
                <Link href={`/family/members/${selectedNodeId}`} className="text-xs font-semibold text-pine">
                  查看家人档案
                </Link>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold text-charcoal">关系筛选</p>
              <div className="flex flex-wrap gap-2">
                {RELATION_FILTERS.map((relationType) => {
                  const active = relationFilters[relationType];
                  return (
                    <button
                      key={relationType}
                      type="button"
                      onClick={() => toggleRelationFilter(relationType)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        active ? 'border-pine bg-pine text-cream' : 'border-sand bg-cream text-muted'
                      )}
                    >
                      {active && <Check size={12} />}
                      {GRAPH_RELATION_FILTER_LABELS[relationType]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFitViewSignal((value) => value + 1)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-sand bg-cream px-2 py-2 text-xs font-medium text-charcoal"
              >
                <LocateFixed size={13} />
                适应全图
              </button>
              <button
                type="button"
                onClick={clearHighlight}
                disabled={!selectedNodeId && !searchKeyword}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-sand bg-cream px-2 py-2 text-xs font-medium text-charcoal disabled:opacity-50"
              >
                <X size={13} />
                清除高亮
              </button>
              <button
                type="button"
                onClick={resetFilters}
                disabled={isDefaultRelationFilter(relationFilters)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-sand bg-cream px-2 py-2 text-xs font-medium text-charcoal disabled:opacity-50"
              >
                <RotateCcw size={13} />
                重置筛选
              </button>
            </div>
          </Card>
        )}

        <Card className="relative h-[60vh] min-h-[420px] overflow-hidden border-sand p-0">
          {state === 'loading' && (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              加载家族关系图中...
            </div>
          )}

          {state === 'error' && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm text-muted">{errorMessage}</p>
            </div>
          )}

          {state === 'empty' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-muted">请先添加亲属</p>
              <Link
                href="/family/relatives/new"
                className={cn(buttonVariants({ variant: 'gold' }), 'gap-2 text-xs')}
              >
                添加亲属
              </Link>
            </div>
          )}

          {state === 'ready' && (
            <GenealogyGraph
              data={visibleGraphData}
              exportFileName={exportFileName}
              selectedNodeId={selectedNodeId}
              fitViewSignal={fitViewSignal}
              onSelectNode={handleGraphNodeSelect}
              className="h-full w-full"
            />
          )}
        </Card>

        {hasNoVisibleEdges && (
          <p className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
            当前筛选条件下暂无关系
          </p>
        )}

        {state === 'ready' && graphData.edges.length === 0 && (
          <p className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
            已有家人档案，但关系还不完整，请继续补充亲属关系。
          </p>
        )}

        <Card className="border-sand bg-card p-3">
          <p className="mb-2 text-xs font-semibold text-charcoal">图例</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
            <LegendDot className="bg-pine" label="已认领" />
            <LegendDot className="bg-gold" label="待认领" />
            <LegendDot className="bg-pine/30" label="在世" />
            <LegendDot className="bg-charcoal/40" label="已故" />
            {RELATION_FILTERS.map((relationType) => (
              <LegendLine
                key={relationType}
                className={relationType === 'spouse_of' ? 'bg-gold' : 'bg-pine'}
                dashed={relationType !== 'parent_of' && relationType !== 'child_of'}
                label={GRAPH_RELATION_FILTER_LABELS[relationType]}
                muted={!relationFilters[relationType]}
              />
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-3 w-3 rounded-full', className)} />
      {label}
    </span>
  );
}

function LegendLine({
  className,
  label,
  dashed,
  muted,
}: {
  className: string;
  label: string;
  dashed?: boolean;
  muted?: boolean;
}) {
  return (
    <span className={cn('flex items-center gap-1.5', muted && 'opacity-35')}>
      <span
        className={cn('h-0.5 w-6 rounded', className, dashed && 'opacity-80')}
        style={
          dashed
            ? { backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px)' }
            : undefined
        }
      />
      {label}
    </span>
  );
}
