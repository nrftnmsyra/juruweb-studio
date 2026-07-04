'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, PASSCODE } from '@/lib/auth';

export async function loginAction(prevState, formData) {
  const passcode = formData.get('passcode');

  if (passcode !== PASSCODE) {
    return { error: 'Incorrect passcode. Please try again.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect('/admin');
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect('/login');
}
