-- Fix event_collaborator_invitations table structure to match development database
-- This ensures the table has the correct schema and policies

-- Check if the table exists and has the correct structure
DO $$
BEGIN
    -- Check if event_collaborator_invitations table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_collaborator_invitations') THEN
        RAISE NOTICE 'Creating event_collaborator_invitations table...';
        
        CREATE TABLE event_collaborator_invitations (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            email TEXT NOT NULL,
            permission_level TEXT NOT NULL CHECK (permission_level IN ('owner', 'admin', 'editor', 'viewer')),
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
            invited_by UUID NOT NULL REFERENCES auth.users(id),
            invited_by_name TEXT,
            invitation_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            accepted_at TIMESTAMP WITH TIME ZONE,
            expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
            read_status BOOLEAN DEFAULT FALSE,
            UNIQUE(event_id, email)
        );
        
        -- Enable RLS
        ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view invitations they sent or received" ON event_collaborator_invitations
            FOR SELECT USING (
                invited_by = auth.uid() OR 
                email = (SELECT email FROM auth.users WHERE id = auth.uid())
            );

        CREATE POLICY "Event admins can create invitations" ON event_collaborator_invitations
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM event_user_roles 
                    WHERE event_id = event_collaborator_invitations.event_id 
                    AND user_id = auth.uid() 
                    AND role IN ('owner', 'admin')
                )
            );

        CREATE POLICY "Users can update their own invitations" ON event_collaborator_invitations
            FOR UPDATE USING (
                email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
                invited_by = auth.uid()
            );
            
        RAISE NOTICE 'event_collaborator_invitations table created successfully';
    ELSE
        RAISE NOTICE 'event_collaborator_invitations table already exists, checking structure...';
        
        -- Check if permission_level column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'event_collaborator_invitations' 
            AND column_name = 'permission_level'
        ) THEN
            RAISE NOTICE 'Adding permission_level column...';
            ALTER TABLE event_collaborator_invitations ADD COLUMN permission_level TEXT;
            
            -- Update existing records to use role as permission_level
            UPDATE event_collaborator_invitations SET permission_level = COALESCE(role, 'editor');
            
            -- Make it NOT NULL and add constraint
            ALTER TABLE event_collaborator_invitations ALTER COLUMN permission_level SET NOT NULL;
            ALTER TABLE event_collaborator_invitations ADD CONSTRAINT event_collaborator_invitations_permission_level_check
                CHECK (permission_level IN ('owner', 'admin', 'editor', 'viewer'));
        END IF;
        
        -- Check if read_status column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'event_collaborator_invitations' 
            AND column_name = 'read_status'
        ) THEN
            RAISE NOTICE 'Adding read_status column...';
            ALTER TABLE event_collaborator_invitations ADD COLUMN read_status BOOLEAN DEFAULT FALSE;
        END IF;
        
        -- Ensure RLS is enabled
        ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;
        
        -- Drop and recreate policies to ensure they're correct
        DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON event_collaborator_invitations;
        DROP POLICY IF EXISTS "Event admins can create invitations" ON event_collaborator_invitations;
        DROP POLICY IF EXISTS "Users can update their own invitations" ON event_collaborator_invitations;
        DROP POLICY IF EXISTS "Allow invitation updates for acceptance" ON event_collaborator_invitations;
        DROP POLICY IF EXISTS "Public read for invitation tokens" ON event_collaborator_invitations;
        DROP POLICY IF EXISTS "Event participants can view invitations" ON event_collaborator_invitations;
        DROP POLICY IF EXISTS "Allow authenticated users full access" ON event_collaborator_invitations;
        DROP POLICY IF EXISTS "collaborator_invitations_policy" ON event_collaborator_invitations;
        
        CREATE POLICY "Users can view invitations they sent or received" ON event_collaborator_invitations
            FOR SELECT USING (
                invited_by = auth.uid() OR 
                email = (SELECT email FROM auth.users WHERE id = auth.uid())
            );

        CREATE POLICY "Event admins can create invitations" ON event_collaborator_invitations
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM event_user_roles 
                    WHERE event_id = event_collaborator_invitations.event_id 
                    AND user_id = auth.uid() 
                    AND role IN ('owner', 'admin')
                )
            );

        CREATE POLICY "Users can update their own invitations" ON event_collaborator_invitations
            FOR UPDATE USING (
                email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
                invited_by = auth.uid()
            );
            
        RAISE NOTICE 'Policies updated successfully';
    END IF;
END $$;
