import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/domain';
import { createSupabaseBrowserClient, hasSupabaseConfig } from '@/lib/supabase/client';

let currentUserRequest: Promise<User | null> | null = null;

function isMissingSessionError(error: { message?: string } | null): boolean {
  return Boolean(error?.message?.includes('Auth session missing'));
}

function toAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('email not confirmed')) {
    return '邮箱尚未确认。请先打开 Supabase 发送的确认邮件完成验证，或在 Supabase Auth 设置中关闭邮箱确认。';
  }

  if (normalized.includes('invalid login credentials')) {
    return '邮箱或密码不正确，请检查后重试。';
  }

  if (normalized.includes('user already registered') || normalized.includes('already registered')) {
    return '该邮箱已注册，请直接登录。';
  }

  if (normalized.includes('signup disabled')) {
    return '当前项目暂未开放注册，请检查 Supabase Auth 注册设置。';
  }

  if (normalized.includes('password')) {
    return '密码不符合要求，请至少输入 6 位密码。';
  }

  return '操作失败，请稍后重试';
}

function requireSupabase() {
  if (!hasSupabaseConfig()) {
    throw new Error('尚未配置 Supabase 环境变量，请先配置 .env.local');
  }

  return createSupabaseBrowserClient();
}

function toNetworkAuthError(error: unknown): Error {
  if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    return new Error(
      '无法连接 Supabase。请检查 .env.local 中的 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY 是否正确，并确认当前网络可以访问 Supabase。'
    );
  }

  return error instanceof Error ? error : new Error('认证请求失败，请稍后重试');
}

function getDisplayNameFromEmail(email?: string): string {
  return email?.split('@')[0]?.trim() || '家人';
}

export async function getCurrentUser(): Promise<User | null> {
  if (!hasSupabaseConfig()) return null;

  if (currentUserRequest) return currentUserRequest;

  const supabase = createSupabaseBrowserClient();
  currentUserRequest = (async () => {
    const { data, error } = await supabase.auth.getUser().catch((error: unknown) => {
      throw toNetworkAuthError(error);
    });

    if (isMissingSessionError(error)) {
      return null;
    }

    if (error) {
      throw new Error(toAuthErrorMessage(error.message));
    }

    return data.user ?? null;
  })();

  try {
    return await currentUserRequest;
  } finally {
    currentUserRequest = null;
  }
}

export async function getCurrentProfile(user?: User | null): Promise<Profile | null> {
  const resolvedUser = user ?? (await getCurrentUser());
  if (!resolvedUser) return null;

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', resolvedUser.id)
    .maybeSingle();

  if (error) {
    throw new Error(toAuthErrorMessage(error.message));
  }

  return data as Profile | null;
}

export async function ensureProfile(user?: User | null): Promise<Profile | null> {
  const supabase = requireSupabase();
  const resolvedUser = user ?? (await getCurrentUser());
  if (!resolvedUser) return null;

  const existing = await getCurrentProfile(resolvedUser);
  if (existing) return existing;

  const profile: Partial<Profile> = {
    id: resolvedUser.id,
    display_name: getDisplayNameFromEmail(resolvedUser.email),
    avatar_url: null,
    phone: null,
    elder_mode: false,
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select('*')
    .single();

  if (error) throw new Error(toAuthErrorMessage(error.message));
  return data as Profile;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth
    .signInWithPassword({ email, password })
    .catch((error: unknown) => {
      throw toNetworkAuthError(error);
    });
  if (error) throw new Error(toAuthErrorMessage(error.message));
  await ensureProfile(data.user ?? data.session?.user ?? null);
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ needsEmailConfirmation: boolean }> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password }).catch((error: unknown) => {
    throw toNetworkAuthError(error);
  });
  if (error) throw new Error(toAuthErrorMessage(error.message));
  if (data.session) {
    await ensureProfile(data.user ?? data.session.user);
    return { needsEmailConfirmation: false };
  }

  return { needsEmailConfirmation: true };
}

export async function signOut(): Promise<void> {
  if (!hasSupabaseConfig()) return;

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut().catch((error: unknown) => {
    throw toNetworkAuthError(error);
  });
  if (error) throw new Error(toAuthErrorMessage(error.message));
}
