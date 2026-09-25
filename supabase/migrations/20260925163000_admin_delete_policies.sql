-- ====================================================================
-- VIP Academy - Admin Delete Policies for Universities, Years & Subjects
-- ====================================================================

-- 1. UNIVERSITIES DELETE POLICY FOR ADMINS
DROP POLICY IF EXISTS "Admins can delete universities" ON public.universities;
CREATE POLICY "Admins can delete universities"
    ON public.universities
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 2. ACADEMIC YEARS DELETE POLICY FOR ADMINS
DROP POLICY IF EXISTS "Admins can delete academic years" ON public.academic_years;
CREATE POLICY "Admins can delete academic years"
    ON public.academic_years
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 3. SUBJECTS DELETE POLICY FOR ADMINS
DROP POLICY IF EXISTS "Admins can delete subjects" ON public.subjects;
CREATE POLICY "Admins can delete subjects"
    ON public.subjects
    FOR DELETE
    TO authenticated
    USING (public.is_admin());
