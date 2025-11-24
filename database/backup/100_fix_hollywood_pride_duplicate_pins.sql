-- Fix duplicate pin assignments for My Hollywood Pride event
-- Based on the diagnostic results showing duplicate pins for "TEST The Good Time Group"

-- First, let's see the current state of pins for My Hollywood Pride
SELECT 
    p.id,
    p.event_id,
    p.assignee_vendor_id,
    p.x,
    p.y,
    p.created_at,
    e.name as event_name,
    vp.name as vendor_profile_name
FROM public.pins p
LEFT JOIN public.events e ON p.event_id = e.id
LEFT JOIN public.vendor_profiles vp ON p.assignee_vendor_id = vp.id
WHERE e.name ILIKE '%my hollywood pride%'
ORDER BY p.created_at;

-- Remove duplicate pins, keeping only the most recent one for each vendor
WITH ranked_pins AS (
    SELECT 
        p.id,
        p.event_id,
        p.assignee_vendor_id,
        ROW_NUMBER() OVER (
            PARTITION BY p.event_id, p.assignee_vendor_id 
            ORDER BY p.created_at DESC
        ) as rn
    FROM public.pins p
    LEFT JOIN public.events e ON p.event_id = e.id
    WHERE e.name ILIKE '%my hollywood pride%'
    AND p.assignee_vendor_id IS NOT NULL
)
DELETE FROM public.pins 
WHERE id IN (
    SELECT id FROM ranked_pins WHERE rn > 1
);

-- Note: vendor_name column may not exist in pins table
-- The assignee_vendor_id is the primary reference to vendor_profiles

-- Verify the cleanup results
SELECT 
    p.id,
    p.event_id,
    p.assignee_vendor_id,
    e.name as event_name,
    vp.name as vendor_profile_name,
    'After cleanup' as status
FROM public.pins p
LEFT JOIN public.events e ON p.event_id = e.id
LEFT JOIN public.vendor_profiles vp ON p.assignee_vendor_id = vp.id
WHERE e.name ILIKE '%my hollywood pride%'
ORDER BY p.created_at;
