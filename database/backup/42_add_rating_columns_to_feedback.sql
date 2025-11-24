-- Update feedback table to match the widget field names
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS user_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS user_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- Update the table to use consistent column names
DO $$
BEGIN
    -- Check if old columns exist and rename them if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'name') THEN
        ALTER TABLE feedback RENAME COLUMN name TO user_name;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'email') THEN
        ALTER TABLE feedback RENAME COLUMN email TO user_email;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'feedback') THEN
        ALTER TABLE feedback RENAME COLUMN feedback TO message;
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        -- Columns already exist, do nothing
        NULL;
END $$;

-- Ensure all required columns exist with correct names
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS user_name VARCHAR(255) NOT NULL DEFAULT 'Anonymous',
ADD COLUMN IF NOT EXISTS user_email VARCHAR(255) NOT NULL DEFAULT 'anonymous@example.com',
ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS easy_to_use INTEGER CHECK (easy_to_use >= 0 AND easy_to_use <= 5) DEFAULT 0,
ADD COLUMN IF NOT EXISTS visually_appealing INTEGER CHECK (visually_appealing >= 0 AND visually_appealing <= 5) DEFAULT 0,
ADD COLUMN IF NOT EXISTS works_as_expected INTEGER CHECK (works_as_expected >= 0 AND works_as_expected <= 5) DEFAULT 0,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update policies to allow anonymous feedback submission
DROP POLICY IF EXISTS "Anyone can insert feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON feedback;

-- Allow anyone to insert feedback (including anonymous users)
CREATE POLICY "Anyone can insert feedback" ON feedback
    FOR INSERT WITH CHECK (true);

-- Allow users to view their own feedback
CREATE POLICY "Users can view their own feedback" ON feedback
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
