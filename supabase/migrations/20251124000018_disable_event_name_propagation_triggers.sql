-- CRITICAL FIX: Disable triggers that reference event_name column
-- These triggers are causing "column event_name does not exist" errors during event updates
-- Date: 2025-11-24

SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Drop the problematic triggers that reference event_name
DROP TRIGGER IF EXISTS trg_events_propagate_name_to_ebi ON public.events;
DROP TRIGGER IF EXISTS tri_propagate_event_name ON public.events;

-- Also drop the trigger functions if they're problematic
-- (We'll recreate them later if needed, but without event_name references)
DROP FUNCTION IF EXISTS public.propagate_event_name_to_invitations() CASCADE;
DROP FUNCTION IF EXISTS public._events_propagate_name_to_ebi() CASCADE;

-- Note: These triggers were likely trying to propagate event.name to other tables
-- but they were referencing a non-existent event_name column. If we need this
-- functionality later, we'll recreate them to use the correct column name (name, not event_name)

RESET lock_timeout;
RESET statement_timeout;

