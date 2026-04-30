'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MailPlus, UserPlus, Users } from 'lucide-react';
import type { FamilyMembership, FamilySpace, PersonProfile, PersonRelation } from '@/types/domain';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { canManageFamily } from '@/lib/auth/permission-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listFamilyMembers, listFamilyMemberships, relationLabel } from '@/lib/services/member-service';
import { listPersonRelations } from '@/lib/services/person-service';
import AppHeader from '@/components/AppHeader';
import { Badge, Card, PageShell, buttonVariants } from '@/components/ui';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'claimed' | 'unclaimed' | 'alive' | 'deceased';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'claimed', label: '已认领' },
  { value: 'unclaimed', label: '待认领' },
  { value: 'alive', label: '在世' },
  { value: 'deceased', label: '已故' },
];

const CLAIM_LABELS = {
  claimed: '已认领',
  unclaimed: '待认领',
  disputed: '有争议',
} as const;

const LIVING_LABELS = {
  alive: '在世',
  deceased: '已故',
  unknown: '未知',
} as const;

const GENDER_LABELS = {
  male: '男',
  female: '女',
  unknown: '未知',
} as const;

const ROLE_LABELS = {
  owner: '创建者',
  family_admin: '家堂管理员',
  memory_admin: '记忆管理员',
  member: '成员',
  viewer: '访客',
} as const;

export default function FamilyMembersPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [people, setPeople] = useState<PersonProfile[]>([]);
  const [memberships, setMemberships] = useState<FamilyMembership[]>([]);
  const [relations, setRelations] = useState<PersonRelation[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
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

        const [familyPeople, familyMemberships, familyRelations, allowed] = await Promise.all([
          listFamilyMembers(currentFamily.id),
          listFamilyMemberships(currentFamily.id),
          listPersonRelations(currentFamily.id),
          canManageFamily(currentFamily.id),
        ]);

        setCurrentUserId(user.id);
        setFamily(currentFamily);
        setPeople(familyPeople);
        setMemberships(familyMemberships);
        setRelations(familyRelations);
        setCanManage(allowed);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载家人成员失败');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const selfPerson = useMemo(
    () =>
      people.find(
        (person) => person.bound_user_id === currentUserId && person.claim_status === 'claimed'
      ) ??
      people.find((person) => person.bound_user_id === currentUserId) ??
      null,
    [currentUserId, people]
  );

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      if (filter === 'claimed') return person.claim_status === 'claimed';
      if (filter === 'unclaimed') return person.claim_status === 'unclaimed';
      if (filter === 'alive') return person.living_status === 'alive';
      if (filter === 'deceased') return person.living_status === 'deceased';
      return true;
    });
  }, [filter, people]);

  if (loading) return <CenteredText text="加载中..." />;
  if (error || !family) return <CenteredText text={error || '请先创建数字家堂'} />;

  function getRelationSummary(person: PersonProfile): string {
    if (selfPerson && person.id === selfPerson.id) return '本人';

    const connected = relations.find(
      (relation) =>
        (relation.from_person_id === person.id && relation.to_person_id === selfPerson?.id) ||
        (relation.to_person_id === person.id && relation.from_person_id === selfPerson?.id)
    );

    if (!connected || !selfPerson) return '家人档案';
    if (connected.relation_type === 'parent_of') {
      return connected.to_person_id === selfPerson.id ? '父母' : '子女';
    }
    if (connected.relation_type === 'spouse_of') return '配偶';
    if (connected.relation_type === 'sibling_of') return '兄弟姐妹';
    if (connected.relation_type === 'grandparent_of') {
      return connected.to_person_id === selfPerson.id ? '祖辈' : '孙辈';
    }
    return relationLabel(connected, selfPerson.id);
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="家人成员" backHref="/family" />

      <PageShell className="min-h-0" contentClassName="space-y-5">
        <Card className="overflow-hidden border-pine/10 bg-pine text-cream">
          <div className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1 text-xs tracking-wider text-cream/60">数字家堂</p>
                <h1 className="truncate text-xl font-bold">{family.displayName}</h1>
                <p className="mt-1 text-sm text-cream/70">{people.length} 份家人档案</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream/10">
                <Users size={22} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat label="已认领" value={people.filter((item) => item.claim_status === 'claimed').length} />
              <Stat label="待认领" value={people.filter((item) => item.claim_status === 'unclaimed').length} />
              <Stat label="在世" value={people.filter((item) => item.living_status === 'alive').length} />
            </div>
          </div>
        </Card>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                filter === item.value
                  ? 'bg-pine text-cream'
                  : 'border border-sand bg-card text-muted hover:border-gold/40 hover:text-charcoal'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {canManage && (
          <div className="grid grid-cols-2 gap-3">
            <Link href="/family/relatives/new" className={cn(buttonVariants({ fullWidth: true }), 'gap-2')}>
              <UserPlus size={16} />
              添加亲属
            </Link>
            <Link
              href="/family/invite"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-pine/70 bg-card px-4 text-sm font-semibold text-pine transition-colors hover:bg-pine/5 active:scale-[0.98]"
            >
              <MailPlus size={16} />
              邀请认领
            </Link>
          </div>
        )}

        {filteredPeople.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="mb-2 text-sm font-medium text-charcoal">暂无成员</p>
            <p className="mb-4 text-xs text-muted">先添加亲属，补全家人档案。</p>
            {canManage && (
              <Link href="/family/relatives/new" className="inline-flex items-center justify-center rounded-xl bg-pine px-4 py-2.5 text-sm font-semibold text-cream">
                去添加亲属
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPeople.map((person) => {
              const membership = person.bound_user_id
                ? memberships.find((item) => item.user_id === person.bound_user_id) ?? null
                : null;

              return (
                <Link key={person.id} href={`/family/members/${person.id}`} className="block">
                  <Card className="p-4 transition-all hover:-translate-y-0.5 hover:border-gold/35 hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pine/10 text-base font-semibold text-pine">
                        {person.display_name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <h2 className="truncate text-base font-semibold text-charcoal">{person.display_name}</h2>
                          <Badge variant={person.claim_status === 'claimed' ? 'pine' : 'gold'}>
                            {CLAIM_LABELS[person.claim_status]}
                          </Badge>
                        </div>
                        <p className="mb-2 text-xs text-muted">
                          {GENDER_LABELS[person.gender ?? 'unknown']} · {person.birth_year ?? '出生年份未知'} · {LIVING_LABELS[person.living_status]}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge>{getRelationSummary(person)}</Badge>
                          <Badge>{person.bound_user_id ? '已绑定用户' : '未绑定用户'}</Badge>
                          {person.bound_user_id && membership && <Badge variant="pine">{ROLE_LABELS[membership.role]}</Badge>}
                          {person.id === selfPerson?.id && <Badge variant="gold">本人</Badge>}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </PageShell>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-cream/10 px-3 py-2">
      <p className="text-[11px] text-cream/60">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
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
