'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signUpWithEmail } from '@/lib/auth/auth-service';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { Button, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        const result = await signUpWithEmail(email.trim(), password);
        if (result.needsEmailConfirmation) {
          setMessage('注册成功。请先打开确认邮件完成邮箱验证，然后回到这里登录。');
          return;
        }
      }
      router.push(redirectTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-[34px] font-bold text-pine tracking-[0.08em] mb-2">吾家祠堂</h1>
          <p className="text-[14px] text-muted">登录后同步你的数字家堂</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-sand/60 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex gap-1 bg-sand/40 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2.5 rounded-lg text-[15px] font-semibold transition-all duration-200 ${
                mode === 'signin'
                  ? 'bg-card text-pine shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                  : 'text-muted hover:text-charcoal'
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-lg text-[15px] font-semibold transition-all duration-200 ${
                mode === 'signup'
                  ? 'bg-card text-pine shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                  : 'text-muted hover:text-charcoal'
              }`}
            >
              注册
            </button>
          </div>

          <label className="block">
            <span className="block text-[14px] font-medium text-charcoal mb-1.5">邮箱</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
            />
          </label>

          <label className="block">
            <span className="block text-[14px] font-medium text-charcoal mb-1.5">密码</span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="至少 6 位"
            />
          </label>

          {message && (
            <p className="text-[14px] text-red-600 bg-red-50 rounded-xl px-4 py-2.5 leading-relaxed">{message}</p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            fullWidth
            size="lg"
          >
            {submitting ? '处理中…' : mode === 'signin' ? '登录' : '注册'}
          </Button>
        </form>
      </div>
    </main>
  );
}
