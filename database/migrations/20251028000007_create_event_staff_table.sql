-- Create event_staff table for staff management
-- Migration: 20251028000007_create_event_staff_table.sql

-- Create event_staff table
CREATE TABLE IF NOT EXISTS event_staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- Changed from 'task' to 'role' to avoid confusion with tasks table
    shift TEXT,
    contact TEXT, -- Can store phone or email
    confirmed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_staff_event_id ON event_staff(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_confirmed ON event_staff(confirmed);
CREATE INDEX IF NOT EXISTS idx_event_staff_role ON event_staff(role);
CREATE INDEX IF NOT EXISTS idx_event_staff_shift ON event_staff(shift);

-- Enable RLS
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_staff

-- Policy: Users can view staff for events they collaborate on
CREATE POLICY "Users can view staff for events they collaborate on" ON event_staff
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_staff.event_id 
            AND (
                events.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                )
            )
        )
    );

-- Policy: Users can insert staff for events they own or edit
CREATE POLICY "Users can insert staff for events they own or edit" ON event_staff
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_staff.event_id 
            AND (
                events.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                    AND event_collaborator_invitations.permission_level IN ('editor', 'owner')
                )
            )
        )
    );

-- Policy: Users can update staff for events they own or edit
CREATE POLICY "Users can update staff for events they own or edit" ON event_staff
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_staff.event_id 
            AND (
                events.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                    AND event_collaborator_invitations.permission_level IN ('editor', 'owner')
                )
            )
        )
    );

-- Policy: Users can delete staff for events they own or edit
CREATE POLICY "Users can delete staff for events they own or edit" ON event_staff
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_staff.event_id 
            AND (
                events.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                    AND event_collaborator_invitations.permission_level IN ('editor', 'owner')
                )
            )
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_event_staff_updated_at 
    BEFORE UPDATE ON event_staff 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add created_by and updated_by triggers
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = auth.uid();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_event_staff_created_by
    BEFORE INSERT ON event_staff
    FOR EACH ROW
    EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_event_staff_updated_by
    BEFORE UPDATE ON event_staff
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_by();
