-- Clean up legacy event_vendors records (adjust scope as needed)
-- For specific event: DELETE FROM event_vendors WHERE event_id = '<event_id>';
-- For full system migration:
DELETE FROM public.event_vendors;

-- Ensure event_invitations table has all required fields and constraints
ALTER TABLE public.event_invitations 
ADD COLUMN IF NOT EXISTS vendor_profile_id UUID REFERENCES public.vendor_profiles(id) ON DELETE CASCADE;

-- Create unique constraint to prevent duplicate invitations
DROP INDEX IF EXISTS idx_event_invitations_unique_vendor;
CREATE UNIQUE INDEX idx_event_invitations_unique_vendor 
ON public.event_invitations(event_id, vendor_profile_id) 
WHERE response != 'declined';

-- Update policies to ensure proper access
DROP POLICY IF EXISTS "Users can view event invitations" ON public.event_invitations;
CREATE POLICY "Users can view event invitations" ON public.event_invitations
FOR SELECT USING (
    auth.uid() = requesting_user_id OR 
    auth.uid() = receiving_user_id OR
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE id = event_id AND user_id = auth.uid()
    )
);

-- Ensure indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_invitations_event_vendor 
ON public.event_invitations(event_id, vendor_profile_id);

CREATE INDEX IF NOT EXISTS idx_event_invitations_response 
ON public.event_invitations(response);
