'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Home, UserPlus, XCircle } from 'lucide-react';
import type { InviteWithPerson } from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { loginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { claimInviteToken, rejectInviteToken, getInviteByToken } from '@/lib/services/invite-service';

export default function ClaimPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [invite, setInvite] = useState<InviteWithPerson | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [message, setMessage] = useState('');
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      if (!hasSupabaseConfig()) { setMessage('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const [currentUser, inviteContext] = await Promise.all([getCurrentUser(), getInviteByToken(token)]);
        setIsLoggedIn(Boolean(currentUser));
        setInvite(inviteContext);
        if (inviteContext?.person.claim_status === 'claimed') {
          setMessage('该档案已被认领');
        }
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
      setClaimed(true);
      setMessage('认领成功！');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '认领失败，请稍后重试');
    } finally { setClaiming(false); }
  }

  async function handleReject() {
    try {
      setRejecting(true); setMessage('');
      await rejectInviteToken(token);
      setMessage('已拒绝该邀请。如需重新认领，请联系家堂管理员。');
      setInvite(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    } finally { setRejecting(false); }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#F8F1E7] flex items-center justify-center px-4"><p className="text-sm text-stone-500">加载中...</p></main>;
  }

  const loginHref = loginRedirectPath(`/claim/${token}`);
  const isAlreadyClaimed = invite?.person.claim_status === 'claimed';
  const canClaim = isLoggedIn && !isAlreadyClaimed && !claimed;

  // === CLAIMED SUCCESS STATE ===
  if (claimed) {
    return (
      <main className="min-h-screen bg-[#F8F1E7] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-#8B5A3C shadow-lg mb-4">
              <CheckCircle size={28} strokeWidth={2} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900">认领成功</h1>
            <p className="mt-1 text-sm text-stone-500">
              你已成为&ldquo;{invite?.person.display_name}&rdquo;的档案关联用户
            </p>
          </div>

          <div className="space-y-3">
            {/* Profile CTA */}
            <Link href={`/family/members/${invite?.person.id}`}
              className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-#F0E6D5 text-#8D6E63">
                <CheckCircle size={18} strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800">完善我的资料</p>
                <p className="text-xs text-stone-500">补充生平和基本信息</p>
              </div>
            </Link>

            {/* Fission CTA */}
            <Link href="/family/relatives/new"
              className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <UserPlus size={18} strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800">补充我这一支亲属</p>
                <p className="text-xs text-stone-500">添加父母、配偶、子女或兄弟姐妹</p>
              </div>
            </Link>

            {/* Enter family */}
            <Link href="/family"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-#5A3524 py-3 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E transition-colors">
              <Home size={16} />进入数字家堂
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // === NORMAL CLAIM FLOW ===
  return (
    <main className="min-h-screen bg-[#F8F1E7] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-#5A3524 shadow-lg mb-4">
            <Home size={26} strokeWidth={1.6} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">家人邀请</h1>
          <p className="mt-1 text-sm text-stone-500">确认你的家人档案</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          {invite ? (
            <div className="space-y-3 mb-5">
              <div className="rounded-xl border border-stone-100 bg-[#F8F1E7] px-4 py-3">
                <p className="text-xs text-stone-400">数字家堂</p>
                <p className="mt-0.5 text-base font-semibold text-stone-800">{invite.family.displayName}</p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-[#F8F1E7] px-4 py-3">
                <p className="text-xs text-stone-400">待认领档案</p>
                <p className="mt-0.5 text-base font-semibold text-stone-800">{invite.person.display_name}</p>
              </div>

              {/* Context cards */}
              <div className="grid grid-cols-1 gap-2">
                <div className="rounded-xl border border-stone-100 bg-[#F8F1E7] px-4 py-3">
                  <p className="text-xs text-stone-400">认领后你能做什么</p>
                  <p className="mt-1 text-sm text-stone-700 leading-relaxed">
                    完善个人资料、补充亲属信息、查看家族树中的位置
                  </p>
                </div>
                <div className="rounded-xl border border-stone-100 bg-[#F8F1E7] px-4 py-3">
                  <p className="text-xs text-stone-400">你的资料谁能看</p>
                  <p className="mt-1 text-sm text-stone-700 leading-relaxed">
                    默认家族内可见，可在设置中调整为仅自己可见
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-500 text-center mb-5 py-8">{message || '邀请链接暂时不可用'}</p>
          )}

          {message && invite && (
            <p className={`rounded-xl px-4 py-2.5 text-sm mb-4 ${
              message.includes('成功') ? 'bg-#F0E6D5 text-#8D6E63' : 'bg-red-50 text-red-600'
            }`}>{message}</p>
          )}

          {!invite ? (
            <Link href="/" className="flex items-center justify-center gap-2 w-full rounded-xl bg-#5A3524 py-3 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E transition-colors">
              <Home size={16} />返回首页
            </Link>
          ) : isAlreadyClaimed ? (
            <div className="space-y-3">
              <p className="text-sm text-#8D6E63 bg-#F0E6D5 rounded-xl px-4 py-2.5 text-center">该档案已被认领</p>
              <Link href="/family" className="flex items-center justify-center w-full rounded-xl bg-#5A3524 py-3 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E transition-colors">
                进入数字家堂
              </Link>
            </div>
          ) : !isLoggedIn ? (
            <div className="space-y-3">
              <p className="text-sm text-stone-500 text-center">请先登录后认领你的家人档案</p>
              <Link href={loginHref} className="flex items-center justify-center w-full rounded-xl bg-#5A3524 py-3 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E transition-colors">
                登录或注册
              </Link>
            </div>
          ) : canClaim ? (
            <div className="space-y-3">
              <button onClick={handleClaim} disabled={claiming}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-#5A3524 py-3 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E disabled:opacity-50 transition-all active:scale-[0.98]">
                <CheckCircle size={16} />
                {claiming ? '认领中...' : '确认认领'}
              </button>
              <button onClick={handleReject} disabled={rejecting}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-500 hover:bg-[#F8F1E7] disabled:opacity-50 transition-colors">
                <XCircle size={16} />
                {rejecting ? '处理中...' : '拒绝，这不是我'}
              </button>
              <p className="text-xs text-stone-400 text-center">拒绝后该档案将不再关联到你的账号</p>
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-center text-xs text-stone-400 leading-relaxed">
          认领后，你将成为该档案的关联用户，可在数字家堂中查看和编辑。
        </p>
      </div>
    </main>
  );
}
