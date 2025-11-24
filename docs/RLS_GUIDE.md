# RLS Guide: Unified Event Access Model

Last Updated: 2025‑11‑11  
Status: Phase 1 complete – helpers are the single source of truth across event-scoped data.

---

## 1. Core Principle

All event-related row-level policies MUST delegate permission decisions to the shared helper functions:

- `public.can_user_view_event(event_id uuid)`  
- `public.can_user_edit_event(event_id uuid)`

These helpers resolve access through a single code path:

1. **Event owner / creator** (`events.user_id`, `events.created_by`)
2. **Assigned roles** (`event_user_roles` with active `owner`, `editor`, `viewer`)
3. **Accepted invitations** (email match in `event_collaborator_invitations` with accepted status)

> 📌 Do not implement per-table logic for roles or invitations. Fix helpers when behavior needs to change.

---

## 2. Standard Policy Templates

When writing migrations, use the following pattern for event-scoped tables:

```sql
-- SELECT
CREATE POLICY mytable_select
ON public.mytable
FOR SELECT
USING (public.can_user_view_event(event_id));

-- INSERT
CREATE POLICY mytable_insert
ON public.mytable
FOR INSERT
WITH CHECK (public.can_user_edit_event(event_id));

-- UPDATE
CREATE POLICY mytable_update
ON public.mytable
FOR UPDATE
USING (public.can_user_edit_event(event_id))
WITH CHECK (public.can_user_edit_event(event_id));

-- DELETE
CREATE POLICY mytable_delete
ON public.mytable
FOR DELETE
USING (public.can_user_edit_event(event_id));
```

Additional fields (e.g., `uploaded_by = auth.uid()`) can be added *after* the helper checks when the mutation requires ownership of a specific column.

---

## 3. Approved Exceptions

### Notifications Insert

For collaborator invitations we inject metadata about the inviter. The notifications insert policy allows any authenticated user to write a notification **as long as** the metadata references an invitation they created:

```sql
(COALESCE(metadata, '{}'::jsonb) ->> 'invitation_id') IS NOT NULL
AND EXISTS (
  SELECT 1
  FROM public.event_collaborator_invitations ci
  WHERE ci.id::text = (COALESCE(metadata, '{}'::jsonb) ->> 'invitation_id')
    AND ci.invited_by = auth.uid()
)
```

This protects notifications from arbitrary writes while avoiding helper false negatives (e.g., stale `event_user_roles`). Any new exception must follow the same pattern: narrow scope, auditable metadata, and explicit justification in this guide.

### Viewer Access to Pending Invites

`event_collaborator_invitations` allows invitees to view/update their own invitations by matching email and status. This is intentional for the acceptance flow and already handled in the policy introduced in `20251110000003_reset_invitation_policies.sql`.

---

## 4. Coding Checklist

1. **Tables**  
   - Ensure `event_id` exists and is indexed.  
   - Ensure `updated_at` triggers are in place before enabling RLS (consistency with other tables).

2. **Policies**  
   - Remove all legacy policies before applying new ones.  
   - Apply the standard template.  
   - Add limited, metadata-driven branches for edge cases (documented above).

3. **Migrations**  
   - Each migration should enable RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).  
   - Prefer helper functions over raw SQL duplication; keep migrations idempotent.

4. **Client Calls**  
   - Always filter by `event_id` when querying.  
   - Only request columns permitted by the policies.  
   - Use service-role edge functions when the browser cannot provide needed context (e.g., admin dashboards).

---

## 5. Testing & Monitoring

- **Manual QA (Phase 4)**  
  - Owner/editor: create events, invite collaborators, manage pins/tasks/documents.  
  - Viewer: confirm read-only access and pending invitations list.  
  - Confirm Supabase Explorer shows `POST /notifications` returning 201 for owner invites.

- **Automated Checks**  
  - Use the existing Supabase API log review to spot 4xx responses (`supabase functions logs api`).  
  - Keep the “inviter-created” notification clause in mind if false positives appear.

---

## 6. Future Work

- Convert this guide into a runbook entry once automated tests cover more flows.  
- Investigate `check-user-exists` edge function (currently returning 500) once RLS audit is complete.  
- Consider a linting step that fails PRs if event tables lack helper-driven policies.

---

**Point of Contact:** Revaya Platform Team (Thiago Ferreira)  
For questions or policy reviews, post in `#revaya-platform` with the migration ID and table name.


