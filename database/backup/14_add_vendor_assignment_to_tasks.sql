-- Add vendor assignment fields to tasks stored in events table
-- Since tasks are stored as JSONB in the events.tasks column, we don't need to alter table structure
-- Instead, we'll document the new task object structure and create helper functions

-- Document the updated task object structure:
-- {
--   id: string,
--   title: string,
--   description: string,
--   category: string,
--   type: string,
--   status: string,
--   createdAt: string,
--   dueDate: string|null,
--   assignedTo: string|null,
--   priority: string,
--   assignee_vendor_id: string|null,  -- NEW: UUID of assigned vendor
--   visible_to_vendor: boolean        -- NEW: Whether vendor can see this task
-- }

-- Create a function to validate task structure
CREATE OR REPLACE FUNCTION validate_task_structure(task_data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check required fields
    IF NOT (task_data ? 'id' AND task_data ? 'title' AND task_data ? 'status') THEN
        RETURN FALSE;
    END IF;
    
    -- Check that assignee_vendor_id is valid UUID if present
    IF task_data ? 'assignee_vendor_id' AND task_data->>'assignee_vendor_id' IS NOT NULL THEN
        BEGIN
            PERFORM task_data->>'assignee_vendor_id'::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
            RETURN FALSE;
        END;
    END IF;
    
    -- Check that visible_to_vendor is boolean if present
    IF task_data ? 'visible_to_vendor' AND NOT (task_data->'visible_to_vendor' IS NULL OR jsonb_typeof(task_data->'visible_to_vendor') = 'boolean') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get tasks assigned to a specific vendor
CREATE OR REPLACE FUNCTION get_vendor_tasks(p_vendor_id UUID, p_event_id UUID DEFAULT NULL)
RETURNS TABLE(
    event_id UUID,
    event_name TEXT,
    task_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as event_id,
        e.name as event_name,
        task.value as task_data
    FROM events e
    CROSS JOIN jsonb_array_elements(COALESCE(e.tasks, '[]'::jsonb)) AS task(value)
    WHERE 
        -- Task is assigned to this vendor
        task.value->>'assignee_vendor_id' = p_vendor_id::text
        -- Task is visible to vendor (default true if not specified)
        AND COALESCE((task.value->>'visible_to_vendor')::boolean, true) = true
        -- Optional event filter
        AND (p_event_id IS NULL OR e.id = p_event_id)
        -- Vendor must be assigned to the event
        AND EXISTS (
            SELECT 1 FROM event_vendors ev 
            WHERE ev.event_id = e.id AND ev.vendor_id = p_vendor_id
        )
    ORDER BY e.name, (task.value->>'createdAt');
END;
$$ LANGUAGE plpgsql;

-- Create a function to update task vendor assignment
CREATE OR REPLACE FUNCTION assign_task_to_vendor(
    p_event_id UUID,
    p_task_id TEXT,
    p_vendor_id UUID,
    p_visible_to_vendor BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_tasks JSONB;
    task_found BOOLEAN := false;
BEGIN
    -- Get current tasks array
    SELECT COALESCE(tasks, '[]'::jsonb) INTO updated_tasks
    FROM events 
    WHERE id = p_event_id;
    
    -- Update the specific task
    updated_tasks := (
        SELECT jsonb_agg(
            CASE 
                WHEN task.value->>'id' = p_task_id THEN
                    task.value || 
                    jsonb_build_object(
                        'assignee_vendor_id', p_vendor_id::text,
                        'visible_to_vendor', p_visible_to_vendor,
                        'updated_at', NOW()::text
                    )
                ELSE task.value
            END
        )
        FROM jsonb_array_elements(updated_tasks) AS task(value)
    );
    
    -- Check if task was found and updated
    SELECT EXISTS(
        SELECT 1 FROM jsonb_array_elements(updated_tasks) AS task(value)
        WHERE task.value->>'id' = p_task_id 
        AND task.value->>'assignee_vendor_id' = p_vendor_id::text
    ) INTO task_found;
    
    -- Update the events table if task was found
    IF task_found THEN
        UPDATE events 
        SET tasks = updated_tasks, updated_at = NOW()
        WHERE id = p_event_id;
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION validate_task_structure(JSONB) IS 'Validates that a task object has the correct structure including new vendor assignment fields';
COMMENT ON FUNCTION get_vendor_tasks(UUID, UUID) IS 'Returns all tasks assigned to a specific vendor, optionally filtered by event';
COMMENT ON FUNCTION assign_task_to_vendor(UUID, TEXT, UUID, BOOLEAN) IS 'Assigns a task to a vendor and sets visibility';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION validate_task_structure(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_vendor_tasks(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_task_to_vendor(UUID, TEXT, UUID, BOOLEAN) TO authenticated;
