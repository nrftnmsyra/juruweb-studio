-- ============================================================================
-- Juruweb Studio — Google sign-in, admin roles, locked-down RLS, audit trail
-- ============================================================================
-- Run this in the Supabase SQL editor AFTER supabase_schema.sql.
-- It is idempotent: running it twice is safe.
--
-- What it replaces: every table previously had `USING (true)` policies for all
-- operations while the anon key ships to the browser, so anyone could read,
-- change or delete all business data straight through the REST API without
-- ever touching the login screen. After this, only a signed-in Google account
-- listed in public.admins can reach that data.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Who is allowed in
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT NOT NULL UNIQUE,
    role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
    full_name  TEXT,
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT,
    last_seen  TIMESTAMPTZ
);

COMMENT ON TABLE public.admins IS
  'Allowlist for the admin dashboard. Matched on the email in the Google JWT.';
COMMENT ON COLUMN public.admins.role IS
  'owner = may manage admins and read the audit log. admin = business data only.';

-- Emails are compared lowercased everywhere; keep the stored value consistent.
CREATE OR REPLACE FUNCTION public.admins_normalise_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.email := lower(trim(NEW.email));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admins_normalise_email ON public.admins;
CREATE TRIGGER admins_normalise_email
    BEFORE INSERT OR UPDATE ON public.admins
    FOR EACH ROW EXECUTE FUNCTION public.admins_normalise_email();

-- Seed the owner. Without this nobody can get in after RLS is tightened.
INSERT INTO public.admins (email, role, full_name, created_by)
VALUES ('juruweb.info@gmail.com', 'owner', 'Juruweb Studio', 'migration')
ON CONFLICT (email) DO UPDATE SET role = 'owner', active = TRUE;


-- ----------------------------------------------------------------------------
-- 2. Identity helpers
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER so they can read public.admins without tripping that table's
-- own RLS policies, which would otherwise recurse infinitely.

CREATE OR REPLACE FUNCTION public.admin_email()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins a
        WHERE a.email = public.admin_email() AND a.active
    );
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins a
        WHERE a.email = public.admin_email() AND a.active AND a.role = 'owner'
    );
$$;


-- ----------------------------------------------------------------------------
-- 3. Audit trail
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
    id          BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_email TEXT,
    actor_id    UUID,
    action      TEXT NOT NULL,   -- INSERT | UPDATE | DELETE | LOGIN | LOGOUT | DENIED
    table_name  TEXT,
    row_id      UUID,
    old_data    JSONB,
    new_data    JSONB,
    detail      TEXT
);

COMMENT ON TABLE public.audit_log IS
  'Append-only. Written by SECURITY DEFINER triggers, readable only by owners.';

CREATE INDEX IF NOT EXISTS audit_log_occurred_at_idx ON public.audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx       ON public.audit_log (actor_email);
CREATE INDEX IF NOT EXISTS audit_log_row_idx         ON public.audit_log (table_name, row_id);

-- Records every write on the business tables. Being a trigger rather than
-- application code means it also catches writes made straight to the REST API.
CREATE OR REPLACE FUNCTION public.log_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_row_id := OLD.id;
    ELSE
        v_row_id := NEW.id;
    END IF;

    INSERT INTO public.audit_log (
        actor_email, actor_id, action, table_name, row_id, old_data, new_data
    )
    VALUES (
        nullif(public.admin_email(), ''),
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        v_row_id,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- Attach to every business table.
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['customers', 'orders', 'quotations', 'invoices', 'ledger']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS audit_write ON public.%I', t);
        EXECUTE format(
            'CREATE TRIGGER audit_write AFTER INSERT OR UPDATE OR DELETE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.log_write()', t
        );
    END LOOP;
END;
$$;

-- Sign-in and sign-out are not table writes, so the app records them through
-- this. SECURITY DEFINER keeps audit_log itself closed to direct inserts.
CREATE OR REPLACE FUNCTION public.log_auth_event(p_action TEXT, p_detail TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_action NOT IN ('LOGIN', 'LOGOUT', 'DENIED') THEN
        RAISE EXCEPTION 'log_auth_event: unsupported action %', p_action;
    END IF;

    INSERT INTO public.audit_log (actor_email, actor_id, action, detail)
    VALUES (nullif(public.admin_email(), ''), auth.uid(), p_action, p_detail);

    IF p_action = 'LOGIN' THEN
        UPDATE public.admins SET last_seen = now() WHERE email = public.admin_email();
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_auth_event(TEXT, TEXT) TO authenticated;


-- ----------------------------------------------------------------------------
-- 4. Lock down the business tables
-- ----------------------------------------------------------------------------
-- Drops the old `USING (true)` policies and replaces them with one policy per
-- table that requires a signed-in admin.

DO $$
DECLARE
    t   TEXT;
    pol RECORD;
BEGIN
    FOREACH t IN ARRAY ARRAY['customers', 'orders', 'quotations', 'invoices', 'ledger']
    LOOP
        FOR pol IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
        END LOOP;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format(
            'CREATE POLICY "Admins manage %1$s" ON public.%1$I
             FOR ALL TO authenticated
             USING (public.is_admin()) WITH CHECK (public.is_admin())', t
        );
    END LOOP;
END;
$$;


-- ----------------------------------------------------------------------------
-- 5. RLS for the new tables
-- ----------------------------------------------------------------------------
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read own row" ON public.admins;
CREATE POLICY "Admins read own row" ON public.admins
    FOR SELECT TO authenticated
    USING (public.is_owner() OR email = public.admin_email());

DROP POLICY IF EXISTS "Owners manage admins" ON public.admins;
CREATE POLICY "Owners manage admins" ON public.admins
    FOR ALL TO authenticated
    USING (public.is_owner()) WITH CHECK (public.is_owner());

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Read-only, owners only. No INSERT/UPDATE/DELETE policy exists on purpose:
-- the trigger writes as the function owner, and nothing can edit history.
DROP POLICY IF EXISTS "Owners read audit log" ON public.audit_log;
CREATE POLICY "Owners read audit log" ON public.audit_log
    FOR SELECT TO authenticated
    USING (public.is_owner());


-- ----------------------------------------------------------------------------
-- 6. Take the keys off anon
-- ----------------------------------------------------------------------------
-- The public /track page now goes through a server route using the service
-- role key, so the browser's anon key needs no table access at all.
REVOKE ALL ON public.customers, public.orders, public.quotations,
              public.invoices, public.ledger, public.admins, public.audit_log
    FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.customers, public.orders, public.quotations,
       public.invoices, public.ledger
    TO authenticated;

GRANT SELECT ON public.admins, public.audit_log TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.admins TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq TO authenticated;
