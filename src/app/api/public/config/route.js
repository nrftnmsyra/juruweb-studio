import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Per-site tracking config, read by t.js on every page load.
 *
 * This is what lets an admin switch GTM on for a client's site from our
 * dashboard without anyone redeploying that site. Only the two public tag IDs
 * are returned — nothing else about the site leaves here.
 */
export async function GET(request) {
  const website = (new URL(request.url).searchParams.get('website') || '')
    .toLowerCase()
    .replace(/^www\./, '');

  const empty = { gtmId: null, ga4Id: null };
  const respond = (data) =>
    NextResponse.json(data, {
      headers: { ...CORS, 'Cache-Control': 'public, max-age=300' },
    });

  if (!website) return respond(empty);

  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from('monitored_sites')
      .select('gtm_id, ga4_id, tracking_enabled')
      .eq('domain', website)
      .maybeSingle();

    if (!data || data.tracking_enabled === false) return respond(empty);
    return respond({ gtmId: data.gtm_id || null, ga4Id: data.ga4_id || null });
  } catch (err) {
    console.error('[config]', err);
    return respond(empty);
  }
}
