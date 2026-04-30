'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FamilySpace, Visibility } from '@/types/domain';
import type { FamilyMemberStats, UserFamilyRole } from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { canManageFamily, getUserFamilyRole } from '@/lib/auth/permission-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import {
  getCurrentFamilySpace,
  getFamilyDashboardStats,
  updateFamilySettings,
} from '@/lib/services/family-service';
import AppHeader from '@/components/AppHeader';

const ROLE_LABELS = {
  owner: '创建者',
  family_admin: '家堂管理员',
  memory_admin: '记忆管理员',
  member: '成员',
  viewer: '访客',
} as const;

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
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载家堂设置失败');
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
      const updated = await updateFamilySettings(family.id, { displayName, visibility });
      setFamily(updated);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <CenteredText text="加载中..." />;
  if (error && !family) return <CenteredText text={error} />;
  if (!family) return <CenteredText text="请先创建数字家堂" />;

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="家堂设置" backHref="/family" />

      <main className="px-4 py-5 max-w-md mx-auto space-y-4">
        <section className="bg-card rounded-2xl border border-sand/60 shadow-sm p-4">
          <h1 className="text-lg font-bold text-charcoal mb-1">{family.displayName}</h1>
          <p className="text-sm text-muted">当前角色：{role ? ROLE_LABELS[role] : '未知'}</p>
        </section>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        <form onSubmit={handleSave} className="bg-card rounded-2xl border border-sand/60 shadow-sm p-4 space-y-3">
          <ReadonlyField label="姓氏" value={family.surname} />
          <ReadonlyField label="名称" value={family.name} />

          <label className="block">
            <span className="block text-sm font-medium text-charcoal mb-1.5">显示名称</span>
            <input
              disabled={!canManage}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border-2 border-sand bg-cream px-3 py-2 text-sm disabled:text-muted focus:outline-none focus:border-pine"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-charcoal mb-1.5">可见范围</span>
            <select
              disabled={!canManage}
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="w-full rounded-xl border-2 border-sand bg-cream px-3 py-2 text-sm disabled:text-muted focus:outline-none focus:border-pine"
            >
              <option value="private">仅自己</option>
              <option value="family">家族可见</option>
              <option value="public">公开</option>
            </select>
          </label>

          <ReadonlyField label="家堂类型" value={family.family_type} />
          <ReadonlyField label="状态" value={family.status} />

          {canManage ? (
            <button
              disabled={saving}
              className="w-full rounded-xl bg-pine text-cream py-3 font-semibold disabled:opacity-60"
            >
              {saving ? '保存中...' : '保存设置'}
            </button>
          ) : (
            <p className="text-xs text-muted bg-sand/50 rounded-xl p-3">普通成员只能查看家堂基础信息。</p>
          )}
        </form>

        <section className="bg-card rounded-2xl border border-sand/60 shadow-sm p-4">
          <h2 className="text-base font-semibold text-charcoal mb-3">成员统计</h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="成员总数" value={stats?.totalPersons ?? 0} />
            <Stat label="已认领" value={stats?.claimedPersons ?? 0} />
            <Stat label="待认领" value={stats?.unclaimedPersons ?? 0} />
            <Stat label="在世" value={stats?.alivePersons ?? 0} />
            <Stat label="已故" value={stats?.deceasedPersons ?? 0} />
          </div>
        </section>

        <section className="bg-card rounded-2xl border border-sand/60 shadow-sm p-4">
          <h2 className="text-base font-semibold text-charcoal mb-2">危险操作</h2>
          <button disabled className="w-full rounded-xl bg-sand text-muted py-3 font-semibold cursor-not-allowed">
            归档家堂
          </button>
          <p className="text-xs text-muted mt-2">后续版本开放</p>
        </section>
      </main>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-cream border border-sand/60 p-3">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-sm font-medium text-charcoal">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-cream border border-sand/60 p-3">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-pine">{value}</p>
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
