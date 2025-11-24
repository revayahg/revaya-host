# Event Management Permissions Summary

## Overview
This document outlines the role-based permissions for the event management system, including the AI Document-to-Tasks feature and Staff Management feature.

## User Roles

### 1. Event Owner
- **Who**: User who created the event (`events.user_id`)
- **Permissions**: Full access to all event features
- **Can**: Create, read, update, delete all event data

### 2. Editor
- **Who**: Collaborators with `permission_level = 'editor'` and `status = 'accepted'`
- **Permissions**: Almost full access (cannot delete the event itself)
- **Can**: Manage tasks, budget, staff, documents, collaborators

### 3. Viewer
- **Who**: Collaborators with `permission_level = 'viewer'` and `status = 'accepted'`
- **Permissions**: Read-only access
- **Can**: View event data, participate in chat, view tasks

## Feature-Specific Permissions

### AI Document-to-Tasks Feature

#### event_documents Table
- **View**: All collaborators (owner, editor, viewer)
- **Insert**: Owner and editors only
- **Update**: Owner and editors only  
- **Delete**: Owner and editors only

#### event-documents Storage Bucket
- **View**: All collaborators (owner, editor, viewer)
- **Upload**: Owner and editors only
- **Update**: Owner and editors only
- **Delete**: Owner and editors only

### Staff Management Feature

#### event_staff Table
- **View**: All collaborators (owner, editor, viewer)
- **Insert**: Owner and editors only
- **Update**: Owner and editors only
- **Delete**: Owner and editors only

### Task Management
- **View**: All collaborators
- **Create/Edit/Delete**: Owner and editors only
- **Assign**: Owner and editors only

### Budget Management
- **View**: All collaborators
- **Create/Edit/Delete**: Owner and editors only

### Event Chat
- **View**: All collaborators
- **Send Messages**: All collaborators

### Collaborator Management
- **View**: All collaborators
- **Invite/Remove/Change Roles**: Owner and editors only

## RLS Policy Structure

### Database Tables
All tables use Row Level Security (RLS) with policies that check:
1. Event ownership (`events.user_id = auth.uid()`)
2. Collaborator status via `event_collaborator_invitations` table
3. Permission level for write operations (editor/owner only)

### Storage Buckets
Storage policies check:
1. Bucket ID matches expected bucket
2. File path contains valid event ID
3. User has appropriate permissions for that event

## Security Features

### 1. Row Level Security (RLS)
- Enabled on all sensitive tables
- Policies prevent cross-event data access
- Automatic permission checking on all queries

### 2. File Upload Security
- File type validation (PDF, Word, Excel, images)
- File size limits (10MB per file)
- Path validation (files stored in event-specific folders)

### 3. API Security
- Authentication required for all operations
- Permission checks in Edge Functions
- CORS restrictions for external access

### 4. Data Isolation
- Users can only access data for events they're part of
- No cross-tenant data leakage possible
- Proper foreign key constraints

## Testing Checklist

### Owner Permissions
- [ ] Can upload documents
- [ ] Can manage staff
- [ ] Can edit all tasks
- [ ] Can manage budget
- [ ] Can invite/remove collaborators
- [ ] Can delete event

### Editor Permissions
- [ ] Can upload documents
- [ ] Can manage staff
- [ ] Can edit all tasks
- [ ] Can manage budget
- [ ] Can invite/remove collaborators
- [ ] Cannot delete event

### Viewer Permissions
- [ ] Can view documents
- [ ] Can view staff
- [ ] Can view tasks
- [ ] Can view budget
- [ ] Can participate in chat
- [ ] Cannot upload documents
- [ ] Cannot manage staff
- [ ] Cannot edit tasks
- [ ] Cannot manage budget
- [ ] Cannot invite/remove collaborators

### Security Tests
- [ ] Cannot access other users' events
- [ ] Cannot access other users' documents
- [ ] Cannot access other users' staff data
- [ ] File uploads restricted to correct bucket
- [ ] API calls require authentication
- [ ] RLS policies prevent unauthorized access

## Implementation Notes

### Migration Applied
- `20251028000008_restore_proper_rls_policies.sql`
- Restored proper role-based permissions
- Removed overly permissive development policies

### Key Files Modified
- `database/migrations/20251028000008_restore_proper_rls_policies.sql`
- `components/Events/EditEventForm.js` (added userRole logic)
- `components/Events/StaffManager.js` (role-based UI)

### Edge Cases Handled
- Pending invitations (not yet accepted)
- Deleted users
- Invalid event IDs
- Malformed file paths
- Cross-tenant access attempts

## Monitoring

### Security Monitoring
- Failed permission checks logged
- Unauthorized access attempts tracked
- File upload violations recorded

### Performance Monitoring
- RLS policy execution time
- Storage access patterns
- API response times

## Future Considerations

### Additional Roles
- **Admin**: System-wide access (future feature)
- **Vendor**: Limited access to assigned events (future feature)

### Enhanced Security
- Audit logging for sensitive operations
- Two-factor authentication (future feature)
- API rate limiting (future feature)
