-- Update vendor table to add visibility fields
ALTER TABLE IF EXISTS vendors
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visibility_settings JSONB DEFAULT '{"profile": false, "portfolio": false, "contact": false}'::jsonb,
ADD COLUMN IF NOT EXISTS searchable BOOLEAN DEFAULT false;

-- Add index for faster visibility filtering
CREATE INDEX IF NOT EXISTS idx_vendors_visibility ON vendors (is_public, searchable);

-- Add comment for documentation
COMMENT ON COLUMN vendors.is_public IS 'Whether the vendor profile is publicly visible';
COMMENT ON COLUMN vendors.visibility_settings IS 'Granular control over which parts of profile are visible';
COMMENT ON COLUMN vendors.searchable IS 'Whether the vendor appears in search results';
