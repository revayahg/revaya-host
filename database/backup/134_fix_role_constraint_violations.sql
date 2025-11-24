-- Fix Role Constraint Violations
-- This script must be run BEFORE the main collaboration system setup

-- Step 1: Check what invalid roles exist
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM event_user_roles 
    WHERE role NOT IN ('owner', 'admin', 'editor', 'viewer');
    
    RAISE NOTICE 'Found % rows with invalid roles', invalid_count;
END $$;

-- Step 2: Show invalid roles for debugging
SELECT DISTINCT role, COUNT(*) as count
FROM event_user_roles 
WHERE role NOT IN ('owner', 'admin', 'editor', 'viewer')
GROUP BY role;

-- Step 3: Fix invalid roles by mapping them to valid ones
UPDATE event_user_roles 
SET role = CASE 
    WHEN role = 'collaborator' THEN 'editor'
    WHEN role = 'member' THEN 'editor'
    WHEN role = 'participant' THEN 'viewer'
    WHEN role = 'guest' THEN 'viewer'
    WHEN role IS NULL THEN 'viewer'
    WHEN role = '' THEN 'viewer'
    ELSE 'viewer'  -- Default fallback for any other invalid values
END
WHERE role NOT IN ('owner', 'admin', 'editor', 'viewer');

-- Step 4: Verify all roles are now valid
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM event_user_roles 
    WHERE role NOT IN ('owner', 'admin', 'editor', 'viewer');
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Still have % invalid roles after cleanup', invalid_count;
    ELSE
        RAISE NOTICE 'All roles are now valid. Ready to proceed with main setup.';
    END IF;
END $$;

-- Step 5: Show final role distribution
SELECT role, COUNT(*) as count
FROM event_user_roles 
GROUP BY role
ORDER BY role;