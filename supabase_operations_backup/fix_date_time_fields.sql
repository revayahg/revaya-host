-- Fix date/time fields to handle null values and empty strings properly
-- This migration ensures robust handling of event dates and times

-- First, let's check if we have any existing data with empty strings in date fields
-- and clean them up

-- Update events table to handle null dates properly
UPDATE public.events 
SET start_date = NULL 
WHERE start_date = '' OR start_date IS NULL;

UPDATE public.events 
SET end_date = NULL 
WHERE end_date = '' OR end_date IS NULL;

UPDATE public.events 
SET date = NULL 
WHERE date = '' OR date IS NULL;

-- Update event_dates table to handle null times properly
UPDATE public.event_dates 
SET start_time = NULL 
WHERE start_time = '' OR start_time IS NULL;

UPDATE public.event_dates 
SET end_time = NULL 
WHERE end_time = '' OR end_time IS NULL;

-- Add constraints to prevent empty strings in date/time fields
-- This will prevent future issues with empty string dates

-- Add check constraints to events table
ALTER TABLE public.events 
ADD CONSTRAINT check_start_date_not_empty 
CHECK (start_date IS NULL OR start_date != '');

ALTER TABLE public.events 
ADD CONSTRAINT check_end_date_not_empty 
CHECK (end_date IS NULL OR end_date != '');

ALTER TABLE public.events 
ADD CONSTRAINT check_date_not_empty 
CHECK (date IS NULL OR date != '');

-- Add check constraints to event_dates table
ALTER TABLE public.event_dates 
ADD CONSTRAINT check_start_time_not_empty 
CHECK (start_time IS NULL OR start_time != '');

ALTER TABLE public.event_dates 
ADD CONSTRAINT check_end_time_not_empty 
CHECK (end_time IS NULL OR end_time != '');

-- Add check constraints for proper date format (YYYY-MM-DD)
ALTER TABLE public.events 
ADD CONSTRAINT check_start_date_format 
CHECK (start_date IS NULL OR start_date ~ '^\d{4}-\d{2}-\d{2}$');

ALTER TABLE public.events 
ADD CONSTRAINT check_end_date_format 
CHECK (end_date IS NULL OR end_date ~ '^\d{4}-\d{2}-\d{2}$');

ALTER TABLE public.events 
ADD CONSTRAINT check_date_format 
CHECK (date IS NULL OR date ~ '^\d{4}-\d{2}-\d{2}$');

ALTER TABLE public.event_dates 
ADD CONSTRAINT check_event_date_format 
CHECK (event_date ~ '^\d{4}-\d{2}-\d{2}$');

-- Add check constraints for proper time format (HH:MM:SS)
ALTER TABLE public.event_dates 
ADD CONSTRAINT check_start_time_format 
CHECK (start_time IS NULL OR start_time ~ '^\d{2}:\d{2}:\d{2}$');

ALTER TABLE public.event_dates 
ADD CONSTRAINT check_end_time_format 
CHECK (end_time IS NULL OR end_time ~ '^\d{2}:\d{2}:\d{2}$');

-- Create a function to safely insert event dates with validation
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

-- Create a function to validate and clean event data before updates
CREATE OR REPLACE FUNCTION validate_event_dates(
    start_date_val text,
    end_date_val text,
    legacy_date_val text
)
RETURNS jsonb AS $$
DECLARE
    result jsonb := '{}';
BEGIN
    -- Clean and validate start_date
    IF start_date_val IS NOT NULL AND start_date_val != '' THEN
        IF NOT (start_date_val ~ '^\d{4}-\d{2}-\d{2}$') THEN
            RAISE EXCEPTION 'Invalid start_date format: %', start_date_val;
        END IF;
        result := result || jsonb_build_object('start_date', start_date_val);
        result := result || jsonb_build_object('date', start_date_val); -- Keep legacy field in sync
    END IF;
    
    -- Clean and validate end_date
    IF end_date_val IS NOT NULL AND end_date_val != '' THEN
        IF NOT (end_date_val ~ '^\d{4}-\d{2}-\d{2}$') THEN
            RAISE EXCEPTION 'Invalid end_date format: %', end_date_val;
        END IF;
        result := result || jsonb_build_object('end_date', end_date_val);
    END IF;
    
    -- Clean and validate legacy date field
    IF legacy_date_val IS NOT NULL AND legacy_date_val != '' THEN
        IF NOT (legacy_date_val ~ '^\d{4}-\d{2}-\d{2}$') THEN
            RAISE EXCEPTION 'Invalid date format: %', legacy_date_val;
        END IF;
        result := result || jsonb_build_object('date', legacy_date_val);
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the validation function
GRANT EXECUTE ON FUNCTION validate_event_dates(text, text, text) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION safe_insert_event_dates IS 'Safely inserts event dates with comprehensive validation to prevent empty string and format errors';
COMMENT ON FUNCTION validate_event_dates IS 'Validates and cleans event date fields before database updates';
