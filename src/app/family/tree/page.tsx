'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listFamilyPersons, listPersonRelations } from '@/lib/services/person-service';
import { mapProfilesToTreePersons } from '@/lib/family-view';
import type { FamilySpace, Person, Relation } from '@/types/domain';
import { getRelationLabel } from '@/types/domain';
import { getKinshipLabel, normalizeRelationType } from '@/lib/kinship/kinship-adapter';
import StatusBadge from '@/components/wujia/StatusBadge';
import { cn } from '@/lib/utils';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import PageSkeleton from '@/components/ui/PageSkeleton';
import TreeViewSwitcher from '@/components/tree/TreeViewSwitcher';

interface NodeProps {
  person: Person | null;
  relation: Relation;
  onAdd?: () => void;
  isOwner?: boolean;
}

const GRANDPARENT_RELS: Relation[] = [
  'grandfather_paternal', 'grandmother_paternal',
  'grandfather_maternal', 'grandmother_maternal',
];
const PARENT_RELS: Relation[] = ['father', 'mother'];

function treeRelationLabel(relation: Relation, person: Person | null): string {
  const fallback = getRelationLabel(relation, person?.gender);
  try {
    if (relation === 'father' || relation === 'mother' || relation === 'spouse' || relation === 'child') {
      return getKinshipLabel(relation, person?.gender).label;
    }
    if (relation === 'sibling') {
      return normalizeRelationType('sibling_of', person?.gender) || fallback;
    }
    if (
      relation === 'grandfather_paternal' || relation === 'grandmother_paternal' ||
      relation === 'grandfather_maternal' || relation === 'grandmother_maternal'
    ) {
      return getKinshipLabel(relation, person?.gender).label;
    }
    return fallback;
  } catch { return fallback; }
}

export default function TreePage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTree() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
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
        setPersons(mapProfilesToTreePersons(profiles, relations, user.id));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载三代谱失败');
      } finally { setLoading(false); }
    }
    loadTree();
  }, [router]);

  if (loading) return <PageSkeleton title="三代谱" backHref="/family" cards={3} withStats={true} withSearch={false} />;
  if (error || !family) return <CenteredText text={error || '请先创建数字家堂'} />;

  function get(rel: Relation) { return persons.find((p) => p.relation === rel) ?? null; }
  function add(rel: Relation) { router.push(`/family/relatives/new?relation=${rel}`); }

  const selfPerson = get('self');
  const spouse = get('spouse');
  const siblings = persons.filter((p) => p.relation === 'sibling');
  const children = persons.filter((p) => p.relation === 'child');
  const filledGrandparents = GRANDPARENT_RELS.filter((r) => Boolean(get(r))).length;
  const filledParents = PARENT_RELS.filter((r) => Boolean(get(r))).length;

  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar
        title="三代谱"
        right={<button onClick={() => add('father')} className="min-h-[44px] px-3 text-sm font-medium flex items-center">更多</button>}
      />

      <div className="relative z-10 px-5 pb-6">
        <div className="mb-5 flex justify-center">
          <TreeViewSwitcher current="list" />
        </div>

        <div className="rounded-[16px] border border-[var(--line-1)] bg-white/62 px-4 py-5 shadow-warm-sm">
          <p className="mb-4 text-center text-[13px] text-[var(--ink-3)]">
            {family.displayName} · {persons.length} 位家人 · 祖辈 {filledGrandparents}/4 · 父母 {filledParents}/2
          </p>

        {/* Generations */}
          <GenRow label="第一代">
            {GRANDPARENT_RELS.slice(0, 2).map((r) => <PersonNode key={r} person={get(r)} relation={r} onAdd={() => add(r)} compact />)}
          </GenRow>
          <TreeLine />
          <GenRow label="第二代">
            {PARENT_RELS.map((r) => <PersonNode key={r} person={get(r)} relation={r} onAdd={() => add(r)} />)}
          </GenRow>
          <TreeLine />
          <GenRow label="第三代">
            {selfPerson && <PersonNode person={selfPerson} relation="self" isOwner />}
            {spouse && <PersonNode person={spouse} relation="spouse" />}
            {siblings.slice(0, 1).map((s) => <PersonNode key={s.id} person={s} relation="sibling" />)}
            {children.slice(0, 1).map((c) => <PersonNode key={c.id} person={c} relation="child" />)}
            <PersonNode person={null} relation="child" onAdd={() => add('child')} compact />
          </GenRow>
        </div>

        {/* Legend */}
        <div className="mt-4 rounded-[15px] border border-[var(--line-1)] bg-white/72 p-4">
          <p className="mb-2 text-xs font-semibold text-[var(--ink-3)]">图例</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[var(--ink-3)]">
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-[var(--walnut)] ring-1 ring-amber-400 ring-offset-1 ring-offset-white" />本人</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-[var(--line-1)]" />已录入</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-[var(--line-2)]" />待添加</span>
            <StatusBadge variant="warning">待认领</StatusBadge>
          </div>
        </div>
      </div>
    </MobilePage>
  );
}

function PersonNode({ person, relation, onAdd, isOwner = false, compact = false }: NodeProps & { compact?: boolean }) {
  const label = treeRelationLabel(relation, person);

  if (!person) {
    return (
      <button onClick={onAdd} className="group flex w-[76px] flex-col items-center gap-1.5" aria-label={`添加${label}`}>
        <div className={`${compact ? 'h-11 w-11' : 'h-14 w-14'} flex items-center justify-center rounded-[12px] border-2 border-dashed border-[var(--line-2)] bg-[var(--surface-2)] transition-all group-hover:border-amber-400 group-active:scale-95`}>
          <Plus size={20} className="text-[var(--ink-3)] group-hover:text-amber-500" />
        </div>
        <span className="w-full truncate text-center text-[11px] leading-tight text-[var(--ink-3)]">{label}</span>
        <span className="text-[10px] text-[var(--ink-3)]">添加</span>
      </button>
    );
  }

  return (
    <div className="flex w-[76px] flex-col items-center gap-1.5">
      <div className={cn(
        `${compact ? 'h-11 w-11 text-sm' : 'h-14 w-14 text-lg'} flex shrink-0 select-none items-center justify-center rounded-[12px] border border-white font-semibold shadow-warm-soft`,
        isOwner ? 'bg-[var(--walnut)] text-white ring-2 ring-amber-400 ring-offset-2 ring-offset-[var(--surface-1)]'
          : 'bg-[var(--surface-3)] text-[var(--ink-3)]'
      )}>
        {person.name.charAt(0)}
      </div>
      <span className="w-full truncate text-center text-[11px] font-medium text-[var(--ink-1)]">{person.name}</span>
      <span className="text-center text-[10px] text-[var(--ink-3)]">{label}</span>
      {person.claimStatus !== 'claimed' && !isOwner && (
        <span className="rounded-full bg-warning-light px-1.5 py-0.5 text-[10px] font-medium text-warning">待认领</span>
      )}
    </div>
  );
}

function GenRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[52px_1fr] items-start gap-2">
      <span className="pt-7 text-[13px] font-medium text-[var(--ink-3)]">{label}</span>
      <div className="flex min-h-[92px] flex-wrap items-start justify-center gap-3">{children}</div>
    </div>
  );
}

function TreeLine() {
  return <div className="mx-auto my-1 h-8 w-px bg-[var(--gold)]" />;
}

function CenteredText({ text }: { text: string }) {
  return (
    <div className="wj-page flex min-h-screen items-center justify-center px-4 text-center">
      <p className="text-sm text-[var(--ink-3)]">{text}</p>
    </div>
  );
}
