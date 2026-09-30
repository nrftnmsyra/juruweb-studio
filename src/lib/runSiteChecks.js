import { getServiceSupabase } from '@/lib/supabaseServer';
import { checkSite } from '@/lib/siteCheck';

// Checked in batches so one slow site cannot stall the rest, while still not
// opening a socket per site all at once.
const BATCH_SIZE = 4;

/**
 * Check every active site and record the results.
 *
 * Shared by the daily Vercel Cron route and the "Check now" button, so the
 * button cannot drift from what the cron actually does.
 *
 * Writes with the service role key, so it works with no signed-in admin and
 * bypasses the RLS that keeps site_checks read-only for everyone else. Callers
 * are responsible for deciding who is allowed to ask.
 */
export async function runSiteChecks() {
  const supabase = getServiceSupabase();

  const { data: sites, error } = await supabase
    .from('monitored_sites')
    .select('id, domain')
    .eq('active', true);

  if (error) throw new Error(`Could not load sites: ${error.message}`);
  if (!sites?.length) return { checked: 0, failed: 0, purged: 0, sites: [] };

  const results = [];
  for (let i = 0; i < sites.length; i += BATCH_SIZE) {
    const batch = sites.slice(i, i + BATCH_SIZE);
    const rows = await Promise.all(
      batch.map(async (site) => {
        try {
          const row = await checkSite(site.domain);
          return { site_id: site.id, domain: site.domain, ...row };
        } catch (err) {
          return {
            site_id: site.id,
            domain: site.domain,
            ok: false,
            error: `Check crashed: ${err.message}`,
          };
        }
      })
    );
    results.push(...rows);
  }

  // domain is only carried through for the response; it is not a column.
  const toInsert = results.map(({ domain, ...row }) => row);
  const { error: insertError } = await supabase.from('site_checks').insert(toInsert);
  if (insertError) throw new Error(`Could not save checks: ${insertError.message}`);

  // Analytics retention, folded into the run we already make each day. Failing
  // to purge must not fail the checks, so it is best-effort.
  let purged = 0;
  try {
    const { data } = await supabase.rpc('purge_old_page_events');
    purged = data ?? 0;
  } catch (err) {
    console.error('[runSiteChecks] purge skipped', err.message);
  }

  return {
    purged,
    checked: results.length,
    failed: results.filter((r) => !r.ok).length,
    sites: results.map((r) => ({
      domain: r.domain,
      ok: r.ok,
      status: r.status_code ?? null,
      ms: r.response_ms ?? null,
      sslDays: r.ssl_days_left ?? null,
      domainDays: r.domain_days_left ?? null,
      seo: r.seo_score ?? null,
      error: r.error ?? null,
    })),
  };
}
