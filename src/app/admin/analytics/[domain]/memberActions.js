'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getServerSupabase, getServiceSupabase, getCurrentAdmin } from '@/lib/supabaseServer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin() {
  return (await getCurrentAdmin()) || null;
}

function generatePassword() {
  return randomBytes(9).toString('base64url');
}

/** auth.users is shared across the whole project, so look an account up by email. */
async function findAuthUser(service, email) {
  const { data } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return (data?.users || []).find((u) => u.email?.toLowerCase() === email) || null;
}

export async function provisionMembers(formData) {
  if (!(await requireAdmin())) return;
  const projectRef = String(formData.get('project_ref') || '');
  const domain = String(formData.get('domain') || '');

  const supabase = await getServerSupabase();
  await supabase.rpc('provision_client_members', { p_project_ref: projectRef });
  revalidatePath(`/admin/analytics/${domain}`);
}

export async function listMembers(projectRef) {
  if (!(await requireAdmin())) return { error: 'You need to be signed in.' };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.rpc('client_members', { p_project_ref: projectRef });
  if (error) return { error: error.message };
  return { members: data || [] };
}

/**
 * Two steps, because one Supabase project shares a single auth.users: the
 * account signs them in, and the schema's members row is what actually grants
 * access to this client's dashboard.
 */
export async function addMember(prevState, formData) {
  const admin = await requireAdmin();
  if (!admin) return { error: 'You need to be signed in.' };

  const projectRef = String(formData.get('project_ref') || '');
  const domain = String(formData.get('domain') || '');
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const fullName = String(formData.get('full_name') || '').trim();
  const role = formData.get('role') === 'owner' ? 'owner' : 'member';
  const typed = String(formData.get('password') || '').trim();

  if (!EMAIL_RE.test(email)) return { error: 'That does not look like an email address.' };
  if (typed && typed.length < 8) return { error: 'A password needs at least 8 characters.' };
  if (!projectRef) return { error: 'This website has no project linked, so there is no schema to add them to.' };

  let service;
  try {
    service = getServiceSupabase();
  } catch {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY is not set, so accounts cannot be created.' };
  }

  const password = typed || generatePassword();
  const { error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  const reusedExisting = Boolean(createError);
  if (createError && !/already been registered|already exists/i.test(createError.message)) {
    return { error: createError.message };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc('client_member_add', {
    p_project_ref: projectRef,
    p_email: email,
    p_role: role,
    p_full_name: fullName || null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/analytics/${domain}`);
  return {
    ok: reusedExisting
      ? `${email} already had an account, so their existing password still works.`
      : `${email} can now sign in to the client dashboard.`,
    password: reusedExisting ? null : password,
  };
}

export async function removeMember(formData) {
  if (!(await requireAdmin())) return;

  const projectRef = String(formData.get('project_ref') || '');
  const domain = String(formData.get('domain') || '');
  const email = String(formData.get('email') || '').toLowerCase();

  const supabase = await getServerSupabase();
  await supabase.rpc('client_member_remove', { p_project_ref: projectRef, p_email: email });

  // The sign-in account is left alone on purpose: the same person may be a
  // member of another client's dashboard, and deleting it would lock them out
  // of that one too. Removing the members row already revokes access here.
  revalidatePath(`/admin/analytics/${domain}`);
}

export async function resetMemberPassword(prevState, formData) {
  if (!(await requireAdmin())) return { error: 'You need to be signed in.' };

  const email = String(formData.get('email') || '').toLowerCase();
  const domain = String(formData.get('domain') || '');

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

  revalidatePath(`/admin/analytics/${domain}`);
  return { ok: `New password for ${email}:`, password };
}
