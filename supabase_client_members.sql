-- ============================================================================
-- Juruweb Studio - who may use a client's own admin dashboard
-- ============================================================================
-- Run in the Supabase SQL editor AFTER supabase_lock_jw0001.sql.
-- Idempotent: running it twice is safe, and safe on a schema that already
-- holds application tables. Nothing existing is dropped or altered.
--
-- One Supabase project means ONE shared auth.users, so a client dashboard user
-- holds a valid JWT for this whole project. Membership of one schema must
-- therefore grant nothing anywhere else. Each schema gets its own members
-- table and its own is_member(), and every policy checks that schema's table
-- rather than a plain `authenticated` role, which every client would pass.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Order ref to schema name
-- ----------------------------------------------------------------------------
-- JW-0001 becomes jw0001: lowercased, non-alphanumerics dropped. This matches
-- the schema that already exists, so provisioning finds it rather than making
-- a second one beside it.
CREATE OR REPLACE FUNCTION public.client_schema_name(p_project_ref TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT lower(regexp_replace(coalesce(p_project_ref, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;


-- ----------------------------------------------------------------------------
-- 2. Provision membership for a client schema
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_client_members(p_project_ref TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $prov$
DECLARE
    s TEXT := public.client_schema_name(p_project_ref);
    t TEXT;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only a Juruweb admin may provision client members.';
    END IF;
    IF s IS NULL OR s = '' THEN
        RAISE EXCEPTION 'That order has no project ref to name a schema after.';
    END IF;

    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', s);

    EXECUTE format($f$
        CREATE TABLE IF NOT EXISTS %I.members (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email      TEXT NOT NULL UNIQUE,
            role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
            full_name  TEXT,
            active     BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_by TEXT
        )$f$, s);

    -- Emails are matched against the JWT, so store them lowercased.
    EXECUTE format($f$
        CREATE OR REPLACE FUNCTION %I.normalise_member_email()
        RETURNS TRIGGER LANGUAGE plpgsql AS $t$
        BEGIN
            NEW.email := lower(trim(NEW.email));
            RETURN NEW;
        END;
        $t$
$f$, s);

    EXECUTE format('DROP TRIGGER IF EXISTS normalise_email ON %I.members', s);
    EXECUTE format($f$
        CREATE TRIGGER normalise_email BEFORE INSERT OR UPDATE ON %I.members
        FOR EACH ROW EXECUTE FUNCTION %I.normalise_member_email()$f$, s, s);

    -- Membership of THIS schema only. SECURITY DEFINER so it can read members
    -- without tripping that table's own policy and recursing forever.
    EXECUTE format($f$
        CREATE OR REPLACE FUNCTION %I.is_member()
        RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
        SET search_path = %I, public AS $t$
            SELECT EXISTS (
                SELECT 1 FROM %I.members m
                WHERE m.email = lower(coalesce(auth.jwt() ->> 'email', '')) AND m.active
            );
        $t$
$f$, s, s, s);

    EXECUTE format('ALTER TABLE %I.members ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('REVOKE ALL ON %I.members FROM anon', s);
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', s);
    EXECUTE format('GRANT SELECT ON %I.members TO authenticated', s);

    -- A member sees only their own row, so one client's staff list is never
    -- readable by another's. Juruweb manages the list through the RPCs below.
    EXECUTE format('DROP POLICY IF EXISTS "Members read own row" ON %I.members', s);
    EXECUTE format($f$
        CREATE POLICY "Members read own row" ON %I.members
        FOR SELECT TO authenticated
        USING (email = lower(coalesce(auth.jwt() ->> 'email', '')))$f$, s);

    -- 3. Let members work on the client's own application tables. Juruweb's
    --    own policies from the lockdown migration stay in place alongside
    --    these: a row is visible if EITHER policy permits it.
    FOR t IN
        SELECT tablename FROM pg_tables WHERE schemaname = s AND tablename <> 'members'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', s, t);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I.%I TO authenticated', s, t);
        EXECUTE format('DROP POLICY IF EXISTS "Members manage %2$s" ON %1$I.%2$I', s, t);
        EXECUTE format($f$
            CREATE POLICY "Members manage %2$s" ON %1$I.%2$I
            FOR ALL TO authenticated
            USING (%1$I.is_member()) WITH CHECK (%1$I.is_member())$f$, s, t);
    END LOOP;

    RETURN s;
END;
$prov$;

GRANT EXECUTE ON FUNCTION public.provision_client_members(TEXT) TO authenticated;


-- ----------------------------------------------------------------------------
-- 4. Manage members from Juruweb
-- ----------------------------------------------------------------------------
-- Definer functions gated on public.is_admin(), so Juruweb reaches any client
-- schema without that schema needing to be exposed to PostgREST for our sake.
-- Only the client dashboard itself needs it exposed, for its own queries.

CREATE OR REPLACE FUNCTION public.client_members(p_project_ref TEXT)
RETURNS TABLE (email TEXT, role TEXT, full_name TEXT, active BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    s TEXT := public.client_schema_name(p_project_ref);
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only a Juruweb admin may read client members.';
    END IF;
    IF to_regclass(format('%I.members', s)) IS NULL THEN
        RETURN;  -- not provisioned yet: an empty list, not an error
    END IF;

    RETURN QUERY EXECUTE format(
        'SELECT email, role, full_name, active, created_at FROM %I.members ORDER BY email', s
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.client_member_add(
    p_project_ref TEXT,
    p_email       TEXT,
    p_role        TEXT DEFAULT 'member',
    p_full_name   TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    s TEXT := public.client_schema_name(p_project_ref);
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only a Juruweb admin may add client members.';
    END IF;
    IF to_regclass(format('%I.members', s)) IS NULL THEN
        RAISE EXCEPTION 'Schema % has no members table yet. Provision it first.', s;
    END IF;
    IF p_role NOT IN ('owner', 'member') THEN
        RAISE EXCEPTION 'Unknown role %.', p_role;
    END IF;

    EXECUTE format(
        'INSERT INTO %I.members (email, role, full_name, created_by) VALUES ($1,$2,$3,$4)
         ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, active = TRUE', s
    ) USING lower(trim(p_email)), p_role, nullif(trim(coalesce(p_full_name, '')), ''),
            public.admin_email();
END;
$$;

CREATE OR REPLACE FUNCTION public.client_member_remove(p_project_ref TEXT, p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    s TEXT := public.client_schema_name(p_project_ref);
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only a Juruweb admin may remove client members.';
    END IF;
    IF to_regclass(format('%I.members', s)) IS NULL THEN
        RETURN;
    END IF;

    EXECUTE format('DELETE FROM %I.members WHERE email = $1', s) USING lower(trim(p_email));
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_members(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_member_add(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_member_remove(TEXT, TEXT) TO authenticated;


-- ----------------------------------------------------------------------------
-- After running this
-- ----------------------------------------------------------------------------
-- Provision from the Juruweb dashboard, or by hand:
--     SELECT public.provision_client_members('JW-0001');
--
-- Removing someone from members revokes their access to that dashboard but
-- leaves their auth.users account, since the same person may belong to another
-- client. Juruweb deletes the account only when it belongs to no schema.
