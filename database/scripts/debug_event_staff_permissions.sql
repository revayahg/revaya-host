-- Debug script to check event ownership and permissions
-- Replace EVENT_ID and USER_EMAIL with actual values

-- Check event ownership
SELECT 
    e.id,
    e.name,
    e.created_by,
    e.user_id,
    u.email as owner_email
FROM events e
LEFT JOIN auth.users u ON u.id = e.created_by OR u.id = e.user_id
WHERE e.id = '8ce6ca22-fe11-4035-8da0-a68a65ede951';

-- Check event_user_roles for this event
SELECT 
    eur.event_id,
    eur.user_id,
    eur.role,
    eur.status,
    u.email
FROM event_user_roles eur
JOIN auth.users u ON u.id = eur.user_id
WHERE eur.event_id = '8ce6ca22-fe11-4035-8da0-a68a65ede951';

-- Check current user
SELECT 
    auth.uid() as current_user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email;

-- Check policies on event_staff
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'event_staff'
ORDER BY policyname;

