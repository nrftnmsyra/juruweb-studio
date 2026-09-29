-- ============================================================================
-- Juruweb Studio — link a monitored website to its order
-- ============================================================================
-- Run in the Supabase SQL editor AFTER supabase_tracking.sql.
-- Idempotent: running it twice is safe.
--
-- A website belongs to one primary order, so the analytics list can show
-- JW-0001 beside each domain. A client who later places a second order still
-- reaches it through customer_id; this column names the build that produced
-- the site.
-- ============================================================================

ALTER TABLE public.monitored_sites
    ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS monitored_sites_order_idx ON public.monitored_sites (order_id);

COMMENT ON COLUMN public.monitored_sites.order_id IS
  'The order this site was built under. Shown as its project ref (JW-0001).';

-- Rebuilt so the dashboard gets the project ref and the client name in one
-- read. CREATE OR REPLACE cannot drop or reorder existing columns, so the view
-- is dropped first.
DROP VIEW IF EXISTS public.site_status;

CREATE VIEW public.site_status AS
SELECT
    s.id,
    s.customer_id,
    s.order_id,
    s.domain,
    s.label,
    s.active,
    s.gtm_id,
    s.ga4_id,
    s.tracking_enabled,
    c.name        AS customer_name,
    o.project_ref AS project_ref,
    o.status      AS order_status,
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
LEFT JOIN public.orders    o ON o.id = s.order_id
LEFT JOIN LATERAL (
    SELECT * FROM public.site_checks ch
    WHERE ch.site_id = s.id
    ORDER BY ch.checked_at DESC
    LIMIT 1
) l ON TRUE;

COMMENT ON VIEW public.site_status IS
  'Each site with its client, its order ref, and its most recent check.';

REVOKE ALL ON public.site_status FROM anon;
GRANT SELECT ON public.site_status TO authenticated;


-- ----------------------------------------------------------------------------
-- Pageview totals per site for a period, so the list page needs one query
-- rather than one per row.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.site_view_totals(
    p_from TIMESTAMPTZ,
    p_to   TIMESTAMPTZ
)
RETURNS TABLE (website TEXT, views BIGINT, sessions BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT website,
           count(*) FILTER (WHERE event_type = 'pageview'),
           count(DISTINCT session_id)
    FROM public.page_events
    WHERE created_at >= p_from AND created_at < p_to
    GROUP BY website;
$$;

GRANT EXECUTE ON FUNCTION public.site_view_totals(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
