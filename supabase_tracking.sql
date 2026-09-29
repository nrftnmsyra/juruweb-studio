-- ============================================================================
-- Juruweb Studio — first-party website tracking
-- ============================================================================
-- Run in the Supabase SQL editor AFTER supabase_monitoring.sql.
-- Idempotent: running it twice is safe.
--
-- Our own analytics: a script on the client's site posts events here, and the
-- admin dashboard reads them. No Google account involved.
--
-- The Webcore spec lists five known quirks to decide on in a clone (§1.8).
-- All five are addressed here rather than inherited:
--   1. custom event names were dropped   -> whitelist is wider, see the check
--   2. totals read 10k raw rows in JS    -> aggregated in SQL, see §3
--   3. country column never populated    -> filled from x-vercel-ip-country
--   4. day buckets were UTC              -> bucketed in Asia/Kuala_Lumpur
--   5. no retention policy               -> purge_old_page_events(), §4
-- Bot filtering happens at ingest, in the route.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Events
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.page_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website    TEXT NOT NULL,           -- bare domain, matches monitored_sites.domain
    event_type TEXT NOT NULL DEFAULT 'pageview',
    path       TEXT NOT NULL DEFAULT '/',
    referrer   TEXT,
    label      TEXT,                    -- 'whatsapp-60123456789', 'product-<slug>'
    device     TEXT,                    -- mobile | tablet | desktop
    browser    TEXT,
    country    TEXT,                    -- from x-vercel-ip-country
    ip_hash    TEXT,                    -- sha256(ip + website), first 16 hex chars
    session_id TEXT,                    -- sessionStorage, per tab
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wider than Webcore's three types, so uwc()-style custom events are stored
-- rather than silently 400'd. Extend this list as new events are needed.
ALTER TABLE public.page_events DROP CONSTRAINT IF EXISTS page_events_event_type_check;
ALTER TABLE public.page_events ADD CONSTRAINT page_events_event_type_check
    CHECK (event_type IN (
        'pageview', 'click', 'impression',
        'whatsapp_click', 'form_submit', 'phone_click', 'outbound_click'
    ));

COMMENT ON TABLE public.page_events IS
  'First-party analytics. Written by /api/public/track with the service role; the raw IP is never stored.';

CREATE INDEX IF NOT EXISTS page_events_site_time_idx ON public.page_events (website, created_at DESC);
CREATE INDEX IF NOT EXISTS page_events_type_time_idx ON public.page_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS page_events_time_idx      ON public.page_events (created_at DESC);


