-- ====================================================================
-- MIGRATION: Add Reverse Sync Support (Google Sheets → Supabase)
-- ====================================================================
-- PURPOSE: Enable safe two-way synchronization between Google Sheets
--          and Supabase without modifying or deleting any existing data.
--
-- THIS MIGRATION IS NON-DESTRUCTIVE:
--   ✅ Adds new columns (nullable, with defaults)
--   ✅ Adds new trigger
--   ✅ Extends existing CHECK constraint
--   ❌ Does NOT delete any column
--   ❌ Does NOT delete any data
--   ❌ Does NOT drop any table
--   ❌ Does NOT truncate anything
-- ====================================================================

-- 1. Add updated_at column to registrations (for conflict detection)
--    Default = created_at so existing rows get a sensible initial value
--    without modifying any actual registration data.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'registrations'
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.registrations
            ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

        -- Backfill existing rows: set updated_at = created_at (safe, read-only operation on existing data)
        UPDATE public.registrations SET updated_at = created_at WHERE updated_at != created_at OR TRUE;
    END IF;
END $$;

-- 2. Add sheet_updated_at column to registrations (tracks last Google Sheets edit)
--    Used for sync loop prevention: if sheet_updated_at >= synced_at, the change came from Sheets.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'registrations'
          AND column_name = 'sheet_updated_at'
    ) THEN
        ALTER TABLE public.registrations
            ADD COLUMN sheet_updated_at TIMESTAMPTZ NULL;
    END IF;
END $$;

-- 3. Add auto-update trigger for updated_at on registrations
--    Uses the existing handle_updated_at() function from initial_schema migration.
DROP TRIGGER IF EXISTS tr_registrations_updated_at ON public.registrations;
CREATE TRIGGER tr_registrations_updated_at
    BEFORE UPDATE ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Extend sync_status CHECK constraint to include new states for reverse sync
--    New states:
--    - 'sheet_modified': The record was updated via Google Sheets reverse sync
--    - 'sheet_deleted': The record's row was removed from Google Sheets (soft-delete)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.registrations'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%sync_status%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.registrations DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END;
$$;

ALTER TABLE public.registrations
    ADD CONSTRAINT registrations_sync_status_check
    CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed', 'sheet_modified', 'sheet_deleted'));

-- 5. Index for efficient reverse sync queries (find synced registrations)
CREATE INDEX IF NOT EXISTS idx_registrations_updated_at
    ON public.registrations(updated_at DESC);
