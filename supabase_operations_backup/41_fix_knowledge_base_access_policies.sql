-- Update knowledge_documents policies to allow access for assigned vendors

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view documents for events they have access to" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can insert documents for events they own" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can update documents for events they own" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can delete documents for events they own" ON knowledge_documents;

-- Create new policies that allow access for both event owners and assigned vendors
CREATE POLICY "Users can view documents for events they have access to" ON knowledge_documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        (
            -- Event owner can access
            event_id IN (
                SELECT id FROM events 
                WHERE user_id = auth.uid()
            )
            OR
            -- Assigned vendors can access
            event_id IN (
                SELECT DISTINCT ei.event_id 
                FROM event_invitations ei
                JOIN vendor_profiles vp ON ei.vendor_profile_id = vp.id
                WHERE vp.user_id = auth.uid()
                AND ei.response = 'accepted'
            )
        )
    );

CREATE POLICY "Users can insert documents for events they have access to" ON knowledge_documents
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        auth.uid() = uploaded_by AND
        (
            -- Event owner can upload
            event_id IN (
                SELECT id FROM events 
                WHERE user_id = auth.uid()
            )
            OR
            -- Assigned vendors can upload
            event_id IN (
                SELECT DISTINCT ei.event_id 
                FROM event_invitations ei
                JOIN vendor_profiles vp ON ei.vendor_profile_id = vp.id
                WHERE vp.user_id = auth.uid()
                AND ei.response = 'accepted'
            )
        )
    );

CREATE POLICY "Users can update documents for events they have access to" ON knowledge_documents
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        (
            -- Event owner can update
            event_id IN (
                SELECT id FROM events 
                WHERE user_id = auth.uid()
            )
            OR
            -- Assigned vendors can update their own uploads
            (
                uploaded_by = auth.uid() AND
                event_id IN (
                    SELECT DISTINCT ei.event_id 
                    FROM event_invitations ei
                    JOIN vendor_profiles vp ON ei.vendor_profile_id = vp.id
                    WHERE vp.user_id = auth.uid()
                    AND ei.response = 'accepted'
                )
            )
        )
    );

CREATE POLICY "Users can delete documents for events they have access to" ON knowledge_documents
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND
        (
            -- Event owner can delete any document
            event_id IN (
                SELECT id FROM events 
                WHERE user_id = auth.uid()
            )
            OR
            -- Assigned vendors can delete their own uploads
            (
                uploaded_by = auth.uid() AND
                event_id IN (
                    SELECT DISTINCT ei.event_id 
                    FROM event_invitations ei
                    JOIN vendor_profiles vp ON ei.vendor_profile_id = vp.id
                    WHERE vp.user_id = auth.uid()
                    AND ei.response = 'accepted'
                )
            )
        )
    );

-- Grant necessary permissions
GRANT ALL ON knowledge_documents TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
