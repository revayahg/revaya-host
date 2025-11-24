# Collaborator System Implementation Checklist

## ✅ STEP 1: API FUNCTION CONSOLIDATION
- [ ] `utils/collaboratorAPI.js` contains ONLY these functions:
  - [ ] `sendCollaboratorInvitation()` (NO sendInvitation duplicate)
  - [ ] `acceptInvitationByToken()` (NO standalone window.acceptCollaboratorInvitation)
  - [ ] `getCollaborators()` 
  - [ ] `getCollaborativeEvents()`
  - [ ] `getPendingCollaboratorInvitations()`
  - [ ] `updateRole()`, `removeCollaborator()`, `cancelInvitation()`

## ✅ STEP 2: DATABASE TABLE CONSISTENCY
- [ ] ALL code references `event_collaborator_invitations` table
- [ ] NO references to deprecated `event_invitations` table
- [ ] Correct column names used: `email`, `role`, `status`, `invitation_token`
- [ ] Role constraints enforced: only 'viewer' and 'editor' for collaborators

## ✅ STEP 3: EMAIL SERVICE CONFIGURATION
- [ ] `utils/collaboratorEmailService.js` uses dynamic URL: `window.location.origin`
- [ ] Email links format: `/index.html#/collaborator-invite-response?invitation=${token}`
- [ ] NO hardcoded preview URLs anywhere

## ✅ STEP 4: EVENT LISTENER CLEANUP
- [ ] Each component has SINGLE event listener per event type
- [ ] Proper cleanup in useEffect return functions
- [ ] Events used: 'collaboratorUpdated', 'eventsUpdated', 'dashboardRefresh'

## ✅ STEP 5: DASHBOARD INTEGRATION
- [ ] Dashboard.js shows collaborative events tab
- [ ] Dashboard.js shows notifications tab
- [ ] Dashboard.js maintains existing visual layout
- [ ] Real-time updates work across all tabs

## ✅ STEP 6: EVENT DETAIL SIDEBAR
- [ ] ViewEventDetailSidebar.js shows collaborator management
- [ ] Collaborator list updates in real-time
- [ ] NO automatic reload on browser tab switching
- [ ] Invite/manage buttons work correctly

## ✅ STEP 7: INVITATION FLOW
- [ ] Create Event → Edit Event → Collaborator Management → Works
- [ ] Invite Form shows email/role inputs
- [ ] Send invitation calls correct API function
- [ ] Email service sends with correct URL
- [ ] UI updates immediately after sending

## ✅ STEP 8: ACCEPTANCE FLOW
- [ ] Email link opens invitation page correctly
- [ ] Hash fragment parsing works for `#/collaborator-invite-response?invitation=xxx`
- [ ] Login redirect preserves invitation token
- [ ] Accept invitation updates both tables (invitations + user_roles)
- [ ] Dashboard updates immediately for both invitor and invitee

## ✅ STEP 9: ERROR HANDLING
- [ ] Invalid invitation tokens show user-friendly errors
- [ ] Email service failures are handled gracefully
- [ ] Database errors don't crash the UI
- [ ] Network failures show retry options

## ✅ STEP 10: VISUAL INTEGRATION
- [ ] All collaborator components match existing design system
- [ ] Loading states use consistent spinners
- [ ] Success/error messages use toast system
- [ ] Modal overlays work correctly

## 🔍 TESTING CHECKLIST

### Invitor Flow:
1. [ ] Create new event
2. [ ] Open event details → collaborator management
3. [ ] Send invitation with viewer role
4. [ ] Verify invitation appears in pending list
5. [ ] Verify email is sent with correct URL
6. [ ] Verify real-time UI updates

### Invitee Flow:
1. [ ] Click email link (logged out)
2. [ ] Verify redirect to login with token preservation
3. [ ] Login and verify automatic redirect to invitation page
4. [ ] Accept invitation
5. [ ] Verify redirect to dashboard
6. [ ] Verify event appears in collaborative events

### Real-time Updates:
1. [ ] Invitor sees acceptance immediately
2. [ ] Both users see collaborator in event details
3. [ ] Dashboard collaborative events count updates
4. [ ] No duplicate API calls or event listeners

## 🚨 CRITICAL CHECKS
- [ ] NO duplicate API functions exist
- [ ] NO references to deprecated tables
- [ ] NO hardcoded URLs
- [ ] NO infinite event listener loops
- [ ] NO visual layout changes to dashboard
- [ ] ALL existing tabs preserved (events, collaborative, notifications)