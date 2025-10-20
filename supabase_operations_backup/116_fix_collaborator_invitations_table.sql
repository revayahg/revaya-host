-- Drop existing table if it exists
DROP TABLE IF EXISTS event_collaborator_invitations CASCADE;

-- Create event_collaborator_invitations table with correct column names
CREATE TABLE event_collaborator_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    permission_level TEXT NOT NULL CHECK (permission_level IN ('view_only', 'can_edit')),
    invitation_token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate invitations
CREATE UNIQUE INDEX unique_pending_invitation 
ON event_collaborator_invitations (event_id, email) 
WHERE status = 'pending';

-- Create indexes for performance
CREATE INDEX idx_collaborator_invitations_event_id ON event_collaborator_invitations(event_id);
CREATE INDEX idx_collaborator_invitations_email ON event_collaborator_invitations(email);
CREATE INDEX idx_collaborator_invitations_token ON event_collaborator_invitations(invitation_token);
CREATE INDEX idx_collaborator_invitations_status ON event_collaborator_invitations(status);

-- Enable RLS
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view invitations for their events" ON event_collaborator_invitations
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM events WHERE created_by = auth.uid()
            UNION
            SELECT event_id FROM event_user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'can_edit')
        )
    );

CREATE POLICY "Users can create invitations for their events" ON event_collaborator_invitations
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT id FROM events WHERE created_by = auth.uid()
            UNION
            SELECT event_id FROM event_user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'can_edit')
        )
    );

CREATE POLICY "Users can update invitations for their events" ON event_collaborator_invitations
    FOR UPDATE USING (
        event_id IN (
            SELECT id FROM events WHERE created_by = auth.uid()
            UNION
            SELECT event_id FROM event_user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'can_edit')
        )
    );