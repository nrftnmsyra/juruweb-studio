-- ============================================================================
-- Juruweb Studio — client website monitoring
-- ============================================================================
-- Run in the Supabase SQL editor AFTER supabase_auth_audit.sql.
-- Idempotent: running it twice is safe.
--
-- Tracks SSL and domain expiry plus SEO basics for every live client site,
-- once a day, and keeps the history so monthly reports have something to
-- report on.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The sites we watch
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monitored_sites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    domain      TEXT NOT NULL UNIQUE,     -- bare host, no scheme: 'catrumah.com.my'
    label       TEXT,                     -- what to call it in a report
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by  TEXT
);

COMMENT ON TABLE public.monitored_sites IS
  'Client websites checked daily. customer_id lets a monthly report name the client.';

CREATE INDEX IF NOT EXISTS monitored_sites_customer_idx
    ON public.monitored_sites (customer_id);

-- Store domains bare and lowercased, whatever gets typed in.
CREATE OR REPLACE FUNCTION public.normalise_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.domain := lower(trim(NEW.domain));
    NEW.domain := regexp_replace(NEW.domain, '^https?://', '');
    NEW.domain := regexp_replace(NEW.domain, '^www\.', '');
    NEW.domain := regexp_replace(NEW.domain, '/.*$', '');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS monitored_sites_normalise ON public.monitored_sites;
CREATE TRIGGER monitored_sites_normalise
    BEFORE INSERT OR UPDATE ON public.monitored_sites
    FOR EACH ROW EXECUTE FUNCTION public.normalise_domain();


-- ----------------------------------------------------------------------------
-- 2. One row per site per check
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_checks (
    id          BIGSERIAL PRIMARY KEY,
    site_id     UUID NOT NULL REFERENCES public.monitored_sites(id) ON DELETE CASCADE,
    checked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Reachability. Free by-product: reading the certificate and the HTML
    -- already requires the site to answer, so we may as well record whether
    -- it did.
    ok            BOOLEAN NOT NULL DEFAULT FALSE,
    status_code   INTEGER,
    response_ms   INTEGER,
    error         TEXT,

    -- Certificate and registration
    ssl_expires_at    TIMESTAMPTZ,
    ssl_days_left     INTEGER,
    ssl_issuer        TEXT,
    domain_expires_at TIMESTAMPTZ,
    domain_days_left  INTEGER,

    -- SEO basics, plus a 0-100 score computed from them
    seo        JSONB,
    seo_score  INTEGER
);

COMMENT ON TABLE public.site_checks IS
  'Append-only history, written by the daily cron using the service role key.';

