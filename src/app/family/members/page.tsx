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
import { listFamilyMembers, listFamilyMemberships } from '@/lib/services/member-service';
import { listPersonRelations } from '@/lib/services/person-service';
import { relationLabelForSubject } from '@/lib/kinship/relation-display';
import StatusBadge from '@/components/wujia/StatusBadge';
import EmptyState from '@/components/wujia/EmptyState';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { NoMembersIllustration } from '@/components/illustrations';

type Filter = 'all' | 'claimed' | 'unclaimed' | 'alive' | 'deceased';
type GroupBy = 'none' | 'decade' | 'living';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'claimed', label: '已认领' },
  { value: 'unclaimed', label: '待认领' },
  { value: 'alive', label: '健在' },
  { value: 'deceased', label: '离世' },
];

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: '列表' },
  { value: 'decade', label: '按年代' },
  { value: 'living', label: '按状态' },
];

/** 把 birth_year 映射到年代标签：1985 → "80 后" */
function decadeLabel(year: number | null | undefined): string {
  if (!year) return '未填生年';
  const decade = Math.floor(year / 10) * 10;
  const suffix = decade % 100;
  return `${suffix < 10 ? '0' + suffix : suffix} 后`;
}

const LIVING_GROUP_LABEL: Record<string, string> = {
  alive: '健在',
  deceased: '离世',
  unknown: '未填写',
};

