-- Supabase Security Advisor: enable RLS on public Prisma tables and revoke Data API roles.
--
-- Data access in this app is via Prisma (database pooler / postgres role), which bypasses RLS.
-- Supabase PostgREST uses JWT roles `anon` and `authenticated`; with RLS enabled and no policies,
-- they cannot read or write these tables (default deny).
--
-- If `anon` / `authenticated` do not exist (plain Postgres), only ALTER TABLE runs; REVOKE is skipped.

DO $$
DECLARE
  r RECORD;
  has_anon boolean;
  has_auth boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') INTO has_anon;
  SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') INTO has_auth;

  FOR r IN
    SELECT format('%I.%I', table_schema, table_name) AS fq
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('_prisma_migrations')
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', r.fq);
    IF has_anon THEN
      EXECUTE format('REVOKE ALL ON TABLE %s FROM anon;', r.fq);
    END IF;
    IF has_auth THEN
      EXECUTE format('REVOKE ALL ON TABLE %s FROM authenticated;', r.fq);
    END IF;
  END LOOP;
END $$;
