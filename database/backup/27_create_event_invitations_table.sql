-- Create event_invitations table with vendor_profile_id as canonical vendor reference
CREATE TABLE IF NOT EXISTS public.event_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_invitation_link TEXT UNIQUE NOT NULL,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    vendor_profile_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
    requesting_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiving_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_timestamp TIMESTAMPTZ DEFAULT NOW(),
    email_delivery_status TEXT DEFAULT 'pending',
    email_opened BOOLEAN DEFAULT false,
    response TEXT DEFAULT 'pending' CHECK (response IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own invitations" ON public.event_invitations
    FOR SELECT USING (
        auth.uid() = requesting_user_id OR 
        auth.uid() = receiving_user_id
    );

CREATE POLICY "Event owners can create invitations" ON public.event_invitations
    FOR INSERT WITH CHECK (
        auth.uid() = requesting_user_id AND
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE id = event_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Recipients can update their response" ON public.event_invitations
    FOR UPDATE USING (auth.uid() = receiving_user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_invitations_event_id ON public.event_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_vendor_profile ON public.event_invitations(vendor_profile_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_receiving_user ON public.event_invitations(receiving_user_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_link ON public.event_invitations(event_invitation_link);

-- Create unique constraint to prevent duplicate invitations
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_invitations_unique 
ON public.event_invitations(event_id, vendor_profile_id) 
WHERE response != 'declined';
