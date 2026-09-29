import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Gate for /admin.
 *
 * The old version compared a cookie to the literal string 'authenticated', so
 * anyone could forge it from the browser console. This asks Supabase to verify
 * a real JWT, and refreshes it on the way through so sessions do not expire
 * mid-session.
 *
 * Being on the allowlist is confirmed again by RLS on every query, so a revoked
 * admin loses data access even if their session cookie is still valid.
 */
export async function proxy(request) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let admin = null;
  if (user?.email) {
    const { data } = await supabase
      .from('admins')
      .select('email, active')
      .eq('email', user.email.toLowerCase())
      .maybeSingle();
    if (data?.active) admin = data;
  }

  if (pathname === '/login') {
    if (admin) return NextResponse.redirect(new URL('/admin', request.url));
    return response;
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!admin) {
      const to = new URL('/login', request.url);
      if (user) to.searchParams.set('error', 'not_allowed');
      return NextResponse.redirect(to);
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/login', '/admin', '/admin/:path*'],
};
