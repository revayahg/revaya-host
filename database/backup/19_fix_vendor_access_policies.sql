-- Fix RLS policies to allow proper vendor access to events and tasks

-- 1. Fix event_vendors table policies
DROP POLICY IF EXISTS "Users can view event vendor assignments" ON event_vendors;
CREATE POLICY "Users can view event vendor assignments" ON event_vendors
    FOR SELECT USING (
        -- Event creators can see all assignments
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
        OR
        -- Vendors can see their own assignments
        vendor_id IN (
            SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
        )
    );

-- 2. Fix events table policies for vendor access
DROP POLICY IF EXISTS "Vendors can view assigned events" ON events;
CREATE POLICY "Vendors can view assigned events" ON events
    FOR SELECT USING (
        -- Event creators can see their events
        user_id = auth.uid()
        OR
        -- Vendors can see events they're assigned to
        id IN (
            SELECT event_id FROM event_vendors 
            WHERE vendor_id IN (
                SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
            )
        )
    );

-- 3. Fix tasks table policies
DROP POLICY IF EXISTS "Users can view tasks for their events" ON tasks;
CREATE POLICY "Users can view tasks for their events" ON tasks
    FOR SELECT USING (
        -- Event creators can see all tasks for their events
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
        OR
        -- Vendors can see tasks assigned to them
        (assignee_vendor_id IN (
            SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
        ) AND visible_to_vendor = true)
    );

-- 4. Ensure vendor_profiles table has proper access
DROP POLICY IF EXISTS "Users can view vendor profiles" ON vendor_profiles;
CREATE POLICY "Users can view vendor profiles" ON vendor_profiles
    FOR SELECT USING (
        -- Users can see their own profile
        user_id = auth.uid()
        OR
        -- Event creators can see profiles of assigned vendors
        id IN (
            SELECT vendor_id FROM event_vendors 
            WHERE event_id IN (
                SELECT id FROM events WHERE user_id = auth.uid()
            )
        )
    );

-- 5. Grant necessary permissions
GRANT SELECT ON events TO authenticated;
GRANT SELECT ON event_vendors TO authenticated;
GRANT SELECT ON tasks TO authenticated;
GRANT SELECT ON vendor_profiles TO authenticated;

-- 6. Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_event_vendors_lookup ON event_vendors(vendor_id, event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_vendor_assignment ON tasks(assignee_vendor_id, visible_to_vendor);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_user_id ON vendor_profiles(user_id);

-- 7. Test query to verify vendor can access assigned events
-- This should return events for the current vendor
SELECT 
    e.id,
    e.name,
    ev.created_at as assigned_at
FROM events e
JOIN event_vendors ev ON e.id = ev.event_id
JOIN vendor_profiles vp ON ev.vendor_id = vp.id
WHERE vp.user_id = auth.uid();
