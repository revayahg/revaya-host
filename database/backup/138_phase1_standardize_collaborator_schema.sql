-- Phase 1: Database Schema Standardization for Collaboration System
-- This script standardizes field naming and ensures proper relationships

-- Step 1: Standardize field naming - Use 'role' consistently across all tables
-- Update event_collaborator_invitations to use 'role' instead of 'permission_level'

-- First, add the role column if it doesn't exist (it already exists based on schema)
-- and populate it from permission_level
DO $$ 
BEGIN
    -- Update existing records to copy permission_level to role
    UPDATE public.event_collaborator_invitations 
    SET role = permission_level 
    WHERE role IS NULL AND permission_level IS NOT NULL;
    
    -- Set default role for any records that have neither
    UPDATE public.event_collaborator_invitations 
    SET role = 'viewer' 
    WHERE role IS NULL;
END $$;

-- Step 2: Make role column NOT NULL and add proper constraint
ALTER TABLE public.event_collaborator_invitations 
ALTER COLUMN role SET NOT NULL;

-- Add constraint to ensure valid roles
ALTER TABLE public.event_collaborator_invitations 
DROP CONSTRAINT IF EXISTS event_collaborator_invitations_role_check;

ALTER TABLE public.event_collaborator_invitations 
ADD CONSTRAINT event_collaborator_invitations_role_check 
CHECK (role = ANY (ARRAY['viewer'::text, 'editor'::text, 'admin'::text]));

-- Step 3: Ensure event_user_roles has proper role constraint
ALTER TABLE public.event_user_roles 
DROP CONSTRAINT IF EXISTS event_user_roles_role_check;

ALTER TABLE public.event_user_roles 
ADD CONSTRAINT event_user_roles_role_check 
CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text, 'viewer'::text]));

-- Step 4: Clean up duplicate records and add unique constraint for invitations

-- First, identify and clean up duplicate invitations (keep the most recent one)
WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (
               PARTITION BY event_id, email, status 
               ORDER BY created_at DESC
           ) as rn
    FROM public.event_collaborator_invitations
)
DELETE FROM public.event_collaborator_invitations 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE public.event_collaborator_invitations 
DROP CONSTRAINT IF EXISTS unique_pending_invitation_per_event_email;

ALTER TABLE public.event_collaborator_invitations 
ADD CONSTRAINT unique_pending_invitation_per_event_email 
UNIQUE (event_id, email, status) 
DEFERRABLE INITIALLY DEFERRED;

-- Step 5: Clean up duplicate user roles and add unique constraint

-- Clean up duplicate user roles (keep the most recent one)
WITH role_duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (
               PARTITION BY event_id, user_id, status 
               ORDER BY created_at DESC
           ) as rn
    FROM public.event_user_roles
)
DELETE FROM public.event_user_roles 
WHERE id IN (
    SELECT id FROM role_duplicates WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE public.event_user_roles 
DROP CONSTRAINT IF EXISTS unique_active_user_per_event;

ALTER TABLE public.event_user_roles 
ADD CONSTRAINT unique_active_user_per_event 
UNIQUE (event_id, user_id, status) 
DEFERRABLE INITIALLY DEFERRED;

-- Step 6: Update RLS policies for proper cross-table access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view collaborator invitations for their events" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can create collaborator invitations for their events" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can update collaborator invitations for their events" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "Invited users can view their invitations" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "Invited users can update their invitations" ON public.event_collaborator_invitations;

-- Create comprehensive RLS policies for event_collaborator_invitations
CREATE POLICY "Event collaborators can view invitations" ON public.event_collaborator_invitations
FOR SELECT USING (
    -- Event owners/admins can see all invitations
    EXISTS (
        SELECT 1 FROM public.event_user_roles eur 
        WHERE eur.event_id = event_collaborator_invitations.event_id 
        AND eur.user_id = auth.uid() 
        AND eur.role IN ('owner', 'admin')
        AND eur.status = 'active'
    )
    OR
    -- Invited users can see their own invitations
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Event owners and admins can create invitations" ON public.event_collaborator_invitations
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.event_user_roles eur 
        WHERE eur.event_id = event_collaborator_invitations.event_id 
        AND eur.user_id = auth.uid() 
        AND eur.role IN ('owner', 'admin')
        AND eur.status = 'active'
    )
);

CREATE POLICY "Event owners and admins can update invitations" ON public.event_collaborator_invitations
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.event_user_roles eur 
        WHERE eur.event_id = event_collaborator_invitations.event_id 
        AND eur.user_id = auth.uid() 
        AND eur.role IN ('owner', 'admin')
        AND eur.status = 'active'
    )
    OR
    -- Invited users can accept their own invitations
    (email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND status = 'pending')
);

-- Update RLS policies for event_user_roles
DROP POLICY IF EXISTS "Users can view event roles" ON public.event_user_roles;
DROP POLICY IF EXISTS "Users can create event roles" ON public.event_user_roles;
DROP POLICY IF EXISTS "Users can update event roles" ON public.event_user_roles;

CREATE POLICY "Event participants can view roles" ON public.event_user_roles
FOR SELECT USING (
    -- Users can see roles for events they're part of
    EXISTS (
        SELECT 1 FROM public.event_user_roles eur2 
        WHERE eur2.event_id = event_user_roles.event_id 
        AND eur2.user_id = auth.uid() 
        AND eur2.status = 'active'
    )
);

CREATE POLICY "Event owners and admins can manage roles" ON public.event_user_roles
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.event_user_roles eur 
        WHERE eur.event_id = event_user_roles.event_id 
        AND eur.user_id = auth.uid() 
        AND eur.role IN ('owner', 'admin')
        AND eur.status = 'active'
    )
);

-- Step 7: Create helper function to get user display name
CREATE OR REPLACE FUNCTION public.get_user_display_name(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    display_name text;
BEGIN
    SELECT COALESCE(
        NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''),
        SPLIT_PART(au.email, '@', 1)
    ) INTO display_name
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE au.id = user_id;
    
    RETURN COALESCE(display_name, 'Unknown User');
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_user_display_name(uuid) TO authenticated;

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_event_id ON public.event_collaborator_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_email ON public.event_collaborator_invitations(email);
CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_status ON public.event_collaborator_invitations(status);
CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_token ON public.event_collaborator_invitations(invitation_token);

CREATE INDEX IF NOT EXISTS idx_event_user_roles_event_id ON public.event_user_roles(event_id);
CREATE INDEX IF NOT EXISTS idx_event_user_roles_user_id ON public.event_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_event_user_roles_status ON public.event_user_roles(status);

-- Ensure RLS is enabled
ALTER TABLE public.event_collaborator_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_user_roles ENABLE ROW LEVEL SECURITY;