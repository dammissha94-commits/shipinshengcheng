'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Network, Users } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listFamilyPersons, listPersonRelations } from '@/lib/services/person-service';
import { buildGenealogyGraphData } from '@/lib/genealogy/graph-adapter';
import type { GenealogyGraphData } from '@/lib/genealogy/graph-types';
import type { FamilySpace } from '@/types/domain';
import AppHeader from '@/components/AppHeader';
import { Card, buttonVariants } from '@/components/ui';
import { cn } from '@/lib/utils';

const GenealogyGraph = dynamic(() => import('@/components/genealogy/graph/GenealogyGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-cream/60 text-sm text-muted">
      正在加载关系图...
    </div>
  ),
});

type LoadState = 'loading' | 'ready' | 'error' | 'empty';

export default function GenealogyGraphPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [graphData, setGraphData] = useState<GenealogyGraphData>({ nodes: [], edges: [] });
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadGraph() {
      if (!hasSupabaseConfig()) {
        setErrorMessage('尚未配置 Supabase 环境变量，请先配置 .env.local');
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

        if (profiles.length === 0) {
          setState('empty');
        } else {
          setState('ready');
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : '加载家族关系图失败';
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
    return `${family.displayName ?? family.display_name ?? '我的家堂'}-家族关系图.png`;
  }, [family]);

  const handleSelectNode = (nodeId: string) => {
    router.push(`/family/members/${nodeId}`);
  };

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
              {graphData.nodes.length} 个节点 · {graphData.edges.length} 条关系
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
              data={graphData}
              exportFileName={exportFileName}
              onSelectNode={handleSelectNode}
              className="h-full w-full"
            />
          )}
        </Card>

        {state === 'ready' && graphData.edges.length === 0 && (
          <p className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
            已有人物档案，但关系还不完整，请继续补充亲属关系。
          </p>
        )}

        <Card className="border-sand bg-card p-3">
          <p className="mb-2 text-xs font-semibold text-charcoal">图例</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
            <LegendDot className="bg-pine" label="已认领" />
            <LegendDot className="bg-gold" label="待认领" />
            <LegendDot className="bg-pine/30" label="在世" />
            <LegendDot className="bg-charcoal/40" label="已故" />
            <LegendLine className="bg-pine" label="父母 / 子女" />
            <LegendLine className="bg-gold" dashed label="配偶" />
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

function LegendLine({ className, label, dashed }: { className: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn('h-0.5 w-6 rounded', className, dashed && 'opacity-80')}
        style={dashed ? { backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px)' } : undefined}
      />
      {label}
    </span>
  );
}
