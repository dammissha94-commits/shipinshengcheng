'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { FamilySpace, PersonProfile, PersonRelation, Relation } from '@/types/domain';
import { ensureProfile, getCurrentUser, signOut } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import {
  listThisWeekFamilyEvents,
  listTodayFamilyReminders,
  listUpcomingFamilyEvents,
} from '@/lib/services/calendar-service';
import { listFamilyPersons, listPersonRelations } from '@/lib/services/person-service';
import { mapProfilesToTreePersons } from '@/lib/family-view';
import { calcCompletion } from '@/lib/family-completion';
import ProgressCard from '@/components/ProgressCard';
import SectionTitle from '@/components/SectionTitle';
import ActionGrid from '@/components/ActionGrid';
import type { ActionItem } from '@/components/ActionGrid';
import type { FamilyReminderItem, FamilyReminderSummary } from '@/types/service';

const quickActions: ActionItem[] = [
  { label: '添加父母', description: '录入父亲、母亲', href: '/family/relatives/new?relation=father', icon: <PeopleIcon /> },
  { label: '添加配偶', description: '录入丈夫或妻子', href: '/family/relatives/new?relation=spouse', icon: <HeartIcon /> },
  { label: '添加子女', description: '录入儿子或女儿', href: '/family/relatives/new?relation=child', icon: <PersonIcon /> },
  { label: '家人成员', description: '查看认领状态', href: '/family/members', icon: <PeopleIcon /> },
  { label: '查看三代谱', description: '家族关系结构图', href: '/family/tree', icon: <TreeIcon /> },
  { label: '家族关系图', description: '可视化亲属关系', href: '/family/tree/graph', icon: <GraphIcon /> },
  { label: '家堂数据看板', description: '查看完整度与家族数据', href: '/family/statistics', icon: <ChartIcon /> },
  { label: '邀请认领', description: '生成邀请链接文案', href: '/family/invite', icon: <ShareIcon /> },
  { label: '家堂设置', description: '名称与权限', href: '/family/settings', icon: <GearIcon /> },
  { label: '成果物', description: '三代谱、记忆册', href: '/family/output', icon: <FileIcon /> },
];

const lifeActions: ActionItem[] = [
  { label: '家族故事', description: '记录家族往事', href: '/family/stories', icon: <BookIcon /> },
  { label: '家族相册', description: '珍藏家族照片', href: '/family/photos', icon: <PhotoIcon /> },
  { label: '家族议事', description: '通知、聚会、投票', href: '/family/meetings', icon: <ChatIcon /> },
  { label: '家族日历', description: '纪念日与提醒', href: '/family/calendar', icon: <CalendarIcon /> },
];

const GRANDPARENT_RELS: Relation[] = [
  'grandfather_paternal',
  'grandmother_paternal',
  'grandfather_maternal',
  'grandmother_maternal',
];
const PARENT_RELS: Relation[] = ['father', 'mother'];

