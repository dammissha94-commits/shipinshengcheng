'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signUpWithEmail } from '@/lib/auth/auth-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';

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
    const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/family';

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
          <h1 className="text-3xl font-bold text-pine tracking-[0.12em] mb-2">吾家祠堂</h1>
          <p className="text-sm text-muted">登录后同步你的数字家堂</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-sand/60 p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-2 bg-sand/50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`py-2 rounded-lg text-sm font-medium ${mode === 'signin' ? 'bg-card text-pine shadow-sm' : 'text-muted'}`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`py-2 rounded-lg text-sm font-medium ${mode === 'signup' ? 'bg-card text-pine shadow-sm' : 'text-muted'}`}
            >
              注册
            </button>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-charcoal mb-1.5">邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-2 border-sand rounded-xl px-4 py-3 bg-cream focus:outline-none focus:border-pine"
              placeholder="name@example.com"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-charcoal mb-1.5">密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border-2 border-sand rounded-xl px-4 py-3 bg-cream focus:outline-none focus:border-pine"
              placeholder="至少 6 位"
            />
          </label>

          {message && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{message}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-pine text-cream text-base font-semibold disabled:opacity-60"
          >
            {submitting ? '处理中…' : mode === 'signin' ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </main>
  );
}
