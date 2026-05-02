'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, Check, LocateFixed, Network, RotateCcw, Search, Users, X } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
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
import { getKinshipLabel, normalizeRelationType } from '@/lib/kinship/kinship-adapter';
import { cn } from '@/lib/utils';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listFamilyPersons, listPersonRelations } from '@/lib/services/person-service';
import type { FamilySpace, RelationType } from '@/types/domain';
import type { GenealogyGraphData, GraphRelationFilter, GraphSearchResult } from '@/lib/genealogy/graph-types';

const GenealogyGraph = dynamic(() => import('@/components/genealogy/graph/GenealogyGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-stone-400">
      正在加载关系图...
    </div>
  ),
});

type LoadState = 'loading' | 'ready' | 'error' | 'empty';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';
const RELATION_FILTERS: RelationType[] = ['parent_of', 'child_of', 'spouse_of', 'sibling_of', 'grandparent_of'];

function getGraphRelationLabel(relationType: RelationType): string {
  const fallback = GRAPH_RELATION_FILTER_LABELS[relationType];
  try {
    if (relationType === 'child_of') return getKinshipLabel('child').label || fallback;
    if (relationType === 'spouse_of') return getKinshipLabel('spouse').label || fallback;
    return normalizeRelationType(relationType) || fallback;
  } catch { return fallback; }
}

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
      if (!hasSupabaseConfig()) { setErrorMessage(SUPABASE_FALLBACK_MESSAGE); setState('error'); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        const [profiles, relations] = await Promise.all([
          listFamilyPersons(currentFamily.id),
          listPersonRelations(currentFamily.id),
        ]);
        setFamily(currentFamily);
        setGraphData(buildGenealogyGraphData(profiles, relations));
        setState(profiles.length === 0 ? 'empty' : 'ready');
      } catch (error) {
        const message = error instanceof Error ? error.message : '加载家族关系图失败';
        if (/auth session missing/i.test(message)) { router.replace(currentLoginRedirectPath()); return; }
        setErrorMessage(/permission|denied|forbidden|权限/i.test(message) ? '你暂无权限执行此操作' : '加载家族关系图失败，请稍后重试');
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
    () => ({ nodes: graphData.nodes, edges: filteredEdges.map((e) => ({ ...e, label: getGraphRelationLabel(e.relationType) as typeof e.label })) }),
    [filteredEdges, graphData.nodes]
  );

  const hasNoVisibleEdges = state === 'ready' && graphData.edges.length > 0 && filteredEdges.length === 0;

  function selectSearchResult(result: GraphSearchResult) {
    setSelectedNodeId(result.id); setSelectedNodeLabel(result.label); setFitViewSignal((v) => v + 1);
  }
  function handleSearchChange(value: string) {
    setSearchKeyword(value);
    if (!value.trim()) { setSelectedNodeId(null); setSelectedNodeLabel(''); }
  }
  function toggleRelationFilter(relationType: RelationType) {
    setRelationFilters((cur) => ({
      ...cur,
      ...(relationType === 'parent_of' || relationType === 'child_of' ? { parent_of: !(cur.parent_of && cur.child_of), child_of: !(cur.parent_of && cur.child_of) } : {}),
      [relationType]: !cur[relationType],
    }));
  }
  function clearHighlight() { setSelectedNodeId(null); setSelectedNodeLabel(''); setSearchKeyword(''); }
  function resetFilters() { setRelationFilters(DEFAULT_GRAPH_RELATION_FILTERS); }
  function handleGraphNodeSelect(nodeId: string) {
    const node = graphData.nodes.find((n) => n.id === nodeId);
    setSelectedNodeId(nodeId); setSelectedNodeLabel(node?.label ?? '');
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <AppHeader title="家族关系图" backHref="/family/tree" />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-4">
        {/* Header card */}
        <div className="rounded-2xl bg-emerald-950 p-4 text-white">
          <p className="text-xs text-white/40 tracking-widest font-medium">家族关系图</p>
          <h1 className="mt-0.5 text-lg font-bold">{family ? family.displayName ?? family.display_name : '加载中...'}</h1>
          <p className="mt-1 text-xs text-white/55">
            {graphData.nodes.length} 位家人 · {filteredEdges.length}/{graphData.edges.length} 条关系
          </p>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-2">
          <Link href="/family/tree"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors">
            <Network size={14} />返回三代谱
          </Link>
          <Link href="/family/members"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-950 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors">
            <Users size={14} />成员列表
          </Link>
          <Link href="/family/statistics"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
            <BarChart3 size={14} />数据看板
          </Link>
        </div>

        {/* Toolbar */}
        {state === 'ready' && (
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
              <input value={searchKeyword} onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="搜索家人姓名"
                className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-9 pr-9 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all" />
              {searchKeyword && (
                <button type="button" onClick={clearHighlight}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100"
                  aria-label="清空搜索">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Search results */}
            {searchKeyword.trim() && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-2">
                {searchResults.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-stone-400">未找到相关家人</p>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((r) => (
                      <button key={r.id} type="button" onClick={() => selectSearchResult(r)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-stone-700 hover:bg-white transition-colors">
                        <span><span className="font-medium">{r.label}</span>
                          {r.relationHint && <span className="ml-2 text-xs text-stone-400">{r.relationHint}</span>}</span>
                        <LocateFixed size={14} className="text-emerald-700" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected node */}
            {selectedNodeId && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm">
                <span className="text-emerald-800 font-medium">已定位：{selectedNodeLabel || '家人'}</span>
                <Link href={`/family/members/${selectedNodeId}`} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
                  查看档案 &rarr;
                </Link>
              </div>
            )}

            {/* Filter pills */}
            <div>
              <p className="mb-2 text-xs font-semibold text-stone-500">关系筛选</p>
              <div className="flex flex-wrap gap-2">
                {RELATION_FILTERS.map((rt) => {
                  const active = relationFilters[rt];
                  return (
                    <button key={rt} type="button" onClick={() => toggleRelationFilter(rt)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                        active ? 'border-emerald-950 bg-emerald-950 text-white' : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
                      )}>
                      {active && <Check size={12} />}
                      {getGraphRelationLabel(rt)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setFitViewSignal((v) => v + 1)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                <LocateFixed size={13} />适应全图
              </button>
              <button type="button" onClick={clearHighlight} disabled={!selectedNodeId && !searchKeyword}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors">
                <X size={13} />清除高亮
              </button>
              <button type="button" onClick={resetFilters} disabled={isDefaultRelationFilter(relationFilters)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors">
                <RotateCcw size={13} />重置筛选
              </button>
            </div>
          </div>
        )}

        {/* Graph canvas */}
        <div className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          {state === 'loading' && (
            <div className="flex h-full items-center justify-center text-sm text-stone-400">加载家族关系图中...</div>
          )}
          {state === 'error' && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm text-stone-500">{errorMessage}</p>
            </div>
          )}
          {state === 'empty' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-stone-500">请先添加亲属</p>
              <Link href="/family/relatives/new"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                添加亲属
              </Link>
            </div>
          )}
          {state === 'ready' && (
            <GenealogyGraph data={visibleGraphData} exportFileName={exportFileName}
              selectedNodeId={selectedNodeId} fitViewSignal={fitViewSignal}
              onSelectNode={handleGraphNodeSelect} className="h-full w-full" />
          )}
        </div>

        {/* Status messages */}
        {hasNoVisibleEdges && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
            当前筛选条件下暂无关系
          </p>
        )}
        {state === 'ready' && graphData.edges.length === 0 && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
            已有家人档案，但关系还不完整，请继续补充亲属关系。
          </p>
        )}

        {/* Legend */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-stone-500">图例</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-stone-500">
            <LegendDot className="bg-emerald-950" label="已认领" />
            <LegendDot className="bg-amber-500" label="待认领" />
            <LegendDot className="bg-emerald-950/30" label="在世" />
            <LegendDot className="bg-stone-800/40" label="已故" />
            {RELATION_FILTERS.map((rt) => (
              <LegendLine key={rt}
                className={rt === 'spouse_of' ? 'bg-amber-500' : 'bg-emerald-700'}
                dashed={rt !== 'parent_of' && rt !== 'child_of'}
                label={getGraphRelationLabel(rt)}
                muted={!relationFilters[rt]} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-3 w-3 rounded-full', className)} />{label}
    </span>
  );
}

function LegendLine({ className, label, dashed, muted }: { className: string; label: string; dashed?: boolean; muted?: boolean }) {
  return (
    <span className={cn('flex items-center gap-1.5', muted && 'opacity-35')}>
      <span className={cn('h-0.5 w-6 rounded', className, dashed && 'opacity-80')}
        style={dashed ? { backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px)' } : undefined} />
      {label}
    </span>
  );
}
