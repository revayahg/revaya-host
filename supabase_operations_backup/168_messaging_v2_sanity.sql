-- Messaging V2: Lightweight sanity checks (safe in dev/stage)
-- Comment out before running in prod.

-- 1) Assert triggers exist
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.messages'::regclass AND tgname IN ('trg_set_message_sender','trigger_update_thread_preview');

-- 2) Policy presence smoke test
-- SELECT polname, polcmd, polroles FROM pg_policy WHERE polrelid = 'public.messages'::regclass;
-- SELECT polname, polcmd, polroles FROM pg_policy WHERE polrelid = 'public.message_participants'::regclass;
-- SELECT polname, polcmd, polroles FROM pg_policy WHERE polrelid = 'public.message_threads'::regclass;

-- 3) Insert test (requires you to be a participant on an existing thread)
-- BEGIN;
--   SELECT public.create_event_group_thread('<some-event-uuid>'::uuid);
--   WITH t AS (
--     SELECT id FROM public.message_threads WHERE event_id = '<some-event-uuid>'::uuid LIMIT 1
--   )
--   INSERT INTO public.messages(thread_id, body)
--   SELECT id, 'Hello from sanity test' FROM t;
-- ROLLBACK;

-- 4) Verify trigger functions exist
-- SELECT proname FROM pg_proc WHERE proname IN ('set_message_sender', 'update_thread_preview');

-- 5) Check RLS is enabled on all messaging tables
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables 
-- WHERE tablename IN ('message_threads', 'messages', 'message_participants') 
-- AND schemaname = 'public';

-- 6) Verify realtime publication includes messaging tables
-- SELECT schemaname, tablename FROM pg_publication_tables 
-- WHERE pubname = 'supabase_realtime' 
-- AND tablename IN ('message_threads', 'messages', 'message_participants');