'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOff, Lock, Mail } from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '@/lib/auth/auth-service';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { MobilePage, MobileStatusBar } from '@/components/wujia/MobileChrome';

type AuthMode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    const redirectTo = sanitizeRedirectPath(new URLSearchParams(window.location.search).get('redirect'));

    if (!hasSupabaseConfig()) {
      setMessage('尚未配置 Supabase 环境变量，请先配置 .env.local');
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'signup') {
        const result = await signUpWithEmail(email.trim(), password);
        if (result.needsEmailConfirmation) {
          setMessage('注册成功，请先打开邮箱确认邮件，再回到这里登录。');
          return;
        }
      } else {
        await signInWithEmail(email.trim(), password);
      }
      router.push(redirectTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobilePage withBottomNav={false}>
      <MobileStatusBar />
      <section className="relative z-10 px-8 pb-10 pt-8">
        <div className="relative min-h-[198px]">
          <h1 className="font-serif text-[45px] font-black leading-none tracking-[0.16em] text-[var(--ink-2)]">吾家祠堂</h1>
          <span className="ml-1 mt-3 inline-flex rounded-full bg-[var(--terracotta)] px-1.5 py-1 text-[10px] font-bold leading-none text-[var(--surface-1)] [writing-mode:vertical-rl]">测试</span>
          <p className="mt-6 whitespace-pre-line text-[18px] leading-8 text-[var(--ink-2)]">
            知来处，明亲缘
            {'\n'}把家人的故事留下来
          </p>
          <div className="absolute right-0 top-8 h-[155px] w-[172px] text-[var(--gold)]">
            <LoginTree />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-[radial-gradient(ellipse_at_20%_100%,rgba(170,151,107,0.18),transparent_46%),radial-gradient(ellipse_at_78%_100%,rgba(111,138,121,0.22),transparent_48%)]" />
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="overflow-hidden rounded-[18px] border border-[var(--line-1)] bg-white/78 shadow-[0_12px_28px_rgba(90,53,36,0.07)] backdrop-blur">
            <label className="flex h-[64px] items-center gap-3 border-b border-[var(--line-1)]/70 px-5">
              <Mail size={19} className="text-[var(--gold)]" />
              <span className="w-12 text-[15px] font-medium text-[var(--ink-2)]">邮箱</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="请输入邮箱"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--ink-1)] outline-none placeholder:text-[var(--ink-placeholder)]"
              />
            </label>
            <label className="flex h-[64px] items-center gap-3 px-5">
              <Lock size={19} className="text-[var(--gold)]" />
              <span className="w-12 text-[15px] font-medium text-[var(--ink-2)]">密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={mode === 'signin' ? '请输入密码' : '请设置至少 6 位密码'}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--ink-1)] outline-none placeholder:text-[var(--ink-placeholder)]"
              />
              <EyeOff size={17} className="text-[var(--ink-3)]" />
            </label>
          </div>

          {message && <p className="rounded-2xl bg-danger-light px-4 py-3 text-sm leading-relaxed text-danger">{message}</p>}

          <div className="flex items-center justify-between px-1">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--ink-3)]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--line-2)] text-[var(--walnut)] focus:ring-[var(--walnut)]/20"
              />
              记住我
            </label>
            <span className="text-[13px] text-[var(--ink-3)]">忘记密码?</span>
          </div>

          <button
            type="submit"
            disabled={submitting || !agreed}
            className="h-[52px] w-full rounded-[14px] bg-[linear-gradient(135deg,var(--walnut),var(--walnut-light))] text-[16px] font-semibold text-white shadow-warm-xl transition active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? '处理中...' : mode === 'signin' ? '登录' : '注册'}
          </button>

          <p className="pt-1 text-center text-[13px] text-[var(--ink-3)]">
            {mode === 'signin' ? '还没账号?' : '已有账号?'}
            <button
              type="button"
              onClick={() => {
                setMode((current) => (current === 'signin' ? 'signup' : 'signin'));
                setMessage('');
              }}
              className="ml-1 min-h-[44px] inline-flex items-center font-semibold text-[var(--walnut)]"
            >
              {mode === 'signin' ? '立即注册' : '立即登录'}
            </button>
          </p>
        </form>
      </section>
    </MobilePage>
  );
}

function LoginTree() {
  return (
    <svg viewBox="0 0 190 170" className="h-full w-full" fill="none" aria-hidden>
      <path d="M88 166C107 121 104 92 99 65C97 48 103 35 118 24" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" />
      <path d="M96 166C120 124 122 99 118 71C115 51 125 40 151 34" stroke="#D0A76A" strokeWidth="2" strokeLinecap="round" />
      <path d="M108 79C79 58 54 63 34 88" stroke="var(--gold)" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M121 86C147 76 161 84 177 105" stroke="var(--gold)" strokeWidth="1.7" strokeLinecap="round" />
      {[101, 74, 134, 48, 154, 91, 58, 77, 36, 112].map((x, i) => (
        <circle key={`${x}-${i}`} cx={x} cy={i % 2 ? 44 + i * 10 : 31 + i * 8} r="5" fill="var(--gold)" opacity=".52" />
      ))}
      {[[66, 46], [55, 62], [137, 55], [158, 84], [84, 88], [121, 118]].map(([x, y], i) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="9" ry="4.5" fill="var(--jade)" opacity=".52" transform={`rotate(${i % 2 ? -26 : 28} ${x} ${y})`} />
      ))}
    </svg>
  );
}
