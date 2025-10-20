-- ===================================================================
-- Fix messaging schema - Remove created_by column from message_threads
-- ===================================================================

-- Check if created_by column exists and drop it if present
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'message_threads' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE message_threads DROP COLUMN created_by;
        RAISE NOTICE 'Dropped created_by column from message_threads';
    ELSE
        RAISE NOTICE 'created_by column does not exist in message_threads';
    END IF;
END $$;