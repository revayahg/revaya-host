-- Ensure the event_collaborator_invitations table exists
CREATE TABLE IF NOT EXISTS event_collaborator_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    permission_level TEXT NOT NULL DEFAULT 'viewer',
    status TEXT NOT NULL DEFAULT 'pending',
    invited_by UUID NOT NULL,
    invited_by_name TEXT,
    invitation_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event admins can create invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow invitation updates for acceptance" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Public read for invitation tokens" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event participants can view invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON event_collaborator_invitations;

-- Disable RLS temporarily
ALTER TABLE event_collaborator_invitations DISABLE ROW LEVEL SECURITY;

-- Create simple permissive policy for authenticated users
CREATE POLICY "collaborator_invitations_policy" ON event_collaborator_invitations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON event_collaborator_invitations TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;