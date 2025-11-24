-- Fix the unique constraint to allow re-inviting vendors who have declined
-- Drop the existing problematic constraint
DROP INDEX IF EXISTS idx_event_invitations_unique;

-- Create a new constraint that only prevents duplicates for pending/accepted invitations
-- This allows vendors who declined to be invited again
CREATE UNIQUE INDEX idx_event_invitations_unique_pending_accepted 
ON public.event_invitations(event_id, vendor_profile_id) 
WHERE response IN ('pending', 'accepted') OR response IS NULL;

-- Also create a function to clean up old declined invitations when creating new ones
CREATE OR REPLACE FUNCTION cleanup_declined_invitations()
RETURNS TRIGGER AS $$
BEGIN
    -- If we're inserting a new invitation, delete any old declined ones for the same event/vendor
    IF TG_OP = 'INSERT' THEN
        DELETE FROM public.event_invitations 
        WHERE event_id = NEW.event_id 
        AND vendor_profile_id = NEW.vendor_profile_id 
        AND response = 'declined'
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically clean up declined invitations
DROP TRIGGER IF EXISTS cleanup_declined_invitations_trigger ON public.event_invitations;
CREATE TRIGGER cleanup_declined_invitations_trigger
    AFTER INSERT ON public.event_invitations
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_declined_invitations();

-- Clean up any existing duplicate declined invitations
DELETE FROM public.event_invitations a 
USING public.event_invitations b 
WHERE a.id < b.id 
AND a.event_id = b.event_id 
AND a.vendor_profile_id = b.vendor_profile_id 
AND a.response = 'declined' 
AND b.response = 'declined';