-- Create email tracking tables for invitation reminders and onboarding emails
-- This ensures we don't spam users with duplicate emails

-- Table to track invitation reminder emails sent
CREATE TABLE IF NOT EXISTS invitation_reminder_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invitation_id UUID NOT NULL,
    recipient_email TEXT NOT NULL,
    event_id UUID NOT NULL,
    event_name TEXT NOT NULL,
    inviter_name TEXT NOT NULL,
    invitation_token TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reminder_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track onboarding emails sent
CREATE TABLE IF NOT EXISTS onboarding_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    grace_period_days INTEGER DEFAULT 7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitation_reminder_emails_recipient ON invitation_reminder_emails(recipient_email);
CREATE INDEX IF NOT EXISTS idx_invitation_reminder_emails_invitation ON invitation_reminder_emails(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_reminder_emails_sent_at ON invitation_reminder_emails(sent_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_emails_user_id ON onboarding_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_emails_user_email ON onboarding_emails(user_email);
CREATE INDEX IF NOT EXISTS idx_onboarding_emails_sent_at ON onboarding_emails(sent_at);

-- Enable RLS
ALTER TABLE invitation_reminder_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitation_reminder_emails (system can insert, users can view their own)
CREATE POLICY "System can insert invitation reminders" ON invitation_reminder_emails
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own invitation reminders" ON invitation_reminder_emails
    FOR SELECT USING (recipient_email = auth.jwt() ->> 'email');

-- RLS Policies for onboarding_emails (system can insert, users can view their own)
CREATE POLICY "System can insert onboarding emails" ON onboarding_emails
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own onboarding emails" ON onboarding_emails
    FOR SELECT USING (user_id = auth.uid());

-- Add comments for documentation
COMMENT ON TABLE invitation_reminder_emails IS 'Tracks invitation reminder emails sent to prevent spam';
COMMENT ON TABLE onboarding_emails IS 'Tracks onboarding emails sent to new users without events';
COMMENT ON COLUMN invitation_reminder_emails.reminder_count IS 'Number of reminders sent for this invitation';
COMMENT ON COLUMN onboarding_emails.grace_period_days IS 'Days waited before sending onboarding email';
