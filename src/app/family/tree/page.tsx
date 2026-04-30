'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listFamilyPersons, listPersonRelations } from '@/lib/services/person-service';
import { mapProfilesToTreePersons } from '@/lib/family-view';
import type { Person, Relation } from '@/types/domain';
import type { FamilySpace } from '@/types/domain';
import { getRelationLabel } from '@/types/domain';
import AppHeader from '@/components/AppHeader';

// ── Person card ──────────────────────────────────────────────────────────────

interface NodeProps {
  person: Person | null;
  relation: Relation;
  onAdd?: () => void;
  isOwner?: boolean;
}

function PersonNode({ person, relation, onAdd, isOwner = false }: NodeProps) {
  const label = getRelationLabel(relation, person?.gender);

  if (!person) {
    return (
      <button
        onClick={onAdd}
        className="flex flex-col items-center gap-1.5 w-[72px] group"
        aria-label={`添加${label}`}
      >
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-sand bg-cream/80
          flex items-center justify-center group-hover:border-gold/70 group-active:scale-95
          transition-all">
          <span className="text-xl leading-none text-sand group-hover:text-gold">+</span>
        </div>
        <span className="text-[11px] text-muted/70 text-center leading-tight">{label}</span>
        <span className="text-[10px] text-sand/80">添加</span>
      </button>
    );
  }

  const initial = person.name.charAt(0);
  const isClaimed = person.claimStatus === 'claimed';

  return (
    <div className="flex flex-col items-center gap-1.5 w-[72px]">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center
          text-lg font-semibold select-none shrink-0
          ${isOwner
            ? 'bg-pine text-cream ring-2 ring-gold/70 ring-offset-2 ring-offset-cream'
            : 'bg-sand text-pine'
          }`}
      >
        {initial}
      </div>
      <span className="text-[11px] font-medium text-charcoal text-center truncate w-full leading-tight">
        {person.name}
      </span>
      <span className="text-[10px] text-muted text-center">{label}</span>
      {!isClaimed && !isOwner && (
        <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full leading-tight whitespace-nowrap">
          待认领
        </span>
      )}
    </div>
  );
}

// ── Generation row ───────────────────────────────────────────────────────────

function GenRow({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl border border-sand/60 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted tracking-wider">{label}</span>
        {badge && (
          <span className="text-[10px] bg-sand/60 text-muted px-2 py-0.5 rounded-full">{badge}</span>
        )}
      </div>
      <div className="flex items-start justify-start gap-3 flex-wrap">{children}</div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center py-0.5">
      <div className="w-px h-5 bg-sand" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const GRANDPARENT_RELS: Relation[] = [
  'grandfather_paternal', 'grandmother_paternal',
  'grandfather_maternal', 'grandmother_maternal',
];
const PARENT_RELS: Relation[] = ['father', 'mother'];

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
        setError(loadError instanceof Error ? loadError.message : '加载家谱失败');
      } finally {
        setLoading(false);
      }
    }

    loadTree();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-muted text-sm">加载中…</p>
      </div>
    );
  }

  if (error || !family) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 text-center">
        <p className="text-sm text-muted">{error || '请先创建数字家堂'}</p>
      </div>
    );
  }

  function get(rel: Relation) {
    return persons.find((p) => p.relation === rel) ?? null;
  }
  function add(rel: Relation) {
    router.push(`/family/relatives/new?relation=${rel}`);
  }

  const selfPerson = get('self');
  const spouse = get('spouse');
  const siblings = persons.filter((p) => p.relation === 'sibling');
  const children = persons.filter((p) => p.relation === 'child');

  const filledGrandparents = GRANDPARENT_RELS.filter((r) => !!get(r)).length;
  const filledParents = PARENT_RELS.filter((r) => !!get(r)).length;

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader
        title={`${family.surname}家三代谱`}
        backHref="/family"
        rightElement={
          <button
            onClick={() => add('father')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sand/60 transition-colors text-pine"
            aria-label="添加成员"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        }
      />

      <div className="px-4 py-5 max-w-md mx-auto space-y-1.5">
        <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-3">
          <button
            onClick={() => router.push('/family/members')}
            className="rounded-xl bg-pine text-cream py-3 text-sm font-semibold"
          >
            查看成员列表
          </button>
          <button
            onClick={() => router.push('/family/settings')}
            className="rounded-xl border border-pine text-pine py-3 text-sm font-semibold"
          >
            查看家堂设置
          </button>
          <button
            onClick={() => router.push('/family/output')}
            className="rounded-xl border border-gold bg-gold/10 text-gold py-3 text-sm font-semibold"
          >
            生成三代谱预览
          </button>
        </div>

        {/* Grandparents */}
        <GenRow
          label="祖　辈"
          badge={filledGrandparents > 0 ? `已录入 ${filledGrandparents}/4` : '尚未录入'}
        >
          {GRANDPARENT_RELS.map((rel) => (
            <PersonNode key={rel} person={get(rel)} relation={rel} onAdd={() => add(rel)} />
          ))}
        </GenRow>

        <Connector />

        {/* Parents */}
        <GenRow
          label="父　辈"
          badge={filledParents > 0 ? `已录入 ${filledParents}/2` : '尚未录入'}
        >
          {PARENT_RELS.map((rel) => (
            <PersonNode key={rel} person={get(rel)} relation={rel} onAdd={() => add(rel)} />
          ))}
        </GenRow>

        <Connector />

        {/* Self generation */}
        <GenRow label="本　辈">
          {/* Siblings (before self) */}
          {siblings.map((s) => (
            <PersonNode key={s.id} person={s} relation="sibling" />
          ))}
          {/* Self — always shown */}
          {selfPerson && (
            <PersonNode person={selfPerson} relation="self" isOwner />
          )}
          {/* Spouse */}
          <PersonNode person={spouse} relation="spouse" onAdd={() => add('spouse')} />
          {/* Add sibling button */}
          <PersonNode person={null} relation="sibling" onAdd={() => add('sibling')} />
        </GenRow>

        <Connector />

        {/* Children */}
        <GenRow
          label="后　代"
          badge={children.length > 0 ? `${children.length} 位` : '尚未录入'}
        >
          {children.map((c) => (
            <PersonNode key={c.id} person={c} relation="child" />
          ))}
          <PersonNode person={null} relation="child" onAdd={() => add('child')} />
        </GenRow>

        {/* Legend */}
        <div className="pt-4 flex items-center justify-center gap-5 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-pine ring-1 ring-gold/60 ring-offset-1" />
            <span>本人</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-sand" />
            <span>已录入</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-sand" />
            <span>待添加</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="px-1.5 py-0.5 rounded-full bg-gold/10 text-[9px] text-gold leading-none">待认领</div>
          </div>
        </div>
      </div>
    </div>
  );
}
