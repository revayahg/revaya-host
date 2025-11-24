-- Drop existing table if it exists to start fresh
DROP TABLE IF EXISTS event_vendors CASCADE;

-- Create basic event_vendors table with only essential columns
CREATE TABLE event_vendors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(event_id, vendor_id)
);

-- Add indexes for better query performance
CREATE INDEX idx_event_vendors_event_id ON event_vendors(event_id);
CREATE INDEX idx_event_vendors_vendor_id ON event_vendors(vendor_id);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_event_vendors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_event_vendors_updated_at
    BEFORE UPDATE ON event_vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_event_vendors_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE event_vendors ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see event_vendors for events they own or vendors they own
CREATE POLICY "Users can view event_vendors for their events or vendors" ON event_vendors
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_vendors.event_id 
            AND events.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM vendor_profiles 
            WHERE vendor_profiles.id = event_vendors.vendor_id 
            AND vendor_profiles.user_id = auth.uid()
        )
    );

-- Policy: Users can only insert event_vendors for events they own
CREATE POLICY "Users can assign vendors to their events" ON event_vendors
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_vendors.event_id 
            AND events.user_id = auth.uid()
        )
    );

-- Policy: Users can update event_vendors for events they own or vendors they own
CREATE POLICY "Users can update event_vendors for their events or vendors" ON event_vendors
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_vendors.event_id 
            AND events.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM vendor_profiles 
            WHERE vendor_profiles.id = event_vendors.vendor_id 
            AND vendor_profiles.user_id = auth.uid()
        )
    );

-- Policy: Users can delete event_vendors for events they own
CREATE POLICY "Users can remove vendors from their events" ON event_vendors
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_vendors.event_id 
            AND events.user_id = auth.uid()
        )
    );
