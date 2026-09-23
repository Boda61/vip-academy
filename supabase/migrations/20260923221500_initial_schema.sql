-- ====================================================================
-- VIP Academy Registration System - Complete Database Schema Migration
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. REFERENCE TABLES

-- 2.1 Universities
CREATE TABLE IF NOT EXISTS public.universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Academic Years (Exactly 5 years)
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL UNIQUE,
    year_order SMALLINT NOT NULL UNIQUE CHECK (year_order BETWEEN 1 AND 5),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 Subjects Catalog
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    name_ar TEXT NOT NULL,
    name_en TEXT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_subject_uni_year_name UNIQUE (university_id, academic_year_id, name_ar)
);

-- 3. QR & SESSION TABLES

-- 3.1 QR Tokens (Stores SHA-256 hash only; raw token is never stored)
CREATE TABLE IF NOT EXISTS public.qr_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 Registration Sessions (Created upon valid QR scan; TTL ~20 minutes)
CREATE TABLE IF NOT EXISTS public.registration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token TEXT NOT NULL UNIQUE,
    qr_token_id UUID NOT NULL UNIQUE REFERENCES public.qr_tokens(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. REGISTRATION TABLES

-- 4.1 Student Registrations
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES public.registration_sessions(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL CHECK (length(trim(full_name)) >= 3),
    phone_number VARCHAR(25) NOT NULL,
    whatsapp_number VARCHAR(25) NOT NULL,
    country TEXT NOT NULL,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    sync_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    synced_at TIMESTAMPTZ NULL,
    sync_error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.2 Registration Items (Snapshots subject name and price at registration time)
CREATE TABLE IF NOT EXISTS public.registration_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    subject_name_snapshot TEXT NOT NULL,
    unit_price_snapshot NUMERIC(10,2) NOT NULL CHECK (unit_price_snapshot >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_reg_item UNIQUE (registration_id, subject_id)
);

-- 5. INDEXES

-- Ensure only ONE globally active QR token at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_tokens_single_active ON public.qr_tokens(status) WHERE status = 'active';

-- Quick catalog lookup for frontend filtering
CREATE INDEX IF NOT EXISTS idx_subjects_uni_year ON public.subjects(university_id, academic_year_id) WHERE is_active = true;

-- Background job index for pending Google Sheets sync
CREATE INDEX IF NOT EXISTS idx_registrations_sync_status ON public.registrations(sync_status) WHERE sync_status = 'pending';

-- Fast lookup for phone numbers and recent registrations
CREATE INDEX IF NOT EXISTS idx_registrations_phone ON public.registrations(phone_number);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registration_items_reg_id ON public.registration_items(registration_id);

-- 6. TRIGGERS FOR UPDATED_AT

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_subjects_updated_at ON public.subjects;
CREATE TRIGGER tr_subjects_updated_at
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. SECURITY DEFINER RPC FUNCTIONS

-- 7.1 RPC: get_or_create_active_qr_token (Used exclusively by the protected display screen)
CREATE OR REPLACE FUNCTION public.get_or_create_active_qr_token()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_raw_token TEXT;
    v_token_hash TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 1. Expire any previously active tokens that passed their expiration time
    UPDATE public.qr_tokens
    SET status = 'expired'
    WHERE status = 'active' AND expires_at <= now();

    -- 2. Expire any remaining unconsumed active tokens to guarantee a fresh active raw token
    UPDATE public.qr_tokens
    SET status = 'expired'
    WHERE status = 'active';

    -- 3. Generate a new cryptographically secure 32-byte hex raw token
    v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');
    -- Compute SHA-256 hash
    v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');
    -- QR lifetime is 10 minutes
    v_expires_at := now() + interval '10 minutes';

    -- 4. Store ONLY the SHA-256 hash in the database
    INSERT INTO public.qr_tokens (token_hash, status, expires_at)
    VALUES (v_token_hash, 'active', v_expires_at);

    -- 5. Return the raw token and expiration timestamp to the server-side display handler
    RETURN json_build_object(
        'raw_token', v_raw_token,
        'expires_at', v_expires_at
    );
END;
$$;

-- 7.2 RPC: claim_qr_token (Public student QR scan entrypoint - Atomic consumption)
CREATE OR REPLACE FUNCTION public.claim_qr_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_token_hash TEXT;
    v_qr_record RECORD;
    v_session_token TEXT;
    v_session_expires_at TIMESTAMPTZ;
    v_session_id UUID;
BEGIN
    IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
        RAISE EXCEPTION 'رمز الـ QR غير صالح' USING ERRCODE = 'P0001';
    END IF;

    -- 1. Hash the raw token provided by the student mobile scan
    v_token_hash := encode(extensions.digest(trim(p_token), 'sha256'), 'hex');

    -- 2. Atomically lock the QR token row to prevent concurrency race conditions
    SELECT id, status, expires_at
    INTO v_qr_record
    FROM public.qr_tokens
    WHERE token_hash = v_token_hash
    FOR UPDATE;

    -- 3. Verify token existence and state
    IF NOT FOUND THEN
        RAISE EXCEPTION 'رمز الـ QR غير صالح أو غير موجود' USING ERRCODE = 'P0001';
    END IF;

    IF v_qr_record.status = 'consumed' THEN
        RAISE EXCEPTION 'تم استخدام رمز الـ QR هذا بالفعل، يرجى مسح الرمز الجديد من الشاشة' USING ERRCODE = 'P0002';
    END IF;

    IF v_qr_record.status = 'expired' OR v_qr_record.expires_at <= now() THEN
        UPDATE public.qr_tokens SET status = 'expired' WHERE id = v_qr_record.id;
        RAISE EXCEPTION 'انتهت صلاحية رمز الـ QR، يرجى مسح الرمز الجديد من الشاشة' USING ERRCODE = 'P0003';
    END IF;

    -- 4. Mark QR as consumed immediately
    UPDATE public.qr_tokens
    SET status = 'consumed',
        consumed_at = now()
    WHERE id = v_qr_record.id;

    -- 5. Create registration session (20-minute validity)
    v_session_token := encode(extensions.gen_random_bytes(32), 'hex');
    v_session_expires_at := now() + interval '20 minutes';

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

    -- 6. Return safe session payload
    RETURN json_build_object(
        'success', true,
        'session_token', v_session_token,
        'expires_at', v_session_expires_at
    );
END;
$$;

-- 7.3 RPC: submit_registration (Atomic student registration submission)
CREATE OR REPLACE FUNCTION public.submit_registration(
    p_session_token TEXT,
    p_full_name TEXT,
    p_phone TEXT,
    p_whatsapp TEXT,
    p_country TEXT,
    p_university_id UUID,
    p_academic_year_id UUID,
    p_subject_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_session RECORD;
    v_university_count INT;
    v_year_count INT;
    v_distinct_subject_ids UUID[];
    v_valid_subjects_count INT;
    v_total_calculated NUMERIC(10,2);
    v_registration_id UUID;
BEGIN
    -- 1. Input sanitization and validations
    IF p_full_name IS NULL OR length(trim(p_full_name)) < 3 THEN
        RAISE EXCEPTION 'اسم الطالب يجب أن لا يقل عن 3 أحرف' USING ERRCODE = 'P0004';
    END IF;

    IF p_phone IS NULL OR length(trim(p_phone)) < 5 THEN
        RAISE EXCEPTION 'رقم الهاتف غير صالح' USING ERRCODE = 'P0005';
    END IF;

    IF p_whatsapp IS NULL OR length(trim(p_whatsapp)) < 5 THEN
        RAISE EXCEPTION 'رقم الواتساب غير صالح' USING ERRCODE = 'P0006';
    END IF;

    IF p_country IS NULL OR length(trim(p_country)) < 2 THEN
        RAISE EXCEPTION 'يرجى اختيار الدولة' USING ERRCODE = 'P0007';
    END IF;

    IF p_subject_ids IS NULL OR array_length(p_subject_ids, 1) IS NULL OR array_length(p_subject_ids, 1) = 0 THEN
        RAISE EXCEPTION 'يجب اختيار مادة واحدة على الأقل' USING ERRCODE = 'P0008';
    END IF;

    -- 2. Validate and Lock Registration Session
    SELECT id, status, expires_at
    INTO v_session
    FROM public.registration_sessions
    WHERE session_token = trim(p_session_token)
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'جلسة التسجيل غير صالحة أو غير موجودة' USING ERRCODE = 'P0009';
    END IF;

    IF v_session.status = 'completed' THEN
        RAISE EXCEPTION 'تم إتمام التسجيل لهذه الجلسة مسبقاً' USING ERRCODE = 'P0010';
    END IF;

    IF v_session.status = 'expired' OR v_session.expires_at <= now() THEN
        UPDATE public.registration_sessions SET status = 'expired' WHERE id = v_session.id;
        RAISE EXCEPTION 'انتهت صلاحية جلسة التسجيل، يرجى إعادة مسح الرمز من الشاشة' USING ERRCODE = 'P0011';
    END IF;

    -- 3. Validate University & Academic Year
    SELECT count(*) INTO v_university_count
    FROM public.universities
    WHERE id = p_university_id AND is_active = true;

    IF v_university_count = 0 THEN
        RAISE EXCEPTION 'الجامعة المختارة غير صالحة أو غير مفعلة' USING ERRCODE = 'P0012';
    END IF;

    SELECT count(*) INTO v_year_count
    FROM public.academic_years
    WHERE id = p_academic_year_id AND is_active = true;

    IF v_year_count = 0 THEN
        RAISE EXCEPTION 'السنة الدراسية المختارة غير صالحة أو غير مفعلة' USING ERRCODE = 'P0013';
    END IF;

    -- 4. Deduplicate Subject IDs
    SELECT array_agg(DISTINCT sub_id)
    INTO v_distinct_subject_ids
    FROM unnest(p_subject_ids) AS sub_id;

    -- 5. Verify all selected subjects exist, are active, and belong to the chosen university & year
    SELECT count(*), coalesce(sum(price), 0)
    INTO v_valid_subjects_count, v_total_calculated
    FROM public.subjects
    WHERE id = ANY(v_distinct_subject_ids)
      AND university_id = p_university_id
      AND academic_year_id = p_academic_year_id
      AND is_active = true;

    IF v_valid_subjects_count <> array_length(v_distinct_subject_ids, 1) THEN
        RAISE EXCEPTION 'بعض المواد المختارة غير صالحة أو لا تنتمي لنفس الجامعة والفرقة الدراسية' USING ERRCODE = 'P0014';
    END IF;

    -- 6. Insert Registration Record
    INSERT INTO public.registrations (
        session_id,
        full_name,
        phone_number,
        whatsapp_number,
        country,
        university_id,
        academic_year_id,
        total_amount,
        status,
        sync_status
    ) VALUES (
        v_session.id,
        trim(p_full_name),
        trim(p_phone),
        trim(p_whatsapp),
        trim(p_country),
        p_university_id,
        p_academic_year_id,
        v_total_calculated,
        'confirmed',
        'pending'
    )
    RETURNING id INTO v_registration_id;

    -- 7. Insert Registration Items (Snapshots)
    INSERT INTO public.registration_items (
        registration_id,
        subject_id,
        subject_name_snapshot,
        unit_price_snapshot
    )
    SELECT
        v_registration_id,
        s.id,
        s.name_ar,
        s.price
    FROM public.subjects s
    WHERE s.id = ANY(v_distinct_subject_ids);

    -- 8. Mark session as completed
    UPDATE public.registration_sessions
    SET status = 'completed',
        completed_at = now()
    WHERE id = v_session.id;

    -- 9. Return confirmation payload
    RETURN json_build_object(
        'success', true,
        'registration_id', v_registration_id,
        'total_amount', v_total_calculated,
        'status', 'confirmed',
        'created_at', now()
    );
END;
$$;

-- 8. ROW LEVEL SECURITY & POLICIES

-- Enable RLS on all tables
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_items ENABLE ROW LEVEL SECURITY;

-- 8.1 Reference Data Public Read Policies
DROP POLICY IF EXISTS "Public can view active universities" ON public.universities;
CREATE POLICY "Public can view active universities"
    ON public.universities
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active academic years" ON public.academic_years;
CREATE POLICY "Public can view active academic years"
    ON public.academic_years
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active subjects" ON public.subjects;
CREATE POLICY "Public can view active subjects"
    ON public.subjects
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- 8.2 Service Role Full Access Policies
DROP POLICY IF EXISTS "Service role full access on universities" ON public.universities;
CREATE POLICY "Service role full access on universities"
    ON public.universities FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on academic_years" ON public.academic_years;
CREATE POLICY "Service role full access on academic_years"
    ON public.academic_years FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on subjects" ON public.subjects;
CREATE POLICY "Service role full access on subjects"
    ON public.subjects FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on qr_tokens" ON public.qr_tokens;
CREATE POLICY "Service role full access on qr_tokens"
    ON public.qr_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on registration_sessions" ON public.registration_sessions;
CREATE POLICY "Service role full access on registration_sessions"
    ON public.registration_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on registrations" ON public.registrations;
CREATE POLICY "Service role full access on registrations"
    ON public.registrations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on registration_items" ON public.registration_items;
CREATE POLICY "Service role full access on registration_items"
    ON public.registration_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9. RPC FUNCTION PERMISSIONS

-- Restrict get_or_create_active_qr_token exclusively to service_role (Protected display screen)
REVOKE ALL ON FUNCTION public.get_or_create_active_qr_token() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_active_qr_token() TO service_role;

-- Grant public execute on student entrypoint RPCs
GRANT EXECUTE ON FUNCTION public.claim_qr_token(TEXT) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_registration(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID[]) TO PUBLIC, anon, authenticated, service_role;

-- 10. SEED DATA

-- 10.1 Universities
INSERT INTO public.universities (name_ar, name_en, code, is_active)
VALUES
    ('جامعة القاهرة', 'Cairo University', 'CU', true),
    ('جامعة عين شمس', 'Ain Shams University', 'ASU', true)
ON CONFLICT (code) DO NOTHING;

-- 10.2 Academic Years (1 to 5 only)
INSERT INTO public.academic_years (name_ar, name_en, year_order, is_active)
VALUES
    ('الفرقة الأولى', 'First Year', 1, true),
    ('الفرقة الثانية', 'Second Year', 2, true),
    ('الفرقة الثالثة', 'Third Year', 3, true),
    ('الفرقة الرابعة', 'Fourth Year', 4, true),
    ('الفرقة الخامسة', 'Fifth Year', 5, true)
ON CONFLICT (year_order) DO NOTHING;

-- 10.3 Temporary Placeholder Subjects (Marked as TEMPORARY SEED DATA)
-- Will be replaced with real curriculum & pricing later
DO $$
DECLARE
    v_cu_id UUID;
    v_asu_id UUID;
    v_year1_id UUID;
    v_year2_id UUID;
    v_year3_id UUID;
BEGIN
    SELECT id INTO v_cu_id FROM public.universities WHERE code = 'CU';
    SELECT id INTO v_asu_id FROM public.universities WHERE code = 'ASU';
    SELECT id INTO v_year1_id FROM public.academic_years WHERE year_order = 1;
    SELECT id INTO v_year2_id FROM public.academic_years WHERE year_order = 2;
    SELECT id INTO v_year3_id FROM public.academic_years WHERE year_order = 3;

    -- Cairo University - Year 1 (Temporary)
    INSERT INTO public.subjects (university_id, academic_year_id, name_ar, name_en, price)
    VALUES
        (v_cu_id, v_year1_id, 'تشريح عام (Anatomy)', 'General Anatomy', 1200.00),
        (v_cu_id, v_year1_id, 'وظائف أعضاء (Physiology)', 'General Physiology', 1100.00),
        (v_cu_id, v_year1_id, 'كيمياء حيوية (Biochemistry)', 'General Biochemistry', 1000.00)
    ON CONFLICT (university_id, academic_year_id, name_ar) DO NOTHING;

    -- Cairo University - Year 2 (Temporary)
    INSERT INTO public.subjects (university_id, academic_year_id, name_ar, name_en, price)
    VALUES
        (v_cu_id, v_year2_id, 'علم الأمراض (Pathology)', 'General Pathology', 1300.00),
        (v_cu_id, v_year2_id, 'علم الأدوية (Pharmacology)', 'General Pharmacology', 1300.00),
        (v_cu_id, v_year2_id, 'علم الأحياء الدقيقة (Microbiology)', 'Microbiology', 1150.00)
    ON CONFLICT (university_id, academic_year_id, name_ar) DO NOTHING;

    -- Ain Shams University - Year 1 (Temporary)
    INSERT INTO public.subjects (university_id, academic_year_id, name_ar, name_en, price)
    VALUES
        (v_asu_id, v_year1_id, 'تشريح وصفي (Descriptive Anatomy)', 'Descriptive Anatomy', 1250.00),
        (v_asu_id, v_year1_id, 'فسيولوجيا طبية (Medical Physiology)', 'Medical Physiology', 1150.00),
        (v_asu_id, v_year1_id, 'هستولوجي (Histology)', 'Medical Histology', 1050.00)
    ON CONFLICT (university_id, academic_year_id, name_ar) DO NOTHING;

    -- Ain Shams University - Year 3 (Temporary)
    INSERT INTO public.subjects (university_id, academic_year_id, name_ar, name_en, price)
    VALUES
        (v_asu_id, v_year3_id, 'باطنة عامة (Internal Medicine)', 'Internal Medicine', 1500.00),
        (v_asu_id, v_year3_id, 'جراحة عامة (General Surgery)', 'General Surgery', 1600.00)
    ON CONFLICT (university_id, academic_year_id, name_ar) DO NOTHING;
END;
$$;
