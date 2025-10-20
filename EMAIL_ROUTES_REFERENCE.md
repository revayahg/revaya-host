# Email Notification Routes Reference

## Correct Routes for All Email Types

### 1. **Task Assigned**
- **Route**: `/#/task-response?token={token}`
- **Component**: `TaskAssignmentResponse`
- **Token**: Generated task assignment token
- **Purpose**: User can accept/decline/request clarification

### 2. **Task Updated**  
- **Route**: `/#/event/view/{event_id}?tab=tasks`
- **Component**: `ViewEventDetail` (Tasks tab)
- **No Token Needed**: Just navigate to event detail page
- **Purpose**: View updated task in context of event

### 3. **Task Completed**
- **Route**: `/#/event/view/{event_id}?tab=tasks`
- **Component**: `ViewEventDetail` (Tasks tab)
- **Purpose**: See completed task in event context

### 4. **Collaborator Invitation**
- **Route**: `/#/collaborator-invite-response?token={invitation_token}`
- **Component**: `CollaboratorInviteResponse`
- **Token**: Invitation token (UUID or collab_ prefixed)
- **Purpose**: Accept/decline collaboration invitation

### 5. **Chat Message**
- **Route**: `/#/event/view/{event_id}?tab=chat`
- **Component**: `ViewEventDetail` (Chat/Messages tab)
- **Purpose**: View and reply to message

### 6. **Event Updated**
- **Route**: `/#/event/view/{event_id}`
- **Component**: `ViewEventDetail`
- **Purpose**: View updated event details

### 7. **Collaborator Status Changed**
- **Route**: `/#/event/view/{event_id}?tab=collaborators`
- **Component**: `ViewEventDetail` (Collaborators tab)
- **Purpose**: See who accepted/declined

### 8. **Vendor Invitation**
- **Route**: `/#/invite-response?invitation={invitation_id}&action=accept&event={event_id}&vendor={vendor_id}`
- **Component**: `InviteResponse`
- **Token**: Invitation UUID
- **Purpose**: Accept/decline vendor invitation

## URL Structure Summary

```javascript
Task Assignment:     https://revayahost.com/#/task-response?token={token}
Task Update/View:    https://revayahost.com/#/event/view/{event_id}?tab=tasks
Collaborator Invite: https://revayahost.com/#/collaborator-invite-response?token={token}
Event View:          https://revayahost.com/#/event/view/{event_id}
Event Chat:          https://revayahost.com/#/event/view/{event_id}?tab=chat
Vendor Invite:       https://revayahost.com/#/invite-response?invitation={id}&action=accept&event={event_id}&vendor={vendor_id}
```

## Critical Fixes Needed

✅ **Fixed**: Task assigned - Changed from `/task-assignment-response` to `/task-response`
✅ **Fixed**: Task updated/completed - Changed to event view with tasks tab
✅ **Fixed**: Chat messages - Added `?tab=chat` parameter
⚠️ **Need to verify**: Vendor invitation URLs include all required parameters
