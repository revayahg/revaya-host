SET statement_timeout TO 0;
SET lock_timeout TO 0;

DROP VIEW IF EXISTS public.function_debug;

CREATE VIEW public.function_debug AS
SELECT
  pg_get_functiondef('public.can_user_view_event(uuid)'::regprocedure)  AS can_user_view_event_def,
  pg_get_functiondef('public.can_user_edit_event(uuid)'::regprocedure)  AS can_user_edit_event_def;

COMMENT ON VIEW public.function_debug IS 'Diagnostic view exposing definitions of can_user_view_event and can_user_edit_event.';

RESET lock_timeout;
RESET statement_timeout;

