-- First, drop the constraint (which will also drop the associated index)
ALTER TABLE public.event_invitations 
DROP CONSTRAINT IF EXISTS unique_event_vendor_invite;

-- Drop any other existing indexes
DROP INDEX IF EXISTS idx_event_invitations_unique;
DROP INDEX IF EXISTS idx_event_invitations_unique_pending_accepted;

-- Clean up any duplicate invitations that might exist
DELETE FROM public.event_invitations a 
USING public.event_invitations b 
WHERE a.id > b.id 
AND a.event_id = b.event_id 
AND a.vendor_profile_id = b.vendor_profile_id;

-- Create a new, properly named unique constraint that allows re-inviting declined vendors
-- This constraint only applies to non-declined invitations
DROP INDEX IF EXISTS idx_event_invitations_active_only;
CREATE UNIQUE INDEX idx_event_invitations_active_only 
ON public.event_invitations(event_id, vendor_profile_id) 
WHERE (response IS NULL OR response != 'declined');

-- Add missing columns to event_invitations table if they don't exist
ALTER TABLE public.event_invitations 
ADD COLUMN IF NOT EXISTS requesting_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS event_name TEXT;

-- Update existing records to have requesting_user_id from events table
UPDATE public.event_invitations 
SET requesting_user_id = e.user_id
FROM public.events e 
WHERE public.event_invitations.event_id = e.id 
AND public.event_invitations.requesting_user_id IS NULL;

-- Create a function to handle invitation upserts properly
CREATE OR REPLACE FUNCTION upsert_event_invitation(
    p_event_id UUID,
    p_vendor_profile_id UUID,
    p_receiving_user_id UUID,
    p_requesting_user_id UUID,
    p_vendor_name TEXT,
    p_vendor_email TEXT,
    p_event_name TEXT
) RETURNS UUID AS $$
DECLARE
    invitation_id UUID;
    invitation_link TEXT;
BEGIN
    -- Generate a unique invitation link
    invitation_link := 'inv_' || encode(gen_random_bytes(16), 'hex');
    
    -- First, delete any existing declined invitations
    DELETE FROM public.event_invitations 
    WHERE event_id = p_event_id 
    AND vendor_profile_id = p_vendor_profile_id 
    AND response = 'declined';
    
    -- Then insert the new invitation
    INSERT INTO public.event_invitations (
        event_id,
        vendor_profile_id,
        receiving_user_id,
        requesting_user_id,
        vendor_name,
        vendor_email,
        event_name,
        event_invitation_link,
        response,
        email_delivery_status,
        invite_timestamp,
        created_at
    ) VALUES (
        p_event_id,
        p_vendor_profile_id,
        p_receiving_user_id,
        p_requesting_user_id,
        p_vendor_name,
        p_vendor_email,
        p_event_name,
        invitation_link,
        'pending',
        'queued',
        NOW(),
        NOW()
    )
    ON CONFLICT (event_id, vendor_profile_id) 
    WHERE (response IS NULL OR response != 'declined')
    DO UPDATE SET
        response = 'pending',
        invite_timestamp = NOW(),
        created_at = NOW(),
        vendor_name = p_vendor_name,
        vendor_email = p_vendor_email,
        event_name = p_event_name,
        email_delivery_status = 'queued'
    RETURNING id INTO invitation_id;
    
    RETURN invitation_id;
END;
$$ LANGUAGE plpgsql;
