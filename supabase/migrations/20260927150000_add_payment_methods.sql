-- ====================================================================
-- MIGRATION: ADD PAYMENT METHODS MANAGEMENT & REGISTRATION INTEGRATION
-- ====================================================================

-- 1. CREATE TABLE: payment_methods
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL,
    name_en TEXT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for ordering active payment methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_active_order 
    ON public.payment_methods(is_active, display_order);

-- 2. EXTEND REGISTRATIONS TABLE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'registrations' AND column_name = 'payment_method_id'
    ) THEN
        ALTER TABLE public.registrations ADD COLUMN payment_method_id UUID NULL REFERENCES public.payment_methods(id) ON DELETE RESTRICT;
        CREATE INDEX IF NOT EXISTS idx_registrations_payment_method ON public.registrations(payment_method_id);
    END IF;
END $$;

-- 3. SEED DEFAULT PAYMENT METHOD: CASH (كاش)
INSERT INTO public.payment_methods (name_ar, name_en, code, is_active, display_order)
VALUES ('كاش', 'Cash', 'cash', true, 1)
ON CONFLICT (code) DO NOTHING;

-- 4. BACKFILL EXISTING REGISTRATIONS TO DEFAULT CASH IF NULL
DO $$
DECLARE
    v_cash_id UUID;
BEGIN
    SELECT id INTO v_cash_id FROM public.payment_methods WHERE code = 'cash' LIMIT 1;
    IF v_cash_id IS NOT NULL THEN
        UPDATE public.registrations SET payment_method_id = v_cash_id WHERE payment_method_id IS NULL;
    END IF;
END $$;

-- 5. ROW LEVEL SECURITY ON payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- 5.1 Public Read for active payment methods
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON public.payment_methods;
CREATE POLICY "Anyone can view active payment methods"
    ON public.payment_methods
    FOR SELECT
    TO public
    USING (is_active = true OR public.is_admin());

-- 5.2 Admin Insert
DROP POLICY IF EXISTS "Admins can insert payment methods" ON public.payment_methods;
CREATE POLICY "Admins can insert payment methods"
    ON public.payment_methods
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- 5.3 Admin Update
DROP POLICY IF EXISTS "Admins can update payment methods" ON public.payment_methods;
CREATE POLICY "Admins can update payment methods"
    ON public.payment_methods
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 5.4 Admin Delete
DROP POLICY IF EXISTS "Admins can delete payment methods" ON public.payment_methods;
CREATE POLICY "Admins can delete payment methods"
    ON public.payment_methods
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 5.5 Service Role Full Access
DROP POLICY IF EXISTS "Service role full access on payment_methods" ON public.payment_methods;
CREATE POLICY "Service role full access on payment_methods"
    ON public.payment_methods FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. UPDATE RPC: submit_registration TO INCLUDE payment_method_id
CREATE OR REPLACE FUNCTION public.submit_registration(
    p_session_token TEXT,
    p_full_name TEXT,
    p_phone TEXT,
    p_whatsapp TEXT,
    p_country TEXT,
    p_university_id UUID,
    p_academic_year_id UUID,
    p_subject_ids UUID[],
    p_semester_id UUID DEFAULT NULL,
    p_module_id UUID DEFAULT NULL,
    p_payment_method_id UUID DEFAULT NULL
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
    v_semester_count INT;
    v_module_count INT;
    v_payment_method_id UUID;
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

    -- Validate Semester if provided
    IF p_semester_id IS NOT NULL THEN
        SELECT count(*) INTO v_semester_count
        FROM public.semesters
        WHERE id = p_semester_id AND academic_year_id = p_academic_year_id AND is_active = true;

        IF v_semester_count = 0 THEN
            RAISE EXCEPTION 'الترم المختار غير صالح أو غير مفعل لهذه الفرقة' USING ERRCODE = 'P0015';
        END IF;
    END IF;

    -- Validate Module if provided
    IF p_module_id IS NOT NULL THEN
        IF p_semester_id IS NULL THEN
            RAISE EXCEPTION 'يجب تحديد الترم التابع له الموديول' USING ERRCODE = 'P0016';
        END IF;

        SELECT count(*) INTO v_module_count
        FROM public.modules
        WHERE id = p_module_id AND semester_id = p_semester_id AND is_active = true;

        IF v_module_count = 0 THEN
            RAISE EXCEPTION 'الموديول المختار غير صالح أو غير مفعل لهذا الترم' USING ERRCODE = 'P0017';
        END IF;
    END IF;

    -- Validate Payment Method
    IF p_payment_method_id IS NOT NULL THEN
        SELECT id INTO v_payment_method_id
        FROM public.payment_methods
        WHERE id = p_payment_method_id AND is_active = true;

        IF v_payment_method_id IS NULL THEN
            RAISE EXCEPTION 'طريقة الدفع المختارة غير صالحة أو غير مفعلة' USING ERRCODE = 'P0018';
        END IF;
    ELSE
        -- Fallback to default Cash or first active method
        SELECT id INTO v_payment_method_id
        FROM public.payment_methods
        WHERE is_active = true
        ORDER BY (CASE WHEN code = 'cash' THEN 0 ELSE 1 END), display_order ASC
        LIMIT 1;
    END IF;

    -- 4. Deduplicate Subject IDs
    SELECT array_agg(DISTINCT sub_id)
    INTO v_distinct_subject_ids
    FROM unnest(p_subject_ids) AS sub_id;

    -- 5. Verify all selected subjects exist, are active, and belong to the chosen hierarchy
    SELECT count(*), coalesce(sum(price), 0)
    INTO v_valid_subjects_count, v_total_calculated
    FROM public.subjects
    WHERE id = ANY(v_distinct_subject_ids)
      AND university_id = p_university_id
      AND academic_year_id = p_academic_year_id
      AND (p_semester_id IS NULL OR semester_id IS NULL OR semester_id = p_semester_id)
      AND (p_module_id IS NULL OR module_id IS NULL OR module_id = p_module_id)
      AND is_active = true;

    IF v_valid_subjects_count <> array_length(v_distinct_subject_ids, 1) THEN
        RAISE EXCEPTION 'بعض المواد المختارة غير صالحة أو لا تنتمي لنفس الجامعة والفرقة الدراسية والموديول' USING ERRCODE = 'P0014';
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
        semester_id,
        module_id,
        payment_method_id,
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
        p_semester_id,
        p_module_id,
        v_payment_method_id,
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
        'payment_method_id', v_payment_method_id,
        'total_amount', v_total_calculated,
        'status', 'confirmed',
        'created_at', now()
    );
END;
$$;
