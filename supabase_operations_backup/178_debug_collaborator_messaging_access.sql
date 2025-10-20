-- Debug queries to check collaborator messaging access
-- Run these to diagnose the exact issue with user booking.thiago@gmail.com

-- 1. Check if the user exists and get their ID
SELECT 
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'booking.thiago@gmail.com';

-- 2. Check if user has a profile
SELECT 
  id,
  email,
  first_name,
  last_name,
  created_at
FROM profiles 
WHERE email = 'booking.thiago@gmail.com';

-- 3. Find the test event
SELECT 
  id,
  name,
  title,
  created_by,
  user_id
FROM events 
WHERE name ILIKE '%test eventvadgagfaafgag%'
   OR title ILIKE '%test eventvadgagfaafgag%';

-- 4. Check collaborator status (replace event_id with actual ID from step 3)
-- Replace 'EVENT_ID_HERE' with the actual event ID from step 3
SELECT 
  eur.id,
  eur.event_id,
  eur.user_id,
  eur.role,
  eur.status,
  eur.created_at,
  p.email as user_email
FROM event_user_roles eur
LEFT JOIN profiles p ON p.id = eur.user_id
WHERE eur.event_id = 'EVENT_ID_HERE'  -- Replace with actual event ID
ORDER BY eur.created_at;

-- 5. Check pending collaborator invitations
SELECT 
  eci.id,
  eci.event_id,
  eci.email,
  eci.role,
  eci.status,
  eci.created_at,
  eci.invitation_token
FROM event_collaborator_invitations eci
WHERE eci.email = 'booking.thiago@gmail.com'
ORDER BY eci.created_at DESC;

-- 6. Check message threads for the event
SELECT 
  mt.id,
  mt.event_id,
  mt.subject,
  mt.created_at
FROM message_threads mt
WHERE mt.event_id = 'EVENT_ID_HERE'  -- Replace with actual event ID
ORDER BY mt.created_at;

-- 7. Check message participants
SELECT 
  mp.thread_id,
  mp.user_id,
  mp.last_read_at,
  p.email as user_email
FROM message_participants mp
LEFT JOIN profiles p ON p.id = mp.user_id
WHERE mp.thread_id IN (
  SELECT id FROM message_threads WHERE event_id = 'EVENT_ID_HERE'  -- Replace with actual event ID
);

-- 8. Test RLS policies for messaging (run this as the problematic user)
-- This will show what the current user can see
SELECT 
  'message_threads' as table_name,
  COUNT(*) as accessible_records
FROM message_threads
WHERE event_id = 'EVENT_ID_HERE'  -- Replace with actual event ID

UNION ALL

SELECT 
  'messages' as table_name,
  COUNT(*) as accessible_records
FROM messages
WHERE thread_id IN (
  SELECT id FROM message_threads WHERE event_id = 'EVENT_ID_HERE'  -- Replace with actual event ID
);

-- Instructions:
-- 1. Replace 'EVENT_ID_HERE' with the actual event ID from query #3
-- 2. Run each query individually to debug the access issue
-- 3. Pay attention to whether the user has active collaborator status
-- 4. Check if message threads exist and if the user can access them