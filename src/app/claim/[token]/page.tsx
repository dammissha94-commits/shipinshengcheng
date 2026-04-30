'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
      if (!hasSupabaseConfig()) {
        setMessage('尚未配置 Supabase 环境变量，请先配置 .env.local');
        setLoading(false);
        return;
      }

      try {
        const [currentUser, inviteContext] = await Promise.all([
          getCurrentUser(),
          getInviteByToken(token),
        ]);
        setIsLoggedIn(Boolean(currentUser));
        setInvite(inviteContext);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '邀请链接暂时不可用，请返回后重试');
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [token]);

  async function handleClaim() {
    try {
      setClaiming(true);
      setMessage('');
      await claimInviteToken(token);
      setMessage('认领成功，正在进入数字家堂');
      setTimeout(() => router.push('/family'), 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '认领失败，请稍后重试');
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-4">
        <p className="text-sm text-muted">加载中...</p>
      </main>
    );
  }

  const loginHref = loginRedirectPath(`/claim/${token}`);

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-sand/60 shadow-sm p-5">
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-pine mb-2">邀请认领</h1>
          <p className="text-sm text-muted">确认你的家人档案</p>
        </div>

        {invite ? (
          <div className="space-y-3 mb-5">
            <div className="bg-cream rounded-xl border border-sand/60 p-3">
              <p className="text-xs text-muted mb-1">数字家堂</p>
              <p className="text-base font-semibold text-charcoal">{invite.family.displayName}</p>
            </div>
            <div className="bg-cream rounded-xl border border-sand/60 p-3">
              <p className="text-xs text-muted mb-1">待认领档案</p>
              <p className="text-base font-semibold text-charcoal">{invite.person.display_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cream rounded-xl border border-sand/60 p-3">
                <p className="text-xs text-muted mb-1">认领状态</p>
                <p className="text-sm font-medium text-gold">
                  {invite.person.claim_status === 'unclaimed' ? '待认领' : '已认领'}
                </p>
              </div>
              <div className="bg-cream rounded-xl border border-sand/60 p-3">
                <p className="text-xs text-muted mb-1">链接状态</p>
                <p className="text-sm font-medium text-pine">
                  {invite.invite.status === 'pending' ? '有效' : invite.invite.status}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted text-center mb-5">{message || '邀请链接暂时不可用'}</p>
        )}

        {message && invite && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-4">{message}</p>
        )}

        {!invite ? (
          <Link href="/" className="block w-full text-center py-3 rounded-xl bg-pine text-cream font-semibold">
            返回首页
          </Link>
        ) : !isLoggedIn ? (
          <div className="space-y-3">
            <p className="text-sm text-muted text-center">请先登录后认领</p>
            <Link
              href={loginHref}
              className="block w-full text-center py-3 rounded-xl bg-pine text-cream font-semibold"
            >
              登录或注册
            </Link>
          </div>
        ) : (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-3 rounded-xl bg-pine text-cream font-semibold disabled:opacity-60"
          >
            {claiming ? '认领中...' : '确认认领'}
          </button>
        )}
      </div>
    </main>
  );
}
