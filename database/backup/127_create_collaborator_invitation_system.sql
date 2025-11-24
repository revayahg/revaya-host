-- Create collaborator invitations table if not exists
CREATE TABLE IF NOT EXISTS event_collaborator_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    permission_level TEXT NOT NULL CHECK (permission_level IN ('viewer', 'editor', 'admin')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    invited_by_name TEXT,
    invitation_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(event_id, email)
);

-- Enable RLS
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view invitations they sent or received" ON event_collaborator_invitations
    FOR SELECT USING (
        invited_by = auth.uid() OR 
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Event admins can create invitations" ON event_collaborator_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_id = event_collaborator_invitations.event_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can update their own invitations" ON event_collaborator_invitations
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        invited_by = auth.uid()
    );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_token ON event_collaborator_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_email ON event_collaborator_invitations(email);
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_event ON event_collaborator_invitations(event_id);