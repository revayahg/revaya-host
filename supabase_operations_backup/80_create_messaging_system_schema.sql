-- Complete Event Messaging System Schema
-- This creates a scalable messaging system scoped to events and vendor profiles

-- 1. Create message_threads table
-- This stores conversation threads scoped to events and vendor profiles
CREATE TABLE IF NOT EXISTS message_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL,
    subject TEXT DEFAULT 'Event Discussion',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add vendor_profile_id column if it doesn't exist (as TEXT for consistency)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'message_threads' 
                   AND column_name = 'vendor_profile_id') THEN
        ALTER TABLE message_threads ADD COLUMN vendor_profile_id TEXT;
    ELSE
        -- If column exists as UUID, convert it to TEXT
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'message_threads' 
                   AND column_name = 'vendor_profile_id'
                   AND data_type = 'uuid') THEN
            ALTER TABLE message_threads ALTER COLUMN vendor_profile_id TYPE TEXT USING vendor_profile_id::TEXT;
        END IF;
    END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'message_threads_event_vendor_unique' 
                   AND table_name = 'message_threads') THEN
        ALTER TABLE message_threads ADD CONSTRAINT message_threads_event_vendor_unique 
        UNIQUE(event_id, vendor_profile_id);
    END IF;
END $$;

-- 2. Create messages table 
-- This stores individual messages within threads, sender identified by context
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false,
    sender_type TEXT CHECK (sender_type IN ('planner', 'vendor')) DEFAULT 'planner',
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add sender_vendor_profile_id column if it doesn't exist (as TEXT for consistency)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' 
                   AND column_name = 'sender_vendor_profile_id') THEN
        ALTER TABLE messages ADD COLUMN sender_vendor_profile_id TEXT;
    ELSE
        -- If column exists as UUID, convert it to TEXT
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' 
                   AND column_name = 'sender_vendor_profile_id'
                   AND data_type = 'uuid') THEN
            ALTER TABLE messages ALTER COLUMN sender_vendor_profile_id TYPE TEXT USING sender_vendor_profile_id::TEXT;
        END IF;
    END IF;
END $$;

-- 3. Remove message_participants table and dependent policies
-- First drop all policies that depend on message_participants
DROP POLICY IF EXISTS "Users can view threads they participate in" ON message_threads;
DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can update messages they can access" ON messages;
DROP POLICY IF EXISTS "View message threads" ON message_threads;
DROP POLICY IF EXISTS "View messages" ON messages;
DROP POLICY IF EXISTS "Create messages" ON messages;

-- Now safely drop the table
DROP TABLE IF EXISTS message_participants CASCADE;

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_threads_event_id ON message_threads(event_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_vendor_profile_id ON message_threads(vendor_profile_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_event_id ON messages(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_vendor_profile_id ON messages(sender_vendor_profile_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 5. Add updated_at trigger for message_threads
CREATE OR REPLACE FUNCTION update_message_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_message_threads_updated_at ON message_threads;
CREATE TRIGGER update_message_threads_updated_at
    BEFORE UPDATE ON message_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_message_thread_timestamp();

-- 6. Enable RLS on all tables
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
