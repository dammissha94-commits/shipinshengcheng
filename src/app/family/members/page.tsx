'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FamilyMembership, FamilySpace, PersonProfile, PersonRelation } from '@/types/domain';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { canManageFamily } from '@/lib/auth/permission-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listFamilyMembers, listFamilyMemberships, relationLabel } from '@/lib/services/member-service';
import { listPersonRelations } from '@/lib/services/person-service';
import AppHeader from '@/components/AppHeader';

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

  if (loading) {
    return <CenteredText text="加载中..." />;
  }

  if (error || !family) {
    return <CenteredText text={error || '请先创建数字家堂'} />;
  }

  function getRelationSummary(person: PersonProfile): string {
    if (selfPerson && person.id === selfPerson.id) return '本人';

    const connected = relations.find(
      (relation) =>
        (relation.from_person_id === person.id && relation.to_person_id === selfPerson?.id) ||
        (relation.to_person_id === person.id && relation.from_person_id === selfPerson?.id)
    );

    if (!connected || !selfPerson) {
      return '家人档案';
    }

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

      <main className="px-4 py-5 max-w-md mx-auto">
        <div className="bg-pine rounded-2xl p-5 text-cream mb-5">
          <p className="text-xs text-cream/60 mb-1">数字家堂</p>
          <h1 className="text-xl font-bold">{family.displayName}</h1>
          <p className="text-sm text-cream/70 mt-1">{people.length} 份家人档案</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium ${
                filter === item.value
                  ? 'bg-pine text-cream'
                  : 'bg-card text-muted border border-sand'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {canManage && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Link href="/family/relatives/new" className="text-center rounded-xl bg-pine text-cream py-3 text-sm font-semibold">
              添加亲属
            </Link>
            <Link href="/family/invite" className="text-center rounded-xl border border-pine text-pine py-3 text-sm font-semibold">
              邀请认领
            </Link>
          </div>
        )}

        {filteredPeople.length === 0 ? (
          <div className="bg-card rounded-2xl border border-sand/60 shadow-sm p-5 text-center">
            <p className="text-sm text-charcoal font-medium mb-2">暂无成员</p>
            <p className="text-xs text-muted mb-4">先去添加亲属，补全家人档案。</p>
            {canManage && (
              <Link href="/family/relatives/new" className="inline-flex items-center justify-center rounded-xl bg-pine text-cream px-4 py-2.5 text-sm font-semibold">
                去添加亲属
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPeople.map((person) => {
              const membership = person.bound_user_id
                ? memberships.find((item) => item.user_id === person.bound_user_id) ?? null
                : null;

              return (
                <Link
                  key={person.id}
                  href={`/family/members/${person.id}`}
                  className="block bg-card rounded-2xl border border-sand/60 shadow-sm p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-sand text-pine font-semibold flex items-center justify-center shrink-0">
                      {person.display_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h2 className="text-base font-semibold text-charcoal truncate">{person.display_name}</h2>
                        <span className="text-[11px] rounded-full px-2 py-0.5 bg-gold/10 text-gold shrink-0">
                          {CLAIM_LABELS[person.claim_status]}
                        </span>
                      </div>
                      <p className="text-xs text-muted mb-2">
                        {GENDER_LABELS[person.gender ?? 'unknown']} ·{' '}
                        {person.birth_year ?? '出生年份未知'} · {LIVING_LABELS[person.living_status]}
                      </p>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="rounded-full bg-sand/60 text-muted px-2 py-0.5">
                          {getRelationSummary(person)}
                        </span>
                        <span className="rounded-full bg-sand/60 text-muted px-2 py-0.5">
                          {person.bound_user_id ? '已绑定用户' : '未绑定用户'}
                        </span>
                        {person.bound_user_id && membership && (
                          <span className="rounded-full bg-pine/10 text-pine px-2 py-0.5">
                            {ROLE_LABELS[membership.role]}
                          </span>
                        )}
                        {person.id === selfPerson?.id && (
                          <span className="rounded-full bg-gold/10 text-gold px-2 py-0.5">本人</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 text-center">
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}
