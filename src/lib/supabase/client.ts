import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseServiceClient } from '@/lib/services/service-client';

let browserClient: SupabaseClient | null = null;

function validateSupabaseConfig(supabaseUrl: string, supabaseAnonKey: string): void {
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL 格式不正确，请填写 Supabase Project URL。');
  }

  const isJwtAnonKey = supabaseAnonKey.split('.').length === 3;
  const isPublishableKey = supabaseAnonKey.startsWith('sb_publishable_');

  if (!isJwtAnonKey && !isPublishableKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY 格式不正确，请填写 Supabase anon public key。');
  }
}

export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createSupabaseBrowserClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  validateSupabaseConfig(supabaseUrl.trim(), supabaseAnonKey.trim());

  browserClient ??= createBrowserClient(supabaseUrl.trim(), supabaseAnonKey.trim());
  return browserClient;
}

export function createSupabaseServiceClient(): SupabaseServiceClient {
  return createSupabaseBrowserClient() as unknown as SupabaseServiceClient;
}
