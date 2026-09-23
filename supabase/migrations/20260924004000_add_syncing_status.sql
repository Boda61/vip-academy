-- ====================================================================
-- VIP Academy Registration System - Add 'syncing' to sync_status
-- ====================================================================

-- Safely drop existing check constraint on sync_status
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

-- Add updated check constraint supporting concurrency guard state ('syncing')
ALTER TABLE public.registrations
  ADD CONSTRAINT registrations_sync_status_check
  CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed'));
