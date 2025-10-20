-- Add vendor info columns to event_invitations table for pending display
ALTER TABLE event_invitations 
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS vendor_email TEXT;

-- Update existing records to have vendor info from vendor_profiles
UPDATE event_invitations 
SET 
    vendor_name = vp.name,
    vendor_email = vp.email
FROM vendor_profiles vp 
WHERE event_invitations.vendor_profile_id = vp.id 
AND event_invitations.vendor_name IS NULL;