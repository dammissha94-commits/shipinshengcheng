'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Home } from 'lucide-react';
import type { InviteWithPerson } from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { loginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { claimInviteToken, getInviteByToken } from '@/lib/services/invite-service';

export default function ClaimPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [invite, setInvite] = useState<InviteWithPerson | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadInvite() {
      if (!hasSupabaseConfig()) { setMessage('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const [currentUser, inviteContext] = await Promise.all([getCurrentUser(), getInviteByToken(token)]);
        setIsLoggedIn(Boolean(currentUser));
        setInvite(inviteContext);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '邀请链接暂时不可用，请返回后重试');
      } finally { setLoading(false); }
    }
    loadInvite();
  }, [token]);

  async function handleClaim() {
    try {
      setClaiming(true); setMessage('');
      await claimInviteToken(token);
      setMessage('认领成功，正在进入数字家堂');
      setTimeout(() => router.push('/family'), 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '认领失败，请稍后重试');
    } finally { setClaiming(false); }
  }

  if (loading) {
    return <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4"><p className="text-sm text-stone-500">加载中...</p></main>;
  }

  const loginHref = loginRedirectPath(`/claim/${token}`);

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-950 shadow-lg mb-4">
            <Home size={26} strokeWidth={1.6} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">家人邀请</h1>
          <p className="mt-1 text-sm text-stone-500">确认你的家人档案</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          {invite ? (
            <div className="space-y-3 mb-5">
              <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                <p className="text-xs text-stone-400">数字家堂</p>
                <p className="mt-0.5 text-base font-semibold text-stone-800">{invite.family.displayName}</p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                <p className="text-xs text-stone-400">待认领档案</p>
                <p className="mt-0.5 text-base font-semibold text-stone-800">{invite.person.display_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                  <p className="text-xs text-stone-400">认领状态</p>
                  <p className="mt-0.5 text-sm font-medium text-amber-700">
                    {invite.person.claim_status === 'unclaimed' ? '待认领' : '已认领'}
                  </p>
                </div>
                <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                  <p className="text-xs text-stone-400">链接状态</p>
                  <p className="mt-0.5 text-sm font-medium text-emerald-700">
                    {invite.invite.status === 'pending' ? '有效' : invite.invite.status}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-500 text-center mb-5 py-8">{message || '邀请链接暂时不可用'}</p>
          )}

          {message && invite && (
            <p className={`rounded-xl px-4 py-2.5 text-sm mb-4 ${
              message.includes('成功') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>{message}</p>
          )}

          {!invite ? (
            <Link href="/" className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-950 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors">
              <Home size={16} />返回首页
            </Link>
          ) : !isLoggedIn ? (
            <div className="space-y-3">
              <p className="text-sm text-stone-500 text-center">请先登录后认领你的家人档案</p>
              <Link href={loginHref} className="flex items-center justify-center w-full rounded-xl bg-emerald-950 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors">
                登录或注册
              </Link>
            </div>
          ) : (
            <button onClick={handleClaim} disabled={claiming}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-950 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-50 transition-all active:scale-[0.98]">
              <CheckCircle size={16} />
              {claiming ? '认领中...' : '确认认领'}
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-stone-400 leading-relaxed">
          认领后，你将成为该档案的关联用户，可在数字家堂中查看和编辑。
        </p>
      </div>
    </main>
  );
}