function IconBase({ children }: { children: React.ReactNode }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
function PeopleIcon() { return <IconBase><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></IconBase>; }
function HeartIcon() { return <IconBase><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-8.84a5.5 5.5 0 0 0 1.06-7.78z" /></IconBase>; }
function PersonIcon() { return <IconBase><circle cx="12" cy="8" r="4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /></IconBase>; }
function TreeIcon() { return <IconBase><rect x="9" y="2" width="6" height="4" rx="1" /><rect x="2" y="18" width="6" height="4" rx="1" /><rect x="9" y="18" width="6" height="4" rx="1" /><rect x="16" y="18" width="6" height="4" rx="1" /><path d="M12 6v4M5 18v-4h14v4M12 10H5M12 10h7" /></IconBase>; }
function GraphIcon() { return <IconBase><circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="12" cy="14" r="2.4" /><circle cx="6" cy="20" r="2.4" /><circle cx="18" cy="20" r="2.4" /><path d="M7.5 7.5l3.5 5M16.5 7.5l-3.5 5M10.6 15.6 7.4 18.4M13.4 15.6l3.2 2.8" /></IconBase>; }
function ChartIcon() { return <IconBase><path d="M4 19V5" /><path d="M4 19h16" /><rect x="7" y="11" width="3" height="5" rx="1" /><rect x="12" y="7" width="3" height="9" rx="1" /><rect x="17" y="3" width="3" height="13" rx="1" /></IconBase>; }
function ShareIcon() { return <IconBase><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></IconBase>; }
function FileIcon() { return <IconBase><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></IconBase>; }
function BookIcon() { return <IconBase><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></IconBase>; }
function PhotoIcon() { return <IconBase><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></IconBase>; }
function ChatIcon() { return <IconBase><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></IconBase>; }
function CalendarIcon() { return <IconBase><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></IconBase>; }
function GearIcon() { return <IconBase><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2 2 0 1 1-2.83 2.83l-.04-.04A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6 1.8 1.8 0 0 0-.5 1.3V21a2 2 0 0 1-4 0v-.06A1.8 1.8 0 0 0 8 19.4a1.8 1.8 0 0 0-1.98.36l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.8 1.8 0 0 0 3.6 15a1.8 1.8 0 0 0-.6-1 1.8 1.8 0 0 0-1.3-.5H1.6a2 2 0 0 1 0-4h.06A1.8 1.8 0 0 0 3.6 8a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2 2 0 1 1 2.83-2.83l.04.04A1.8 1.8 0 0 0 8 3.6a1.8 1.8 0 0 0 1-.6 1.8 1.8 0 0 0 .5-1.3V1.6a2 2 0 0 1 4 0v.06A1.8 1.8 0 0 0 15 3.6a1.8 1.8 0 0 0 1.98-.36l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04A1.8 1.8 0 0 0 19.4 8a1.8 1.8 0 0 0 .6 1 1.8 1.8 0 0 0 1.3.5h.1a2 2 0 0 1 0 4h-.06A1.8 1.8 0 0 0 19.4 15Z" /></IconBase>; }

function formatReminderDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

function RecentFamilyNodeCard({ summary }: { summary: FamilyReminderSummary | null }) {
  const upcoming = summary?.upcoming ?? [];

  return (
    <div className="mb-6">
      <SectionTitle title="近期家庭节点" rightElement={<Link href="/family/reminders" className="text-[14px] text-gold">查看全部</Link>} />
      <div className="rounded-2xl border border-sand/60 bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-pine/8 px-3 py-2.5">
            <p className="text-[12px] text-muted">今日提醒</p>
            <p className="mt-1 text-xl font-bold text-pine">{summary?.todayCount ?? 0}</p>
          </div>
          <div className="rounded-xl bg-gold/8 px-3 py-2.5">
            <p className="text-[12px] text-muted">本周提醒</p>
            <p className="mt-1 text-xl font-bold text-gold">{summary?.weekCount ?? 0}</p>
          </div>
        </div>

        {upcoming.length === 0 ? (
          <p className="rounded-xl bg-cream/60 px-4 py-4 text-[14px] text-muted text-center">近期暂无家庭节点提醒</p>
        ) : (
          <div className="space-y-1.5">
            {upcoming.map((item) => <RecentFamilyNodeItem key={item.event.id} item={item} />)}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Link href="/family/reminders" className="rounded-xl bg-pine px-3 py-2.5 text-center text-[14px] font-semibold text-cream transition-colors hover:bg-pine-light active:scale-[0.98]">
            查看全部提醒
          </Link>
          <Link href="/family/calendar" className="rounded-xl border border-pine/40 bg-card px-3 py-2.5 text-center text-[14px] font-semibold text-pine transition-colors hover:bg-pine/5 active:scale-[0.98]">
            打开家族日历
          </Link>
        </div>
      </div>
    </div>
  );
}

function RecentFamilyNodeItem({ item }: { item: FamilyReminderItem }) {
  const dateValue = item.nextOccurrenceDate ?? item.event.event_date;
  const dateLabel = item.isRecurringYearly && item.nextOccurrenceDate
    ? `下一次 ${formatReminderDate(dateValue)}`
    : formatReminderDate(dateValue);

  return (
    <Link
      href={`/family/calendar/${item.event.id}`}
      className="flex items-center justify-between gap-3 rounded-xl bg-cream px-3 py-2 transition-colors hover:bg-sand/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-charcoal">{item.event.title}</p>
        <p className="text-xs text-muted">
          {dateLabel} · {item.typeLabel}
          {item.isRecurringYearly ? ' · 每年重复' : ''}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">
        {item.badge}
      </span>
    </Link>
  );
}

function PersonDot({ relation, persons }: { relation: Relation; persons: ReturnType<typeof mapProfilesToTreePersons> }) {
  const person = persons.find((p) => p.relation === relation);
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium ${person ? 'bg-pine text-cream' : 'bg-sand text-muted/60'}`}>
      {person ? person.name.charAt(0) : '·'}
    </div>
  );
}

export default function FamilyPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [relations, setRelations] = useState<PersonRelation[]>([]);
  const [reminderSummary, setReminderSummary] = useState<FamilyReminderSummary | null>(null);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadFamily() {
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
        setUserId(user.id);
        await ensureProfile(user);
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) {
          router.replace('/create');
          return;
        }
        setFamily(currentFamily);
        const [familyProfiles, familyRelations, todayReminders, weekReminders, upcomingEvents] = await Promise.all([
          listFamilyPersons(currentFamily.id),
          listPersonRelations(currentFamily.id),
          listTodayFamilyReminders(currentFamily.id),
          listThisWeekFamilyEvents(currentFamily.id),
          listUpcomingFamilyEvents(currentFamily.id, 30),
        ]);
        setProfiles(familyProfiles);
        setRelations(familyRelations);
        setReminderSummary({
          todayCount: todayReminders.length,
          weekCount: weekReminders.length,
          monthCount: upcomingEvents.events.length,
          upcoming: upcomingEvents.events.slice(0, 3),
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载家堂失败');
      } finally {
        setLoading(false);
      }
    }

    loadFamily();
  }, [router]);

  async function handleSignOut() {
    await signOut();
    router.push(currentLoginRedirectPath());
  }

  if (loading) {
    return <div className="min-h-screen bg-cream flex items-center justify-center"><p className="text-muted text-sm">加载中…</p></div>;
  }

  if (error || !family) {
    return <div className="min-h-screen bg-cream flex items-center justify-center px-4 text-center"><p className="text-sm text-muted">{error || '请先创建数字家堂'}</p></div>;
  }

  const persons = mapProfilesToTreePersons(profiles, relations, userId);
  const completion = calcCompletion(persons);
  const selfPerson = persons.find((p) => p.relation === 'self');
  const spouse = persons.find((p) => p.relation === 'spouse');
  const unclaimedCount = profiles.filter((profile) => profile.claim_status === 'unclaimed').length;

  const hasFather = persons.some((p) => p.relation === 'father');
  const hasMother = persons.some((p) => p.relation === 'mother');
  const hasSpouse = Boolean(spouse);
  const hasChild = persons.some((p) => p.relation === 'child');
  const nextAction = !hasFather || !hasMother
    ? { label: '添加父母', desc: '完善三代谱的基础结构', href: '/family/relatives/new?relation=father' }
    : !hasSpouse
    ? { label: '添加配偶', desc: '让本辈家谱更加完整', href: '/family/relatives/new?relation=spouse' }
    : !hasChild
    ? { label: '添加子女', desc: '记录下一代家人信息', href: '/family/relatives/new?relation=child' }
    : unclaimedCount > 0
    ? { label: `邀请 ${unclaimedCount} 位亲属认领`, desc: '让家人自己完善个人档案', href: '/family/invite' }
    : null;

  return (
    <div className="min-h-screen bg-cream pb-safe">
      <div className="bg-pine px-5 pt-14 pb-9 text-cream">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12px] text-cream/45 tracking-[0.12em] font-medium">我的数字家堂</div>
          <button onClick={handleSignOut} className="text-[12px] text-cream/50 hover:text-cream/80 transition-colors">退出</button>
        </div>
        <h1 className="text-[26px] font-bold tracking-[0.03em] mb-1.5">{family.displayName}</h1>
        <p className="text-[14px] text-cream/55">{selfPerson?.name ?? '家人'} · {profiles.length} 位成员</p>
      </div>

      <div className="px-4 max-w-lg mx-auto">
        <div className="mb-6 -mt-4">
          <ProgressCard memberCount={profiles.length} completion={completion} />
        </div>

        {nextAction && (
          <Link href={nextAction.href} className="block mb-6">
            <div className="bg-gold/5 border border-gold/25 rounded-2xl p-4 flex items-center gap-3.5 transition-all duration-200 hover:border-gold/40 hover:bg-gold/8 active:scale-[0.99]">
              <div className="w-9 h-9 rounded-xl bg-gold/15 flex items-center justify-center text-gold shrink-0 text-[15px] font-semibold">!</div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-charcoal">建议下一步：{nextAction.label}</p>
                <p className="text-[13px] text-muted mt-0.5">{nextAction.desc}</p>
              </div>
              <span className="text-gold/60 shrink-0 text-lg">›</span>
            </div>
          </Link>
        )}

        <div className="mb-6">
          <SectionTitle title="快速入口" subtitle="添加家人，完善家族关系" />
          <ActionGrid items={quickActions} cols={3} />
        </div>

        <RecentFamilyNodeCard summary={reminderSummary} />

        <div className="mb-6">
          <SectionTitle title="三代谱预览" rightElement={<Link href="/family/tree" className="text-[14px] text-gold">查看详情</Link>} />
          <Link href="/family/tree">
            <div className="bg-card rounded-2xl border border-sand/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-3 mb-2.5">
                <span className="text-[13px] text-muted w-8 shrink-0">祖辈</span>
                <div className="flex gap-1.5">{GRANDPARENT_RELS.map((rel) => <PersonDot key={rel} relation={rel} persons={persons} />)}</div>
              </div>
              <div className="ml-[46px] w-px h-3 bg-sand/80" />
              <div className="flex items-center gap-3 mb-2.5">
                <span className="text-[13px] text-muted w-8 shrink-0">父辈</span>
                <div className="flex gap-1.5">{PARENT_RELS.map((rel) => <PersonDot key={rel} relation={rel} persons={persons} />)}</div>
              </div>
              <div className="ml-[46px] w-px h-3 bg-sand/80" />
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-muted w-8 shrink-0">本辈</span>
                <div className="flex gap-1.5">
                  <div className="w-7 h-7 rounded-full bg-pine flex items-center justify-center text-[10px] text-cream font-bold ring-2 ring-gold/50 ring-offset-2 ring-offset-card">
                    {(selfPerson?.name ?? '我').charAt(0)}
                  </div>
                  {spouse && <div className="w-7 h-7 rounded-full bg-pine/80 text-cream flex items-center justify-center text-[10px] font-medium">{spouse.name.charAt(0)}</div>}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-sand/60 flex items-center justify-between">
                <span className="text-[13px] text-muted">{profiles.length} 位成员{unclaimedCount > 0 && <span className="ml-1.5 text-gold font-medium">· {unclaimedCount} 待认领</span>}</span>
                <span className="text-[13px] text-gold font-medium">查看完整家谱 →</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="mb-6">
          <SectionTitle title="家族生活" subtitle="记录故事、照片与家族事务" />
          <ActionGrid items={lifeActions} cols={3} />
        </div>
      </div>
    </div>
  );
}
