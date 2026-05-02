'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signUpWithEmail } from '@/lib/auth/auth-service';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { Users, BookOpen, MessageSquare } from 'lucide-react';

const VALUE_PROPS = [
  {
    icon: <Users size={18} strokeWidth={1.8} />,
    title: '管理家族关系',
    desc: '以自己为中心整理三代谱，清晰呈现亲属关系',
  },
  {
    icon: <BookOpen size={18} strokeWidth={1.8} />,
    title: '沉淀家庭记忆',
    desc: '保存故事、相册和家人档案，让记忆有处安放',
  },
  {
    icon: <MessageSquare size={18} strokeWidth={1.8} />,
    title: '组织家庭议事',
    desc: '发布通知、发起投票、记录家庭聚会与纪念日',
  },
];

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
    <main className="min-h-screen bg-stone-50 flex flex-col lg:flex-row">
      {/* Left: Brand */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 lg:py-20 bg-emerald-950 text-white">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 4L28 12V28H4V12L16 4Z" stroke="#FBBF24" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M11 28V18H21V28" stroke="#FBBF24" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="16" cy="13" r="2" fill="#FBBF24" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">吾家祠堂</h1>
          <p className="mt-3 text-base text-white/60 leading-relaxed">
            家族关系操作系统 &middot; 数字家堂 &middot; 家族记忆资产库
          </p>

          {/* Value props */}
          <div className="mt-10 space-y-5">
            {VALUE_PROPS.map((prop) => (
              <div key={prop.title} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-400">
                  {prop.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{prop.title}</p>
                  <p className="mt-0.5 text-sm text-white/50">{prop.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-stone-900">
              {mode === 'signin' ? '登录数字家堂' : '注册账号'}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {mode === 'signin' ? '登录后进入你的家族空间' : '创建一个账号，建立你的数字家堂'}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4"
          >
            {/* Mode tabs */}
            <div className="flex rounded-xl bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === 'signin'
                    ? 'bg-white text-emerald-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === 'signup'
                    ? 'bg-white text-emerald-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                注册
              </button>
            </div>

            <label className="block">
              <span className="block text-sm font-medium text-stone-700 mb-1.5">邮箱</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all duration-200"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-stone-700 mb-1.5">密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="至少 6 位"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all duration-200"
              />
            </label>

            {message && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 leading-relaxed">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-emerald-950 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-900 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
            >
              {submitting ? '处理中…' : mode === 'signin' ? '登录' : '注册'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-stone-400 leading-relaxed">
            仅家庭成员可进入所属数字家堂，你的信息仅在家族内部可见。
          </p>
        </div>
      </div>
    </main>
  );
}
