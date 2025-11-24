-- Create event_vendor_links table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_vendor_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'confirmed', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(event_id, vendor_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_vendor_links_event_id ON event_vendor_links(event_id);
CREATE INDEX IF NOT EXISTS idx_event_vendor_links_vendor_id ON event_vendor_links(vendor_id);
CREATE INDEX IF NOT EXISTS idx_event_vendor_links_status ON event_vendor_links(status);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_event_vendor_links_updated_at ON event_vendor_links;

CREATE TRIGGER update_event_vendor_links_updated_at
    BEFORE UPDATE ON event_vendor_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
