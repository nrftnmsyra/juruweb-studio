'use server';

import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';

/**
 * Email + password sign-in.
 *
 * Being on the public.admins allowlist is checked separately from having valid
 * credentials: someone can hold a Supabase account and still not be an admin.
 * Both a refused and a successful attempt are recorded in the audit log.
 */
export async function signInAction(prevState, formData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague: saying which half was wrong tells an attacker which
    // emails exist.
    return { error: 'That email and password do not match. Please try again.' };
  }

  const { data: admin } = await supabase
    .from('admins')
    .select('email, active')
    .eq('email', email)
    .maybeSingle();

  if (!admin || !admin.active) {
    // Log while the session still exists, so the attempt is attributable.
    await supabase.rpc('log_auth_event', { p_action: 'DENIED', p_detail: email });
    await supabase.auth.signOut();
    return {
      error: admin
        ? 'That account has been suspended. Ask the owner to restore it.'
        : 'That account is not on the admin list.',
    };
  }

  await supabase.rpc('log_auth_event', { p_action: 'LOGIN', p_detail: null });
  redirect('/admin');
}

export async function logoutAction() {
  const supabase = await getServerSupabase();
  // Log first: after signOut there is no JWT left to attribute the event to.
  await supabase.rpc('log_auth_event', { p_action: 'LOGOUT', p_detail: null });
  await supabase.auth.signOut();
  redirect('/login');
}
