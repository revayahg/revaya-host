-- Fix Event Ownership and Collaborator Association
-- Complete rewrite to handle UUID/text type issues properly

-- First, verify and fix the events table structure
DO $$
BEGIN
    -- Ensure events table has proper created_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.events ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

    -- Ensure events table has proper user_id column for backward compatibility
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.events ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Sync created_by with user_id where missing
UPDATE public.events 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

UPDATE public.events 
SET user_id = created_by 
WHERE user_id IS NULL AND created_by IS NOT NULL;

-- Ensure event_user_roles table exists with UUID user_id column
DROP TABLE IF EXISTS event_user_roles CASCADE;

CREATE TABLE event_user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_event_user_roles_event_id ON event_user_roles(event_id);
CREATE INDEX idx_event_user_roles_user_id ON event_user_roles(user_id);
CREATE INDEX idx_event_user_roles_status ON event_user_roles(status);

-- Enable RLS on event_user_roles
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies for event_user_roles
CREATE POLICY "event_user_roles_all_policy" ON event_user_roles
    FOR ALL USING (
        -- Users can access their own roles or roles in events they participate in
        user_id = auth.uid()
        OR
        event_id IN (
            SELECT id FROM events WHERE created_by = auth.uid()
        )
        OR
        event_id IN (
            SELECT event_id FROM event_user_roles 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Create trigger function to add event creator as admin
CREATE OR REPLACE FUNCTION add_event_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Add event creator as admin in event_user_roles
    INSERT INTO event_user_roles (event_id, user_id, role, status)
    VALUES (NEW.id, NEW.created_by, 'admin', 'active')
    ON CONFLICT (event_id, user_id) DO UPDATE SET
        role = 'admin',
        status = 'active',
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_add_event_creator_as_admin ON events;

-- Create trigger to automatically add event creator as admin
CREATE TRIGGER trigger_add_event_creator_as_admin
    AFTER INSERT ON events
    FOR EACH ROW
    WHEN (NEW.created_by IS NOT NULL)
    EXECUTE FUNCTION add_event_creator_as_admin();

-- Backfill existing events to ensure all creators have admin roles
INSERT INTO event_user_roles (event_id, user_id, role, status)
SELECT 
    e.id, 
    COALESCE(e.created_by, e.user_id), 
    'admin', 
    'active'
FROM events e
WHERE COALESCE(e.created_by, e.user_id) IS NOT NULL
ON CONFLICT (event_id, user_id) DO UPDATE SET
    role = 'admin',
    status = 'active',
    updated_at = NOW();

-- Grant permissions
GRANT ALL ON event_user_roles TO authenticated;