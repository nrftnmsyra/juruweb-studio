-- ============================================================================
-- Juruweb Studio — API keys so a client's own dashboard can read its data
-- ============================================================================
-- Run in the Supabase SQL editor AFTER supabase_site_order.sql.
-- Idempotent: running it twice is safe.
--
-- Each key is bound to exactly one website. A leaked key exposes that client's
-- traffic and nothing else — never another client's, and never anything
-- commercial like orders, invoices or the ledger.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.client_api_keys (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website      TEXT NOT NULL REFERENCES public.monitored_sites(domain) ON DELETE CASCADE,
    key_hash     TEXT NOT NULL UNIQUE,   -- sha256 of the key; the key itself is never stored
    key_hint     TEXT NOT NULL,          -- last 4 chars, so a key can be recognised in a list
    label        TEXT,
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by   TEXT,
    last_used_at TIMESTAMPTZ
);

COMMENT ON TABLE public.client_api_keys IS
  'One key per client dashboard, scoped to a single website. Only the hash is stored.';

CREATE INDEX IF NOT EXISTS client_api_keys_website_idx ON public.client_api_keys (website);

-- Resolves a key to its website and stamps last_used_at. SECURITY DEFINER so
-- the public route can call it without any table grants of its own.
CREATE OR REPLACE FUNCTION public.resolve_client_key(p_hash TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_website TEXT;
BEGIN
    SELECT website INTO v_website
    FROM public.client_api_keys
    WHERE key_hash = p_hash AND active;

    IF v_website IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE public.client_api_keys SET last_used_at = now() WHERE key_hash = p_hash;
    RETURN v_website;
END;
$$;

ALTER TABLE public.client_api_keys ENABLE ROW LEVEL SECURITY;

-- Admins manage keys from the dashboard. The public route uses the service
-- role, which bypasses RLS, so no policy is needed for it.
DROP POLICY IF EXISTS "Admins manage client_api_keys" ON public.client_api_keys;
CREATE POLICY "Admins manage client_api_keys" ON public.client_api_keys
    FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Issuing or revoking a client's access is worth recording.
DROP TRIGGER IF EXISTS audit_write ON public.client_api_keys;
CREATE TRIGGER audit_write
    AFTER INSERT OR UPDATE OR DELETE ON public.client_api_keys
    FOR EACH ROW EXECUTE FUNCTION public.log_write();

REVOKE ALL ON public.client_api_keys FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_api_keys TO authenticated;
