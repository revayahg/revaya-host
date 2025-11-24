SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Ensure the pins table carries the columns expected by the application.
ALTER TABLE public.pins
    ADD COLUMN IF NOT EXISTS notes text,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

ALTER TABLE public.pins
    ALTER COLUMN visible_to_vendor SET DEFAULT true;

-- Recreate the updated_at trigger so it stays aligned with the shared helper.
DROP TRIGGER IF EXISTS update_pins_updated_at ON public.pins;

CREATE TRIGGER update_pins_updated_at
    BEFORE UPDATE ON public.pins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Rebuild row level policies so pins follow the unified event access helpers.
DO $$
DECLARE
    rec record;
BEGIN
    FOR rec IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'pins'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.pins', rec.policyname);
    END LOOP;
END
$$;

ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY pins_select
ON public.pins
FOR SELECT
USING (public.can_user_view_event(event_id));

CREATE POLICY pins_insert
ON public.pins
FOR INSERT
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY pins_update
ON public.pins
FOR UPDATE
USING (public.can_user_edit_event(event_id))
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY pins_delete
ON public.pins
FOR DELETE
USING (public.can_user_edit_event(event_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pins TO authenticated;

RESET lock_timeout;
RESET statement_timeout;