-- ----------------------------------------------------------------------------
-- 2. Day buckets in Malaysian time
-- ----------------------------------------------------------------------------
-- Webcore bucketed by UTC day, so a visit at 1am Malaysia time landed on the
-- previous day in the chart. Everything below buckets in Asia/Kuala_Lumpur.
CREATE OR REPLACE FUNCTION public.my_day(ts TIMESTAMPTZ)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT (ts AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE;
$$;


-- ----------------------------------------------------------------------------
-- 3. One aggregated read
-- ----------------------------------------------------------------------------
-- Webcore pulled up to 10,000 raw rows and aggregated in JavaScript, which
-- under-counts on a busy site or a long period. This does the whole thing in
-- SQL and returns one JSON object.
CREATE OR REPLACE FUNCTION public.analytics_summary(
    p_from    TIMESTAMPTZ,
    p_to      TIMESTAMPTZ,
    p_website TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH scoped AS (
        SELECT *
        FROM public.page_events
        WHERE created_at >= p_from
          AND created_at <  p_to
          AND (p_website IS NULL OR website = p_website)
    ),
    views AS (SELECT * FROM scoped WHERE event_type = 'pageview')
    SELECT jsonb_build_object(
        'totals', jsonb_build_object(
            'events',   (SELECT count(*) FROM scoped),
            'views',    (SELECT count(*) FROM views),
            'sessions', (SELECT count(DISTINCT session_id) FROM scoped WHERE session_id IS NOT NULL),
            'visitors', (SELECT count(DISTINCT ip_hash)    FROM scoped WHERE ip_hash IS NOT NULL),
            'clicks',   (SELECT count(*) FROM scoped WHERE event_type <> 'pageview')
        ),
        'firstEventAt', (SELECT min(created_at) FROM public.page_events
                         WHERE (p_website IS NULL OR website = p_website)),
        'daily', COALESCE((
            SELECT jsonb_agg(d ORDER BY d->>'day')
            FROM (
                SELECT jsonb_build_object(
                    'day',      public.my_day(created_at),
                    'views',    count(*) FILTER (WHERE event_type = 'pageview'),
                    'sessions', count(DISTINCT session_id)
                ) AS d
                FROM scoped GROUP BY public.my_day(created_at)
            ) x
        ), '[]'::jsonb),
        'sites', COALESCE((
            SELECT jsonb_agg(s ORDER BY (s->>'views')::BIGINT DESC)
            FROM (
                SELECT jsonb_build_object(
                    'website',  website,
                    'views',    count(*) FILTER (WHERE event_type = 'pageview'),
                    'sessions', count(DISTINCT session_id)
                ) AS s
                FROM scoped GROUP BY website
            ) x
        ), '[]'::jsonb),
        'pages', COALESCE((
            SELECT jsonb_agg(p ORDER BY (p->>'views')::BIGINT DESC)
            FROM (
                SELECT jsonb_build_object('path', path, 'views', count(*)) AS p
                FROM views GROUP BY path ORDER BY count(*) DESC LIMIT 10
            ) x
        ), '[]'::jsonb),
        'referrers', COALESCE((
            SELECT jsonb_agg(r ORDER BY (r->>'views')::BIGINT DESC)
            FROM (
                SELECT jsonb_build_object(
                    'source', COALESCE(NULLIF(regexp_replace(referrer, '^https?://(www\.)?([^/]+).*$', '\2'), ''), 'Direct'),
                    'views',  count(*)
                ) AS r
                FROM views GROUP BY 1 ORDER BY count(*) DESC LIMIT 10
            ) x
        ), '[]'::jsonb),
        'devices', COALESCE((
            SELECT jsonb_object_agg(COALESCE(device, 'unknown'), n)
            FROM (SELECT device, count(*) n FROM views GROUP BY device) x
        ), '{}'::jsonb),
        'browsers', COALESCE((
            SELECT jsonb_object_agg(COALESCE(browser, 'Other'), n)
            FROM (SELECT browser, count(*) n FROM views GROUP BY browser) x
        ), '{}'::jsonb),
        'countries', COALESCE((
            SELECT jsonb_object_agg(COALESCE(country, 'Unknown'), n)
            FROM (SELECT country, count(*) n FROM views GROUP BY country ORDER BY count(*) DESC LIMIT 10) x
        ), '{}'::jsonb),
        'labels', COALESCE((
            SELECT jsonb_agg(l ORDER BY (l->>'count')::BIGINT DESC)
            FROM (
                SELECT jsonb_build_object('label', label, 'type', event_type, 'count', count(*)) AS l
                FROM scoped WHERE event_type <> 'pageview' AND label IS NOT NULL
                GROUP BY label, event_type ORDER BY count(*) DESC LIMIT 10
            ) x
        ), '[]'::jsonb)
    );
$$;

GRANT EXECUTE ON FUNCTION public.analytics_summary(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;


-- ----------------------------------------------------------------------------
-- 4. Retention
-- ----------------------------------------------------------------------------
-- Webcore keeps page_events forever. Thirteen months covers a year-on-year
-- comparison and stops the table growing without limit. Called by the daily cron.
CREATE OR REPLACE FUNCTION public.purge_old_page_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    removed INTEGER;
BEGIN
    DELETE FROM public.page_events WHERE created_at < now() - INTERVAL '13 months';
    GET DIAGNOSTICS removed = ROW_COUNT;
    RETURN removed;
END;
$$;


-- ----------------------------------------------------------------------------
-- 5. Per-site tracking settings
-- ----------------------------------------------------------------------------
-- Lets an admin switch GTM on for a site without redeploying the client's site:
-- t.js reads this through /api/public/config.
ALTER TABLE public.monitored_sites ADD COLUMN IF NOT EXISTS gtm_id TEXT;
ALTER TABLE public.monitored_sites ADD COLUMN IF NOT EXISTS ga4_id TEXT;
ALTER TABLE public.monitored_sites ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE;


-- ----------------------------------------------------------------------------
-- 6. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;

-- Read-only for admins. Writes come from /api/public/track with the service
-- role, which bypasses RLS, so no insert policy exists and history cannot be
-- edited from the dashboard.
DROP POLICY IF EXISTS "Admins read page_events" ON public.page_events;
CREATE POLICY "Admins read page_events" ON public.page_events
    FOR SELECT TO authenticated
    USING (public.is_admin());

REVOKE ALL ON public.page_events FROM anon;
GRANT SELECT ON public.page_events TO authenticated;
