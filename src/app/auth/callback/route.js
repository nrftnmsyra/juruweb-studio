import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

/**
 * Where Google sends the visitor back to. Exchanges the one-time code for a
 * session, then checks the email against public.admins before letting them in.
 * A successful or refused attempt is both recorded in the audit log.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error_description') || searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase() ?? '';

  const { data: admin } = await supabase
    .from('admins')
    .select('email, role, active')
    .eq('email', email)
    .maybeSingle();

  if (!admin || !admin.active) {
    // Record the refused attempt before dropping the session, while the JWT is
    // still available for log_auth_event to attribute it to.
    await supabase.rpc('log_auth_event', { p_action: 'DENIED', p_detail: email || 'unknown' });
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_allowed`);
  }

  await supabase.rpc('log_auth_event', { p_action: 'LOGIN', p_detail: null });

  return NextResponse.redirect(`${origin}/admin`);
}
