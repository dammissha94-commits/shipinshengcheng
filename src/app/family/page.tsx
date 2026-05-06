'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, GitBranch, BookOpen, Camera, MailPlus, Bell,
  ChevronRight, Home, PenLine, Plus, Settings,
} from 'lucide-react';
import type { FamilySpace, PersonProfile } from '@/types/domain';
import { ensureProfile, getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { listFamilyPersons } from '@/lib/services/person-service';
import { listFamilyStories } from '@/lib/services/story-service';
import { getFamilyActivityLogs, getActivitySummary, getActivityLabel } from '@/lib/services/activity-service';

/* ===== Types ===== */
interface HomeData {
  family: FamilySpace;
  profiles: PersonProfile[];
  storiesCount: number;
  photosCount: number;
  recentNotice: { text: string; time: string } | null;
  recentUpdates: { id: string; text: string; time: string; icon: 'story' | 'photo' | 'member' }[];
}

/* ===== Helpers ===== */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return '刚刚';
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

const FEATURES = [
  { icon: <GitBranch size={22} strokeWidth={1.6} />, label: '家族树', href: '/family/tree/graph' },
  { icon: <BookOpen size={22} strokeWidth={1.6} />, label: '生平传记', href: '/family/members' },
  { icon: <Camera size={22} strokeWidth={1.6} />, label: '祠堂相册', href: '/family/photos' },
  { icon: <ClockIcon />, label: '生平纪念', href: '/family/members' },
  { icon: <Users size={22} strokeWidth={1.6} />, label: '家族成员', href: '/family/members' },
  { icon: <MenuIcon />, label: '全部功能', href: '/family/statistics' },
];

const BOTTOM_TABS = [
  { icon: <Home size={20} />, label: '首页', href: '/family', active: true },
  { icon: <GitBranch size={20} />, label: '家族树', href: '/family/tree' },
  { icon: <Plus size={24} strokeWidth={2.5} />, label: '记录', href: '/family/stories', primary: true },
  { icon: <PenLine size={20} />, label: '传记', href: '/family/members' },
  { icon: <Settings size={20} />, label: '我的', href: '/family/settings' },
];

export default function FamilyPage() {
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) { setError('no-config'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        await ensureProfile(user);
        const family = await getCurrentFamilySpace(undefined, user);
        if (!family) { router.replace('/create'); return; }

        const [profiles, stories, logs] = await Promise.all([
          listFamilyPersons(family.id),
          listFamilyStories(family.id),
          getFamilyActivityLogs({ familyId: family.id, limit: 10 }),
        ]);

        // Recent notice: latest activity log with real summary
        const lastLog = logs[0];
        const recentNotice = lastLog
          ? { text: getActivitySummary(lastLog), time: relativeTime(lastLog.created_at) }
          : null;

        // Recent updates: merge activity logs + stories, sorted by time
        const storyUpdates = stories.filter(s => s.status === 'active').slice(0, 3).map(s => ({
          id: s.id, text: s.title || '记录了故事',
          time: relativeTime(s.created_at), icon: 'story' as const,
        }));
        const logUpdates = logs.slice(0, 5).filter(l => l.action_type !== 'create_family_space' && l.action_type !== 'update_family_space').map(l => ({
          id: l.id, text: getActivitySummary(l),
          time: relativeTime(l.created_at),
          icon: (getActivityLabel(l.action_type).category === 'story' ? 'story' : getActivityLabel(l.action_type).category === 'photo' ? 'photo' : 'member') as 'story' | 'photo' | 'member',
        }));
        const recentUpdates = [...logUpdates, ...storyUpdates].slice(0, 5);

        setData({
          family,
          profiles,
          storiesCount: stories.filter(s => s.status === 'active').length,
          photosCount: 0,
          recentNotice,
          recentUpdates,
        });
      } catch (e) { setError(e instanceof Error ? e.message : '加载失败'); }
      finally { setLoading(false); }
    }
    load();
  }, [router]);

  if (loading) return <div className="min-h-screen bg-[#F8F1E7] flex items-center justify-center"><p className="text-[#8A7465] text-sm">加载中…</p></div>;
  if (error === 'no-config') return <EmptyShell text="尚未配置 Supabase 环境变量" />;
  if (error || !data) return <EmptyShell text={error || '请先创建数字家堂'} />;

  const { family, profiles, storiesCount, recentNotice, recentUpdates } = data;
  const claimedCount = profiles.filter(p => p.claim_status === 'claimed').length;
  const unclaimedCount = profiles.filter(p => p.claim_status === 'unclaimed').length;
  const userName = profiles.find(p => p.claim_status === 'claimed')?.display_name || family.displayName;

  return (
    <div className="min-h-screen bg-[#F8F1E7] pb-24">
      {/* ===== 1. Top Bar ===== */}
      <header className="px-4 pt-12 pb-3">
        <div className="max-w-[430px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E8D9C8] flex items-center justify-center text-[#5A3524] font-bold text-lg">
              {userName?.charAt(0) || family.surname?.charAt(0) || '家'}
            </div>
            <div>
              <p className="text-base font-semibold text-[#3A2418]">{userName || '成员'}</p>
              <p className="text-xs text-[#8A7465]">欢迎回到 {family.surname}氏祠堂</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/family/invite" className="flex flex-col items-center gap-0.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E8D9C8] flex items-center justify-center text-[#5A3524]">
                <MailPlus size={16} />
              </div>
              <span className="text-[10px] text-[#8A7465]">邀请</span>
            </Link>
            <Link href="/family/members" className="flex flex-col items-center gap-0.5 relative">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E8D9C8] flex items-center justify-center text-[#8B5A3C]">
                <Users size={16} />
              </div>
              <span className="text-[10px] text-[#8A7465]">
                待认领{unclaimedCount > 0 && <span className="text-[#8B5A3C] font-bold"> {unclaimedCount}</span>}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[430px] mx-auto px-4 space-y-4">
        {/* ===== 2. Hero Card ===== */}
        <Link href="/family/tree" className="block">
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6B3A29] via-[#5A3524] to-[#4A2A1A] p-6 text-white shadow-xl">
            {/* Decorative image layer — warm, atmospheric */}
            <img
              src="/images/home-page-design.png"
              alt=""
              className="absolute right-0 top-1/2 -translate-y-1/2 h-[140%] w-auto max-w-[60%] object-cover opacity-20 mix-blend-soft-light"
            />
            {/* Gradient overlay — ensures text readability */}
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#5A3524]/40 to-[#5A3524]/80" />
            {/* Warm circle ornament */}
            <div className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full bg-[#C9A35A]/10" />
            <div className="absolute right-8 bottom-4 w-16 h-16 rounded-full bg-amber-400/5" />

            <div className="relative z-10">
              <p className="text-xs text-amber-200/60 tracking-[0.15em]">追本溯源 · 慎终追远 · 敦亲睦族</p>
              <h1 className="mt-2 text-xl font-bold tracking-wide">{family.surname}氏祠堂</h1>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  {profiles.slice(0, 3).map((p, i) => (
                    <div key={p.id} className="w-7 h-7 rounded-full bg-white/20 border-2 border-[#5A3524] flex items-center justify-center text-[10px] font-bold"
                      style={{ zIndex: 3 - i }}>{p.display_name?.charAt(0)}</div>
                  ))}
                  {profiles.length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-white/20 border-2 border-[#5A3524] flex items-center justify-center text-[10px]">+{profiles.length - 3}</div>
                  )}
                </div>
                <span className="text-sm text-white/70">共{profiles.length}位族人</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatBadge label="已认领" value={claimedCount} />
          <StatBadge label="待认领" value={unclaimedCount} tone="amber" />
          <StatBadge label="故事" value={storiesCount} />
        </div>

        {/* ===== 3. Feature Grid ===== */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <Link key={f.label} href={f.href} className="flex flex-col items-center gap-2 py-1">
                <div className="w-12 h-12 rounded-2xl bg-[#F8F1E7] flex items-center justify-center text-[#5A3524]">{f.icon}</div>
                <span className="text-xs font-medium text-[#3A2418]">{f.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ===== 4. Notice Bar ===== */}
        {recentNotice && (
          <Link href="/family/activity" className="block">
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
              <Bell size={16} className="text-[#C9A35A] shrink-0" />
              <p className="flex-1 text-sm text-[#3A2418] truncate">{recentNotice.text}</p>
              <span className="text-xs text-[#8A7465] shrink-0">{recentNotice.time}</span>
              <ChevronRight size={14} className="text-[#C4B5A5] shrink-0" />
            </div>
          </Link>
        )}

        {/* ===== 5. Tree Preview ===== */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#3A2418]">家族树概览</h2>
            <Link href="/family/tree" className="text-xs text-[#8B5A3C] flex items-center gap-1">
              查看完整家族树 <ChevronRight size={14} />
            </Link>
          </div>
          {profiles.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-[#8A7465]">还没有家人档案</p>
              <Link href="/family/relatives/new" className="mt-2 inline-block text-sm font-medium text-[#8B5A3C]">添加第一位家人</Link>
            </div>
          ) : (
            <TreePreview profiles={profiles} />
          )}
        </div>

        {/* ===== 6. Invite Card ===== */}
        <Link href="/family/invite" className="block">
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FFFDF8] via-[#FBF6ED] to-[#F5ECD8] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#E8D9C8]">
            {/* Decorative abstract leaves/circles */}
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#C9A35A]/8" />
            <div className="absolute right-8 bottom-2 w-16 h-16 rounded-full bg-[#8B5A3C]/5" />
            <div className="absolute right-16 top-4 w-8 h-8 rounded-full bg-[#C9A35A]/10" />

            <div className="relative z-10">
              <h2 className="text-base font-semibold text-[#3A2418]">邀请亲人入驻祠堂</h2>
              <p className="mt-1 text-sm text-[#8A7465]">一起完善家族资料，延续家族记忆</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#5A3524] to-[#6B4030] text-white px-5 py-2.5 text-sm font-semibold shadow-md shadow-[#5A3524]/20 hover:shadow-lg hover:shadow-[#5A3524]/30 transition-all">
                立即邀请 <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </Link>

        {/* ===== 7. Recent Updates ===== */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#3A2418]">家族近况</h2>
            <Link href="/family/activity" className="text-xs text-[#8B5A3C] flex items-center gap-1">
              查看全部 <ChevronRight size={14} />
            </Link>
          </div>
          {recentUpdates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#8A7465]">暂无家族近况</p>
              <p className="text-xs text-[#C4B5A5] mt-1">记录一段故事，让家人看到更新</p>
              <Link href="/family/stories" className="mt-3 inline-block text-sm font-medium text-[#8B5A3C]">记录第一段故事</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentUpdates.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F0E6D5] flex items-center justify-center text-[#8B5A3C] font-bold text-sm">
                    {u.icon === 'story' ? <BookOpen size={16} /> : u.icon === 'photo' ? <Camera size={16} /> : <Users size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#3A2418] truncate">{u.text}</p>
                    <p className="text-xs text-[#B8A898] mt-0.5">{u.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>

      {/* ===== 8. Bottom Nav ===== */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8D9C8] z-50">
        <div className="max-w-[430px] mx-auto flex items-center justify-around py-2 px-2">
          {BOTTOM_TABS.map((tab) => (
            <Link key={tab.label} href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-1 ${tab.primary ? '-mt-5' : ''}`}>
              {tab.primary ? (
                <div className="w-12 h-12 rounded-full bg-[#5A3524] text-white flex items-center justify-center shadow-lg shadow-[#5A3524]/30">
                  {tab.icon}
                </div>
              ) : (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tab.active ? 'text-[#5A3524]' : 'text-[#B8A898]'}`}>
                  {tab.icon}
                </div>
              )}
              <span className={`text-[10px] ${tab.active ? 'text-[#5A3524] font-semibold' : 'text-[#B8A898]'}`}>
                {tab.label}
              </span>
            </Link>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </nav>
    </div>
  );
}

/* ===== Sub-components ===== */

function StatBadge({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'amber' }) {
  return (
    <div className={`rounded-2xl px-4 py-3 text-center ${tone === 'amber' ? 'bg-[#FFF8E7] border border-[#E8D9C8]' : 'bg-white border border-[#E8D9C8]'}`}>
      <p className="text-xl font-bold text-[#3A2418]">{value}</p>
      <p className="text-xs text-[#8A7465] mt-0.5">{label}</p>
    </div>
  );
}

function TreePreview({ profiles }: { profiles: PersonProfile[] }) {
  const top = profiles.slice(0, 7);
  if (top.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-2">
      {top.map((p, i) => (
        <div key={p.id} className="flex flex-col items-center gap-1.5">
          <Link href={`/family/members/${p.id}`}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
              i === 0 ? 'bg-[#5A3524] text-white ring-2 ring-[#C9A35A] ring-offset-2 ring-offset-white' :
              p.claim_status === 'claimed' ? 'bg-[#8B5A3C] text-white' : 'bg-[#E8D9C8] text-[#8A7465]'
            }`}>
            {p.display_name?.charAt(0)}
          </Link>
          <span className="text-[10px] text-[#3A2418] max-w-[48px] truncate text-center">{p.display_name}</span>
        </div>
      ))}
      <Link href="/family/relatives/new"
        className="flex flex-col items-center gap-1.5">
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#C4B5A5] flex items-center justify-center text-[#B8A898] hover:border-[#8B5A3C] hover:text-[#8B5A3C] transition-colors">
          <Plus size={16} />
        </div>
        <span className="text-[10px] text-[#8A7465]">添加</span>
      </Link>
    </div>
  );
}

function EmptyShell({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-[#F8F1E7] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-sm text-[#8A7465] mb-3">{text}</p>
      <Link href="/create" className="rounded-2xl bg-[#5A3524] text-white px-5 py-2.5 text-sm font-semibold shadow-sm">
        创建我的姓氏祠堂
      </Link>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}
