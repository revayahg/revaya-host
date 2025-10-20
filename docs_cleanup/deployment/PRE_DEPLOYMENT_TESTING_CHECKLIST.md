# Pre-Deployment Testing Checklist - Revaya Host

## 🔐 Authentication & User Management
- [ ] **Login functionality** - Test with valid/invalid credentials
- [ ] **Registration** - New user signup process
- [ ] **Password reset** - Forgot password flow
- [ ] **Profile creation** - Complete user profile setup
- [ ] **Profile editing** - Update user information
- [ ] **Logout functionality** - Proper session termination
- [ ] **Session persistence** - Login state maintained across browser refresh

## 🏠 Homepage & Navigation
- [ ] **Homepage loading** - All sections display correctly
- [ ] **Navigation menu** - All links work properly
- [ ] **Mobile responsiveness** - Test on different screen sizes
- [ ] **Footer links** - Privacy policy, terms of service
- [ ] **How It Works section** - Content displays correctly
- [ ] **Hero section** - Images and text load properly

## 📊 Dashboard Functionality
- [ ] **Dashboard loading** - Stats and sections display correctly
- [ ] **Events section** - "Events I Created" tab displays correctly
- [ ] **Collaborative events** - "Events I'm Collaborating On" tab displays correctly
- [ ] **Statistics** - Event counts and metrics
- [ ] **Notifications tab** - In-app notifications display
- [ ] **Quick actions** - Create event, view events buttons work
- [ ] **Real-time updates** - Changes reflect immediately
- [ ] **Date-based sorting** - Events sorted by end date (not start date)
- [ ] **Past/upcoming logic** - Events properly categorized by end date

## 🎉 Event Management
### Event Creation
- [ ] **Create event form** - All fields validate properly
- [ ] **Event types** - Dropdown selections work
- [ ] **Location autocomplete** - Address suggestions work
- [ ] **Date/time pickers** - Proper date selection
- [ ] **Budget setup** - Budget items can be added/edited with default categories
- [ ] **Event saving** - New events save to database
- [ ] **Default budget items** - New events get default budget categories automatically
- [ ] **Event map upload** - Event maps can be uploaded and displayed

### Event Viewing & Editing
- [ ] **Event detail view** - All information displays correctly
- [ ] **Edit event form** - Existing data pre-populated
- [ ] **Event updates** - Changes save properly
- [ ] **Event deletion** - Events can be removed
- [ ] **Event map** - Location displays on map correctly

### Event Collaboration
- [ ] **Invite collaborators** - Email invitations work
- [ ] **Collaborator roles** - Viewer/Editor permissions
- [ ] **Remove collaborators** - Participants can be removed
- [ ] **Role updates** - Collaborator roles can be changed
- [ ] **Access control** - Proper permission enforcement

## ✅ Task Management
- [ ] **Create tasks** - New tasks can be created
- [ ] **Edit tasks** - Task details can be modified
- [ ] **Delete tasks** - Tasks can be removed
- [ ] **Task assignment** - Tasks can be assigned to collaborators
- [ ] **Task status updates** - Status changes (todo, in progress, done)
- [ ] **Task priorities** - Priority levels work correctly
- [ ] **Due dates** - Date selection and display
- [ ] **Kanban view** - Tasks display in columns correctly
- [ ] **Drag & drop** - Tasks can be moved between columns
- [ ] **Task filtering** - Filter by status, assignee, priority
- [ ] **Task form close button** - X button closes task add/edit forms
- [ ] **Task assignee display** - Assignee names show correctly (not UUIDs)

## 🔔 Notification System
- [ ] **In-app notifications** - Notifications appear in dashboard
- [ ] **Task assignment notifications** - Assignees get notified
- [ ] **Task completion notifications** - Completion updates work
- [ ] **Collaborator invitation notifications** - Invitation alerts
- [ ] **Real-time updates** - Notifications appear immediately
- [ ] **Notification history** - Past notifications accessible
- [ ] **Mark as read** - Notifications can be marked read

## 💬 Messaging System
- [ ] **Group chat access** - Event participants can access chat
- [ ] **Send messages** - Messages can be sent
- [ ] **Receive messages** - Messages appear for all participants
- [ ] **Real-time messaging** - Messages appear instantly
- [ ] **Message history** - Previous messages load correctly
- [ ] **Thread creation** - Group threads work properly
- [ ] **Participant visibility** - All event members can participate
- [ ] **Chat performance** - Messages load 60-80% faster than before
- [ ] **Message caching** - Subsequent loads use cache (very fast)
- [ ] **Pagination** - Initial load limited to 20 messages

