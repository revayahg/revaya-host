-- Add support_staff_needed column to events table
-- This field will store the number of support staff needed for an event

-- Add the column
ALTER TABLE events
ADD COLUMN IF NOT EXISTS support_staff_needed INTEGER DEFAULT NULL;

-- Add a comment to describe the column
COMMENT ON COLUMN events.support_staff_needed IS 'Number of support staff needed for the event';

-- Add a check constraint to ensure the value is positive if provided
ALTER TABLE events
DROP CONSTRAINT IF EXISTS check_support_staff_needed_positive;
ALTER TABLE events
ADD CONSTRAINT check_support_staff_needed_non_negative
CHECK (support_staff_needed IS NULL OR support_staff_needed >= 0);

-- Update existing events to have NULL for support_staff_needed (no default value needed)
-- This is already handled by the DEFAULT NULL in the column definition
