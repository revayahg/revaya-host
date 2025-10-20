-- Messaging V2: Sender triggers and RLS policy alignment
-- This migration adds sender auto-population and precise RLS policies

BEGIN;

-- 0) Schema-qualify everything. Don't error if objects already exist / don't exist.
--    Use IF EXISTS when dropping; CREATE OR REPLACE for functions; name triggers explicitly.

-- 1) BEFORE INSERT: auto-set sender_id from auth.uid()
CREATE OR REPLACE FUNCTION public.set_message_sender()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sender_id IS NULL THEN
    NEW.sender_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_message_sender ON public.messages;
CREATE TRIGGER trg_set_message_sender
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.set_message_sender();

-- 2) Keep your AFTER INSERT preview bump (you already have update_thread_preview).
--    Ensure name is stable and not duplicated.
CREATE OR REPLACE FUNCTION public.update_thread_preview()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.message_threads
     SET last_message_at = NEW.created_at,
         last_message_preview = CASE
            WHEN length(trim(NEW.body)) <= 140 THEN trim(NEW.body)
            ELSE substring(trim(NEW.body) FROM 1 FOR 137) || '…'
         END
   WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_thread_preview ON public.messages;
CREATE TRIGGER trigger_update_thread_preview
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_thread_preview();

-- 3) RLS: replace broad FOR ALL with precise policies (SELECT/INSERT/UPDATE)
-- THREADS
DROP POLICY IF EXISTS "message_threads_access" ON public.message_threads;

-- Users can SELECT threads where they are participants.
CREATE POLICY "threads_select_if_participant"
ON public.message_threads
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.message_participants mp
    WHERE mp.thread_id = message_threads.id
      AND mp.user_id = auth.uid()
  )
);

-- We don't expose generic INSERT/UPDATE for threads; RPC manages creation/membership.

-- MESSAGES
DROP POLICY IF EXISTS "messages_access" ON public.messages;

-- 12-month visibility via SELECT policy
CREATE POLICY "messages_select_if_participant_recent"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.message_participants mp
    WHERE mp.thread_id = messages.thread_id
      AND mp.user_id = auth.uid()
  )
  AND messages.created_at >= now() - INTERVAL '12 months'
);

-- Allow inserts only if the user is a participant and body is non-empty
CREATE POLICY "messages_insert_if_participant"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.message_participants mp
    WHERE mp.thread_id = messages.thread_id
      AND mp.user_id = auth.uid()
  )
  AND char_length(trim(body)) > 0
);

-- PARTICIPANTS
DROP POLICY IF EXISTS "message_participants_access" ON public.message_participants;

-- Participants can SELECT participants of their threads
CREATE POLICY "participants_select_own_threads"
ON public.message_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.message_participants me
    WHERE me.thread_id = message_participants.thread_id
      AND me.user_id = auth.uid()
  )
);

-- Allow a participant to UPDATE only their own row (for markRead)
CREATE POLICY "participants_update_self"
ON public.message_participants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Deny ad-hoc INSERT; RPC (security definer) manages membership
CREATE POLICY "participants_insert_denied"
ON public.message_participants
FOR INSERT
WITH CHECK (false);

-- 4) Drop brittle 12-month CHECK constraint; retention is handled by SELECT RLS + optional cleanup job
ALTER TABLE IF EXISTS public.messages
  DROP CONSTRAINT IF EXISTS messages_recent_only;

COMMIT;

-- Notes:
-- - Keep your existing RPC create_event_group_thread(UUID) as-is.
-- - Keep your realtime publication lines as-is.
-- - Keep your cleanup_old_messages() function as-is (optional hard-delete).
-- - We made no table-shape changes to your message_threads/messages/message_participants.