-- ============================================================================
-- Lock down the jw0001 client schema (Teratak Warisan Kampung)
-- ============================================================================
-- Run in the Supabase SQL editor. Idempotent: running it twice is safe.
--
-- Found open: the anon key, which ships inside the browser bundle of the
-- client's own website, could read AND delete every row in this schema. A
-- single HTTP request could have wiped their bookings and their whole menu.
--
-- Shape below:
--   public website content  -> anyone may READ, nobody anonymous may write
--   bookings                -> anyone may CREATE one, nobody anonymous may read
--   everything else         -> Juruweb admins only
--
-- Writes are gated on public.is_admin() rather than plain `authenticated`,
-- because this project has ONE shared auth.users. Any signed-in user of any
-- future client dashboard would otherwise pass an `authenticated` check and
-- reach this client's data. When this schema gets its own members table,
-- change these policies to check that instead.
-- ============================================================================

DO $$
DECLARE
    -- Content the client's public website is meant to show to visitors.
    public_tables TEXT[] := ARRAY[
        'announcements', 'gallery_photos', 'instagram_posts', 'job_listings',
        'menu_items', 'menu_sections', 'opening_hours', 'phone_numbers'
    ];
    t   TEXT;
    pol RECORD;
BEGIN
    -- 1. Clear whatever is there now, so the result does not depend on what
    --    was configured before.
    FOR pol IN
        SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'jw0001'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON jw0001.%I', pol.policyname, pol.tablename);
    END LOOP;

    FOR t IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'jw0001'
    LOOP
        EXECUTE format('ALTER TABLE jw0001.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON jw0001.%I FROM anon', t);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON jw0001.%I TO authenticated', t);

        -- Juruweb admins keep full access to everything.
        EXECUTE format($f$
            CREATE POLICY "Juruweb admins manage %1$s" ON jw0001.%1$I
            FOR ALL TO authenticated
            USING (public.is_admin()) WITH CHECK (public.is_admin())$f$, t);
    END LOOP;

    -- 2. Public website content: readable by anyone, writable by nobody
    --    anonymous.
    FOREACH t IN ARRAY public_tables
    LOOP
        IF to_regclass(format('jw0001.%I', t)) IS NOT NULL THEN
            EXECUTE format('GRANT SELECT ON jw0001.%I TO anon', t);
            EXECUTE format($f$
                CREATE POLICY "Public may read %1$s" ON jw0001.%1$I
                FOR SELECT TO anon USING (true)$f$, t);
        END IF;
    END LOOP;

    -- 3. Bookings: a visitor may create one, and that is all. They cannot
    --    read, change or delete any booking, including their own, because
    --    there is no signed-in identity to match one against.
    --
    --    If the client's website does NOT take bookings through Supabase,
    --    delete this block: it is the one route by which a stranger can still
    --    write to this schema, and without a form there is nothing to break.
    IF to_regclass('jw0001.bookings') IS NOT NULL THEN
        EXECUTE 'GRANT INSERT ON jw0001.bookings TO anon';
        EXECUTE $f$
            CREATE POLICY "Public may create a booking" ON jw0001.bookings
            FOR INSERT TO anon WITH CHECK (true)$f$;
    END IF;
END;
$$;

-- Sequences behind any anon insert still need to be reachable.
DO $$
DECLARE
    s TEXT;
BEGIN
    FOR s IN
        SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'jw0001'
    LOOP
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE jw0001.%I TO anon, authenticated', s);
    END LOOP;
END;
$$;


-- ----------------------------------------------------------------------------
-- Check it worked
-- ----------------------------------------------------------------------------
-- Expect: every table RLS enabled, anon holding SELECT only on content tables
-- and INSERT only on bookings.
--
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'jw0001';
--
--   SELECT table_name, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE table_schema = 'jw0001' AND grantee = 'anon'
--   ORDER BY table_name, privilege_type;
