-- Dashboard Performance Indexes
-- These indexes will significantly speed up dashboard data loading

-- Index for events by user_id (for My Events section)
CREATE INDEX IF NOT EXISTS idx_events_user_id_created_at 
ON events(user_id, created_at DESC);

-- Index for vendor_profiles by user_id (for My Vendor Profiles section)
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_user_id_created_at 
ON vendor_profiles(user_id, created_at DESC);

-- Index for event_invitations by vendor_profile_id and response (for Pending Invitations)
CREATE INDEX IF NOT EXISTS idx_event_invitations_vendor_response 
ON event_invitations(vendor_profile_id, response, invite_timestamp DESC);

-- Index for event_invitations by event_id (for invitation lookups)
CREATE INDEX IF NOT EXISTS idx_event_invitations_event_id 
ON event_invitations(event_id);

-- Index for event_vendors by vendor_id (for Assigned Events)
CREATE INDEX IF NOT EXISTS idx_event_vendors_vendor_id 
ON event_vendors(vendor_id);

-- Composite index for faster joins on events table
CREATE INDEX IF NOT EXISTS idx_events_id_user_id 
ON events(id, user_id);

-- Index for profiles table used in messaging
CREATE INDEX IF NOT EXISTS idx_profiles_id_full_name 
ON profiles(id, full_name);

-- Analyze tables to update query planner statistics
ANALYZE events;
ANALYZE vendor_profiles;
ANALYZE event_invitations;
ANALYZE event_vendors;
ANALYZE profiles;
