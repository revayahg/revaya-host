-- Create pins table for event map pin management
CREATE TABLE IF NOT EXISTS pins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    x NUMERIC NOT NULL,
    y NUMERIC NOT NULL,
    assignee_vendor_id UUID REFERENCES vendor_profiles(id) ON DELETE SET NULL,
    vendor_name TEXT,
    visible_to_vendor BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pins_event_id ON pins(event_id);
CREATE INDEX IF NOT EXISTS idx_pins_assignee_vendor_id ON pins(assignee_vendor_id);
CREATE INDEX IF NOT EXISTS idx_pins_created_at ON pins(created_at);

-- Enable RLS
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Event creators can manage pins for their events" ON pins
    FOR ALL USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Assigned vendors can view their pins" ON pins
    FOR SELECT USING (
        assignee_vendor_id IN (
            SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
        )
        AND visible_to_vendor = true
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pins_updated_at
    BEFORE UPDATE ON pins
    FOR EACH ROW
    EXECUTE FUNCTION update_pins_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON pins TO authenticated;
GRANT USAGE ON SEQUENCE pins_id_seq TO authenticated;

-- Add comments
COMMENT ON TABLE pins IS 'Map pins for events with vendor assignment support';
COMMENT ON COLUMN pins.assignee_vendor_id IS 'References vendor_profiles.id for vendor-specific pins';
COMMENT ON COLUMN pins.visible_to_vendor IS 'Controls whether assigned vendor can see this pin';
COMMENT ON COLUMN pins.x IS 'X coordinate as percentage of map width';
COMMENT ON COLUMN pins.y IS 'Y coordinate as percentage of map height';
