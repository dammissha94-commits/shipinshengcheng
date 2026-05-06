'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FamilySpace, Visibility } from '@/types/domain';
import type { FamilyMemberStats, UserFamilyRole } from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { canManageFamily, getUserFamilyRole } from '@/lib/auth/permission-service';
import { hasSupabaseConfig, createSupabaseServiceClient } from '@/lib/supabase/client';
import { getCurrentFamilySpace, getFamilyDashboardStats, updateFamilySettings } from '@/lib/services/family-service';
import AppHeader from '@/components/AppHeader';

const ROLE_LABELS: Record<string, string> = { owner: '创建者', family_admin: '家堂管理员', memory_admin: '记忆管理员', member: '成员', viewer: '访客' };

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
  const [elderMode, setElderMode] = useState(false);
  const [togglingElder, setTogglingElder] = useState(false);

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        const [familyStats, userRole, allowed] = await Promise.all([getFamilyDashboardStats(currentFamily.id), getUserFamilyRole(currentFamily.id), canManageFamily(currentFamily.id)]);
        setFamily(currentFamily); setStats(familyStats); setRole(userRole); setCanManage(allowed);
        setDisplayName(currentFamily.displayName); setVisibility(currentFamily.visibility);
        // Read elder_mode from current user profile
        try {
          const supabase = createSupabaseServiceClient();
          const profileResult = await supabase.from<{ elder_mode: boolean }>('profiles').select('elder_mode').eq('id', user.id);
          if (profileResult.data?.[0]) setElderMode(profileResult.data[0].elder_mode ?? false);
        } catch { /* ignore — elder mode is a convenience feature */ }
      } catch (e) { setError(e instanceof Error ? e.message : '加载设置失败'); }
      finally { setLoading(false); }
    }
    load();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!family) return;
    try { setSaving(true); setError(''); const updated = await updateFamilySettings(family.id, { displayName, visibility }); setFamily(updated); }
    catch (e) { setError(e instanceof Error ? e.message : '保存失败'); }
    finally { setSaving(false); }
  }

  if (loading) return <C text="加载中..." />;
  if (error && !family) return <C text={error} />;
  if (!family) return <C text="请先创建数字家堂" />;

  return (
    <div className="min-h-screen bg-[#F8F1E7]">
      <AppHeader title="家堂设置" backHref="/family" />
      <main className="px-4 py-5 max-w-lg mx-auto space-y-4">
        {/* Info card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h1 className="text-lg font-bold text-stone-900">{family.displayName}</h1>
          <p className="mt-1 text-sm text-stone-500">当前角色：{role ? ROLE_LABELS[role] : '未知'}</p>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

        {/* Form */}
        <form onSubmit={handleSave}>
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-5 py-4"><h2 className="text-base font-semibold text-stone-800">家堂信息</h2></div>
            <div className="space-y-4 px-5 py-5">
              <RF label="姓氏" value={family.surname} />
              <RF label="名称" value={family.name} />
              <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">显示名称</span>
                <input disabled={!canManage} value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all disabled:opacity-60" /></label>
              <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">可见范围</span>
                <select disabled={!canManage} value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all disabled:opacity-60">
                  <option value="private">仅自己</option><option value="family">家族可见</option><option value="public">公开</option></select></label>
              <RF label="家堂类型" value={family.family_type} />
              <RF label="状态" value={family.status} />
            </div>
            <div className="border-t border-stone-100 px-5 py-4">
              {canManage ? (
                <button disabled={saving} className="w-full rounded-xl bg-#5A3524 py-3 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E disabled:opacity-60 transition-all active:scale-[0.98]">{saving ? '保存中...' : '保存设置'}</button>
              ) : (
                <p className="text-xs text-stone-400 text-center">普通成员只能查看家堂基础信息。</p>
              )}
            </div>
          </div>
        </form>

        {/* Stats */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-4"><h2 className="text-base font-semibold text-stone-800">成员统计</h2></div>
          <div className="grid grid-cols-2 gap-3 p-5">
            {[['成员总数',stats?.totalPersons ?? 0],['已认领',stats?.claimedPersons ?? 0],['待认领',stats?.unclaimedPersons ?? 0],['在世',stats?.alivePersons ?? 0],['已故',stats?.deceasedPersons ?? 0]].map(([l,v]) => (
              <div key={l} className="rounded-xl border border-stone-100 bg-[#F8F1E7] px-4 py-3"><p className="text-xs text-stone-400">{l}</p><p className="mt-0.5 text-xl font-bold text-#8D6E63">{v as number}</p></div>
            ))}
          </div>
        </div>

        {/* Elder mode */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="text-base font-semibold text-stone-800">长辈模式</h2>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-700">大字版</p>
                <p className="text-xs text-stone-400 mt-0.5">启用后按钮和文字会变大，更适合长辈使用</p>
              </div>
              <button
                type="button"
                disabled={togglingElder}
                onClick={async () => {
                  setTogglingElder(true);
                  try {
                    const supabase = createSupabaseServiceClient();
                    const user = await getCurrentUser();
                    if (!user) return;
                    const next = !elderMode;
                    await supabase.from('profiles').update({ elder_mode: next }).eq('id', user.id);
                    setElderMode(next);
                  } catch { /* ignore */ }
                  finally { setTogglingElder(false); }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${elderMode ? 'bg-#8B5A3C' : 'bg-stone-300'}`}
                role="switch"
                aria-checked={elderMode}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${elderMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="text-base font-semibold text-stone-800">账号</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs text-stone-400">账号注销功能将在下一版本开放。如需删除数据，请联系家堂管理员。</p>
            <button disabled className="w-full rounded-xl bg-stone-100 py-2.5 text-sm font-medium text-stone-400 cursor-not-allowed">
              注销账号（开发中）
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-4"><h2 className="text-base font-semibold text-stone-800">危险操作</h2></div>
          <div className="px-5 py-4">
            <button disabled className="w-full rounded-xl bg-stone-100 py-3 text-sm font-medium text-stone-400 cursor-not-allowed">归档家堂</button>
            <p className="mt-2 text-xs text-stone-400 text-center">后续版本开放</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function RF({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-stone-100 bg-[#F8F1E7] px-4 py-3"><p className="text-xs text-stone-400">{label}</p><p className="mt-0.5 text-sm font-medium text-stone-800">{value}</p></div>;
}
function C({ text }: { text: string }) {
  return <div className="min-h-screen bg-[#F8F1E7] flex items-center justify-center px-4 text-center"><p className="text-sm text-stone-500">{text}</p></div>;
}
