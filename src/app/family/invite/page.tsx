'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, Share2, UserPlus } from 'lucide-react';
import type { FamilySpace, PersonProfile } from '@/types/domain';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { canManageFamily } from '@/lib/auth/permission-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createInviteToken, listPendingInvites } from '@/lib/services/invite-service';
import type { PendingInviteTarget } from '@/lib/services/invite-service';
import AppHeader from '@/components/AppHeader';
import StatusBadge from '@/components/wujia/StatusBadge';
import EmptyState from '@/components/wujia/EmptyState';

function buildInviteText(person: PersonProfile, familyDisplayName: string, token: string): string {
  const inviteUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/claim/${encodeURIComponent(token)}`;
  return `你已被加入「${familyDisplayName}」。这里记录了我们家的亲属关系、老照片和家族故事。点击链接后，你可以认领自己的资料，并补充家人的记忆：${inviteUrl}\n\n待认领档案：${person.display_name}`;
}

export default function InvitePage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [targets, setTargets] = useState<PendingInviteTarget[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    async function loadInvites() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        setFamily(currentFamily);
        setCanManage(await canManageFamily(currentFamily.id));
        setTargets(await listPendingInvites(currentFamily.id));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载邀请列表失败');
      } finally { setLoading(false); }
    }
    loadInvites();
  }, [router]);

  async function handleCopy(target: PendingInviteTarget) {
    if (!family) return;
    if (!canManage) { setError('当前账号无权限创建邀请。'); return; }
    try {
      setError('');
      const invite = target.invite ?? (await createInviteToken({ familyId: family.id, inviteePersonId: target.person.id }));
      const text = buildInviteText(target.person, family.displayName, invite.token);
      await navigator.clipboard.writeText(text);
      setCopied(target.person.id);
      setTargets((cur) => cur.map((item) => item.person.id === target.person.id ? { ...item, invite } : item));
      setTimeout(() => setCopied(null), 2000);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : '复制邀请文案失败');
    }
  }

  if (loading) return <div className="min-h-screen bg-[#F8F1E7] flex items-center justify-center"><p className="text-sm text-stone-500">加载中…</p></div>;
  if (error && !family) return <div className="min-h-screen bg-[#F8F1E7] flex items-center justify-center px-4 text-center"><p className="text-sm text-stone-500">{error}</p></div>;

  return (
    <div className="min-h-screen bg-[#F8F1E7]">
      <AppHeader title="邀请认领" backHref="/family" />

      <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
        {/* Instructions */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-#F0E6D5 text-#8D6E63">
              <Share2 size={18} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-800">如何邀请？</h2>
              <p className="mt-1 text-sm text-stone-500 leading-relaxed">
                复制邀请文案后，通过微信等常用工具发送给家人。家人打开链接即可认领自己的档案。
              </p>
            </div>
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

        {/* Targets */}
        {targets.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={24} strokeWidth={1.8} />}
            title="暂无待认领成员"
            description="先在家谱中添加亲属，再邀请他们认领"
            action={<button onClick={() => router.push('/family/relatives/new')} className="inline-flex items-center gap-2 rounded-xl bg-#5A3524 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E transition-colors">添加家人</button>}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-stone-500">共 <span className="text-#8D6E63 font-semibold">{targets.length}</span> 位家人待认领</p>
            {targets.map((target) => {
              const isCopied = copied === target.person.id;
              const previewToken = target.invite?.token ?? '';
              const inviteText = family ? buildInviteText(target.person, family.displayName, previewToken || '...') : '';

              return (
                <div key={target.person.id} className="rounded-2xl border border-stone-200 bg-white shadow-sm">
                  {/* Person header */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600 font-semibold text-sm">
                      {target.person.display_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-800">{target.person.display_name}</p>
                      <p className="text-xs text-stone-500">家人档案 · 待认领</p>
                    </div>
                    <StatusBadge variant="warning">待认领</StatusBadge>
                  </div>

                  {/* Preview */}
                  <div className="px-5 py-4">
                    <div className="rounded-xl border border-stone-200 bg-[#F8F1E7] p-3 text-xs text-stone-500 leading-relaxed whitespace-pre-line max-h-24 overflow-y-auto">
                      {inviteText || '加载中...'}
                    </div>
                  </div>

                  {/* Copy button */}
                  <div className="border-t border-stone-100 px-5 py-4">
                    <button onClick={() => handleCopy(target)} disabled={!canManage}
                      className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
                        isCopied
                          ? 'bg-#8B5A3C text-white'
                          : 'bg-#5A3524 text-white hover:bg-#4E342E shadow-sm'
                      } disabled:opacity-50 disabled:pointer-events-none`}>
                      {isCopied ? <><Check size={16} />已复制</> : target.invite ? <><Copy size={15} />复制邀请文案</> : <><Copy size={15} />生成并复制邀请</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
