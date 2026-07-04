import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from '@/lib/auth';

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const isAuthed = request.cookies.get(AUTH_COOKIE_NAME)?.value === AUTH_COOKIE_VALUE;

  // Authenticated users skip the login screen and land on the dashboard
  if (pathname === '/login') {
    if (isAuthed) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // Only the admin dashboard is passcode-protected
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Landing page, /track, and everything else are public
  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/admin', '/admin/:path*'],
};
