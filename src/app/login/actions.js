'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';

/** Starts the Google sign-in and hands the visitor off to Google. */
export async function signInWithGoogle() {
  const supabase = await getServerSupabase();
  const headerList = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${headerList.get('x-forwarded-proto') ?? 'https'}://${headerList.get('host')}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { access_type: 'offline', prompt: 'select_account' },
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(data.url);
}

export async function logoutAction() {
  const supabase = await getServerSupabase();
  // Log first: after signOut there is no JWT left to attribute the event to.
  await supabase.rpc('log_auth_event', { p_action: 'LOGOUT', p_detail: null });
  await supabase.auth.signOut();
  redirect('/login');
}
