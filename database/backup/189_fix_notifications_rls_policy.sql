-- BULLETPROOF NOTIFICATIONS RLS POLICY
-- Start from first principles with proper UUID casting

-- Drop the old policy completely
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;

-- Create dead-simple, bulletproof policy
CREATE POLICY "notifications_insert_policy" ON notifications
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND (
    -- Allow sending to self
    auth.uid() = notifications.user_id::uuid

    -- Or allow if both users are collaborators on the same event
    OR (
      notifications.event_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM event_user_roles AS sender
        WHERE sender.event_id = notifications.event_id
          AND sender.user_id::uuid = auth.uid()
          AND sender.status IN ('active', 'invited')
      )
      AND EXISTS (
        SELECT 1 FROM event_user_roles AS recipient
        WHERE recipient.event_id = notifications.event_id
          AND recipient.user_id::uuid = notifications.user_id::uuid
          AND recipient.status IN ('active', 'invited')
      )
    )
  )
);

-- Verify the policy was created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'notifications' 
AND policyname = 'notifications_insert_policy';

-- DEBUG: Check the actual data to see why policy is failing

-- 1. Check if sender (b50c5c1c-0248-49a5-8851-226dd5f1d80c) has role in event
SELECT 
  'SENDER ROLE CHECK' AS check_type,
  event_id, 
  user_id, 
  role, 
  status,
  user_id::uuid AS user_id_as_uuid,
  'b50c5c1c-0248-49a5-8851-226dd5f1d80c'::uuid AS target_sender_uuid
FROM event_user_roles 
WHERE event_id = 'ca788fe9-3c75-44bf-b92b-b2b8c12dcc97'
  AND user_id::uuid = 'b50c5c1c-0248-49a5-8851-226dd5f1d80c'::uuid;

-- 2. Check if recipient (4a59dba5-7215-4a06-9b78-97669788d029) has role in event  
SELECT 
  'RECIPIENT ROLE CHECK' AS check_type,
  event_id, 
  user_id, 
  role, 
  status,
  user_id::uuid AS user_id_as_uuid,
  '4a59dba5-7215-4a06-9b78-97669788d029'::uuid AS target_recipient_uuid
FROM event_user_roles 
WHERE event_id = 'ca788fe9-3c75-44bf-b92b-b2b8c12dcc97'
  AND user_id::uuid = '4a59dba5-7215-4a06-9b78-97669788d029'::uuid;

-- 3. Check what auth.uid() returns in this context
SELECT 
  'AUTH CHECK' AS check_type,
  auth.uid() AS current_auth_uid,
  auth.role() AS current_auth_role;

-- 4. Show all event_user_roles for this event to see the full picture
SELECT 
  'ALL EVENT ROLES' AS check_type,
  event_id, 
  user_id, 
  role, 
  status,
  user_id::uuid AS user_id_as_uuid
FROM event_user_roles 
WHERE event_id = 'ca788fe9-3c75-44bf-b92b-b2b8c12dcc97';

-- 5. Test the exact policy logic manually
SELECT 
  'POLICY TEST' AS check_type,
  (auth.role() = 'authenticated') AS auth_check,
  (auth.uid() = '4a59dba5-7215-4a06-9b78-97669788d029'::uuid) AS self_send_check,
  ('ca788fe9-3c75-44bf-b92b-b2b8c12dcc97' IS NOT NULL) AS event_id_check,
  EXISTS (
    SELECT 1 FROM event_user_roles AS sender
    WHERE sender.event_id = 'ca788fe9-3c75-44bf-b92b-b2b8c12dcc97'
      AND sender.user_id::uuid = auth.uid()
      AND sender.status IN ('active', 'invited')
  ) AS sender_exists,
  EXISTS (
    SELECT 1 FROM event_user_roles AS recipient
    WHERE recipient.event_id = 'ca788fe9-3c75-44bf-b92b-b2b8c12dcc97'
      AND recipient.user_id::uuid = '4a59dba5-7215-4a06-9b78-97669788d029'::uuid
      AND recipient.status IN ('active', 'invited')
  ) AS recipient_exists;
