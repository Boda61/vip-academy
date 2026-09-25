-- ====================================================================
-- VIP Academy Registration System - Admin Roles & Subject Management
-- ====================================================================

-- 1. ADMIN USERS TABLE
-- Securely links authorized admin accounts to Supabase Auth (auth.users)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger for admin_users
DROP TRIGGER IF EXISTS tr_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER tr_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 2. SECURITY DEFINER HELPER FUNCTION: is_admin
-- Returns true if the authenticated caller's uid exists and is active in public.admin_users
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_users
        WHERE id = auth.uid()
          AND is_active = true
    );
$$;

-- Grant execution to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 3. RPC FUNCTION: check_admin_status
-- Used by the frontend client upon login to securely verify admin privileges and get profile info
CREATE OR REPLACE FUNCTION public.check_admin_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_record RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object(
            'is_admin', false,
            'message', 'غير مسجل دخول'
        );
    END IF;

    SELECT id, email, full_name, is_active
    INTO v_user_record
    FROM public.admin_users
    WHERE id = auth.uid();

    IF NOT FOUND OR v_user_record.is_active = false THEN
        RETURN json_build_object(
            'is_admin', false,
            'message', 'هذا الحساب غير مصرح له كمسؤول'
        );
    END IF;

    RETURN json_build_object(
        'is_admin', true,
        'user_id', v_user_record.id,
        'email', v_user_record.email,
        'full_name', v_user_record.full_name
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_admin_status() TO authenticated, service_role;

-- 4. RLS POLICIES ON admin_users
-- Normal users cannot insert, update, or delete admin_users.
-- Only authenticated admins or the service role can access admin_users.
DROP POLICY IF EXISTS "Admins can view their own profile or all admins" ON public.admin_users;
CREATE POLICY "Admins can view their own profile or all admins"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (public.is_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "Service role full access on admin_users" ON public.admin_users;
CREATE POLICY "Service role full access on admin_users"
    ON public.admin_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. UPDATED RLS POLICIES ON subjects
-- Public/anon can only view active subjects.
-- Authenticated admins can view ALL subjects (including inactive ones), insert, and update.
DROP POLICY IF EXISTS "Public can view active subjects" ON public.subjects;
DROP POLICY IF EXISTS "Public and admins can view subjects" ON public.subjects;
CREATE POLICY "Public and admins can view subjects"
    ON public.subjects
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert subjects" ON public.subjects;
CREATE POLICY "Admins can insert subjects"
    ON public.subjects
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update subjects" ON public.subjects;
CREATE POLICY "Admins can update subjects"
    ON public.subjects
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6. UPDATED RLS POLICIES ON universities AND academic_years
DROP POLICY IF EXISTS "Public can view active universities" ON public.universities;
DROP POLICY IF EXISTS "Public and admins can view universities" ON public.universities;
CREATE POLICY "Public and admins can view universities"
    ON public.universities
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Public can view active academic years" ON public.academic_years;
DROP POLICY IF EXISTS "Public and admins can view academic years" ON public.academic_years;
CREATE POLICY "Public and admins can view academic years"
    ON public.academic_years
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true OR public.is_admin());
