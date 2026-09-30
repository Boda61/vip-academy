-- ====================================================================
-- VIP Academy - Exclude Cancelled and Sheet Deleted Registrations from Analytics
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_admin_registration_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_cairo_today date;
    v_today_count int;
    v_today_amount numeric(10,2);
    v_last_7_days_count int;
    v_this_month_count int;
    v_total_registrations int;
    v_trend json;
BEGIN
    -- 1. Verify admin authorization
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can view registration analytics' USING ERRCODE = '42501';
    END IF;

    -- 2. Determine current date in Cairo timezone
    v_cairo_today := (now() AT TIME ZONE 'Africa/Cairo')::date;

    -- 3. Today metrics (excluding cancelled and sheet_deleted)
    SELECT count(*), coalesce(sum(total_amount), 0)
    INTO v_today_count, v_today_amount
    FROM public.registrations
    WHERE created_at >= (v_cairo_today::timestamp AT TIME ZONE 'Africa/Cairo')
      AND status != 'cancelled'
      AND sync_status != 'sheet_deleted';

    -- 4. Last 7 days metrics (excluding cancelled and sheet_deleted)
    SELECT count(*)
    INTO v_last_7_days_count
    FROM public.registrations
    WHERE created_at >= ((v_cairo_today - 6)::timestamp AT TIME ZONE 'Africa/Cairo')
      AND status != 'cancelled'
      AND sync_status != 'sheet_deleted';

    -- 5. This month metrics (excluding cancelled and sheet_deleted)
    SELECT count(*)
    INTO v_this_month_count
    FROM public.registrations
    WHERE created_at >= ((date_trunc('month', now() AT TIME ZONE 'Africa/Cairo')) AT TIME ZONE 'Africa/Cairo')
      AND status != 'cancelled'
      AND sync_status != 'sheet_deleted';

    -- 6. Total registrations (excluding cancelled and sheet_deleted)
    SELECT count(*)
    INTO v_total_registrations
    FROM public.registrations
    WHERE status != 'cancelled'
      AND sync_status != 'sheet_deleted';

    -- 7. 7-Day Trend data (excluding cancelled and sheet_deleted)
    SELECT json_agg(
        json_build_object(
            'date', d.day_date::text,
            'day_name_ar', CASE EXTRACT(DOW FROM d.day_date)
                WHEN 0 THEN 'الأحد'
                WHEN 1 THEN 'الإثنين'
                WHEN 2 THEN 'الثلاثاء'
                WHEN 3 THEN 'الأربعاء'
                WHEN 4 THEN 'الخميس'
                WHEN 5 THEN 'الجمعة'
                WHEN 6 THEN 'السبت'
            END,
            'count', coalesce(r.cnt, 0),
            'amount', coalesce(r.total_amt, 0)
        ) ORDER BY d.day_date ASC
    )
    INTO v_trend
    FROM (
        SELECT ( v_cairo_today - i )::date AS day_date
        FROM generate_series(6, 0, -1) AS i
    ) d
    LEFT JOIN (
        SELECT 
            (created_at AT TIME ZONE 'Africa/Cairo')::date AS reg_date,
            count(*) AS cnt,
            sum(total_amount) AS total_amt
        FROM public.registrations
        WHERE created_at >= ( (v_cairo_today - 6)::timestamp AT TIME ZONE 'Africa/Cairo' )
          AND status != 'cancelled'
          AND sync_status != 'sheet_deleted'
        GROUP BY (created_at AT TIME ZONE 'Africa/Cairo')::date
    ) r ON d.day_date = r.reg_date;

    -- 8. Return comprehensive analytics object
    RETURN json_build_object(
        'today_count', v_today_count,
        'today_amount', v_today_amount,
        'last_7_days_count', v_last_7_days_count,
        'this_month_count', v_this_month_count,
        'total_registrations', v_total_registrations,
        'seven_days_trend', coalesce(v_trend, '[]'::json)
    );
END;
$$;
