-- ====================================================================
-- MIGRATION: Add Reverse Sync Support (Google Sheets → Supabase) [REVISED]
-- ====================================================================
-- PURPOSE: Enable safe two-way synchronization between Google Sheets
--          and Supabase without modifying or deleting any existing data.
--
-- THIS MIGRATION IS 100% NON-DESTRUCTIVE:
--   ✅ Adds updated_at column (with DEFAULT now() and backfilled to created_at)
--   ✅ Adds sheet_updated_at column (nullable)
--   ✅ Creates BEFORE UPDATE trigger tr_registrations_updated_at using existing handle_updated_at()
--   ✅ Safely updates ONLY the sync_status check constraint to add ('sheet_modified', 'sheet_deleted')
--   ✅ Preserves ALL existing check constraints (status, full_name, total_amount)
--   ✅ Preserves ALL existing foreign keys and unique indexes
--   ❌ NO DELETE, NO TRUNCATE, NO DROP TABLE, NO DATA LOSS
-- ====================================================================

-- 1. Add updated_at column to public.registrations
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

        -- Initialize updated_at with the registration creation time
        UPDATE public.registrations
            SET updated_at = created_at
            WHERE created_at IS NOT NULL;
    END IF;
END $$;

-- 2. Add sheet_updated_at column to public.registrations
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
--    handle_updated_at() is an existing BEFORE UPDATE trigger function that sets NEW.updated_at = now()
DROP TRIGGER IF EXISTS tr_registrations_updated_at ON public.registrations;
CREATE TRIGGER tr_registrations_updated_at
    BEFORE UPDATE ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Update sync_status CHECK constraint
--    Existing allowed values: 'pending', 'syncing', 'synced', 'failed'
--    New allowed values added: 'sheet_modified', 'sheet_deleted'
--    Target ONLY the registrations_sync_status_check constraint explicitly
DO $$
BEGIN
    -- Drop only the specific named constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.registrations'::regclass
          AND conname = 'registrations_sync_status_check'
    ) THEN
        ALTER TABLE public.registrations
            DROP CONSTRAINT registrations_sync_status_check;
    END IF;
END $$;

ALTER TABLE public.registrations
    ADD CONSTRAINT registrations_sync_status_check
    CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed', 'sheet_modified', 'sheet_deleted'));

-- 5. Index for reverse sync query performance
CREATE INDEX IF NOT EXISTS idx_registrations_updated_at
    ON public.registrations(updated_at DESC);
