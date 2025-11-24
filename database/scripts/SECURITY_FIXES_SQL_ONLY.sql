-- SECURITY FIXES FOR PRODUCTION DEPLOYMENT
-- Fix function search_path security issues
-- Run this script in Supabase SQL Editor

-- 1. Fix safe_insert_event_dates
CREATE OR REPLACE FUNCTION public.safe_insert_event_dates(
    event_id_param UUID,
    event_dates_param JSONB
)
RETURNS TABLE(inserted_count INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    date_item JSONB;
    inserted_count INTEGER := 0;
    error_message TEXT := '';
BEGIN
    -- Validate input
    IF event_id_param IS NULL THEN
        RETURN QUERY SELECT 0, 'Event ID cannot be null';
        RETURN;
    END IF;
    
    IF event_dates_param IS NULL OR jsonb_array_length(event_dates_param) = 0 THEN
        RETURN QUERY SELECT 0, 'Event dates cannot be null or empty';
        RETURN;
    END IF;
    
    -- Loop through dates and insert
    FOR date_item IN SELECT * FROM jsonb_array_elements(event_dates_param)
    LOOP
        BEGIN
            INSERT INTO public.event_dates (
                event_id,
                event_date,
                start_time,
                end_time,
                created_at,
                updated_at
            ) VALUES (
                event_id_param,
                (date_item->>'date')::DATE,
                (date_item->>'startTime')::TIME,
                (date_item->>'endTime')::TIME,
                NOW(),
                NOW()
            );
            
            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                error_message := 'Error inserting date: ' || date_item->>'date' || ' - ' || SQLERRM;
                RETURN QUERY SELECT inserted_count, error_message;
                RETURN;
        END;
    END LOOP;
    
    RETURN QUERY SELECT inserted_count, error_message;
END;
$$;

-- 2. Fix get_event_dates
CREATE OR REPLACE FUNCTION public.get_event_dates(event_id_param UUID)
RETURNS TABLE(
    id UUID,
    event_date DATE,
    start_time TIME,
    end_time TIME
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ed.id,
        ed.event_date,
        ed.start_time,
        ed.end_time
    FROM public.event_dates ed
    WHERE ed.event_id = event_id_param
    ORDER BY ed.event_date ASC, ed.start_time ASC;
END;
$$;

-- 3. Fix add_event_dates
CREATE OR REPLACE FUNCTION public.add_event_dates(
    event_id_param UUID,
    dates_json JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    date_item JSONB;
BEGIN
    -- Validate input
    IF event_id_param IS NULL THEN
        RAISE EXCEPTION 'Event ID cannot be null';
    END IF;
    
    IF dates_json IS NULL OR jsonb_array_length(dates_json) = 0 THEN
        RAISE EXCEPTION 'Dates JSON cannot be null or empty';
    END IF;
    
    -- Delete existing dates for this event
    DELETE FROM public.event_dates WHERE event_id = event_id_param;
    
    -- Insert new dates
    FOR date_item IN SELECT * FROM jsonb_array_elements(dates_json)
    LOOP
        INSERT INTO public.event_dates (
            event_id,
            event_date,
            start_time,
            end_time,
            created_at,
            updated_at
        ) VALUES (
            event_id_param,
            (date_item->>'date')::DATE,
            (date_item->>'startTime')::TIME,
            (date_item->>'endTime')::TIME,
            NOW(),
            NOW()
        );
    END LOOP;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error adding event dates: %', SQLERRM;
END;
$$;

-- 4. Fix validate_access_code
CREATE OR REPLACE FUNCTION public.validate_access_code(
    code_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate input
    IF code_param IS NULL OR TRIM(code_param) = '' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if access code exists and is valid
    RETURN EXISTS (
        SELECT 1 
        FROM public.access_codes 
        WHERE code = TRIM(code_param) 
        AND is_active = TRUE 
        AND (expires_at IS NULL OR expires_at > NOW())
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- 5. Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.raw_user_meta_data->>'avatar_url',
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- 6. Fix get_user_profile
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id_param UUID)
RETURNS TABLE(
    id UUID,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.avatar_url,
        p.created_at,
        p.updated_at
    FROM public.profiles p
    WHERE p.id = user_id_param;
END;
$$;

-- 7. Fix update_full_name
CREATE OR REPLACE FUNCTION public.update_full_name(
    user_id_param UUID,
    new_full_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate input
    IF user_id_param IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF new_full_name IS NULL OR TRIM(new_full_name) = '' THEN
        RAISE EXCEPTION 'Full name cannot be null or empty';
    END IF;
    
    -- Update the profile
    UPDATE public.profiles 
    SET 
        full_name = TRIM(new_full_name),
        updated_at = NOW()
    WHERE id = user_id_param;
    
    -- Return success if row was updated
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error updating full name: %', SQLERRM;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.safe_insert_event_dates(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_dates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_event_dates(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_access_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_full_name(UUID, TEXT) TO authenticated;
