import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PERIODS = { '7d': 7, '30d': 30, '90d': 90 };

/**
 * Read API for a client's own dashboard.
 *
 * Authenticated with X-API-Key. The key resolves to exactly one website, and
 * every figure below is scoped to it — a leaked key exposes that client's
 * traffic and nothing else.
 *
 * Deliberately excluded: orders, invoices, the ledger, and anything about
 * other clients. Those are ours, not theirs.
 *
 * Call it from the client dashboard's server side (a Route Handler or Server
 * Component), never the browser, so the key stays out of their bundle.
 */
export async function GET(request) {
  const key = request.headers.get('x-api-key') || '';
  if (!key) {
    return NextResponse.json({ error: 'Missing X-API-Key header.' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch {
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  const hash = createHash('sha256').update(key).digest('hex');
  const { data: website } = await supabase.rpc('resolve_client_key', { p_hash: hash });

  if (!website) {
    // Same answer for an unknown key and a revoked one: no probing.
    return NextResponse.json({ error: 'Invalid or revoked API key.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const period = PERIODS[url.searchParams.get('period')] ? url.searchParams.get('period') : '30d';
  const days = PERIODS[period];
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);

  const [{ data: summary }, { data: status }] = await Promise.all([
    supabase.rpc('analytics_summary', {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_website: website,
    }),
    supabase
      .from('site_status')
      .select('domain, label, ok, response_ms, ssl_days_left, seo_score, checked_at')
      .eq('domain', website)
      .maybeSingle(),
  ]);

  const s = summary || {};
  const totals = s.totals || {};

  return NextResponse.json(
    {
      website,
      label: status?.label ?? null,
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      traffic: {
        pageviews: Number(totals.views || 0),
        sessions: Number(totals.sessions || 0),
        visitors: Number(totals.visitors || 0),
        actions: Number(totals.clicks || 0),
        daily: s.daily || [],
        topPages: s.pages || [],
        sources: s.referrers || [],
        devices: s.devices || {},
        browsers: s.browsers || {},
      },
      health: status
        ? {
            up: status.ok ?? null,
            responseMs: status.response_ms ?? null,
            sslDaysLeft: status.ssl_days_left ?? null,
            seoScore: status.seo_score ?? null,
            checkedAt: status.checked_at ?? null,
          }
        : null,
    },
    { headers: { 'Cache-Control': 'private, max-age=120' } }
  );
}
