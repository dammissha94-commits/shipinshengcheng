'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MailPlus, Search, UserPlus, Users } from 'lucide-react';
import type { FamilyMembership, FamilySpace, PersonProfile, PersonRelation } from '@/types/domain';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { canManageFamily } from '@/lib/auth/permission-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listFamilyMembers, listFamilyMemberships, relationLabel } from '@/lib/services/member-service';
import { listPersonRelations } from '@/lib/services/person-service';
import { getKinshipLabel, normalizeRelationType } from '@/lib/kinship/kinship-adapter';
import AppHeader from '@/components/AppHeader';
import StatusBadge from '@/components/wujia/StatusBadge';
import EmptyState from '@/components/wujia/EmptyState';

type Filter = 'all' | 'claimed' | 'unclaimed' | 'alive' | 'deceased';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'claimed', label: '已认领' },
  { value: 'unclaimed', label: '待认领' },
  { value: 'alive', label: '在世' },
  { value: 'deceased', label: '已故' },
];

const CLAIM_LABELS: Record<string, string> = {
  claimed: '已认领',
  unclaimed: '待认领',
  disputed: '有争议',
};

const GENDER_LABELS: Record<string, string> = {
  male: '男',
  female: '女',
  unknown: '未知',
};

const ROLE_LABELS: Record<string, string> = {
  owner: '创建者',
  family_admin: '管理员',
  memory_admin: '记忆管理员',
  member: '成员',
  viewer: '访客',
};

