-- ====================================================================
-- VIP Academy - Admin Universities & Academic Years Management RLS
-- ====================================================================

-- 1. UNIVERSITIES RLS POLICIES FOR ADMINS
-- Enable Admins to insert and update universities safely

DROP POLICY IF EXISTS "Admins can insert universities" ON public.universities;
CREATE POLICY "Admins can insert universities"
    ON public.universities
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update universities" ON public.universities;
CREATE POLICY "Admins can update universities"
    ON public.universities
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 2. ACADEMIC YEARS RLS POLICIES FOR ADMINS
-- Enable Admins to insert and update academic years safely

DROP POLICY IF EXISTS "Admins can insert academic years" ON public.academic_years;
CREATE POLICY "Admins can insert academic years"
    ON public.academic_years
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update academic years" ON public.academic_years;
CREATE POLICY "Admins can update academic years"
    ON public.academic_years
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
