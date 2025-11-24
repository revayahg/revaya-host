BEGIN;

-- Replace the RPC to include owner in access check and ensure both the
-- caller (auth.uid) and the owner are participants, along with collaborators and vendors.
create or replace function public.create_event_group_thread(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_thread public.message_threads%rowtype;
    v_participant_count integer;
begin
    if v_uid is null then
        raise exception 'Not authenticated';
    end if;

    -- Access check: owner OR active collaborator OR mapped vendor
    if not (
        exists (select 1 from public.events e where e.id = p_event_id and e.user_id = v_uid)
        or exists (select 1 from public.event_user_roles eur
                   where eur.event_id = p_event_id
                     and eur.user_id = v_uid
                     and coalesce(eur.status,'active')='active')
        or exists (select 1
                   from public.event_vendors ev
                   join public.vendor_profiles vp on ev.vendor_id = vp.id
                   where ev.event_id = p_event_id
                     and vp.user_id = v_uid)
    ) then
        raise exception 'Access denied to event';
    end if;

    -- Get or create single group thread per event
    select *
      into v_thread
      from public.message_threads
     where event_id = p_event_id
     limit 1;

    if not found then
        insert into public.message_threads (event_id, subject)
        values (p_event_id, 'Event Team Chat')
        returning * into v_thread;
    end if;

    -- Ensure the caller is a participant
    insert into public.message_participants (thread_id, user_id)
    values (v_thread.id, v_uid)
    on conflict (thread_id, user_id) do nothing;

    -- Ensure the event OWNER is a participant
    insert into public.message_participants (thread_id, user_id)
    select v_thread.id, e.user_id
      from public.events e
     where e.id = p_event_id
    on conflict (thread_id, user_id) do nothing;

    -- Ensure active collaborators are participants
    insert into public.message_participants (thread_id, user_id)
    select v_thread.id, eur.user_id
      from public.event_user_roles eur
     where eur.event_id = p_event_id
       and coalesce(eur.status,'active')='active'
    on conflict (thread_id, user_id) do nothing;

    -- Ensure mapped vendors are participants
    insert into public.message_participants (thread_id, user_id)
    select v_thread.id, vp.user_id
      from public.event_vendors ev
      join public.vendor_profiles vp on ev.vendor_id = vp.id
     where ev.event_id = p_event_id
    on conflict (thread_id, user_id) do nothing;

    -- Count participants
    select count(*) into v_participant_count
      from public.message_participants
     where thread_id = v_thread.id;

    return json_build_object(
      'thread', row_to_json(v_thread),
      'participant_count', v_participant_count
    );
end;
$$;

COMMIT;