const CLAIM_LABELS: Record<string, string> = {
  claimed: '已认领',
  unclaimed: '待认领',
  disputed: '有争议',
  rejected: '已拒绝',
  hidden: '已隐藏',
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
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
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

  /** 按 groupBy 把 filteredPeople 切分为有序分组 */
  const groupedPeople = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: '', items: filteredPeople }];
    }
    if (groupBy === 'decade') {
      // 按年代倒序（年长者优先）
      const buckets = new Map<string, PersonProfile[]>();
      for (const p of filteredPeople) {
        const key = decadeLabel(p.birth_year);
        const list = buckets.get(key) ?? [];
        list.push(p);
        buckets.set(key, list);
      }
      const entries = Array.from(buckets.entries()).map(([label, items]) => {
        // 排序：年长者排前；同年代内按 birth_year asc
        const sorted = [...items].sort((a, b) => (a.birth_year ?? 9999) - (b.birth_year ?? 9999));
        return { key: label, label, items: sorted };
      });
      return entries.sort((a, b) => {
        // "未填生年" 放最后
        if (a.label === '未填生年') return 1;
        if (b.label === '未填生年') return -1;
        // 取数字部分（'80 后' → 80）
        const ay = parseInt(a.label, 10);
        const by = parseInt(b.label, 10);
        // 旧的年代（30 后）排前面，但 00 后实际是 2000s，应该比 90 后更晚
        // 简化：< 30 视为 200x，否则 19xx
        const ya = ay < 30 ? 2000 + ay : 1900 + ay;
        const yb = by < 30 ? 2000 + by : 1900 + by;
        return ya - yb;
      });
    }
    // groupBy === 'living'
    const buckets = new Map<string, PersonProfile[]>();
    for (const p of filteredPeople) {
      const key = p.living_status ?? 'unknown';
      const list = buckets.get(key) ?? [];
      list.push(p);
      buckets.set(key, list);
    }
    const order = ['alive', 'deceased', 'unknown'];
    return order
      .filter((k) => buckets.has(k))
      .map((k) => ({ key: k, label: LIVING_GROUP_LABEL[k], items: buckets.get(k) ?? [] }));
  }, [filteredPeople, groupBy]);

  if (loading) return <PageSkeleton title="家人列表" backHref="/family" cards={5} />;
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
    return relationLabelForSubject(connected, person.id, person.gender) ?? '家人';
  }

  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar title="家人列表" />

      <div className="relative z-10 px-5 pb-6">
        <div className="mb-4 grid grid-cols-3 gap-2">
          <MiniStat label="全部" value={people.length} />
          <MiniStat label="已认领" value={claimedCount} />
          <MiniStat label="待认领" value={unclaimedCount} />
        </div>

        {/* Search & actions */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索姓名、关系、生日等"
              className="h-11 w-full rounded-[13px] border border-[var(--line-1)] bg-white/82 pl-10 pr-4 text-[14px] text-[var(--ink-1)] shadow-warm-xs outline-none placeholder:text-[var(--ink-placeholder)] focus:border-[var(--walnut)]"
            />
          </div>
          {canManage && (
            <Link
              href="/family/relatives/new"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[var(--walnut)] text-white shadow-warm-lg transition active:scale-95"
              aria-label="添加亲属"
            >
              <UserPlus size={18} strokeWidth={2} />
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`shrink-0 rounded-full px-3.5 min-h-[44px] flex items-center text-[13px] font-medium transition-all ${
                filter === item.value
                  ? 'bg-[var(--walnut)] text-white shadow-warm-soft'
                  : 'bg-[var(--surface-3)] text-[var(--ink-3)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Group by */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[12px] tracking-[0.16em] text-[var(--ink-3)]">分组方式</p>
          <div
            role="radiogroup"
            aria-label="分组方式"
            className="inline-flex items-center gap-1 rounded-full border border-[var(--line-1)] bg-[var(--surface-1)] p-1"
          >
            {GROUP_OPTIONS.map(({ value, label }) => {
              const active = groupBy === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setGroupBy(value)}
                  className={`min-h-[36px] rounded-full px-3 text-[12px] font-medium transition-colors ${
                    active
                      ? 'bg-[var(--walnut)] text-white shadow-warm-xs'
                      : 'text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-2)]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Invite CTA */}
        {canManage && unclaimedCount > 0 && (
          <Link
            href="/family/invite"
            className="mt-4 flex items-center gap-3 rounded-[18px] border border-[var(--surface-2)] bg-[var(--surface-2)] p-4 shadow-gold-sm transition active:scale-[0.99]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning-light text-warning">
              <MailPlus size={18} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--ink-1)]">邀请 {unclaimedCount} 位家人认领档案</p>
              <p className="text-xs text-[var(--ink-3)]">让家人自己完善个人资料</p>
            </div>
            <span className="text-amber-600 text-lg">&rsaquo;</span>
          </Link>
        )}

        {/* Member cards */}
        {filteredPeople.length === 0 ? (
          <EmptyState
            illustration={search ? undefined : <NoMembersIllustration />}
            icon={search ? <Users size={24} strokeWidth={1.8} /> : undefined}
            title={search ? '未找到匹配的成员' : '还没有家人档案'}
            description={search ? '尝试其他关键词' : '从「添加亲属」开始，慢慢搭起这棵家族树'}
            action={!search && canManage ? <Link href="/family/relatives/new" className="wj-primary inline-flex items-center gap-2 rounded-2xl px-5 min-h-[44px] text-sm font-semibold transition-colors"><UserPlus size={16} /> 添加第一位家人</Link> : undefined}
          />
        ) : (
          <div className="mt-4 space-y-5">
            {groupedPeople.map((group) => (
              <section key={group.key}>
                {group.label && (
                  <div className="mb-2 flex items-center gap-2.5 px-1">
                    <div className="h-3 w-[3px] rounded-full bg-[var(--gold)]" />
                    <h3 className="text-[13px] font-semibold tracking-[0.04em] text-[var(--ink-2)]">
                      {group.label}
                    </h3>
                    <span className="text-[12px] text-[var(--ink-3)]">{group.items.length} 位</span>
                  </div>
                )}
                <div className="space-y-2.5">
                  {group.items.map((person) => {
                    const membership = person.bound_user_id
                      ? (membershipByUserId.get(person.bound_user_id) ?? null)
                      : null;
                    const isClaimed = person.claim_status === 'claimed';
                    const isSelf = person.id === selfPerson?.id;

                    return (
                      <Link key={person.id} href={`/family/members/${person.id}`} className="block">
                        <div className="rounded-[13px] border border-[var(--line-1)] bg-white/86 p-3 shadow-warm-xs transition active:scale-[0.99]">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl text-[18px] font-semibold ${
                              isSelf ? 'bg-[var(--walnut)] text-white ring-2 ring-[var(--gold-light)] ring-offset-2 ring-offset-white' : 'bg-[var(--gold-light)] text-[var(--walnut)]'
                            }`}>
                              {person.display_name.charAt(0)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <h2 className="truncate text-[16px] font-bold text-[var(--ink-1)]">{person.display_name}</h2>
                                <StatusBadge variant={isClaimed ? 'success' : 'warning'}>
                                  {CLAIM_LABELS[person.claim_status]}
                                </StatusBadge>
                              </div>
                              <p className="mt-1 text-[13px] text-[var(--ink-3)]">
                                {getRelationSummary(person)}
                                {person.birth_year && <span> · {person.birth_year} 年</span>}
                                {person.living_status !== 'alive' && <span> · {person.living_status === 'deceased' ? '离世' : ''}</span>}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <StatusBadge variant="muted">{GENDER_LABELS[person.gender ?? 'unknown']}</StatusBadge>
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
              </section>
            ))}
          </div>
        )}
      </div>
    </MobilePage>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[13px] border border-[var(--line-1)] bg-white/76 px-3 py-2 text-center shadow-warm-xs">
      <p className="text-[12px] text-[var(--ink-3)]">{label}</p>
      <p className="mt-0.5 font-serif text-[24px] leading-none text-[var(--ink-2)]">{value}</p>
    </div>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <div className="wj-page flex min-h-screen items-center justify-center px-4 text-center">
      <p className="text-sm text-[var(--ink-3)]">{text}</p>
    </div>
  );
}
