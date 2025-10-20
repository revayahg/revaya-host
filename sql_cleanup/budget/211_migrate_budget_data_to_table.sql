-- Migration script: Move budget data from events table to event_budget_items table
-- This script safely migrates existing budget JSON data to the normalized table structure

-- Helper function to safely cast text->jsonb without aborting the whole statement
CREATE OR REPLACE FUNCTION public.try_cast_jsonb(txt text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN txt::jsonb;
EXCEPTION WHEN others THEN
  RETURN '[]'::jsonb;
END;
$$;

-- Move existing budget JSON (events.budget_items or events.budget) into public.event_budget_items.
-- Idempotent: only inserts for events that currently have zero rows in the table.
WITH src AS (
  SELECT
    e.id AS event_id,
    e.created_by,
    CASE
      WHEN e.budget_items IS NOT NULL THEN e.budget_items::jsonb
      WHEN e.budget IS NOT NULL THEN
        CASE
          WHEN jsonb_typeof(try_cast_jsonb(e.budget)) = 'array' THEN try_cast_jsonb(e.budget)
          ELSE '[]'::jsonb
        END
      ELSE '[]'::jsonb
    END AS items
  FROM public.events e
),
need AS (
  SELECT s.event_id, s.created_by, s.items
  FROM src s
  WHERE jsonb_typeof(s.items) = 'array'
    AND jsonb_array_length(s.items) > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.event_budget_items bi WHERE bi.event_id = s.event_id
    )
)
INSERT INTO public.event_budget_items
  (event_id, title, category, allocated, spent, description, created_by, created_at, updated_at)
SELECT
  n.event_id,
  COALESCE(NULLIF((i->>'title'), ''), 'New Item') AS title,
  NULLIF((i->>'category'), '') AS category,
  COALESCE(NULLIF((i->>'allocated'), '')::numeric, 0) AS allocated,
  COALESCE(NULLIF((i->>'spent'), '')::numeric, 0) AS spent,
  NULLIF((i->>'description'), '') AS description,
  n.created_by,
  now(), 
  now()
FROM need n
CROSS JOIN LATERAL jsonb_array_elements(n.items) AS i;

-- Verify migration results
SELECT 
  e.id AS event_id,
  e.title AS event_title,
  COUNT(bi.id) AS migrated_budget_items,
  CASE 
    WHEN e.budget_items IS NOT NULL THEN 'had budget_items'
    WHEN e.budget IS NOT NULL THEN 'had budget'
    ELSE 'no budget data'
  END AS original_data_source
FROM public.events e
LEFT JOIN public.event_budget_items bi ON bi.event_id = e.id
GROUP BY e.id, e.title, e.budget_items, e.budget
ORDER BY migrated_budget_items DESC;

-- Clean up helper function
DROP FUNCTION IF EXISTS public.try_cast_jsonb(text);