CREATE INDEX IF NOT EXISTS site_checks_site_time_idx
    ON public.site_checks (site_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS site_checks_time_idx
    ON public.site_checks (checked_at DESC);


-- ----------------------------------------------------------------------------
-- 3. Latest state per site, for the dashboard
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.site_status AS
SELECT
    s.id,
    s.customer_id,
    s.domain,
    s.label,
    s.active,
    c.name AS customer_name,
    l.checked_at,
    l.ok,
    l.status_code,
    l.response_ms,
    l.error,
    l.ssl_expires_at,
    l.ssl_days_left,
    l.ssl_issuer,
    l.domain_expires_at,
    l.domain_days_left,
    l.seo,
    l.seo_score
FROM public.monitored_sites s
LEFT JOIN public.customers c ON c.id = s.customer_id
LEFT JOIN LATERAL (
    SELECT * FROM public.site_checks ch
    WHERE ch.site_id = s.id
    ORDER BY ch.checked_at DESC
    LIMIT 1
) l ON TRUE;

COMMENT ON VIEW public.site_status IS
  'Each site with its most recent check. Inherits RLS from the tables beneath.';


-- ----------------------------------------------------------------------------
-- 4. Monthly rollup, for the PDF report
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.monthly_site_report(
    p_site_id UUID,
    p_month   DATE          -- any day inside the month you want
)
RETURNS TABLE (
    checks_run        BIGINT,
    checks_ok         BIGINT,
    uptime_pct        NUMERIC,
    avg_response_ms   NUMERIC,
    worst_response_ms INTEGER,
    avg_seo_score     NUMERIC,
    first_seo_score   INTEGER,
    last_seo_score    INTEGER,
    ssl_days_left     INTEGER,
    domain_days_left  INTEGER
)
LANGUAGE sql
STABLE
AS $$
    WITH window_checks AS (
        SELECT *
        FROM public.site_checks
        WHERE site_id = p_site_id
          AND checked_at >= date_trunc('month', p_month)
          AND checked_at <  date_trunc('month', p_month) + INTERVAL '1 month'
    )
    SELECT
        count(*),
        count(*) FILTER (WHERE ok),
        CASE WHEN count(*) = 0 THEN NULL
             ELSE round(100.0 * count(*) FILTER (WHERE ok) / count(*), 1) END,
        round(avg(response_ms) FILTER (WHERE ok), 0),
        max(response_ms) FILTER (WHERE ok),
        round(avg(seo_score), 0),
        (SELECT seo_score FROM window_checks WHERE seo_score IS NOT NULL
         ORDER BY checked_at ASC LIMIT 1),
        (SELECT seo_score FROM window_checks WHERE seo_score IS NOT NULL
         ORDER BY checked_at DESC LIMIT 1),
        (SELECT ssl_days_left FROM window_checks WHERE ssl_days_left IS NOT NULL
         ORDER BY checked_at DESC LIMIT 1),
        (SELECT domain_days_left FROM window_checks WHERE domain_days_left IS NOT NULL
         ORDER BY checked_at DESC LIMIT 1)
    FROM window_checks;
$$;

GRANT EXECUTE ON FUNCTION public.monthly_site_report(UUID, DATE) TO authenticated;


-- ----------------------------------------------------------------------------
-- 5. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.monitored_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_checks     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage monitored_sites" ON public.monitored_sites;
CREATE POLICY "Admins manage monitored_sites" ON public.monitored_sites
    FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Read-only for admins. The cron writes with the service role key, which
-- bypasses RLS, so no insert policy is needed and history cannot be edited
-- from the dashboard.
DROP POLICY IF EXISTS "Admins read site_checks" ON public.site_checks;
CREATE POLICY "Admins read site_checks" ON public.site_checks
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- Changing which sites we watch is a config change worth recording. The
-- checks themselves are machine-written and far too numerous to audit.
DROP TRIGGER IF EXISTS audit_write ON public.monitored_sites;
CREATE TRIGGER audit_write
    AFTER INSERT OR UPDATE OR DELETE ON public.monitored_sites
    FOR EACH ROW EXECUTE FUNCTION public.log_write();


-- ----------------------------------------------------------------------------
-- 6. Grants
-- ----------------------------------------------------------------------------
REVOKE ALL ON public.monitored_sites, public.site_checks, public.site_status FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitored_sites TO authenticated;
GRANT SELECT ON public.site_checks, public.site_status TO authenticated;


-- ----------------------------------------------------------------------------
-- 7. Seed
-- ----------------------------------------------------------------------------
-- Sites Juruweb built. Several are hosted under the client's own account
-- rather than this Vercel team, which makes no difference here: every check
-- runs from outside over HTTPS, so we need no access to where they are hosted.
INSERT INTO public.monitored_sites (domain, label, created_by) VALUES
    ('teratak-warisan-kampung.vercel.app', 'Teratak Warisan Kampung', 'migration'),
    ('catrumah.com.my',       'Cat Rumah',           'migration'),
    ('wallpanel.my',          'Wall Panel',          'migration'),
    ('cateringservice.my',    'Catering Service',    'migration'),
    ('electrician24hour.my',  'Electrician 24 Hour', 'migration'),
    ('sleeptest.my',          'Sleep Test',          'migration'),
    ('kerusimeja.my',         'Kerusi Meja',         'migration'),
    ('catboarding.my',        'Cat Boarding',        'migration'),
    ('plumbingservices.my',   'Plumbing Services',   'migration'),
    ('lorikren.com.my',       'Lori Kren',           'migration'),
    ('concretemixer.my',      'Concrete Mixer',      'migration'),
    ('ibnusinacare.com.my',   'Ibnu Sina Care',      'migration'),
    ('sewavanjohor.my',       'Sewa Van Johor',      'migration'),
    ('oxygentank.my',         'Oxygen Tank',         'migration'),
    ('air-compressor.my',     'Air Compressor',      'migration'),
    ('coldroomrental.my',     'Cold Room Rental',    'migration'),
    ('motorsewa.com.my',      'Motor Sewa',          'migration')
ON CONFLICT (domain) DO NOTHING;
