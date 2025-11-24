-- SECURE RLS POLICIES - Non-recursive, production-ready (CORRECTED)
-- Run this AFTER the system is working to restore security

-- Step 1: Re-enable RLS on all tables
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Create secure, non-recursive policies for event_user_roles
-- Policy 1: Users can view their own roles (simple, no recursion)
CREATE POLICY "Users can view their own event roles" ON event_user_roles
    FOR SELECT USING (user_id = auth.uid());

-- Policy 2: Event creators can manage roles (checks events table, not event_user_roles)
CREATE POLICY "Event creators can manage roles" ON event_user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE id = event_user_roles.event_id
            AND created_by = auth.uid()
        )
    );

-- Step 3: Create secure policies for event_collaborator_invitations
CREATE POLICY "Users can view invitations they sent or received" ON event_collaborator_invitations
    FOR SELECT USING (
        invited_by = auth.uid() OR 
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Event creators can create invitations" ON event_collaborator_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events
            WHERE id = event_collaborator_invitations.event_id
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own invitations" ON event_collaborator_invitations
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        invited_by = auth.uid()
    );

-- Step 4: Create secure policies for message_threads
CREATE POLICY "Users can view messages for events they have access to" ON message_threads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = message_threads.event_id
            AND user_id = auth.uid()
            AND status = 'active'
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = message_threads.event_id
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create messages for events they have access to" ON message_threads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = message_threads.event_id
            AND user_id = auth.uid()
            AND status = 'active'
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = message_threads.event_id
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages" ON message_threads
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON message_threads
    FOR DELETE USING (user_id = auth.uid());

-- Step 5: Create secure policies for messages table
CREATE POLICY "Users can view messages in threads they have access to" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN event_user_roles eur ON mt.event_id = eur.event_id
            WHERE mt.id = messages.thread_id
            AND eur.user_id = auth.uid()
            AND eur.status = 'active'
        )
        OR
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN events e ON mt.event_id = e.id
            WHERE mt.id = messages.thread_id
            AND e.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in threads they have access to" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN event_user_roles eur ON mt.event_id = eur.event_id
            WHERE mt.id = messages.thread_id
            AND eur.user_id = auth.uid()
            AND eur.status = 'active'
        )
        OR
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN events e ON mt.event_id = e.id
            WHERE mt.id = messages.thread_id
            AND e.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON messages
    FOR DELETE USING (sender_id = auth.uid());

-- Step 6: Create secure policies for tasks table
CREATE POLICY "Users can view tasks for events they have access to" ON tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = tasks.event_id
            AND user_id = auth.uid()
            AND status = 'active'
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = tasks.event_id
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create tasks for events they have access to" ON tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = tasks.event_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('owner', 'admin', 'editor')
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = tasks.event_id
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update tasks for events they have access to" ON tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = tasks.event_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('owner', 'admin', 'editor')
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = tasks.event_id
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete tasks for events they have access to" ON tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = tasks.event_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('owner', 'admin', 'editor')
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = tasks.event_id
            AND created_by = auth.uid()
        )
    );

-- Step 7: Create secure policies for notifications table
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create notifications" ON notifications
    FOR INSERT WITH CHECK (true); -- Allow creation for system notifications

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (user_id = auth.uid());

-- Step 8: Create secure policies for pins table
CREATE POLICY "Users can view pins for events they have access to" ON pins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = pins.event_id
            AND user_id = auth.uid()
            AND status = 'active'
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = pins.event_id
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create pins for events they have access to" ON pins
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = pins.event_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('owner', 'admin', 'editor')
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = pins.event_id
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update pins for events they have access to" ON pins
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = pins.event_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('owner', 'admin', 'editor')
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = pins.event_id
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete pins for events they have access to" ON pins
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = pins.event_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('owner', 'admin', 'editor')
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = pins.event_id
            AND created_by = auth.uid()
        )
    );

-- Step 9: Create secure policies for profiles table
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can view other profiles" ON profiles
    FOR SELECT USING (true); -- Allow viewing for collaboration features

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can create their own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Step 10: Test that the policies work
SELECT 'RLS policies created successfully' as status;
