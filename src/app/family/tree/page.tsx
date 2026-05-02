'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Network, Plus, Settings, Users } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listFamilyPersons, listPersonRelations } from '@/lib/services/person-service';
import { mapProfilesToTreePersons } from '@/lib/family-view';
import type { FamilySpace, Person, Relation } from '@/types/domain';
import { getRelationLabel } from '@/types/domain';
import { getKinshipLabel, normalizeRelationType } from '@/lib/kinship/kinship-adapter';
import AppHeader from '@/components/AppHeader';
import StatusBadge from '@/components/wujia/StatusBadge';
import { cn } from '@/lib/utils';

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

  if (loading) return <CenteredText text="加载中..." />;
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
    <div className="min-h-screen bg-stone-50">
      <AppHeader
        title={`${family.surname}家三代谱`}
        backHref="/family"
        rightElement={
          <button onClick={() => add('father')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-700 transition-colors hover:bg-stone-200"
            aria-label="添加成员">
            <Plus size={18} strokeWidth={2.4} />
          </button>
        }
      />

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Header card */}
        <div className="rounded-2xl bg-emerald-950 p-5 text-white">
          <p className="text-xs text-white/40 tracking-widest font-medium">家族关系</p>
          <h1 className="mt-0.5 text-xl font-bold">{family.displayName}</h1>
          <p className="mt-1 text-sm text-white/55">
            {persons.length} 位家人 · 祖辈 {filledGrandparents}/4 · 父母 {filledParents}/2
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link href="/family/tree/graph"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-950 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors">
            <Network size={14} />关系图
          </Link>
          <Link href="/family/members"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors">
            <Users size={14} />成员列表
          </Link>
          <Link href="/family/settings"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors">
            <Settings size={14} />设置
          </Link>
          <Link href="/family/output"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
            <FileText size={14} />成果物
          </Link>
        </div>

        {/* Generations */}
        <GenRow label="祖辈" badge={filledGrandparents > 0 ? `已录入 ${filledGrandparents}/4` : '尚未录入'}>
          {GRANDPARENT_RELS.map((r) => <PersonNode key={r} person={get(r)} relation={r} onAdd={() => add(r)} />)}
        </GenRow>
        <Connector />
        <GenRow label="父母" badge={filledParents > 0 ? `已录入 ${filledParents}/2` : '尚未录入'}>
          {PARENT_RELS.map((r) => <PersonNode key={r} person={get(r)} relation={r} onAdd={() => add(r)} />)}
        </GenRow>
        <Connector />
        <GenRow label="本人 / 配偶 / 兄弟姐妹">
          {siblings.map((s) => <PersonNode key={s.id} person={s} relation="sibling" />)}
          {selfPerson && <PersonNode person={selfPerson} relation="self" isOwner />}
          <PersonNode person={spouse} relation="spouse" onAdd={() => add('spouse')} />
          <PersonNode person={null} relation="sibling" onAdd={() => add('sibling')} />
        </GenRow>
        <Connector />
        <GenRow label="子女" badge={children.length > 0 ? `${children.length} 位` : '尚未录入'}>
          {children.map((c) => <PersonNode key={c.id} person={c} relation="child" />)}
          <PersonNode person={null} relation="child" onAdd={() => add('child')} />
        </GenRow>

        {/* Legend */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold text-stone-500">图例</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-stone-500">
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-emerald-950 ring-1 ring-amber-400 ring-offset-1 ring-offset-white" />本人</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-stone-200" />已录入</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-stone-300" />待添加</span>
            <StatusBadge variant="warning">待认领</StatusBadge>
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonNode({ person, relation, onAdd, isOwner = false }: NodeProps) {
  const label = treeRelationLabel(relation, person);

  if (!person) {
    return (
      <button onClick={onAdd} className="group flex w-[76px] flex-col items-center gap-1.5" aria-label={`添加${label}`}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 transition-all group-hover:border-amber-400 group-active:scale-95">
          <Plus size={20} className="text-stone-300 group-hover:text-amber-500" />
        </div>
        <span className="w-full truncate text-center text-[11px] leading-tight text-stone-400">{label}</span>
        <span className="text-[10px] text-stone-300">添加</span>
      </button>
    );
  }

  return (
    <div className="flex w-[76px] flex-col items-center gap-1.5">
      <div className={cn(
        'flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-2xl text-lg font-semibold',
        isOwner ? 'bg-emerald-950 text-white ring-2 ring-amber-400 ring-offset-2 ring-offset-stone-50'
          : 'bg-stone-100 text-emerald-800'
      )}>
        {person.name.charAt(0)}
      </div>
      <span className="w-full truncate text-center text-[11px] font-medium text-stone-800">{person.name}</span>
      <span className="text-center text-[10px] text-stone-500">{label}</span>
      {person.claimStatus !== 'claimed' && !isOwner && (
        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">待认领</span>
      )}
    </div>
  );
}

function GenRow({ label, badge, children }: { label: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-stone-500">{label}</span>
        {badge && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">{badge}</span>}
      </div>
      <div className="flex flex-wrap items-start justify-start gap-3">{children}</div>
    </div>
  );
}

function Connector() {
  return <div className="flex justify-center py-0.5"><div className="h-5 w-px bg-stone-300" /></div>;
}

function CenteredText({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-center">
      <p className="text-sm text-stone-500">{text}</p>
    </div>
  );
}
