-- Fix invitation response access for anonymous users
-- This allows the invitation acceptance flow to work properly

-- First, ensure the event_invitations table exists with proper structure
CREATE TABLE IF NOT EXISTS event_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    vendor_email TEXT NOT NULL,
    vendor_profile_id UUID,
    invited_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    response TEXT CHECK (response IN ('accept', 'decline')),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the table
ALTER TABLE event_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous read for invitation responses" ON event_invitations;
DROP POLICY IF EXISTS "Allow anonymous update for invitation responses" ON event_invitations;
DROP POLICY IF EXISTS "Allow authenticated users to read invitations" ON event_invitations;
DROP POLICY IF EXISTS "Allow authenticated users to manage invitations" ON event_invitations;

-- Create new policies that allow anonymous access for invitation responses
CREATE POLICY "Allow anonymous read for invitation responses" 
ON event_invitations 
FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anonymous update for invitation responses" 
ON event_invitations 
FOR UPDATE 
TO anon 
USING (true)
WITH CHECK (true);

-- Also allow authenticated users full access
CREATE POLICY "Allow authenticated users full access to invitations" 
ON event_invitations 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_invitations_id ON event_invitations(id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_email ON event_invitations(vendor_email);
CREATE INDEX IF NOT EXISTS idx_event_invitations_event_id ON event_invitations(event_id);

-- Add a function to safely update invitation responses
CREATE OR REPLACE FUNCTION update_invitation_response(
    invitation_id UUID,
    new_response TEXT
) RETURNS JSON AS $$
DECLARE
    result JSON;
    invitation_record RECORD;
BEGIN
    -- Validate response
    IF new_response NOT IN ('accept', 'decline') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid response. Must be accept or decline.'
        );
    END IF;

    -- Check if invitation exists
    SELECT * INTO invitation_record 
    FROM event_invitations 
    WHERE id = invitation_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invitation not found.'
        );
    END IF;

    -- Update the invitation
    UPDATE event_invitations 
    SET 
        response = new_response,
        status = CASE WHEN new_response = 'accept' THEN 'accepted' ELSE 'declined' END,
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = invitation_id;

    -- Return success
    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'id', invitation_id,
            'response', new_response,
            'event_id', invitation_record.event_id,
            'vendor_email', invitation_record.vendor_email
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION update_invitation_response(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_invitation_response(UUID, TEXT) TO authenticated;