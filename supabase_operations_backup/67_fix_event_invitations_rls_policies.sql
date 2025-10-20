-- Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.event_invitations;
DROP POLICY IF EXISTS "Event owners can create invitations" ON public.event_invitations;
DROP POLICY IF EXISTS "Recipients can update their response" ON public.event_invitations;

-- Create more permissive policies for event invitations
CREATE POLICY "Users can view invitations they are involved in" ON public.event_invitations
    FOR SELECT USING (
        auth.uid() = requesting_user_id OR 
        auth.uid() = receiving_user_id OR
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE id = event_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Event owners can create invitations for their events" ON public.event_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE id = event_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update invitation responses" ON public.event_invitations
    FOR UPDATE USING (
        auth.uid() = receiving_user_id OR
        auth.uid() = requesting_user_id OR
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE id = event_id AND user_id = auth.uid()
        )
    );

-- Ensure the table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_invitations_composite 
ON public.event_invitations(event_id, requesting_user_id, receiving_user_id);

-- Add a function to debug RLS issues
CREATE OR REPLACE FUNCTION debug_invitation_access(
    p_event_id UUID,
    p_requesting_user_id UUID,
    p_receiving_user_id UUID
) RETURNS JSON AS $$
DECLARE
    result JSON;
    current_user_id UUID;
    event_owner UUID;
    can_insert BOOLEAN;
BEGIN
    current_user_id := auth.uid();
    
    SELECT user_id INTO event_owner 
    FROM public.events 
    WHERE id = p_event_id;
    
    can_insert := (current_user_id = event_owner);
    
    result := json_build_object(
        'current_user', current_user_id,
        'event_owner', event_owner,
        'event_id', p_event_id,
        'requesting_user', p_requesting_user_id,
        'receiving_user', p_receiving_user_id,
        'can_insert', can_insert,
        'is_event_owner', (current_user_id = event_owner)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;