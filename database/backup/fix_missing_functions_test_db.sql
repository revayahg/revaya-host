-- Fix missing functions in test database
-- This script adds the missing functions that are causing 404 errors

-- 1. Drop and recreate get_user_identity_bulk function (in case it exists with different signature)
DROP FUNCTION IF EXISTS public.get_user_identity_bulk(uuid[]);
CREATE OR REPLACE FUNCTION public.get_user_identity_bulk(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH u AS (
    SELECT a.id AS user_id,
           -- If you have a public profiles table with full_name, join it here.
           null::text AS display_name_fallback,
           a.email
    FROM auth.users a
    WHERE a.id = ANY(p_user_ids)
  )
  SELECT u.user_id,
         COALESCE(null, u.display_name_fallback, split_part(u.email, '@', 1)) AS display_name,
         u.email
  FROM u;
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.get_user_identity_bulk(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_user_identity_bulk(uuid[]) TO authenticated;

-- 2. Drop and recreate safe_insert_event_dates function
DROP FUNCTION IF EXISTS safe_insert_event_dates(uuid, jsonb, uuid);
CREATE OR REPLACE FUNCTION safe_insert_event_dates(
    event_uuid uuid,
    dates_data jsonb,
    user_uuid uuid DEFAULT auth.uid()
)
RETURNS void AS $$
DECLARE
    date_item jsonb;
    start_time_val text;
    end_time_val text;
BEGIN
    -- First, delete existing dates for this event
    DELETE FROM public.event_dates 
    WHERE event_id = event_uuid;
    
    -- Then insert new dates with validation
    FOR date_item IN SELECT * FROM jsonb_array_elements(dates_data)
    LOOP
        -- Validate required fields
        IF NOT (date_item ? 'date' AND date_item ? 'startTime') THEN
            RAISE EXCEPTION 'Each date item must have date and startTime fields';
        END IF;
        
        -- Validate date format
        IF NOT (date_item->>'date' ~ '^\d{4}-\d{2}-\d{2}$') THEN
            RAISE EXCEPTION 'Date must be in YYYY-MM-DD format: %', date_item->>'date';
        END IF;
        
        -- Validate and convert start time
        start_time_val := date_item->>'startTime';
        IF start_time_val IS NULL OR start_time_val = '' THEN
            RAISE EXCEPTION 'Start time cannot be empty';
        END IF;
        
        -- Validate and convert end time (optional)
        end_time_val := date_item->>'endTime';
        IF end_time_val IS NULL OR end_time_val = '' THEN
            end_time_val := start_time_val; -- Use start time as fallback
        END IF;
        
        -- Validate time format (should be HH:MM:SS)
        IF NOT (start_time_val ~ '^\d{2}:\d{2}:\d{2}$') THEN
            RAISE EXCEPTION 'Start time must be in HH:MM:SS format: %', start_time_val;
        END IF;
        
        IF NOT (end_time_val ~ '^\d{2}:\d{2}:\d{2}$') THEN
            RAISE EXCEPTION 'End time must be in HH:MM:SS format: %', end_time_val;
        END IF;
        
        -- Insert the validated data
        INSERT INTO public.event_dates (event_id, event_date, start_time, end_time, created_by)
        VALUES (
            event_uuid,
            (date_item->>'date')::date,
            start_time_val,
            end_time_val,
            user_uuid
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the new function
GRANT EXECUTE ON FUNCTION safe_insert_event_dates(uuid, jsonb, uuid) TO authenticated;

-- 3. Drop and recreate get_event_dates function
DROP FUNCTION IF EXISTS get_event_dates(uuid);
CREATE OR REPLACE FUNCTION get_event_dates(event_uuid uuid)
RETURNS TABLE(
    id uuid,
    event_date date,
    start_time text,
    end_time text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ed.id,
        ed.event_date,
        ed.start_time,
        ed.end_time
    FROM public.event_dates ed
    WHERE ed.event_id = event_uuid
    ORDER BY ed.event_date, ed.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_event_dates(uuid) TO authenticated;

-- 4. Drop and recreate add_event_dates function
DROP FUNCTION IF EXISTS add_event_dates(uuid, jsonb, uuid);
CREATE OR REPLACE FUNCTION add_event_dates(
    event_uuid uuid,
    dates_data jsonb,
    user_uuid uuid DEFAULT auth.uid()
)
RETURNS void AS $$
DECLARE
    date_item jsonb;
BEGIN
    -- First, delete existing dates for this event
    DELETE FROM public.event_dates 
    WHERE event_id = event_uuid;
    
    -- Then insert new dates
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_event_dates(uuid, jsonb, uuid) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_identity_bulk IS 'Returns user identity information for bulk user lookups';
COMMENT ON FUNCTION safe_insert_event_dates IS 'Safely inserts event dates with comprehensive validation';
COMMENT ON FUNCTION get_event_dates IS 'Retrieves event dates for a specific event';
COMMENT ON FUNCTION add_event_dates IS 'Adds event dates for a specific event';
