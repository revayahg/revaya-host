-- Simple fix for test database - only essential functions
-- This script fixes the 404 errors you're seeing

-- Fix 1: get_user_identity_bulk function
DROP FUNCTION IF EXISTS public.get_user_identity_bulk(uuid[]);
CREATE FUNCTION public.get_user_identity_bulk(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id AS user_id,
    COALESCE(a.email, 'Unknown') AS display_name,
    a.email
  FROM auth.users a
  WHERE a.id = ANY(p_user_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_identity_bulk(uuid[]) TO authenticated;

-- Fix 2: safe_insert_event_dates function
DROP FUNCTION IF EXISTS safe_insert_event_dates(uuid, jsonb, uuid);
CREATE FUNCTION safe_insert_event_dates(event_uuid uuid, dates_data jsonb, user_uuid uuid DEFAULT auth.uid())
RETURNS void AS $$
DECLARE
    date_item jsonb;
BEGIN
    -- Delete existing dates
    DELETE FROM public.event_dates WHERE event_id = event_uuid;
    
    -- Insert new dates
    FOR date_item IN SELECT * FROM jsonb_array_elements(dates_data)
    LOOP
        INSERT INTO public.event_dates (event_id, event_date, start_time, end_time, created_by)
        VALUES (
            event_uuid,
            (date_item->>'date')::date,
            date_item->>'startTime',
            date_item->>'endTime',
            user_uuid
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION safe_insert_event_dates(uuid, jsonb, uuid) TO authenticated;
