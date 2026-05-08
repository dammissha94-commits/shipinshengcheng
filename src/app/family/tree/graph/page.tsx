'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, Check, ImageDown, LocateFixed, Network, RotateCcw, Search, Users, X } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { TreePoster, useExportPoster } from '@/components/poster';
import PageHero from '@/components/wujia/PageHero';
import TreeViewSwitcher from '@/components/tree/TreeViewSwitcher';
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
    <div className="flex h-full w-full items-center justify-center text-sm text-[var(--ink-3)]">
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
  const posterRef = useRef<HTMLDivElement>(null);
  const { exportPoster, isExporting: posterExporting, error: posterError, successMessage: posterSuccess, reset: resetPoster } = useExportPoster();

  function handleExportPoster() {
    if (!family) return;
    const fileName = `${family.displayName ?? family.display_name ?? '家堂'}-家族海报.png`;
    void exportPoster(posterRef.current, fileName);
  }

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
    <div className="wj-page flex min-h-screen flex-col">
      <AppHeader title="家族关系图" backHref="/family/tree" />

      <main className="wj-shell flex flex-1 flex-col gap-3 px-4 py-4">
        <PageHero
          eyebrow="家族关系图"
          title={family ? family.displayName ?? family.display_name : '加载中...'}
          subtitle={`${graphData.nodes.length} 位家人 · ${filteredEdges.length}/${graphData.edges.length} 条关系`}
        />

        {/* 视图切换器 + 操作 */}
        <div className="flex items-center justify-between gap-2">
          <TreeViewSwitcher current="graph" />
          <button
            type="button"
            onClick={handleExportPoster}
            disabled={posterExporting || !family}
            className="flex min-h-[40px] items-center gap-1.5 rounded-full border border-[var(--line-1)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--ink-2)] shadow-warm-xs transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            <ImageDown size={14} />{posterExporting ? '生成中…' : '导出海报'}
          </button>
        </div>

        {/* Secondary nav */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/family/members"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line-1)] bg-[var(--surface-1)] min-h-[44px] px-3 text-xs font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <Users size={14} />成员列表
          </Link>
          <Link
            href="/family/statistics"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line-1)] bg-[var(--surface-1)] min-h-[44px] px-3 text-xs font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <BarChart3 size={14} />数据看板
          </Link>
        </div>

        {state === 'ready' && (
          <div className="rounded-[20px] border border-[var(--line-1)] bg-[var(--surface-1)]/88 p-4 shadow-warm-xs">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-3)] text-[var(--walnut-light)]">
                <Network size={18} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--ink-1)]">看图谱的小技巧</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <span className="rounded-xl bg-[var(--surface-2)] px-2 py-2 text-[11px] leading-4 text-[var(--ink-3)]">拖动画布<br />看全家关系</span>
                  <span className="rounded-xl bg-[var(--surface-2)] px-2 py-2 text-[11px] leading-4 text-[var(--ink-3)]">点选家人<br />高亮一跳亲属</span>
                  <span className="rounded-xl bg-[var(--surface-2)] px-2 py-2 text-[11px] leading-4 text-[var(--ink-3)]">用筛选<br />只看一种关系</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {(posterError || posterSuccess) && (
          <button
            type="button"
            onClick={resetPoster}
            className="rounded-xl border border-[var(--line-1)] bg-[var(--surface-1)] px-4 py-2 text-left text-xs"
          >
            <span className={posterError ? 'text-[var(--terracotta)]' : 'text-[var(--jade)]'}>
              {posterError || posterSuccess}
            </span>
            <span className="ml-2 text-[var(--ink-3)]">点击关闭</span>
          </button>
        )}

        {/* Toolbar */}
        {state === 'ready' && (
          <div className="wj-card-solid rounded-[24px] p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" size={15} />
              <input value={searchKeyword} onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="搜索家人姓名"
                className="w-full rounded-2xl border border-[var(--line-1)] bg-[var(--surface-1)] py-3 pl-9 pr-9 text-sm text-[var(--ink-1)] placeholder:text-[var(--ink-placeholder)] focus:border-[var(--walnut)] focus:outline-none focus:ring-2 focus:ring-[var(--walnut)]/20 transition-all" />
              {searchKeyword && (
                <button type="button" onClick={clearHighlight}
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--ink-3)] hover:bg-[var(--surface-2)]"
                  aria-label="清空搜索">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Search results */}
            {searchKeyword.trim() && (
              <div className="rounded-xl border border-[var(--line-1)] bg-[var(--surface-2)] p-2">
                {searchResults.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-[var(--ink-3)]">未找到相关家人</p>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((r) => (
                      <button key={r.id} type="button" onClick={() => selectSearchResult(r)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 min-h-[44px] text-left text-sm text-[var(--ink-2)] hover:bg-white transition-colors">
                        <span><span className="font-medium">{r.label}</span>
                          {r.relationHint && <span className="ml-2 text-xs text-[var(--ink-3)]">{r.relationHint}</span>}</span>
                        <LocateFixed size={14} className="text-[var(--walnut-light)]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected node */}
            {selectedNodeId && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--surface-3)] px-4 py-2.5 text-sm">
                <span className="text-[var(--ink-3)] font-medium">已定位：{selectedNodeLabel || '家人'}</span>
                <Link href={`/family/members/${selectedNodeId}`} className="text-xs font-semibold text-[var(--walnut-light)] hover:text-[var(--ink-3)]">
                  查看档案 &rarr;
                </Link>
              </div>
            )}

            {/* Filter pills */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--ink-3)]">关系筛选</p>
              <div className="flex flex-wrap gap-2">
                {RELATION_FILTERS.map((rt) => {
                  const active = relationFilters[rt];
                  return (
                    <button key={rt} type="button" onClick={() => toggleRelationFilter(rt)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border min-h-[44px] px-3 text-xs font-medium transition-all',
                        active ? 'border-[var(--walnut)] bg-[var(--walnut)] text-white' : 'border-[var(--line-1)] bg-white text-[var(--ink-3)] hover:border-[var(--line-2)]'
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
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line-1)] bg-white min-h-[44px] text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] transition-colors">
                <LocateFixed size={13} />适应全图
              </button>
              <button type="button" onClick={clearHighlight} disabled={!selectedNodeId && !searchKeyword}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line-1)] bg-white min-h-[44px] text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] disabled:opacity-40 transition-colors">
                <X size={13} />清除高亮
              </button>
              <button type="button" onClick={resetFilters} disabled={isDefaultRelationFilter(relationFilters)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line-1)] bg-white min-h-[44px] text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] disabled:opacity-40 transition-colors">
                <RotateCcw size={13} />重置筛选
              </button>
            </div>
          </div>
        )}

        {/* Graph canvas */}
        <div className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-[24px] border border-[var(--line-1)] bg-[var(--surface-1)] shadow-warm">
          {state === 'loading' && (
            <div className="flex h-full items-center justify-center text-sm text-[var(--ink-3)]">加载家族关系图中...</div>
          )}
          {state === 'error' && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm text-[var(--ink-3)]">{errorMessage}</p>
            </div>
          )}
          {state === 'empty' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-[var(--ink-3)]">请先添加亲属</p>
              <Link href="/family/relatives/new"
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-warning-light border border-warning-light px-4 text-xs font-semibold text-warning hover:bg-warning-light transition-colors">
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
          <p className="rounded-xl border border-warning-light bg-warning-light px-4 py-2.5 text-xs text-warning">
            当前筛选条件下暂无关系
          </p>
        )}
        {state === 'ready' && graphData.edges.length === 0 && (
          <p className="rounded-xl border border-warning-light bg-warning-light px-4 py-2.5 text-xs text-warning">
            已有家人档案，但关系还不完整，请继续补充亲属关系。
          </p>
        )}

        {/* Legend */}
        <div className="wj-card-solid rounded-[24px] p-4">
          <p className="mb-2 text-xs font-semibold text-[var(--ink-3)]">图例</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[var(--ink-3)]">
            <LegendDot className="bg-[var(--walnut)]" label="已认领" />
            <LegendDot className="bg-[var(--warning)]" label="待认领" />
            <LegendDot className="bg-[var(--walnut)]/30" label="健在" />
            <LegendDot className="bg-[var(--ink-1)]/40" label="离世" />
            {RELATION_FILTERS.map((rt) => (
              <LegendLine key={rt}
                className={rt === 'spouse_of' ? 'bg-[var(--warning)]' : 'bg-[var(--walnut-light)]'}
                dashed={rt !== 'parent_of' && rt !== 'child_of'}
                label={getGraphRelationLabel(rt)}
                muted={!relationFilters[rt]} />
            ))}
          </div>
        </div>
      </main>

      {/* 离屏海报 — 用于 html-to-image 渲染 */}
      {family && (
        <TreePoster
          ref={posterRef}
          surname={family.surname}
          familyDisplayName={family.displayName ?? family.display_name ?? ''}
          totalMembers={graphData.nodes.length}
          claimedMembers={graphData.nodes.filter((n) => n.claimStatus === 'claimed').length}
          storyCount={0}
          photoCount={0}
        />
      )}
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
