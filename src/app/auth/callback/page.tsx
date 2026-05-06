'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureProfile } from '@/lib/auth/auth-service';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';
import { createSupabaseBrowserClient, hasSupabaseConfig } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('正在完成登录…');

  useEffect(() => {
    async function completeAuth() {
      if (!hasSupabaseConfig()) {
        setMessage('尚未配置 Supabase 环境变量，请先配置 .env.local');
        return;
      }

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const redirectTo = sanitizeRedirectPath(url.searchParams.get('redirect'));

        if (!code) {
          router.replace(`/login?redirect=${encodeURIComponent(redirectTo)}`);
          return;
        }

        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          throw new Error('登录回调处理失败，请重新登录');
        }

        const profile = await ensureProfile(data.session?.user ?? null);
        if (!profile) {
          router.replace(`/login?redirect=${encodeURIComponent(redirectTo)}`);
          return;
        }
        router.replace(redirectTo);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '登录回调处理失败，请重新登录');
      }
    }

    completeAuth();
  }, [router]);

  return (
    <main className="min-h-screen bg-[#F8F1E7] flex items-center justify-center px-4">
      <p className="text-sm text-stone-500">{message}</p>
    </main>
  );
}