## 💰 Budget Management
- [ ] **Budget creation** - Budget items can be created
- [ ] **Budget editing** - Budget items can be modified
- [ ] **Default categories** - New events get default budget categories
- [ ] **Budget calculations** - Totals calculate correctly
- [ ] **Budget permissions** - Only admins/editors can edit, viewers can see
- [ ] **Budget persistence** - Budget data saves to event_budget_items table
- [ ] **Budget display** - Budget items display correctly in view/edit modes

## 🗺️ Event Maps
- [ ] **Map upload** - Event maps can be uploaded
- [ ] **Map display** - Maps display correctly in event details
- [ ] **Pin creation** - Pins can be added to maps
- [ ] **Pin editing** - Pins can be modified
- [ ] **Pin permissions** - Only admins/editors can add/edit pins, viewers can see
- [ ] **Map storage** - Maps save to Supabase Storage correctly
- [ ] **Map persistence** - Maps persist after page refresh

## 📋 Invitation & Response System
### Collaborator Invitations
- [ ] **Send invitations** - Email invitations are created
- [ ] **Invitation links** - Links work correctly
- [ ] **Accept invitations** - Users can accept invitations
- [ ] **Decline invitations** - Users can decline invitations
- [ ] **Invalid tokens** - Proper error handling for bad links
- [ ] **Duplicate invitations** - Prevent duplicate invites

### Task Assignment Responses
- [ ] **Task assignment tokens** - Assignment links work
- [ ] **Accept task assignments** - Users can accept tasks
- [ ] **Decline task assignments** - Users can decline tasks
- [ ] **Request clarification** - Clarification requests work
- [ ] **Response tracking** - Assignment responses are recorded

## 🛠 Profile & Settings
- [ ] **Profile settings** - User can update profile
- [ ] **Email changes** - Email updates work properly
- [ ] **Password changes** - Password updates function
- [ ] **Profile picture** - Image uploads work
- [ ] **Notification preferences** - Settings can be changed
- [ ] **Account deletion** - Account removal process

## 📱 Mobile Responsiveness
- [ ] **Mobile navigation** - Menu works on mobile
- [ ] **Touch interactions** - Buttons and forms work on touch
- [ ] **Form inputs** - Input fields work on mobile keyboards
- [ ] **Image display** - Images scale properly on mobile
- [ ] **Table scrolling** - Tables scroll horizontally on mobile
- [ ] **Modal dialogs** - Modals display correctly on mobile
- [ ] **Edit Event Form** - All tabs optimized for mobile (Event Details, Budget, Tasks, Collaborators, Event Chat)
- [ ] **View Event Details** - Header buttons and map controls optimized for mobile
- [ ] **Budget forms** - Edit budget buttons stack properly on mobile
- [ ] **Task forms** - Task add/edit forms optimized for mobile
- [ ] **Dashboard tabs** - Tab navigation works smoothly on mobile
- [ ] **Button sizing** - All buttons properly sized for touch interaction

## 🔒 Security & Permissions
- [ ] **Row Level Security** - Users only see their data
- [ ] **API permissions** - Proper access controls
- [ ] **URL protection** - Direct URL access restricted properly
- [ ] **Data validation** - Input sanitization works
- [ ] **CSRF protection** - Forms protected against attacks
- [ ] **SQL injection** - Database queries are safe

## 🚀 Performance & Loading
- [ ] **Page load times** - Pages load within reasonable time
- [ ] **Database queries** - No unnecessary API calls
- [ ] **Image optimization** - Images load efficiently
- [ ] **JavaScript errors** - No console errors
- [ ] **Memory leaks** - No excessive memory usage
- [ ] **Caching** - Appropriate data caching
- [ ] **Chat performance** - Messages load 60-80% faster than before
- [ ] **Message caching** - Subsequent chat loads use cache (very fast)
- [ ] **Thread caching** - Thread data cached for 5 minutes
- [ ] **Identity caching** - User identities cached to avoid repeated lookups
- [ ] **Pagination** - Initial message load limited to 20 messages
- [ ] **Cache invalidation** - Cache clears when new messages are sent

