-- Create function to get all event participants (users + pending invitations)
CREATE OR REPLACE FUNCTION get_event_participants(event_uuid UUID)
RETURNS TABLE (
    participant_id TEXT,
    user_id UUID,
    email TEXT,
    display_name TEXT,
    role TEXT,
    status_display TEXT,
    source TEXT,
    invitation_id UUID
) AS $$
BEGIN
    RETURN QUERY
    -- Active collaborators from event_user_roles
    SELECT 
        eur.user_id::text as participant_id,
        eur.user_id,
        au.email,
        COALESCE(p.full_name, au.raw_user_meta_data->>'full_name', au.email) as display_name,
        eur.role,
        'Active Collaborator' as status_display,
        'event_user_roles' as source,
        NULL::UUID as invitation_id
    FROM event_user_roles eur
    JOIN auth.users au ON au.id = eur.user_id
    LEFT JOIN profiles p ON p.id = eur.user_id
    WHERE eur.event_id = event_uuid
    
    UNION ALL
    
    -- Pending event invitations
    SELECT 
        eci.id::text as participant_id,
        eci.accepted_by as user_id,
        eci.email,
        eci.email as display_name,
        eci.permission_level as role,
        'Pending Invitation' as status_display,
        'pending_event_invite' as source,
        eci.id as invitation_id
    FROM event_collaborator_invitations eci
    WHERE eci.event_id = event_uuid 
    AND eci.status = 'pending' 
    AND eci.expires_at > NOW()
    
    ORDER BY source, display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;