-- Diagnostic script to check vendor assignments for My Hollywood Pride event
-- and clean up any orphaned or duplicate records

-- First, find the My Hollywood Pride event
SELECT 
    id as event_id,
    name as event_name,
    user_id as event_owner,
    created_at
FROM public.events 
WHERE name ILIKE '%hollywood%pride%' 
OR name ILIKE '%my hollywood pride%';

-- Check event_invitations table for this event
SELECT 
    ei.id,
    ei.event_id,
    ei.vendor_profile_id,
    ei.vendor_name,
    ei.vendor_email,
    ei.response,
    ei.invite_timestamp,
    e.name as event_name
FROM public.event_invitations ei
JOIN public.events e ON ei.event_id = e.id
WHERE e.name ILIKE '%hollywood%pride%' 
OR e.name ILIKE '%my hollywood pride%';

-- Check if "Drag Queen Party Bus" is still in vendor_profiles
SELECT 
    id,
    name,
    company,
    email,
    user_id,
    created_at
FROM public.vendor_profiles 
WHERE name ILIKE '%drag%queen%party%bus%' 
OR company ILIKE '%drag%queen%party%bus%';

-- Check event_vendors table for any lingering records
SELECT 
    ev.id,
    ev.event_id,
    ev.vendor_id,
    ev.vendor_name,
    e.name as event_name,
    vp.name as vendor_profile_name
FROM public.event_vendors ev
LEFT JOIN public.events e ON ev.event_id = e.id
LEFT JOIN public.vendor_profiles vp ON ev.vendor_id = vp.id
WHERE e.name ILIKE '%hollywood%pride%' 
OR e.name ILIKE '%my hollywood pride%'
OR ev.vendor_name ILIKE '%drag%queen%party%bus%';

-- Check tasks assigned to vendors for this event
SELECT 
    t.id,
    t.event_id,
    t.title,
    t.assignee_vendor_id,
    t.assigned_to,
    e.name as event_name,
    vp.name as vendor_name
FROM public.tasks t
LEFT JOIN public.events e ON t.event_id = e.id
LEFT JOIN public.vendor_profiles vp ON t.assignee_vendor_id = vp.id
WHERE e.name ILIKE '%hollywood%pride%' 
OR e.name ILIKE '%my hollywood pride%'
OR t.assigned_to ILIKE '%drag%queen%party%bus%';

-- Check pins assigned to vendors for this event
SELECT 
    p.id,
    p.event_id,
    p.assignee_vendor_id,
    p.vendor_name,
    e.name as event_name,
    vp.name as vendor_profile_name
FROM public.pins p
LEFT JOIN public.events e ON p.event_id = e.id
LEFT JOIN public.vendor_profiles vp ON p.assignee_vendor_id = vp.id
WHERE e.name ILIKE '%hollywood%pride%' 
OR e.name ILIKE '%my hollywood pride%'
OR p.vendor_name ILIKE '%drag%queen%party%bus%';

-- CLEANUP SCRIPT (uncomment to execute cleanup)
-- Clean up any orphaned invitations for Drag Queen Party Bus
/*
DELETE FROM public.event_invitations 
WHERE vendor_name ILIKE '%drag%queen%party%bus%'
AND event_id IN (
    SELECT id FROM public.events 
    WHERE name ILIKE '%hollywood%pride%' 
    OR name ILIKE '%my hollywood pride%'
);

-- Clean up any orphaned event_vendors records
DELETE FROM public.event_vendors 
WHERE vendor_name ILIKE '%drag%queen%party%bus%'
AND event_id IN (
    SELECT id FROM public.events 
    WHERE name ILIKE '%hollywood%pride%' 
    OR name ILIKE '%my hollywood pride%'
);

-- Clean up any orphaned tasks
UPDATE public.tasks 
SET assignee_vendor_id = NULL, assigned_to = NULL
WHERE assigned_to ILIKE '%drag%queen%party%bus%'
AND event_id IN (
    SELECT id FROM public.events 
    WHERE name ILIKE '%hollywood%pride%' 
    OR name ILIKE '%my hollywood pride%'
);

-- Clean up any orphaned pins
UPDATE public.pins 
SET assignee_vendor_id = NULL, vendor_name = NULL
WHERE vendor_name ILIKE '%drag%queen%party%bus%'
AND event_id IN (
    SELECT id FROM public.events 
    WHERE name ILIKE '%hollywood%pride%' 
    OR name ILIKE '%my hollywood pride%'
);
*/