'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Check your environment variables.');
}

/**
 * Browser client. Unlike the plain createClient it used to use, this reads the
 * session from cookies, so every query carries the signed-in admin's JWT — which
 * is what the RLS policies in supabase_auth_audit.sql check. Without a session
 * the tables now return nothing rather than everything.
 */
// createBrowserClient throws on empty credentials, where the old createClient
// tolerated them. Falling back to an unreachable placeholder keeps the app's
// existing behaviour: queries fail, handleDbError catches it, and
// DatabaseSetupHelper explains what to configure — rather than a hard crash.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : createBrowserClient('https://unconfigured.supabase.co', 'unconfigured');
