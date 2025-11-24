-- Create access_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS access_codes (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create access_visits table if it doesn't exist
CREATE TABLE IF NOT EXISTS access_visits (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    code TEXT NOT NULL,
    login_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample access code if not exists
INSERT INTO access_codes (code, active) 
VALUES ('MHP2026', true)
ON CONFLICT (code) DO NOTHING;

-- Enable RLS
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_visits ENABLE ROW LEVEL SECURITY;

-- Create policies for access_codes (read-only for authenticated users)
CREATE POLICY IF NOT EXISTS "Anyone can read active codes" ON access_codes
    FOR SELECT USING (active = true);

-- Create policies for access_visits (users can insert and update their own)
CREATE POLICY IF NOT EXISTS "Anyone can insert visits" ON access_visits
    FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can update their own visits" ON access_visits
    FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_active ON access_codes(active);
CREATE INDEX IF NOT EXISTS idx_access_visits_session_id ON access_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_access_visits_code ON access_visits(code);