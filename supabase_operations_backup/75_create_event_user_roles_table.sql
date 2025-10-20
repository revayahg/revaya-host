-- Create event_user_roles table for managing user access to events
CREATE TABLE IF NOT EXISTS event_user_roles (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('view', 'edit', 'owner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for event_user_roles
-- Users can see roles for events they have access to
CREATE POLICY IF NOT EXISTS "Users can see roles for their events" ON event_user_roles
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM event_user_roles eur 
            WHERE eur.event_id = event_user_roles.event_id 
            AND eur.user_id = auth.uid()
        )
    );

-- Only owners and editors can insert new roles
CREATE POLICY IF NOT EXISTS "Owners and editors can add roles" ON event_user_roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_user_roles eur 
            WHERE eur.event_id = event_user_roles.event_id 
            AND eur.user_id = auth.uid() 
            AND eur.role IN ('owner', 'edit')
        )
    );

-- Only owners and editors can update roles
CREATE POLICY IF NOT EXISTS "Owners and editors can update roles" ON event_user_roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM event_user_roles eur 
            WHERE eur.event_id = event_user_roles.event_id 
            AND eur.user_id = auth.uid() 
            AND eur.role IN ('owner', 'edit')
        )
    );

-- Only owners and editors can delete roles
CREATE POLICY IF NOT EXISTS "Owners and editors can delete roles" ON event_user_roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM event_user_roles eur 
            WHERE eur.event_id = event_user_roles.event_id 
            AND eur.user_id = auth.uid() 
            AND eur.role IN ('owner', 'edit')
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_user_roles_event_id ON event_user_roles(event_id);
CREATE INDEX IF NOT EXISTS idx_event_user_roles_user_id ON event_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_event_user_roles_role ON event_user_roles(role);

-- Create function to automatically add event creator as owner
CREATE OR REPLACE FUNCTION add_event_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO event_user_roles (event_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add event creator as owner
DROP TRIGGER IF EXISTS trigger_add_event_creator_as_owner ON events;
CREATE TRIGGER trigger_add_event_creator_as_owner
    AFTER INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION add_event_creator_as_owner();