export default function FamilyMembersPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [people, setPeople] = useState<PersonProfile[]>([]);
  const [memberships, setMemberships] = useState<FamilyMembership[]>([]);
  const [relations, setRelations] = useState<PersonRelation[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
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
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }

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
    () => people.find((p) => p.bound_user_id === currentUserId && p.claim_status === 'claimed')
      ?? people.find((p) => p.bound_user_id === currentUserId) ?? null,
    [currentUserId, people]
  );

  const membershipByUserId = useMemo(
    () => new Map(memberships.map((m) => [m.user_id, m])),
    [memberships]
  );

  const filteredPeople = useMemo(() => {
    let result = people;
    if (filter === 'claimed') result = result.filter((p) => p.claim_status === 'claimed');
    else if (filter === 'unclaimed') result = result.filter((p) => p.claim_status === 'unclaimed');
    else if (filter === 'alive') result = result.filter((p) => p.living_status === 'alive');
    else if (filter === 'deceased') result = result.filter((p) => p.living_status === 'deceased');
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((p) => p.display_name.toLowerCase().includes(q));
    }
    return result;
  }, [filter, search, people]);

  if (loading) return <CenteredText text="加载中..." />;
  if (error || !family) return <CenteredText text={error || '请先创建数字家堂'} />;

  const claimedCount = people.filter((p) => p.claim_status === 'claimed').length;
  const unclaimedCount = people.filter((p) => p.claim_status === 'unclaimed').length;

  function getRelationSummary(person: PersonProfile): string {
    if (selfPerson && person.id === selfPerson.id) return '本人';
    const connected = relations.find(
      (r) => (r.from_person_id === person.id && r.to_person_id === selfPerson?.id)
        || (r.to_person_id === person.id && r.from_person_id === selfPerson?.id)
    );
    if (!connected || !selfPerson) return '家人';
    try {
      const fallback = relationLabel(connected, selfPerson.id);
      if (connected.relation_type === 'parent_of') {
        if (connected.to_person_id === selfPerson.id) {
          return person.gender === 'male' ? getKinshipLabel('father', person.gender).label
            : person.gender === 'female' ? getKinshipLabel('mother', person.gender).label
            : normalizeRelationType('parent_of') || fallback;
        }
        return getKinshipLabel('child', person.gender ?? undefined).label;
      }
      if (connected.relation_type === 'spouse_of') return getKinshipLabel('spouse', person.gender ?? undefined).label;
      if (connected.relation_type === 'sibling_of') return normalizeRelationType('sibling_of', person.gender ?? undefined) || fallback;
      if (connected.relation_type === 'grandparent_of') {
        if (connected.to_person_id === selfPerson.id) return normalizeRelationType('grandparent_of', person.gender ?? undefined) || fallback;
        return person.gender === 'male' ? '孙子' : person.gender === 'female' ? '孙女' : '孙辈';
      }
      return normalizeRelationType(connected.relation_type, person.gender ?? undefined) || fallback;
    } catch { return relationLabel(connected, selfPerson.id); }
  }

  return (
    <div className="min-h-screen bg-[#F8F1E7]">
      <AppHeader title="家人" backHref="/family" />

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-5">
        {/* Header stats */}
        <div className="rounded-2xl bg-#5A3524 p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-white/40 tracking-widest font-medium">数字家堂</p>
              <h1 className="mt-0.5 text-xl font-bold">{family.displayName}</h1>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <Users size={22} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="已认领" value={claimedCount} />
            <Stat label="待认领" value={unclaimedCount} />
            <Stat label="总成员" value={people.length} />
          </div>
        </div>

        {/* Search & actions */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索姓名..."
              className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all"
            />
          </div>
          {canManage && (
            <Link
              href="/family/relatives/new"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-#5A3524 text-white transition-colors hover:bg-#4E342E active:scale-95"
              aria-label="添加亲属"
            >
              <UserPlus size={18} strokeWidth={2} />
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                filter === item.value
                  ? 'bg-#5A3524 text-white'
                  : 'border border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Invite CTA */}
        {canManage && unclaimedCount > 0 && (
          <Link
            href="/family/invite"
            className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 transition-all hover:border-amber-300 active:scale-[0.99]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <MailPlus size={18} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-800">邀请 {unclaimedCount} 位家人认领档案</p>
              <p className="text-xs text-stone-500">让家人自己完善个人资料</p>
            </div>
            <span className="text-amber-600 text-lg">&rsaquo;</span>
          </Link>
        )}

        {/* Member cards */}
        {filteredPeople.length === 0 ? (
          <EmptyState
            icon={<Users size={24} strokeWidth={1.8} />}
            title={search ? '未找到匹配的成员' : '暂无成员'}
            description={search ? '尝试其他关键词' : '先添加亲属，补全家人档案'}
            action={!search && canManage ? <Link href="/family/relatives/new" className="inline-flex items-center gap-2 rounded-xl bg-#5A3524 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E transition-colors"><UserPlus size={16} /> 添加第一位家人</Link> : undefined}
          />
        ) : (
          <div className="space-y-3">
            {filteredPeople.map((person) => {
              const membership = person.bound_user_id
                ? (membershipByUserId.get(person.bound_user_id) ?? null)
                : null;
              const isClaimed = person.claim_status === 'claimed';
              const isSelf = person.id === selfPerson?.id;

              return (
                <Link key={person.id} href={`/family/members/${person.id}`} className="block">
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-semibold ${
                        isSelf ? 'bg-#5A3524 text-white ring-2 ring-amber-400 ring-offset-2 ring-offset-white' : 'bg-#F0E6D5 text-#6D4C41'
                      }`}>
                        {person.display_name.charAt(0)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="truncate text-base font-semibold text-stone-800">{person.display_name}</h2>
                          <StatusBadge variant={isClaimed ? 'success' : 'warning'}>
                            {CLAIM_LABELS[person.claim_status]}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          {GENDER_LABELS[person.gender ?? 'unknown']}
                          {person.birth_year && <span> · {person.birth_year} 年</span>}
                          {person.living_status !== 'alive' && <span> · {person.living_status === 'deceased' ? '已故' : ''}</span>}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <StatusBadge variant="muted">{getRelationSummary(person)}</StatusBadge>
                          {isSelf && <StatusBadge variant="warning">本人</StatusBadge>}
                          {membership && !isSelf && <StatusBadge variant="muted">{ROLE_LABELS[membership.role]}</StatusBadge>}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2">
      <p className="text-[11px] text-white/50">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F1E7] px-4 text-center">
      <p className="text-sm text-stone-500">{text}</p>
    </div>
  );
}
