'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, getCurrentAdmin } from '@/lib/supabaseServer';
import { ROLE_ADMIN, ROLE_OWNER, canManageUsers } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Every action re-checks the caller server-side. RLS blocks these writes anyway
 * for non-owners, but failing here gives a clear message instead of a silent
 * empty result.
 */
async function requireOwner() {
  const admin = await getCurrentAdmin();
  if (!canManageUsers(admin)) return null;
  return admin;
}

export async function addAdmin(prevState, formData) {
  const owner = await requireOwner();
  if (!owner) return { error: 'Only an owner can add admins.' };

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const fullName = String(formData.get('full_name') || '').trim();
  const role = formData.get('role') === ROLE_OWNER ? ROLE_OWNER : ROLE_ADMIN;

  if (!EMAIL_RE.test(email)) {
    return { error: 'That does not look like an email address.' };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from('admins')
    .insert({ email, full_name: fullName || null, role, created_by: owner.email });

  if (error) {
    if (error.code === '23505') return { error: `${email} is already on the list.` };
    return { error: error.message };
  }

  revalidatePath('/admin/users');
  return { ok: `${email} can now sign in with Google.` };
}

export async function setAdminActive(formData) {
  const owner = await requireOwner();
  if (!owner) return;

  const email = String(formData.get('email') || '').toLowerCase();
  const active = formData.get('active') === 'true';

  // Losing the last owner would lock everyone out of user management.
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
  revalidatePath('/admin/users');
}
