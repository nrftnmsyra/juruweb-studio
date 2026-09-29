'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getServerSupabase, getCurrentAdmin } from '@/lib/supabaseServer';

export async function issueClientKey(prevState, formData) {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: 'You need to be signed in.' };

  const website = String(formData.get('website') || '').toLowerCase();
  const label = String(formData.get('label') || '').trim();
  if (!website) return { error: 'No website given.' };

  // Shown to the admin once and never stored: only its hash goes to the
  // database, so a leaked backup cannot be turned back into working keys.
  const apiKey = `jw_live_${randomBytes(24).toString('hex')}`;
  const keyHash = createHash('sha256').update(apiKey).digest('hex');

  const supabase = await getServerSupabase();
  const { error } = await supabase.from('client_api_keys').insert({
    website,
    key_hash: keyHash,
    key_hint: apiKey.slice(-4),
    label: label || null,
    created_by: admin.email,
  });

  if (error) return { error: error.message };

  revalidatePath(`/admin/analytics/${website}`);
  return { apiKey };
}

export async function revokeClientKey(formData) {
  const admin = await getCurrentAdmin();
  if (!admin) return;

  const id = String(formData.get('id') || '');
  const website = String(formData.get('website') || '').toLowerCase();

  // Kept rather than deleted, so the audit trail still shows it existed.
  const supabase = await getServerSupabase();
  await supabase.from('client_api_keys').update({ active: false }).eq('id', id);
  revalidatePath(`/admin/analytics/${website}`);
}
