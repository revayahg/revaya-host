SET statement_timeout TO 0;
SET lock_timeout TO 0;

CREATE OR REPLACE FUNCTION public.storage_object_event_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  segments text[];
  segment text;
BEGIN
  IF object_name IS NULL THEN
    RETURN NULL;
  END IF;

  segments := storage.foldername(object_name);

  IF segments IS NULL OR array_length(segments, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  FOREACH segment IN ARRAY segments LOOP
    IF segment IS NULL OR length(segment) = 0 THEN
      CONTINUE;
    END IF;

    BEGIN
      RETURN segment::uuid;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN NULL;
END;
$function$;

RESET lock_timeout;
RESET statement_timeout;


