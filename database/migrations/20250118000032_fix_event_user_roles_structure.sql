-- Fix event_user_roles table structure to match development database
-- This ensures the table has the correct role constraints and structure

-- First, check if the table exists and what its current structure is
DO $$
BEGIN
    -- Check if event_user_roles table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_user_roles') THEN
        RAISE NOTICE 'Creating event_user_roles table...';
        
        CREATE TABLE event_user_roles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(event_id, user_id)
        );
        
        -- Enable RLS
        ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view their own event roles" ON event_user_roles
            FOR SELECT USING (user_id = auth.uid());

        CREATE POLICY "Event creators can manage roles" ON event_user_roles
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM events
                    WHERE id = event_user_roles.event_id
                    AND created_by = auth.uid()
                )
            );
            
        RAISE NOTICE 'event_user_roles table created successfully';
    ELSE
        RAISE NOTICE 'event_user_roles table already exists, checking structure...';
        
        -- Check if the role constraint needs to be updated
        IF EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'event_user_roles_role_check' 
            AND pg_get_constraintdef(oid) LIKE '%admin%, editor%, viewer%'
            AND pg_get_constraintdef(oid) NOT LIKE '%owner%'
        ) THEN
            RAISE NOTICE 'Updating role constraint to include owner role...';
            
            -- Drop the old constraint
            ALTER TABLE event_user_roles DROP CONSTRAINT IF EXISTS event_user_roles_role_check;
            
            -- Add the new constraint with owner role
            ALTER TABLE event_user_roles ADD CONSTRAINT event_user_roles_role_check
                CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));
                
            RAISE NOTICE 'Role constraint updated successfully';
        ELSE
            RAISE NOTICE 'Role constraint is already correct';
        END IF;
        
        -- Ensure RLS is enabled
        ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;
        
        -- Drop and recreate policies to ensure they're correct
        DROP POLICY IF EXISTS "Users can view their own event roles" ON event_user_roles;
        DROP POLICY IF EXISTS "Event creators can manage roles" ON event_user_roles;
        DROP POLICY IF EXISTS "Event owners/admins can manage roles" ON event_user_roles;
        
        CREATE POLICY "Users can view their own event roles" ON event_user_roles
            FOR SELECT USING (user_id = auth.uid());

        CREATE POLICY "Event creators can manage roles" ON event_user_roles
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM events
                    WHERE id = event_user_roles.event_id
                    AND created_by = auth.uid()
                )
            );
            
        RAISE NOTICE 'Policies updated successfully';
    END IF;
END $$;

-- Update any existing 'admin' roles to 'owner' for event creators
UPDATE event_user_roles
SET role = 'owner'
WHERE role = 'admin'
AND user_id IN (
    SELECT created_by FROM events WHERE id = event_user_roles.event_id
);

-- Ensure event creators have 'owner' role in event_user_roles
INSERT INTO event_user_roles (event_id, user_id, role, status)
SELECT
    e.id as event_id,
    e.created_by as user_id,
    'owner' as role,
    'active' as status
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM event_user_roles eur
    WHERE eur.event_id = e.id
    AND eur.user_id = e.created_by
)
ON CONFLICT (event_id, user_id) DO UPDATE SET
    role = 'owner',
    status = 'active',
    updated_at = NOW();