## 🌐 Browser Compatibility
- [ ] **Chrome** - Full functionality works
- [ ] **Firefox** - All features work correctly
- [ ] **Safari** - Mac/iOS compatibility
- [ ] **Edge** - Microsoft browser support
- [ ] **Mobile browsers** - iOS Safari, Chrome Mobile

## 📧 Email System (NOW ENABLED - NEW UNIFIED SYSTEM)
- [ ] **Email delivery** - All emails send via Resend API
- [ ] **Email templates** - HTML formatting works correctly
- [ ] **Task assignment emails** - Notifications sent when tasks are assigned
- [ ] **Collaborator invitation emails** - Email invitations work properly
- [ ] **Chat message notifications** - Email notifications for new messages (8hr rate limit)
- [ ] **Event update notifications** - Emails sent when events are modified
- [ ] **Status change notifications** - Emails for collaboration status changes
- [ ] **Vendor invitation emails** - Email invitations to vendors
- [ ] **Unsubscribe links** - Email opt-out functionality
- [ ] **Email bounces** - Handle bounced emails
- [ ] **Spam filtering** - Emails don't go to spam

## 🔔 Email Reminder & Onboarding System (NEW)
- [ ] **Invitation reminder emails** - Automated reminders for pending invitations
- [ ] **Onboarding welcome emails** - Welcome emails for new users without events
- [ ] **Background job processing** - Automated processing of reminders and onboarding
- [ ] **Email tracking tables** - Database tables prevent spam and track sent emails
- [ ] **Reminder rate limiting** - Respects 24-hour cooldown between reminders
- [ ] **Onboarding grace period** - 7-day grace period before sending onboarding emails
- [ ] **Eligibility checks** - Proper validation of reminder and onboarding eligibility
- [ ] **Test page functionality** - `test-email-reminders.html` works correctly
- [ ] **Edge function deployment** - All 3 new edge functions deployed and working
- [ ] **Environment variables** - RESEND_API_KEY configured correctly

## 🗄 Data Integrity
- [ ] **Database consistency** - Data relationships maintained
- [ ] **Backup verification** - Recent backups exist
- [ ] **Migration success** - All database migrations applied
- [ ] **Foreign key constraints** - Referential integrity maintained
- [ ] **Data validation** - Invalid data rejected properly

## 🔍 Error Handling
- [ ] **404 pages** - Proper not found handling
- [ ] **500 errors** - Server error recovery
- [ ] **Network failures** - Offline/connection error handling
- [ ] **Invalid inputs** - Form validation error messages
- [ ] **Permission errors** - Proper access denied messages
- [ ] **Loading states** - Loading spinners and skeleton screens

## 📊 Analytics & Monitoring
- [ ] **Error reporting** - Errors are tracked
- [ ] **User actions** - Key interactions logged
- [ ] **Performance monitoring** - Page speed tracked
- [ ] **Database monitoring** - Query performance tracked
- [ ] **Uptime monitoring** - Service availability checked

## ⚡ Final Checks
- [ ] **SSL certificate** - HTTPS working properly
- [ ] **Domain configuration** - Custom domain setup correctly
- [ ] **Environment variables** - Production config correct
- [ ] **Database connection** - Production database accessible
- [ ] **CDN resources** - All external resources load
- [ ] **Favicon** - Site icon displays correctly
- [ ] **Meta tags** - SEO tags properly configured
- [ ] **Legal pages** - Privacy policy, terms accessible

---

## 🚨 Known Issues (To Address Before Deployment)
- [ ] **Email notifications enabled** - New unified email system working
- [ ] **Infinite recursion policies** - Some RLS policies may cause issues
- [ ] **Task assignment emails** - Now working with unified notification system

## 📝 Testing Notes
- Use multiple browser profiles to test different user roles
- Test with actual collaborators to verify permission systems
- Test on both desktop and mobile devices
- Clear cache between tests to ensure fresh loads
- Monitor browser console for JavaScript errors during testing

## ✅ Sign-off
- [ ] **Development Team** - All features tested and working
- [ ] **User Acceptance** - Client has approved all functionality
- [ ] **Performance Review** - Site meets performance standards
- [ ] **Security Review** - Security audit completed
- [ ] **Backup Verified** - Recent backup confirmed working

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Version:** ___________