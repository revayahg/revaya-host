-- ===================================================================
-- Messaging System V2 - Database Schema Setup
-- ===================================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS message_participants CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS message_threads CASCADE;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS create_event_group_thread(UUID);

-- ===================================================================
-- 1. MESSAGE THREADS TABLE
-- ===================================================================
CREATE TABLE message_threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    subject TEXT DEFAULT 'Event Team Chat',
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Ensure one thread per event
    UNIQUE(event_id)
);

-- Index for performance
CREATE INDEX idx_message_threads_event_id ON message_threads(event_id);
CREATE INDEX idx_message_threads_last_message_at ON message_threads(last_message_at DESC);

-- ===================================================================
-- 2. MESSAGES TABLE
-- ===================================================================
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (LENGTH(TRIM(body)) > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Enforce 12-month retention via constraint
    CONSTRAINT messages_recent_only CHECK (
        created_at >= (NOW() - INTERVAL '12 months')
    )
);

-- Indexes for performance
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- ===================================================================
-- 3. MESSAGE PARTICIPANTS TABLE
-- ===================================================================
CREATE TABLE message_participants (
    thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (thread_id, user_id)
);

-- Index for performance
CREATE INDEX idx_message_participants_user_id ON message_participants(user_id);

-- ===================================================================
-- 4. RLS POLICIES
-- ===================================================================

-- Enable RLS on all tables
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;