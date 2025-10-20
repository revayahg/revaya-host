-- Enhance event_invitations table to support email-based invitations
-- Add columns for email-based invitations that don't require existing user accounts

-- Add invited_email column if it doesn't exist
ALTER TABLE event_invitations 
ADD COLUMN IF NOT EXISTS invited_email TEXT;

-- Add invite_type column to distinguish between vendor and event invitations
ALTER TABLE event_invitations 
ADD COLUMN IF NOT EXISTS invite_type TEXT DEFAULT 'vendor' CHECK (invite_type IN ('vendor', 'event'));

-- Make user_id nullable to support pending email invitations
ALTER TABLE event_invitations 
ALTER COLUMN user_id DROP NOT NULL;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_event_invitations_invited_email 
ON event_invitations(invited_email);

-- Create index for invite type
CREATE INDEX IF NOT EXISTS idx_event_invitations_invite_type 
ON event_invitations(invite_type);

-- Update RLS policies to handle email-based invitations
DROP POLICY IF EXISTS "Users can see their event invitations" ON event_invitations;
CREATE POLICY "Users can see their event invitations" ON event_invitations
    FOR SELECT USING (
        user_id = auth.uid() OR
        invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_invitations.event_id 
            AND e.user_id = auth.uid()
        )
    );

-- Function to link pending email invitations when user signs up
CREATE OR REPLACE FUNCTION link_pending_invitations()
RETURNS TRIGGER AS $$
BEGIN
    -- Link pending event invitations to the new user
    UPDATE event_invitations 
    SET user_id = NEW.id 
    WHERE invited_email = NEW.email 
    AND user_id IS NULL 
    AND invite_type = 'event';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically link invitations when user signs up
DROP TRIGGER IF EXISTS trigger_link_pending_invitations ON auth.users;
CREATE TRIGGER trigger_link_pending_invitations
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION link_pending_invitations();

-- Function to get event participants including pending email invitations
CREATE OR REPLACE FUNCTION get_event_participants(event_uuid BIGINT)
RETURNS TABLE (
    participant_id TEXT,
    user_id UUID,
    email TEXT,
    display_name TEXT,
    role TEXT,
    source TEXT,
    status_display TEXT,
    invitation_id BIGINT
) AS $$
BEGIN
    RETURN QUERY
    -- Get users with roles
    SELECT 
        'role_' || eur.id::TEXT as participant_id,
        eur.user_id,
        COALESCE(p.email, au.email) as email,
        COALESCE(p.first_name || ' ' || p.last_name, p.display_name, au.email) as display_name,
        eur.role,
        'event_role' as source,
        'Active' as status_display,
        NULL::BIGINT as invitation_id
    FROM event_user_roles eur
    LEFT JOIN auth.users au ON eur.user_id = au.id
    LEFT JOIN profiles p ON eur.user_id = p.id
    WHERE eur.event_id = event_uuid
    
    UNION ALL
    
    -- Get pending email invitations (no user_id yet)
    SELECT 
        'invite_' || ei.id::TEXT as participant_id,
        ei.user_id,
        ei.invited_email as email,
        ei.invited_email as display_name,
        'view' as role,
        'pending_event_invite' as source,
        CASE 
            WHEN ei.response = 'pending' THEN 'Pending Signup'
            WHEN ei.response = 'accepted' THEN 'Accepted (Pending Signup)'
            WHEN ei.response = 'declined' THEN 'Declined'
            ELSE 'Pending Signup'
        END as status_display,
        ei.id as invitation_id
    FROM event_invitations ei
    WHERE ei.event_id = event_uuid 
    AND ei.invite_type = 'event'
    AND ei.user_id IS NULL
    AND ei.invited_email IS NOT NULL;
END;
$$ LANGUAGE plpgsql;