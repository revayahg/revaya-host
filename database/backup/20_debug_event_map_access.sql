-- Debug query to check event map URLs and storage access
-- Run this in Supabase SQL Editor to debug map image issues

-- Check if events have map_image_url data
SELECT 
    id,
    name,
    map_image_url,
    created_at,
    user_id
FROM events 
WHERE map_image_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Check if vendor_profiles exist and are accessible
SELECT 
    vp.id,
    vp.name,
    vp.company,
    vp.user_id,
    ev.event_id
FROM vendor_profiles vp
LEFT JOIN event_vendors ev ON vp.id = ev.vendor_id
WHERE ev.event_id IS NOT NULL
ORDER BY vp.created_at DESC
LIMIT 10;

-- Check event_vendors relationships
SELECT 
    ev.event_id,
    ev.vendor_id,
    e.name as event_name,
    vp.name as vendor_name,
    vp.company as vendor_company
FROM event_vendors ev
JOIN events e ON ev.event_id = e.id
JOIN vendor_profiles vp ON ev.vendor_id = vp.id
ORDER BY ev.created_at DESC
LIMIT 10;

-- Check storage bucket policies (if using Supabase storage)
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name LIKE '%image%' OR name LIKE '%map%' OR name LIKE '%event%';
