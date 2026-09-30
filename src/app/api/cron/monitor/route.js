import { NextResponse } from 'next/server';
import { runSiteChecks } from '@/lib/runSiteChecks';

// node:tls needs the Node runtime, and a page of sites takes longer than the
// default ten seconds.
export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Daily site check, triggered by Vercel Cron (see vercel.json).
 *
 * Machine callers only. The "Check now" button used to POST here, which never
 * worked: this path is outside the proxy matcher, so it is the one place in the
 * app where the session is not refreshed on the way in, and the request arrived
 * with nothing the route could verify. That button is a Server Action now, and
 * the only key that opens this door is CRON_SECRET.
 */
function authorised(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

async function handle(request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await runSiteChecks()) });
  } catch (err) {
    console.error('[cron/monitor]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
