import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';
import { checkSite } from '@/lib/siteCheck';

// node:tls needs the Node runtime, and sixteen sites take longer than the
// default ten seconds.
export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Checked in batches so one slow site cannot stall the rest, while still not
// opening sixteen sockets at once.
const BATCH_SIZE = 4;

/**
 * Daily site check. Triggered by Vercel Cron (see vercel.json).
 *
 * Writes with the service role key, so it works without a signed-in admin and
 * bypasses the RLS that keeps site_checks read-only for everyone else.
 */
async function runChecks() {
  const supabase = getServiceSupabase();

  const { data: sites, error } = await supabase
    .from('monitored_sites')
    .select('id, domain')
    .eq('active', true);

  if (error) throw new Error(`Could not load sites: ${error.message}`);
  if (!sites?.length) return { checked: 0, failed: 0, sites: [] };

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
    console.error('[cron/monitor] purge skipped', err.message);
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

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without the check,
 * anyone could hammer this endpoint and fill the history with junk.
 */
function authorised(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await runChecks()) });
  } catch (err) {
    console.error('[cron/monitor]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

/** Same work, triggered by the "Check now" button in the dashboard. */
export async function POST(request) {
  const { getCurrentAdmin } = await import('@/lib/supabaseServer');
  const admin = await getCurrentAdmin();
  if (!admin && !authorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await runChecks()) });
  } catch (err) {
    console.error('[cron/monitor]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
