-- ============================================================
-- Migration: 20260927190000_fix_qr_grace_period.sql
-- Purpose:   Implement real Grace Period for QR tokens using a
--            dedicated 'grace' status, so students can claim a
--            scanned token even after the display screen has
--            already moved on to the next QR code.
--
-- Status lifecycle:
--   active   -> Only ONE allowed at a time (unique partial index).
--               The QR currently shown on the display screen.
--   grace    -> NO uniqueness constraint. The QR that was shown
--               previously. Still claimable until expires_at.
--               Transitions here when the display rotates.
--   consumed -> Claimed by exactly one student. Cannot be reused.
--   expired  -> expires_at has passed. Permanently dead.
--
-- Token timing:
--   display_window = 15 seconds  (QR shown on screen)
--   grace_period   = 225 seconds (total - display)
--   total_lifetime = 240 seconds (4 minutes from created_at)
--
-- Key design decisions:
--   * KEEP idx_qr_tokens_single_active: still enforces one active
--     token at a time; 'grace' rows are NOT covered by this index.
--   * When the display rotates: active -> grace (NOT expired).
--     This preserves the student's claimable window.
--   * claim_qr_token now accepts both 'active' AND 'grace' tokens
--     provided expires_at > now().
--   * FOR UPDATE row-lock in claim_qr_token prevents race conditions
--     between two simultaneous scans of the same QR.
--   * One-time-use guaranteed: consumed status is irreversible.
-- ============================================================

-- ============================================================
-- Step 1: Extend the status CHECK constraint to include 'grace'.
-- ============================================================
ALTER TABLE public.qr_tokens
    DROP CONSTRAINT IF EXISTS qr_tokens_status_check;

ALTER TABLE public.qr_tokens
    ADD CONSTRAINT qr_tokens_status_check
    CHECK (status IN ('active', 'grace', 'consumed', 'expired'));

-- ============================================================
-- Step 2: Replace get_or_create_active_qr_token.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_active_qr_token()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_raw_token       TEXT;
    v_token_hash      TEXT;
    v_expires_at      TIMESTAMPTZ;
    v_existing        RECORD;

    -- How long (seconds) the QR is shown on the display screen.
    -- MUST match DISPLAY_WINDOW_SECONDS in QRDisplay.tsx (= 15).
    v_display_seconds CONSTANT INT      := 15;

    -- Total DB lifetime per token (display window + grace period).
    v_total_lifetime  CONSTANT INTERVAL := INTERVAL '4 minutes';
BEGIN
    -- Step A: Expire ALL tokens (active or grace) whose total lifetime elapsed.
    UPDATE public.qr_tokens
    SET    status = 'expired'
    WHERE  status IN ('active', 'grace')
      AND  expires_at <= now();

    -- Step B: Look for the current active token.
    SELECT id, expires_at, created_at
    INTO   v_existing
    FROM   public.qr_tokens
    WHERE  status = 'active'
    LIMIT  1;

    IF FOUND THEN
        -- Still within display window?
        IF v_existing.created_at + (v_display_seconds || ' seconds')::INTERVAL > now() THEN
            -- No rotation needed. Return reused=true; frontend keeps current QR.
            RETURN json_build_object(
                'raw_token', NULL::TEXT,
                'expires_at', v_existing.expires_at,
                'reused', TRUE
            );
        END IF;

        -- Display window is over.
        -- Transition active -> grace (NOT expired).
        -- Grace token remains claimable until its expires_at (~3m 45s more).
        -- Unique partial index only covers status='active',
        -- so this grace row does NOT conflict with the new active token.
        UPDATE public.qr_tokens
        SET    status = 'grace'
        WHERE  id = v_existing.id
          AND  status = 'active';
    END IF;

    -- Step C: Generate a fresh token for the display screen.
    v_raw_token  := encode(extensions.gen_random_bytes(32), 'hex');
    v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');
    v_expires_at := now() + v_total_lifetime;

    INSERT INTO public.qr_tokens (token_hash, status, expires_at)
    VALUES (v_token_hash, 'active', v_expires_at);

    RETURN json_build_object(
        'raw_token',  v_raw_token,
        'expires_at', v_expires_at,
        'reused',     FALSE
    );
END;
$$;

-- ============================================================
-- Step 3: Replace claim_qr_token to accept 'active' and 'grace'.
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_qr_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_token_hash         TEXT;
    v_qr_record          RECORD;
    v_session_token      TEXT;
    v_session_expires_at TIMESTAMPTZ;
    v_session_id         UUID;
BEGIN
    IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
        RAISE EXCEPTION 'رمز الـ QR غير صالح' USING ERRCODE = 'P0001';
    END IF;

    -- 1. Hash the raw token provided by the student mobile scan.
    v_token_hash := encode(extensions.digest(trim(p_token), 'sha256'), 'hex');

    -- 2. Atomically lock the QR token row to prevent race conditions.
    SELECT id, status, expires_at
    INTO   v_qr_record
    FROM   public.qr_tokens
    WHERE  token_hash = v_token_hash
    FOR UPDATE;

    -- 3. Token must exist.
    IF NOT FOUND THEN
        RAISE EXCEPTION 'رمز الـ QR غير صالح أو غير موجود' USING ERRCODE = 'P0001';
    END IF;

    -- 4. Already consumed -> cannot reuse.
    IF v_qr_record.status = 'consumed' THEN
        RAISE EXCEPTION 'تم استخدام رمز الـ QR هذا بالفعل، يرجى مسح الرمز الجديد من الشاشة' USING ERRCODE = 'P0002';
    END IF;

    -- 5. Must be 'active' or 'grace' (not 'expired').
    IF v_qr_record.status NOT IN ('active', 'grace') THEN
        RAISE EXCEPTION 'انتهت صلاحية رمز الـ QR، يرجى مسح الرمز الجديد من الشاشة' USING ERRCODE = 'P0003';
    END IF;

    -- 6. Server-side timestamp validation (never trust frontend timer alone).
    IF v_qr_record.expires_at <= now() THEN
        UPDATE public.qr_tokens SET status = 'expired' WHERE id = v_qr_record.id;
        RAISE EXCEPTION 'انتهت صلاحية رمز الـ QR، يرجى مسح الرمز الجديد من الشاشة' USING ERRCODE = 'P0003';
    END IF;

    -- 7. Atomically consume the token (one-time-use enforced here).
    UPDATE public.qr_tokens
    SET    status      = 'consumed',
           consumed_at = now()
    WHERE  id = v_qr_record.id;

    -- 8. Create a 20-minute registration session.
    v_session_token      := encode(extensions.gen_random_bytes(32), 'hex');
    v_session_expires_at := now() + INTERVAL '20 minutes';

    INSERT INTO public.registration_sessions (
        session_token,
        qr_token_id,
        status,
        expires_at
    ) VALUES (
        v_session_token,
        v_qr_record.id,
        'active',
        v_session_expires_at
    )
    RETURNING id INTO v_session_id;

    -- 9. Return safe session payload to the student's browser.
    RETURN json_build_object(
        'success',       true,
        'session_token', v_session_token,
        'expires_at',    v_session_expires_at
    );
END;
$$;

-- ============================================================
-- Grants (idempotent)
-- ============================================================
REVOKE ALL ON FUNCTION public.get_or_create_active_qr_token() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_or_create_active_qr_token() TO service_role;

-- claim_qr_token is public (called from student browser via anon key).
GRANT EXECUTE ON FUNCTION public.claim_qr_token(TEXT) TO PUBLIC, anon, authenticated, service_role;
