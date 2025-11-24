-- First, add invitation links to any existing records that don't have them
UPDATE event_invitations 
SET event_invitation_link = 'inv_' || substr(md5(random()::text), 1, 20)
WHERE event_invitation_link IS NULL;

-- Create a function to auto-generate invitation links if not provided
CREATE OR REPLACE FUNCTION generate_invitation_link()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_invitation_link IS NULL THEN
        NEW.event_invitation_link := 'inv_' || substr(md5(random()::text), 1, 20);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate invitation links
DROP TRIGGER IF EXISTS auto_generate_invitation_link ON event_invitations;
CREATE TRIGGER auto_generate_invitation_link
    BEFORE INSERT ON event_invitations
    FOR EACH ROW
    EXECUTE FUNCTION generate_invitation_link();
