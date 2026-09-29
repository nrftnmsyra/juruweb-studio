'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getServerSupabase, getServiceSupabase, getCurrentAdmin } from '@/lib/supabaseServer';
import { ROLE_ADMIN, ROLE_OWNER, canManageUsers } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Readable but still 12 random bytes of entropy. */
function generatePassword() {
  return randomBytes(9).toString('base64url');
}

/**
 * Every action re-checks the caller. RLS blocks the admins table for non-owners
 * anyway, but the service-role client below bypasses RLS entirely — so this
 * check is the only thing standing between an admin and creating accounts.
 */
async function requireOwner() {
  const admin = await getCurrentAdmin();
  return canManageUsers(admin) ? admin : null;
}

/** The admins table stores emails, not auth ids, so look the account up. */
async function findAuthUser(service, email) {
  const { data } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return (data?.users || []).find((u) => u.email?.toLowerCase() === email) || null;
}

export async function addAdmin(prevState, formData) {
  const owner = await requireOwner();
  if (!owner) return { error: 'Only an owner can add admins.' };

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const fullName = String(formData.get('full_name') || '').trim();
  const role = formData.get('role') === ROLE_OWNER ? ROLE_OWNER : ROLE_ADMIN;
  const typed = String(formData.get('password') || '').trim();

  if (!EMAIL_RE.test(email)) return { error: 'That does not look like an email address.' };
  if (typed && typed.length < 8) return { error: 'A password needs at least 8 characters.' };

  const password = typed || generatePassword();

  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return {
      error:
        'SUPABASE_SERVICE_ROLE_KEY is not set, so accounts cannot be created. Add it in Vercel and redeploy.',
    };
  }

  // email_confirm skips the verification email — the owner hands the password
  // over directly, and Supabase's default SMTP is not reliable for this.
  const { error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError && !/already been registered|already exists/i.test(createError.message)) {
    return { error: createError.message };
  }
  const reusedExisting = Boolean(createError);

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from('admins')
    .insert({ email, full_name: fullName || null, role, created_by: owner.email });

  if (error) {
    if (error.code === '23505') return { error: `${email} is already on the admin list.` };
    return { error: error.message };
  }

  revalidatePath('/admin/users');
  return {
    ok: reusedExisting
      ? `${email} already had an account, so their existing password still applies.`
      : `${email} can now sign in.`,
    password: reusedExisting ? null : password,
  };
}

export async function resetPassword(prevState, formData) {
  const owner = await requireOwner();
  if (!owner) return { error: 'Only an owner can reset passwords.' };

  const email = String(formData.get('email') || '').toLowerCase();

  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY is not set, so passwords cannot be reset.' };
  }

  const user = await findAuthUser(service, email);
  if (!user) return { error: `No sign-in account exists for ${email}.` };

  const password = generatePassword();
  const { error } = await service.auth.admin.updateUserById(user.id, { password });
  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  return { ok: `New password for ${email}:`, password };
}

export async function setAdminActive(formData) {
  const owner = await requireOwner();
  if (!owner) return;

  const email = String(formData.get('email') || '').toLowerCase();
  const active = formData.get('active') === 'true';

  // Suspending yourself would leave nobody able to manage this list.
  if (!active && email === owner.email) return;

  const supabase = await getServerSupabase();
  await supabase.from('admins').update({ active }).eq('email', email);
  revalidatePath('/admin/users');
}

export async function removeAdmin(formData) {
  const owner = await requireOwner();
  if (!owner) return;

  const email = String(formData.get('email') || '').toLowerCase();
  if (email === owner.email) return; // never remove yourself

  const supabase = await getServerSupabase();
  await supabase.from('admins').delete().eq('email', email);

  // Drop the sign-in account too, so no orphan credentials are left behind.
  try {
    const service = getServiceSupabase();
    const user = await findAuthUser(service, email);
    if (user) await service.auth.admin.deleteUser(user.id);
  } catch {
    // Removing the allowlist row already blocks access; the account is harmless.
  }

  revalidatePath('/admin/users');
}
