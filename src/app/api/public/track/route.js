import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS = new Set([
  'pageview',
  'click',
  'impression',
  'whatsapp_click',
  'form_submit',
  'phone_click',
  'outbound_click',
]);

// Cheap, boring, and catches the overwhelming majority. Bots that lie about
// their user agent are not worth chasing for a small-business dashboard.
const BOT_RE =
  /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pingdom|uptime|curl|wget|python-requests|axios|monitor/i;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Event ingest. No auth — it is called from other people's websites.
 *
 * Always answers 204, even when something fails here, so a problem on our side
 * can never show up as an error on a client's site. Failures are logged
 * server-side instead.
 */
export async function POST(request) {
  const ok = () => new NextResponse(null, { status: 204, headers: CORS });

  try {
    if (BOT_RE.test(request.headers.get('user-agent') || '')) return ok();

    const body = await request.json().catch(() => null);
    if (!body?.website || !body?.event_type) return ok();
    if (!ALLOWED_EVENTS.has(body.event_type)) return ok();

    const website = String(body.website).toLowerCase().replace(/^www\./, '').slice(0, 253);

    // The raw IP is never stored. Salting with the website keeps the same
    // visitor from being correlated across different clients' sites.
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const ipHash = ip
      ? createHash('sha256').update(`${ip}${website}`).digest('hex').slice(0, 16)
      : null;

    const row = {
      website,
      event_type: body.event_type,
      path: String(body.path || '/').slice(0, 512),
      referrer: body.referrer ? String(body.referrer).slice(0, 512) : null,
      label: body.label ? String(body.label).slice(0, 200) : null,
      device: body.device ? String(body.device).slice(0, 20) : null,
      browser: body.browser ? String(body.browser).slice(0, 30) : null,
      // Webcore left this column empty; Vercel hands it to us for free.
      country: request.headers.get('x-vercel-ip-country') || null,
      ip_hash: ipHash,
      session_id: body.session_id ? String(body.session_id).slice(0, 64) : null,
    };

    const supabase = getServiceSupabase();
    // supabase-js returns errors rather than throwing, so check explicitly.
    const { error } = await supabase.from('page_events').insert(row);
    if (error) console.error('[track] insert failed', error.message);
  } catch (err) {
    console.error('[track]', err);
  }

  return ok();
}
