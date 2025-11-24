-- Drop the existing function with old parameters
DROP FUNCTION IF EXISTS upsert_event_invitation(uuid,uuid,uuid,uuid,text,text,text);

-- Add missing columns to event_invitations table if they don't exist
ALTER TABLE public.event_invitations 
ADD COLUMN IF NOT EXISTS event_name TEXT,
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS vendor_email TEXT;

-- Update existing records to have proper event_name from events table
UPDATE public.event_invitations 
SET event_name = e.name
FROM public.events e 
WHERE public.event_invitations.event_id = e.id 
AND public.event_invitations.event_name IS NULL;

-- Create a new function with correct parameter names matching the database schema
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
    existing_invitation UUID;
BEGIN
    -- Check if there's already an active invitation for this event-vendor pair
    SELECT id INTO existing_invitation 
    FROM public.event_invitations 
    WHERE event_id = p_event_id 
    AND vendor_profile_id = p_vendor_profile_id 
    AND (response IS NULL OR response != 'declined');
    
    -- If there's an existing active invitation, update it instead of creating new one
    IF existing_invitation IS NOT NULL THEN
        UPDATE public.event_invitations 
        SET 
            response = 'pending',
            email_delivery_status = 'pending',
            invite_timestamp = NOW(),
            updated_at = NOW(),
            vendor_name = p_vendor_name,
            vendor_email = p_vendor_email,
            event_name = p_event_name,
            receiving_user_id = p_receiving_user_id,
            requesting_user_id = p_requesting_user_id
        WHERE id = existing_invitation;
        
        RETURN existing_invitation;
    END IF;
    
    -- Generate a unique invitation link
    invitation_link := 'inv_' || encode(gen_random_bytes(16), 'hex');
    
    -- Clean up any declined invitations first
    DELETE FROM public.event_invitations 
    WHERE event_id = p_event_id 
    AND vendor_profile_id = p_vendor_profile_id 
    AND response = 'declined';
    
    -- Insert new invitation
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
        'pending',
        NOW(),
        NOW()
    )
    RETURNING id INTO invitation_id;
    
    RETURN invitation_id;
END;
$$ LANGUAGE plpgsql;

-- Create proper unique constraint for active invitations
DROP INDEX IF EXISTS idx_event_invitations_active_only;
CREATE UNIQUE INDEX idx_event_invitations_active_only 
ON public.event_invitations(event_id, vendor_profile_id) 
WHERE (response IS NULL OR response != 'declined');

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION upsert_event_invitation TO authenticated;