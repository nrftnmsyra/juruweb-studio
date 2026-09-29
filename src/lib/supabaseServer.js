import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Server client bound to the request's cookies. Use it in Server Components,
 * Server Actions and Route Handlers so queries run as the signed-in admin.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session instead, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS entirely, so it must never be imported into
 * anything that reaches the browser — only route handlers and server actions.
 * Used by the public /track lookup, which has no session to run as.
 */
export function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Order tracking cannot read the database without it.'
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The signed-in admin's row, or null when they are not on the allowlist. */
export async function getCurrentAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data } = await supabase
    .from('admins')
    .select('email, role, full_name, active')
    .eq('email', user.email.toLowerCase())
    .maybeSingle();

  if (!data || !data.active) return null;
  return { ...data, id: user.id, avatar: user.user_metadata?.avatar_url ?? null };
}
