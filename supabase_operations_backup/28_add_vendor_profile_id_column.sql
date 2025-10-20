-- Add vendor_profile_id column to existing event_invitations table
ALTER TABLE public.event_invitations 
ADD COLUMN IF NOT EXISTS vendor_profile_id UUID REFERENCES public.vendor_profiles(id) ON DELETE CASCADE;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_event_invitations_vendor_profile_new 
ON public.event_invitations(vendor_profile_id);

-- Backfill vendor_profile_id for existing records (if any)
-- This assumes receiving_user_id matches the user_id in vendor_profiles
UPDATE public.event_invitations 
SET vendor_profile_id = (
    SELECT vp.id 
    FROM public.vendor_profiles vp 
    WHERE vp.user_id = event_invitations.receiving_user_id
    LIMIT 1
)
WHERE vendor_profile_id IS NULL;

-- Create unique constraint to prevent duplicate invitations by vendor_profile_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_invitations_unique_vendor 
ON public.event_invitations(event_id, vendor_profile_id) 
WHERE response != 'declined';

-- Make vendor_profile_id NOT NULL after backfill
ALTER TABLE public.event_invitations 
ALTER COLUMN vendor_profile_id SET NOT NULL;
