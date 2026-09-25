-- ====================================================================
-- VIP Academy Registration System - Add Semesters and Modules Hierarchy
-- ====================================================================

-- 1. CREATE TABLE: Semesters
CREATE TABLE IF NOT EXISTS public.semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    name_ar TEXT NOT NULL,
    name_en TEXT NULL,
    semester_order SMALLINT NOT NULL DEFAULT 1 CHECK (semester_order BETWEEN 1 AND 10),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_semester_year_name UNIQUE (academic_year_id, name_ar)
);

-- 2. CREATE TABLE: Modules
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    name_ar TEXT NOT NULL,
    name_en TEXT NULL,
    code VARCHAR(50) NULL,
    module_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_module_semester_name UNIQUE (semester_id, name_ar)
);

-- 3. EXTEND SUBJECTS TABLE
-- Safely add nullable foreign keys for semester_id and module_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'semester_id'
    ) THEN
        ALTER TABLE public.subjects ADD COLUMN semester_id UUID NULL REFERENCES public.semesters(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'module_id'
    ) THEN
        ALTER TABLE public.subjects ADD COLUMN module_id UUID NULL REFERENCES public.modules(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 4. EXTEND REGISTRATIONS TABLE
-- Safely add nullable foreign keys to record selected semester and module without breaking historical records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'registrations' AND column_name = 'semester_id'
    ) THEN
        ALTER TABLE public.registrations ADD COLUMN semester_id UUID NULL REFERENCES public.semesters(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'registrations' AND column_name = 'module_id'
    ) THEN
        ALTER TABLE public.registrations ADD COLUMN module_id UUID NULL REFERENCES public.modules(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_semesters_year ON public.semesters(academic_year_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_modules_semester ON public.modules(semester_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subjects_hierarchy ON public.subjects(university_id, academic_year_id, semester_id, module_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subjects_module ON public.subjects(module_id) WHERE is_active = true;

-- Adjust Unique Constraint on Subjects to be module-aware while supporting legacy NULL modules
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS uq_subject_uni_year_name;
DROP INDEX IF EXISTS idx_uq_subject_uni_mod_name;
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_subject_uni_mod_name ON public.subjects(university_id, module_id, name_ar) WHERE module_id IS NOT NULL;
DROP INDEX IF EXISTS idx_uq_subject_uni_year_legacy;
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_subject_uni_year_legacy ON public.subjects(university_id, academic_year_id, name_ar) WHERE module_id IS NULL;

-- 6. TRIGGERS FOR UPDATED_AT
DROP TRIGGER IF EXISTS tr_semesters_updated_at ON public.semesters;
CREATE TRIGGER tr_semesters_updated_at
    BEFORE UPDATE ON public.semesters
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_modules_updated_at ON public.modules;
CREATE TRIGGER tr_modules_updated_at
    BEFORE UPDATE ON public.modules
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. ROW LEVEL SECURITY ON SEMESTERS & MODULES
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- 7.1 Semesters Policies
DROP POLICY IF EXISTS "Public and admins can view semesters" ON public.semesters;
CREATE POLICY "Public and admins can view semesters"
    ON public.semesters
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert semesters" ON public.semesters;
CREATE POLICY "Admins can insert semesters"
    ON public.semesters
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update semesters" ON public.semesters;
CREATE POLICY "Admins can update semesters"
    ON public.semesters
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete semesters" ON public.semesters;
CREATE POLICY "Admins can delete semesters"
    ON public.semesters
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Service role full access on semesters" ON public.semesters;
CREATE POLICY "Service role full access on semesters"
    ON public.semesters FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7.2 Modules Policies
DROP POLICY IF EXISTS "Public and admins can view modules" ON public.modules;
CREATE POLICY "Public and admins can view modules"
    ON public.modules
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert modules" ON public.modules;
CREATE POLICY "Admins can insert modules"
    ON public.modules
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update modules" ON public.modules;
CREATE POLICY "Admins can update modules"
    ON public.modules
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete modules" ON public.modules;
CREATE POLICY "Admins can delete modules"
    ON public.modules
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Service role full access on modules" ON public.modules;
CREATE POLICY "Service role full access on modules"
    ON public.modules FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. UPDATE RPC: submit_registration
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
    p_module_id UUID DEFAULT NULL
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

-- 9. SEED CONFIRMED STRUCTURAL DATA ONLY
DO $$
DECLARE
    v_year_2_id UUID;
    v_year_3_id UUID;
    v_sem_year_2_id UUID;
    v_sem_year_3_id UUID;
BEGIN
    -- Get Year 2 & Year 3
    SELECT id INTO v_year_2_id FROM public.academic_years WHERE year_order = 2 LIMIT 1;
    SELECT id INTO v_year_3_id FROM public.academic_years WHERE year_order = 3 LIMIT 1;

    -- Year 2: First Semester
    IF v_year_2_id IS NOT NULL THEN
        INSERT INTO public.semesters (academic_year_id, name_ar, name_en, semester_order, is_active)
        VALUES (v_year_2_id, 'الترم الأول', 'First Semester', 1, true)
        ON CONFLICT (academic_year_id, name_ar) DO UPDATE SET updated_at = now()
        RETURNING id INTO v_sem_year_2_id;

        IF v_sem_year_2_id IS NULL THEN
            SELECT id INTO v_sem_year_2_id FROM public.semesters WHERE academic_year_id = v_year_2_id AND name_ar = 'الترم الأول';
        END IF;

        -- Year 2 Modules: Blood, Respiratory, CVS
        INSERT INTO public.modules (semester_id, name_ar, name_en, code, module_order, is_active)
        VALUES 
            (v_sem_year_2_id, '🩸 Blood', 'Blood', 'BLOOD', 1, true),
            (v_sem_year_2_id, '🫁 Respiratory', 'Respiratory', 'RESP', 2, true),
            (v_sem_year_2_id, '❤️ CVS', 'Cardiovascular System', 'CVS', 3, true)
        ON CONFLICT (semester_id, name_ar) DO NOTHING;
    END IF;

    -- Year 3: First Semester
    IF v_year_3_id IS NOT NULL THEN
        INSERT INTO public.semesters (academic_year_id, name_ar, name_en, semester_order, is_active)
        VALUES (v_year_3_id, 'الترم الأول', 'First Semester', 1, true)
        ON CONFLICT (academic_year_id, name_ar) DO UPDATE SET updated_at = now()
        RETURNING id INTO v_sem_year_3_id;

        IF v_sem_year_3_id IS NULL THEN
            SELECT id INTO v_sem_year_3_id FROM public.semesters WHERE academic_year_id = v_year_3_id AND name_ar = 'الترم الأول';
        END IF;

        -- Year 3 Modules: GIT, Urogenital
        INSERT INTO public.modules (semester_id, name_ar, name_en, code, module_order, is_active)
        VALUES 
            (v_sem_year_3_id, '🩺 GIT', 'Gastrointestinal Tract', 'GIT', 1, true),
            (v_sem_year_3_id, '🧬 Urogenital', 'Urogenital System', 'URO', 2, true)
        ON CONFLICT (semester_id, name_ar) DO NOTHING;
    END IF;
END $$;
