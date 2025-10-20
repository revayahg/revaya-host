-- Fix messaging system constraints to match application logic
-- The error indicates we need a proper unique constraint for the upsert operation

-- First, drop the existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'message_threads_event_vendor_unique' 
               AND table_name = 'message_threads') THEN
        ALTER TABLE message_threads DROP CONSTRAINT message_threads_event_vendor_unique;
    END IF;
END $$;

-- Create a proper unique constraint that includes subject for vendor-to-vendor chats
-- This allows multiple threads per event+vendor combination with different subjects
ALTER TABLE message_threads 
ADD CONSTRAINT message_threads_event_vendor_subject_unique 
UNIQUE(event_id, vendor_profile_id, subject);

-- Also create an index for performance
CREATE INDEX IF NOT EXISTS idx_message_threads_event_vendor_subject 
ON message_threads(event_id, vendor_profile_id, subject);

-- Verify the constraint was created
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'message_threads' 
AND constraint_type = 'UNIQUE';