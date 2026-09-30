'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase, getCurrentAdmin } from '@/lib/supabaseServer';

async function requireAdmin() {
  const admin = await getCurrentAdmin();
  return admin || null;
}

export async function addSite(prevState, formData) {
  const admin = await requireAdmin();
  if (!admin) return { error: 'You need to be signed in.' };

  const domain = String(formData.get('domain') || '').trim();
  const label = String(formData.get('label') || '').trim();
  const customerId = String(formData.get('customer_id') || '');

  if (!domain) return { error: 'Enter a domain.' };
  // The database trigger strips scheme, www and any path, so a pasted URL works.
  if (!/[a-z0-9-]+\.[a-z]{2,}/i.test(domain)) {
    return { error: 'That does not look like a domain.' };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.from('monitored_sites').insert({
    domain,
    label: label || null,
    customer_id: customerId || null,
    created_by: admin.email,
  });

  if (error) {
    if (error.code === '23505') return { error: `${domain} is already being watched.` };
    return { error: error.message };
  }

  revalidatePath('/admin/websites');
  return { ok: `Now watching ${domain}. First check runs tonight.` };
}

export async function toggleSite(formData) {
  if (!(await requireAdmin())) return;
  const id = String(formData.get('id') || '');
  const active = formData.get('active') === 'true';

  const supabase = await getServerSupabase();
  await supabase.from('monitored_sites').update({ active }).eq('id', id);
  revalidatePath('/admin/websites');
}

export async function removeSite(formData) {
  if (!(await requireAdmin())) return;
  const id = String(formData.get('id') || '');

  // site_checks cascades, so the history goes with it.
  const supabase = await getServerSupabase();
  await supabase.from('monitored_sites').delete().eq('id', id);
  revalidatePath('/admin/websites');
}

/** Rollup for every site in one month, used to build the PDF. */
export async function getMonthlyReport(monthISO) {
  const admin = await requireAdmin();
  if (!admin) return { error: 'You need to be signed in.' };

  const supabase = await getServerSupabase();
  const { data: sites, error } = await supabase
    .from('site_status')
    .select('id, domain, label, customer_name, active')
    .eq('active', true)
    .order('domain');

  if (error) return { error: error.message };

  const rows = await Promise.all(
    (sites || []).map(async (site) => {
      const { data } = await supabase.rpc('monthly_site_report', {
        p_site_id: site.id,
        p_month: monthISO,
      });
      const stats = Array.isArray(data) ? data[0] : data;
      return { ...site, ...(stats || {}) };
    })
  );

  return { month: monthISO, rows };
}
