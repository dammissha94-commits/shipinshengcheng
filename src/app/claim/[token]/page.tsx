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
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';

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
    return <MobilePage withBottomNav={false}><MobileStatusBar /><div className="flex min-h-[70vh] items-center justify-center px-4"><p className="text-sm text-[var(--ink-3)]">加载中...</p></div></MobilePage>;
  }

  const loginHref = loginRedirectPath(`/claim/${token}`);
  const isAlreadyClaimed = invite?.person.claim_status === 'claimed';
  const canClaim = isLoggedIn && !isAlreadyClaimed && !claimed;

  // === CLAIMED SUCCESS STATE ===
  if (claimed) {
    return (
      <MobilePage withBottomNav={false}>
        <MobileStatusBar />
        <MobileTopBar title="邀请认领" />
        <div className="relative z-10 px-8 py-8">
          <div className="text-center mb-8">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--walnut)] shadow-lg">
              <CheckCircle size={28} strokeWidth={2} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--ink-1)]">认领成功</h1>
            <p className="mt-1 text-sm text-[var(--ink-3)]">
              你已成为&ldquo;{invite?.person.display_name}&rdquo;的档案关联用户
            </p>
          </div>

          <div className="space-y-3">
            {/* Profile CTA */}
            <Link href={`/family/members/${invite?.person.id}`}
              className="wj-card-solid flex items-center gap-3 rounded-[24px] p-4 transition-all hover:-translate-y-0.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-3)] text-[var(--walnut-light)]">
                <CheckCircle size={18} strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--ink-1)]">完善我的资料</p>
              <p className="text-xs text-[var(--ink-3)]">补充档案和基本信息</p>
              </div>
            </Link>

            {/* Fission CTA */}
            <Link href="/family/relatives/new"
              className="flex items-center gap-3 rounded-2xl border border-warning-light bg-warning-light p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-light text-warning">
                <UserPlus size={18} strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--ink-1)]">补充我这一支亲属</p>
                <p className="text-xs text-[var(--ink-3)]">添加父母、配偶、子女或兄弟姐妹</p>
              </div>
            </Link>

            {/* Enter family */}
            <Link href="/family"
              className="wj-primary flex min-h-[44px] items-center justify-center gap-2 w-full rounded-2xl text-sm font-semibold transition-colors">
              <Home size={16} />进入数字家堂
            </Link>
          </div>
        </div>
      </MobilePage>
    );
  }

  // === NORMAL CLAIM FLOW ===
  return (
    <MobilePage withBottomNav={false}>
      <MobileStatusBar />
      <MobileTopBar title="邀请认领" />
      <div className="relative z-10 px-8 py-8">
        {/* Brand */}
        <div className="mb-7 rounded-[13px] border border-[var(--line-1)] bg-[var(--surface-3)] px-6 py-8 text-center shadow-warm-sm">
          <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] text-white shadow-gold-sm">
            <MailIcon />
          </div>
          <h1 className="text-[24px] font-bold text-[var(--ink-1)]">邀请认领</h1>
          <p className="mt-3 text-[18px] font-semibold text-[var(--ink-2)]">{invite?.person.display_name || '家人档案'}</p>
          <p className="mt-1 text-[14px] text-[var(--ink-3)]">来自：{invite?.family.displayName || '数字家堂'}</p>
        </div>

        {/* Card */}
        <div className="rounded-[13px] border border-[var(--line-1)] bg-white/86 p-5 shadow-warm-sm">
          {invite ? (
            <div className="space-y-3 mb-5">
              <div className="rounded-[12px] border border-[var(--line-1)] bg-[var(--surface-2)] px-4 py-3">
                <p className="text-xs text-[var(--ink-3)]">数字家堂</p>
                <p className="mt-0.5 text-base font-semibold text-[var(--ink-1)]">{invite.family.displayName}</p>
              </div>
              <div className="rounded-[12px] border border-[var(--line-1)] bg-[var(--surface-2)] px-4 py-3">
                <p className="text-xs text-[var(--ink-3)]">待认领档案</p>
                <p className="mt-0.5 text-base font-semibold text-[var(--ink-1)]">{invite.person.display_name}</p>
              </div>

              {/* Context cards */}
              <div className="grid grid-cols-1 gap-2">
                <div className="rounded-[12px] border border-[var(--line-1)] bg-[var(--surface-2)] px-4 py-3">
                  <p className="text-xs text-[var(--ink-3)]">认领后你能做什么</p>
                  <p className="mt-1 text-sm text-[var(--ink-2)] leading-relaxed">
                    完善个人资料、补充亲属信息、查看家族树中的位置
                  </p>
                </div>
                <div className="rounded-[12px] border border-[var(--line-1)] bg-[var(--surface-2)] px-4 py-3">
                  <p className="text-xs text-[var(--ink-3)]">你的资料谁能看</p>
                  <p className="mt-1 text-sm text-[var(--ink-2)] leading-relaxed">
                    默认家族内可见，可在设置中调整为仅自己可见
                  </p>
                </div>
                <div className="rounded-[12px] border border-[#E7D9C9] bg-[#FBF4E8] px-4 py-3">
                  <p className="text-xs text-[var(--ink-3)]">确认前请核对</p>
                  <p className="mt-1 text-sm text-[var(--ink-2)] leading-relaxed">
                    请确认上方家堂与姓名是你本人。如果不是你，可以选择拒绝，不会关联到你的账号。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-3)] text-center mb-5 py-8">{message || '邀请链接暂时不可用'}</p>
          )}

          {message && invite && (
            <p className={`rounded-xl px-4 py-2.5 text-sm mb-4 ${
              message.includes('成功') ? 'bg-[var(--surface-3)] text-[var(--jade)]' : 'bg-danger-light text-danger'
            }`}>{message}</p>
          )}

          {!invite ? (
            <Link href="/" className="wj-primary flex min-h-[44px] items-center justify-center gap-2 w-full rounded-2xl text-sm font-semibold transition-colors">
              <Home size={16} />返回首页
            </Link>
          ) : isAlreadyClaimed ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--walnut-light)] bg-[var(--surface-3)] rounded-xl px-4 py-2.5 text-center">该档案已被认领</p>
              <Link href="/family" className="wj-primary flex items-center justify-center w-full rounded-2xl py-3 text-sm font-semibold transition-colors">
                进入数字家堂
              </Link>
            </div>
          ) : !isLoggedIn ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--ink-3)] text-center">请先登录后认领你的家人档案</p>
              <Link href={loginHref} className="wj-primary flex min-h-[44px] items-center justify-center w-full rounded-2xl text-sm font-semibold transition-colors">
                登录或注册
              </Link>
            </div>
          ) : canClaim ? (
            <div className="space-y-3">
              <button onClick={handleClaim} disabled={claiming}
                className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[var(--walnut)] to-[var(--walnut-light)] text-sm font-semibold text-white shadow-warm-lg transition-all active:scale-[0.98] disabled:opacity-50">
                <CheckCircle size={16} />
                {claiming ? '认领中...' : '确认认领'}
              </button>
              <button onClick={handleReject} disabled={rejecting}
                className="flex min-h-[44px] items-center justify-center gap-2 w-full rounded-xl border border-[var(--line-1)] bg-white py-3 text-sm font-medium text-[var(--ink-3)] hover:bg-[var(--surface-2)] disabled:opacity-50 transition-colors">
                <XCircle size={16} />
                {rejecting ? '处理中...' : '拒绝，这不是我'}
              </button>
              <p className="text-xs text-[var(--ink-3)] text-center">拒绝后该档案将不再关联到你的账号</p>
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-center text-xs text-[var(--ink-3)] leading-relaxed">
          认领后，你将成为该档案的关联用户，可在数字家堂中查看和编辑。
        </p>
      </div>
    </MobilePage>
  );
}

function MailIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M8 18 24 7l16 11v20a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V18Z" fill="#F6D8A2" />
      <path d="M13 13h22v23H13V13Z" fill="var(--surface-1)" />
      <path d="M8 18l16 12 16-12v20a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V18Z" fill="#C58B48" />
      <circle cx="24" cy="29" r="5" fill="#B64632" />
    </svg>
  );
}
