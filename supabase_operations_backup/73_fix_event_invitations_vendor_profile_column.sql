-- Ensure vendor_profile_id column exists in event_invitations
ALTER TABLE event_invitations 
ADD COLUMN IF NOT EXISTS vendor_profile_id UUID;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_event_invitations_vendor_profile 
ON event_invitations(vendor_profile_id);

-- Update existing records to populate vendor_profile_id if missing
UPDATE event_invitations 
SET vendor_profile_id = vp.id
FROM vendor_profiles vp 
WHERE event_invitations.vendor_email = vp.email 
AND event_invitations.vendor_profile_id IS NULL;