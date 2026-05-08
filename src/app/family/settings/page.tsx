'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Globe, LogOut, Shield, ShieldCheck, Sparkles, Trash2, UserRound, Users } from 'lucide-react';
import type { FamilySpace, Visibility } from '@/types/domain';
import type { FamilyMemberStats, UserFamilyRole } from '@/types/service';
import { getCurrentUser, signOut } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { canManageFamily, getUserFamilyRole } from '@/lib/auth/permission-service';
import { hasSupabaseConfig, createSupabaseServiceClient } from '@/lib/supabase/client';
import {
  getCurrentFamilySpace,
  getFamilyDashboardStats,
  updateFamilySettings,
} from '@/lib/services/family-service';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import { WjButton, WjFormRow, WjInput, WjSelect, WjToggle } from '@/components/wujia/WjForm';
import ThemeSwitcher from '@/components/settings/ThemeSwitcher';
import ContrastSwitcher from '@/components/settings/ContrastSwitcher';
import { Palette } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  owner: '创建者',
  family_admin: '家堂管理员',
  memory_admin: '记忆管理员',
  member: '成员',
  viewer: '访客',
};

export default function FamilySettingsPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [stats, setStats] = useState<FamilyMemberStats | null>(null);
  const [role, setRole] = useState<UserFamilyRole>(null);
  const [canManage, setCanManage] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [elderMode, setElderMode] = useState(false);
  const [togglingElder, setTogglingElder] = useState(false);
  const [userEmail, setUserEmail] = useState('');

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
        setUserEmail(user.email ?? '');
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) {
          router.replace('/create');
          return;
        }
        const [familyStats, userRole, allowed] = await Promise.all([
          getFamilyDashboardStats(currentFamily.id),
          getUserFamilyRole(currentFamily.id),
          canManageFamily(currentFamily.id),
        ]);
        setFamily(currentFamily);
        setStats(familyStats);
        setRole(userRole);
        setCanManage(allowed);
        setDisplayName(currentFamily.displayName);
        setVisibility(currentFamily.visibility);
        try {
          const supabase = createSupabaseServiceClient();
          const profileResult = await supabase
            .from<{ elder_mode: boolean }>('profiles')
            .select('elder_mode')
            .eq('id', user.id);
          if (profileResult.data?.[0]) setElderMode(profileResult.data[0].elder_mode ?? false);
        } catch {
          /* ignore */
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载设置失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!family) return;
    try {
      setSaving(true);
      setError('');
      setNotice('');
      const updated = await updateFamilySettings(family.id, { displayName, visibility });
      setFamily(updated);
      setNotice('家堂信息已保存');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleElder(next: boolean) {
    setTogglingElder(true);
    try {
      const supabase = createSupabaseServiceClient();
      const user = await getCurrentUser();
      if (!user) return;
      await supabase.from('profiles').update({ elder_mode: next }).eq('id', user.id);
      setElderMode(next);
      setNotice(next ? '已开启长辈模式' : '已关闭长辈模式');
    } catch {
      /* ignore */
    } finally {
      setTogglingElder(false);
    }
  }

  async function handleSignOut() {
    if (!window.confirm('确定要退出登录？')) return;
    try {
      setSigningOut(true);
      await signOut();
      router.replace('/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : '退出登录失败');
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) return <PageSkeleton title="家堂设置" backHref="/family" cards={4} withStats={true} withSearch={false} />;
  if (error && !family) return <CenterText text={error} />;
  if (!family) return <CenterText text="请先创建数字家堂" />;

  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar title="我的" />
      <main className="relative z-10 space-y-4 px-5 pb-6">
        {/* Identity hero */}
        <section className="relative overflow-hidden rounded-[15px] border border-[#E7D9C9] bg-white/76 p-5 shadow-[0_10px_28px_rgba(90,53,36,0.07)]">
          <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full bg-[#F3D6AA]/30" />
          <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-[#DCE6D4]/40" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1E5D6] text-[#9B6A37]">
              <Users size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] tracking-widest text-[#9B6A37]">{family.surname}氏家堂</p>
              <h1 className="truncate text-[22px] font-bold text-[#2A1D16]">{family.displayName}</h1>
              <p className="mt-0.5 text-[12px] text-[#78675B]">
                当前角色：{role ? ROLE_LABELS[role] : '未知'}
              </p>
            </div>
          </div>
        </section>

        {error && <p className="rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}
        {notice && (
          <p className="rounded-xl border border-[var(--surface-3)] bg-[var(--surface-3)] px-4 py-2.5 text-sm text-[var(--jade)]">
            {notice}
          </p>
        )}

        {/* Stats — 真实数据，不再 hardcode */}
        <SectionCard title="成员统计" icon={<Users size={16} />}>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="成员" value={stats?.totalPersons ?? 0} />
            <Stat label="已认领" value={stats?.claimedPersons ?? 0} tone="jade" />
            <Stat label="待认领" value={stats?.unclaimedPersons ?? 0} tone="terracotta" />
          <Stat label="健在" value={stats?.alivePersons ?? 0} />
          <Stat label="离世" value={stats?.deceasedPersons ?? 0} tone="muted" />
          </div>
        </SectionCard>

        {/* Family info form */}
        <form onSubmit={handleSave}>
          <SectionCard title="家堂信息" icon={<ShieldCheck size={16} />}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <ReadOnly label="姓氏" value={family.surname} />
                <ReadOnly label="名称" value={family.name} />
              </div>
              <WjFormRow label="显示名称" hint={canManage ? '将显示在首页与家族树顶部' : undefined}>
                <WjInput
                  disabled={!canManage}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </WjFormRow>
              <WjFormRow label="可见范围">
                <WjSelect
                  disabled={!canManage}
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as Visibility)}
                >
                  <option value="private">仅自己</option>
                  <option value="family">家族可见</option>
                  <option value="public">公开</option>
                </WjSelect>
              </WjFormRow>
              <div className="grid grid-cols-2 gap-3">
                <ReadOnly label="家堂类型" value={family.family_type} />
                <ReadOnly label="状态" value={family.status} />
              </div>
            </div>
            <div className="mt-5">
              {canManage ? (
                <WjButton type="submit" variant="primary" size="lg" loading={saving} className="w-full">
                  保存家堂信息
                </WjButton>
              ) : (
                <p className="text-center text-[12px] text-[var(--ink-3)]">
                  普通成员只能查看家堂基础信息。
                </p>
              )}
            </div>
          </SectionCard>
        </form>

        {/* Theme */}
        <SectionCard title="界面主题" icon={<Palette size={16} />}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-[var(--ink-3)]">
                切换浅色 / 深色，或跟随系统设置自动切换
              </p>
              <ThemeSwitcher />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-[var(--ink-3)]">
                高对比度模式：文字更深、边线更明显，适合阅读吃力的家人
              </p>
              <ContrastSwitcher />
            </div>
          </div>
        </SectionCard>

        {/* Elder mode */}
        <SectionCard title="长辈模式" icon={<Sparkles size={16} />}>
          <RowToggle
            title="大字版"
            desc="启用后按钮和文字会变大，更适合长辈使用"
            checked={elderMode}
            onChange={handleToggleElder}
            disabled={togglingElder}
          />
        </SectionCard>

        {/* Account */}
        <SectionCard title="账号" icon={<UserRound size={16} />}>
          <div className="space-y-3">
            <Row label="登录邮箱" value={userEmail || '—'} icon={<Globe size={14} />} />
            <WjButton
              type="button"
              variant="danger"
              className="w-full"
              onClick={handleSignOut}
              loading={signingOut}
            >
              <LogOut size={16} />
              退出登录
            </WjButton>
            <p className="text-center text-[12px] text-[var(--ink-3)]">
              账号注销与数据导出将在下一版本开放
            </p>
          </div>
        </SectionCard>

        {/* Danger zone */}
        <SectionCard title="危险操作" icon={<Shield size={16} />} tone="danger">
          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-[var(--line-1)] bg-[var(--surface-2)] min-h-[44px] text-[14px] font-medium text-[var(--ink-3)]"
          >
            <Archive size={16} /> 归档家堂
          </button>
          <button
            type="button"
            disabled
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-[var(--line-1)] bg-[var(--surface-2)] py-3 text-[14px] font-medium text-[var(--ink-3)]"
          >
            <Trash2 size={16} /> 解散家堂
          </button>
          <p className="mt-2 text-center text-[12px] text-[var(--ink-3)]">后续版本开放</p>
        </SectionCard>

        <div className="h-2" />
      </main>
    </MobilePage>
  );
}

function SectionCard({
  title,
  icon,
  tone = 'default',
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[15px] border border-[#E7D9C9] bg-white/82 p-5 shadow-[0_10px_28px_rgba(90,53,36,0.06)]">
      <header className="mb-3 flex items-center gap-2.5">
        <span className="h-4 w-[3px] rounded-full bg-[var(--gold)]" />
        <h2
          className={`flex items-center gap-1.5 text-[16px] font-semibold ${
            tone === 'danger' ? 'text-[var(--terracotta)]' : 'text-[var(--ink-1)]'
          }`}
        >
          {icon}
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line-1)] bg-[var(--surface-2)] px-3 py-2.5">
      <p className="text-[11px] text-[var(--ink-3)]">{label}</p>
      <p className="mt-0.5 truncate text-[14px] font-medium text-[var(--ink-1)]">{value}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'walnut',
}: {
  label: string;
  value: number;
  tone?: 'walnut' | 'jade' | 'terracotta' | 'muted';
}) {
  const cls =
    tone === 'jade'
      ? 'text-[var(--jade)]'
      : tone === 'terracotta'
      ? 'text-[var(--terracotta)]'
      : tone === 'muted'
      ? 'text-[var(--ink-3)]'
      : 'text-[var(--walnut)]';
  return (
    <div className="rounded-xl border border-[var(--line-1)] bg-[var(--surface-2)] px-3 py-2.5">
      <p className="text-[11px] text-[var(--ink-3)]">{label}</p>
      <p className={`mt-0.5 font-serif text-[22px] font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[var(--line-1)] bg-[var(--surface-2)] px-4 py-3">
      <span className="flex items-center gap-2 text-[13px] text-[var(--ink-3)]">
        {icon}
        {label}
      </span>
      <span className="max-w-[60%] truncate text-[14px] font-medium text-[var(--ink-1)]">
        {value}
      </span>
    </div>
  );
}

function RowToggle({
  title,
  desc,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line-1)] bg-[var(--surface-2)] px-4 py-3">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-[var(--ink-1)]">{title}</p>
        <p className="mt-0.5 text-[12px] leading-5 text-[var(--ink-3)]">{desc}</p>
      </div>
      <WjToggle checked={checked} onChange={onChange} disabled={disabled} ariaLabel={title} />
    </div>
  );
}

function CenterText({ text }: { text: string }) {
  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar title="我的" />
      <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-5 text-center">
        <p className="rounded-[15px] border border-[#E7D9C9] bg-white/82 px-4 py-5 text-sm text-[#78675B] shadow-[0_10px_28px_rgba(90,53,36,0.06)]">{text}</p>
      </main>
    </MobilePage>
  );
}
