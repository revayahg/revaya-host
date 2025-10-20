-- INSTRUCTIONS: This file contains example queries with a sample UUID.
-- To use: Replace '00000000-0000-0000-0000-000000000000' with your actual event UUID.

-- 1) Ensure a thread exists (should return 1 row):
select id, event_id, subject, created_at, last_message_at, last_message_preview
from public.message_threads
where event_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 2) Ensure YOU are a participant (should return 1 row):
with t as (
  select id from public.message_threads where event_id = '00000000-0000-0000-0000-000000000000'::uuid limit 1
)
select mp.thread_id, mp.user_id, mp.last_read_at
from public.message_participants mp, t
where mp.thread_id = t.id and mp.user_id = auth.uid();

-- 3) Messages may legitimately be zero for a brand new thread:
with t as (
  select id from public.message_threads where event_id = '00000000-0000-0000-0000-000000000000'::uuid limit 1
)
select count(*) as message_count
from public.messages m, t
where m.thread_id = t.id;
