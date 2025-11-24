-- Phase 1: Database Schema Standardization for Collaboration System
-- This script fixes field naming inconsistencies and ensures proper relationships

-- Step 1: Fix event_collaborator_invitations table structure
-- Check if permission_level column exists and has conflicting constraint
DO $$ 
BEGIN
    -- Drop conflicting permission_level constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'event_collaborator_invitations_permission_level_check' 
               AND table_name = 'event_collaborator_invitations') THEN
        ALTER TABLE event_collaborator_invitations DROP CONSTRAINT event_collaborator_invitations_permission_level_check;
    END IF;
    
    -- Remove the conflicting permission_level column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'event_collaborator_invitations' 
               AND column_name = 'permission_level') THEN
        ALTER TABLE event_collaborator_invitations DROP COLUMN permission_level CASCADE;
    END IF;
END $$;

-- Ensure the role column allows all necessary values
-- Drop existing role constraint first if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'event_collaborator_invitations_role_check' 
               AND table_name = 'event_collaborator_invitations') THEN
        ALTER TABLE event_collaborator_invitations DROP CONSTRAINT event_collaborator_invitations_role_check;
    END IF;
END $$;

-- Add the correct constraint for role column
ALTER TABLE event_collaborator_invitations 
ADD CONSTRAINT event_collaborator_invitations_role_check 
CHECK (role = ANY (ARRAY['viewer'::text, 'editor'::text, 'admin'::text]));

-- Step 2: Ensure proper foreign key relationships and missing columns
-- Add invited_by_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'event_collaborator_invitations' 
                   AND column_name = 'invited_by_name') THEN
        ALTER TABLE event_collaborator_invitations ADD COLUMN invited_by_name text;
    END IF;
END $$;

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_event_id ON event_collaborator_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_email ON event_collaborator_invitations(email);
CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_token ON event_collaborator_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_event_user_roles_event_user ON event_user_roles(event_id, user_id);

-- Step 3: Update RLS policies for proper cross-table access
-- Drop existing policies that might conflict with comprehensive error handling
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on event_collaborator_invitations
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'event_collaborator_invitations' 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON event_collaborator_invitations';
    END LOOP;
    
    -- Drop all existing policies on event_user_roles
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'event_user_roles' 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON event_user_roles';
    END LOOP;
END $$;

-- Create comprehensive RLS policies for event_collaborator_invitations
-- Allow users to view invitations sent to their email
CREATE POLICY "Users can view invitations for their email" ON event_collaborator_invitations
    FOR SELECT USING (
        email = auth.email() OR
        invited_by = auth.uid()
    );

-- Allow event owners and admins to manage invitations for their events
CREATE POLICY "Event owners can manage invitations" ON event_collaborator_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_collaborator_invitations.event_id 
            AND events.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_user_roles.event_id = event_collaborator_invitations.event_id 
            AND event_user_roles.user_id = auth.uid() 
            AND event_user_roles.role IN ('owner', 'admin', 'editor')
            AND event_user_roles.status = 'active'
        )
    );

-- Allow users to update invitations sent to their email (for accepting/declining)
CREATE POLICY "Users can respond to their invitations" ON event_collaborator_invitations
    FOR UPDATE USING (email = auth.email());

-- Create comprehensive RLS policies for event_user_roles
CREATE POLICY "Event participants can view event roles" ON event_user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_user_roles.event_id 
            AND events.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM event_user_roles eur2
            WHERE eur2.event_id = event_user_roles.event_id 
            AND eur2.user_id = auth.uid() 
            AND eur2.status = 'active'
        )
    );

CREATE POLICY "Event owners and admins can manage roles" ON event_user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_user_roles.event_id 
            AND events.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM event_user_roles eur2
            WHERE eur2.event_id = event_user_roles.event_id 
            AND eur2.user_id = auth.uid() 
            AND eur2.role IN ('owner', 'admin')
            AND eur2.status = 'active'
        )
    );

-- Step 4: Create or update the collaboration invitation function
-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS send_collaborator_invitation(uuid, text, text);
DROP FUNCTION IF EXISTS send_collaborator_invitation(uuid, text);
DROP FUNCTION IF EXISTS send_collaborator_invitation(uuid, text, text, uuid);
DROP FUNCTION IF EXISTS send_collaborator_invitation(uuid, text, text, uuid, text);

CREATE OR REPLACE FUNCTION send_collaborator_invitation(
    p_event_id uuid,
    p_email text,
    p_permission_level text DEFAULT 'viewer'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation_id uuid;
    v_token text;
    v_event_exists boolean;
    v_user_can_invite boolean;
BEGIN
    -- Check if event exists
    SELECT EXISTS(SELECT 1 FROM events WHERE id = p_event_id) INTO v_event_exists;
    
    IF NOT v_event_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event not found');
    END IF;
    
    -- Check if user can invite (event owner or admin/editor)
    SELECT EXISTS(
        SELECT 1 FROM events WHERE id = p_event_id AND user_id = auth.uid()
        UNION
        SELECT 1 FROM event_user_roles 
        WHERE event_id = p_event_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'editor')
        AND status = 'active'
    ) INTO v_user_can_invite;
    
    IF NOT v_user_can_invite THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;
    
    -- Check if invitation already exists for this email and event
    IF EXISTS(
        SELECT 1 FROM event_collaborator_invitations 
        WHERE event_id = p_event_id 
        AND email = p_email 
        AND status = 'pending'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation already exists for this email');
    END IF;
    
    -- Generate new invitation
    v_invitation_id := gen_random_uuid();
    v_token := gen_random_uuid()::text;
    
    -- Insert invitation
    INSERT INTO event_collaborator_invitations (
        id,
        event_id,
        invited_by,
        email,
        role,
        invitation_token,
        status,
        expires_at,
        created_at
    ) VALUES (
        v_invitation_id,
        p_event_id,
        auth.uid(),
        p_email,
        p_permission_level,
        v_token,
        'pending',
        now() + interval '7 days',
        now()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'invitation_id', v_invitation_id,
        'token', v_token
    );
END;
$$;

-- Verify the schema changes
SELECT 
    'event_collaborator_invitations' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'event_collaborator_invitations' 
AND column_name IN ('role', 'permission_level')
ORDER BY column_name;