-- Create table for event collaborator invitations
CREATE TABLE IF NOT EXISTS event_collaborator_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    collaborator_email TEXT NOT NULL,
    inviter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    UNIQUE(event_id, collaborator_email)
);

-- Enable RLS
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view collaborator invitations for their events" ON event_collaborator_invitations
    FOR SELECT USING (
        inviter_user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_collaborator_invitations.event_id 
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create collaborator invitations for their events" ON event_collaborator_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_collaborator_invitations.event_id 
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update collaborator invitations for their events" ON event_collaborator_invitations
    FOR UPDATE USING (
        inviter_user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_collaborator_invitations.event_id 
            AND events.user_id = auth.uid()
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_event_id ON event_collaborator_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_email ON event_collaborator_invitations(collaborator_email);
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_status ON event_collaborator_invitations(status);