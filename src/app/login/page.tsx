'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail } from '@/lib/auth/auth-service';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { Mail, Lock, MessageCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
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
      await signInWithEmail(email.trim(), password);
      router.push(redirectTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F3EC] flex flex-col items-center justify-center px-4 py-10">
      {/* ===== Top Visual Area ===== */}
      <div className="w-full max-w-md mb-8 text-center">
        {/* Decorative family tree lines */}
        <div className="relative mx-auto mb-6 h-28 w-64 overflow-hidden">
          <svg viewBox="0 0 256 112" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Trunk */}
            <line x1="128" y1="100" x2="128" y2="68" stroke="#8B6914" strokeWidth="1.5" opacity="0.4" />
            {/* Branches */}
            <line x1="128" y1="68" x2="64" y2="28" stroke="#8B6914" strokeWidth="1.2" opacity="0.3" />
            <line x1="128" y1="68" x2="128" y2="20" stroke="#8B6914" strokeWidth="1.2" opacity="0.3" />
            <line x1="128" y1="68" x2="192" y2="28" stroke="#8B6914" strokeWidth="1.2" opacity="0.3" />
            {/* Subtle leaf dots */}
            <circle cx="64" cy="28" r="3" fill="#C4A96A" opacity="0.4" />
            <circle cx="128" cy="20" r="3" fill="#C4A96A" opacity="0.4" />
            <circle cx="192" cy="28" r="3" fill="#C4A96A" opacity="0.4" />
            <circle cx="96" cy="40" r="2.5" fill="#C4A96A" opacity="0.3" />
            <circle cx="160" cy="40" r="2.5" fill="#C4A96A" opacity="0.3" />
            {/* Roots */}
            <line x1="128" y1="100" x2="112" y2="106" stroke="#8B6914" strokeWidth="1" opacity="0.25" />
            <line x1="128" y1="100" x2="144" y2="106" stroke="#8B6914" strokeWidth="1" opacity="0.25" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold tracking-[0.06em] text-[#5D4037]">
          吾家祠堂
        </h1>
        <p className="mt-3 text-[15px] text-[#8D7B6F] leading-relaxed">
          把家族关系理清楚，把长辈故事留下来
        </p>
      </div>

      {/* ===== Login Card ===== */}
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white px-6 py-7 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[#E8DFD3]">
          {/* Title */}
          <h2 className="text-lg font-semibold text-[#5D4037] mb-5">
            手机号登录
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field — styled as phone */}
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B8A89A]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="请输入手机号"
                className="w-full h-[52px] rounded-2xl border border-[#E0D5C7] bg-[#FCFAF7] pl-12 pr-4 text-[15px] text-[#4A3728] placeholder:text-[#B8A89A] focus:border-[#8B6914] focus:outline-none focus:ring-2 focus:ring-[#8B6914]/10 transition-all"
              />
            </div>

            {/* Password field — styled as verification code */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B8A89A]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="请输入验证码"
                  className="w-full h-[52px] rounded-2xl border border-[#E0D5C7] bg-[#FCFAF7] pl-12 pr-4 text-[15px] text-[#4A3728] placeholder:text-[#B8A89A] focus:border-[#8B6914] focus:outline-none focus:ring-2 focus:ring-[#8B6914]/10 transition-all"
                />
              </div>
              <button
                type="button"
                className="shrink-0 h-[52px] px-4 rounded-2xl border border-[#E0D5C7] bg-white text-[14px] font-medium text-[#8D7B6F] hover:bg-[#FCFAF7] transition-colors"
                title="当前使用邮箱密码登录"
              >
                获取验证码
              </button>
            </div>

            {/* Error message */}
            {message && (
              <p className="text-sm text-red-500 bg-red-50 rounded-2xl px-4 py-3 leading-relaxed">
                {message}
              </p>
            )}

            {/* Agreement */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#D0C4B5] text-[#8B6914] focus:ring-[#8B6914]/20"
              />
              <span className="text-[13px] text-[#8D7B6F] leading-relaxed">
                我已阅读并同意《用户协议》《隐私政策》
              </span>
            </label>

            {/* Primary button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-[52px] rounded-2xl bg-[#5D4037] text-[16px] font-semibold text-white shadow-sm transition-all hover:bg-[#4E342E] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
            >
              {submitting ? '处理中…' : '登录 / 注册'}
            </button>

            {/* WeChat button */}
            <button
              type="button"
              className="w-full h-[52px] rounded-2xl border-2 border-[#2D5A3D] bg-white text-[16px] font-semibold text-[#2D5A3D] transition-all hover:bg-[#F0F7F2] disabled:opacity-50"
              title="微信登录功能即将开放"
            >
              <span className="flex items-center justify-center gap-2">
                <MessageCircle size={20} strokeWidth={2} />
                微信快捷登录
              </span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[13px] text-[#B8A89A] leading-relaxed">
          专注家族联结与生平记录
          <br />
          首次登录后，可创建你的姓氏祠堂
        </p>
      </div>
    </main>
  );
}
