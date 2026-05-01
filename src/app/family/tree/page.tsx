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
import { Badge, Card, PageShell, buttonVariants } from '@/components/ui';
import { cn } from '@/lib/utils';

interface NodeProps {
  person: Person | null;
  relation: Relation;
  onAdd?: () => void;
  isOwner?: boolean;
}

const GRANDPARENT_RELS: Relation[] = [
  'grandfather_paternal',
  'grandmother_paternal',
  'grandfather_maternal',
  'grandmother_maternal',
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
      relation === 'grandfather_paternal' ||
      relation === 'grandmother_paternal' ||
      relation === 'grandfather_maternal' ||
      relation === 'grandmother_maternal'
    ) {
      return getKinshipLabel(relation, person?.gender).label;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export default function TreePage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTree() {
      if (!hasSupabaseConfig()) {
        setError('尚未配置 Supabase 环境变量，请先配置 .env.local');
        setLoading(false);
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
        setPersons(mapProfilesToTreePersons(profiles, relations, user.id));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载三代谱失败');
      } finally {
        setLoading(false);
      }
    }

    loadTree();
  }, [router]);

  if (loading) return <CenteredText text="加载中..." />;
  if (error || !family) return <CenteredText text={error || '请先创建数字家堂'} />;

  function get(rel: Relation) {
    return persons.find((person) => person.relation === rel) ?? null;
  }

  function add(rel: Relation) {
    router.push(`/family/relatives/new?relation=${rel}`);
  }

  const selfPerson = get('self');
  const spouse = get('spouse');
  const siblings = persons.filter((person) => person.relation === 'sibling');
  const children = persons.filter((person) => person.relation === 'child');
  const filledGrandparents = GRANDPARENT_RELS.filter((relation) => Boolean(get(relation))).length;
  const filledParents = PARENT_RELS.filter((relation) => Boolean(get(relation))).length;

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader
        title={`${family.surname}家三代谱`}
        backHref="/family"
        rightElement={
          <button
            onClick={() => add('father')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-pine transition-colors hover:bg-sand/60"
            aria-label="添加成员"
          >
            <Plus size={18} strokeWidth={2.4} />
          </button>
        }
      />

      <PageShell className="min-h-0" contentClassName="space-y-4">
        <Card className="overflow-hidden border-pine/10 bg-pine text-cream">
          <div className="p-5">
            <p className="mb-1 text-xs tracking-wider text-cream/60">家族关系</p>
            <h1 className="text-xl font-bold">{family.displayName}</h1>
            <p className="mt-1 text-sm text-cream/70">
              {persons.length} 位家人 · 祖辈 {filledGrandparents}/4 · 父母 {filledParents}/2
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/family/tree/graph" className={cn(buttonVariants({ variant: 'primary' }), 'gap-2')}>
            <Network size={16} />
            查看家族关系图
          </Link>
          <Link href="/family/members" className={cn(buttonVariants({ variant: 'secondary' }), 'gap-2')}>
            <Users size={16} />
            成员列表
          </Link>
          <Link href="/family/settings" className={cn(buttonVariants({ variant: 'secondary' }), 'gap-2')}>
            <Settings size={16} />
            家堂设置
          </Link>
          <Link href="/family/output" className={cn(buttonVariants({ variant: 'gold' }), 'gap-2')}>
            <FileText size={16} />
            生成预览
          </Link>
        </div>

        <GenRow label="祖辈" badge={filledGrandparents > 0 ? `已录入 ${filledGrandparents}/4` : '尚未录入'}>
          {GRANDPARENT_RELS.map((relation) => (
            <PersonNode key={relation} person={get(relation)} relation={relation} onAdd={() => add(relation)} />
          ))}
        </GenRow>

        <Connector />

        <GenRow label="父母" badge={filledParents > 0 ? `已录入 ${filledParents}/2` : '尚未录入'}>
          {PARENT_RELS.map((relation) => (
            <PersonNode key={relation} person={get(relation)} relation={relation} onAdd={() => add(relation)} />
          ))}
        </GenRow>

        <Connector />

        <GenRow label="本人 / 配偶 / 兄弟姐妹">
          {siblings.map((sibling) => (
            <PersonNode key={sibling.id} person={sibling} relation="sibling" />
          ))}
          {selfPerson && <PersonNode person={selfPerson} relation="self" isOwner />}
          <PersonNode person={spouse} relation="spouse" onAdd={() => add('spouse')} />
          <PersonNode person={null} relation="sibling" onAdd={() => add('sibling')} />
        </GenRow>

        <Connector />

        <GenRow label="子女" badge={children.length > 0 ? `${children.length} 位` : '尚未录入'}>
          {children.map((child) => (
            <PersonNode key={child.id} person={child} relation="child" />
          ))}
          <PersonNode person={null} relation="child" onAdd={() => add('child')} />
        </GenRow>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-3 text-xs text-muted">
          <LegendDot className="bg-pine ring-1 ring-gold/60 ring-offset-1" label="本人" />
          <LegendDot className="bg-sand" label="已录入" />
          <LegendDot className="border-2 border-dashed border-sand" label="待添加" />
          <Badge variant="gold">待认领</Badge>
        </div>
      </PageShell>
    </div>
  );
}

function PersonNode({ person, relation, onAdd, isOwner = false }: NodeProps) {
  const label = treeRelationLabel(relation, person);

  if (!person) {
    return (
      <button onClick={onAdd} className="group flex w-[76px] flex-col items-center gap-1.5" aria-label={`添加${label}`}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-sand bg-cream/80 transition-all group-hover:border-gold/70 group-active:scale-95">
          <Plus size={20} className="text-sand group-hover:text-gold" />
        </div>
        <span className="w-full truncate text-center text-[11px] leading-tight text-muted/80">{label}</span>
        <span className="text-[10px] text-sand/90">添加</span>
      </button>
    );
  }

  const initial = person.name.charAt(0);
  const isClaimed = person.claimStatus === 'claimed';

  return (
    <div className="flex w-[76px] flex-col items-center gap-1.5">
      <div
        className={cn(
          'flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-2xl text-lg font-semibold',
          isOwner
            ? 'bg-pine text-cream ring-2 ring-gold/70 ring-offset-2 ring-offset-cream'
            : 'bg-sand text-pine'
        )}
      >
        {initial}
      </div>
      <span className="w-full truncate text-center text-[11px] font-medium leading-tight text-charcoal">
        {person.name}
      </span>
      <span className="text-center text-[10px] text-muted">{label}</span>
      {!isClaimed && !isOwner && <Badge variant="gold" className="px-1.5 py-0.5 text-[10px]">待认领</Badge>}
    </div>
  );
}

function GenRow({ label, badge, children }: { label: string; badge?: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-muted">{label}</span>
        {badge && <Badge>{badge}</Badge>}
      </div>
      <div className="flex flex-wrap items-start justify-start gap-3">{children}</div>
    </Card>
  );
}

function Connector() {
  return (
    <div className="flex justify-center py-0.5">
      <div className="h-5 w-px bg-sand" />
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('h-4 w-4 rounded-full', className)} />
      <span>{label}</span>
    </div>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}
