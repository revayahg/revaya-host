# Manual Feature Testing Guide - Single User
## Complete Testing Checklist for booking.thiago@gmail.com

This guide provides step-by-step instructions for testing all features that can be tested by a single logged-in user.

## Prerequisites
- User is logged in as: booking.thiago@gmail.com
- Access to: http://localhost:8000

---

## 1. Dashboard Testing

### Test Steps:
1. Navigate to `http://localhost:8000/#/dashboard`
2. Verify dashboard loads
3. Check event counts match expected values
4. Click through navigation tabs
5. Click "Create New Event" button

### Expected Results:
- ✅ Dashboard displays correctly
- ✅ Shows correct event counts
- ✅ Navigation works smoothly
- ✅ "Create New Event" button navigates to form

---

## 2. Event Creation

### Test Steps:
1. Go to `#/event-form`
2. Fill in Event Name: "Browser Test Event 2025"
3. Fill in Description: "Testing event creation via browser"
4. Enter Location: "Test Venue, Test City"
5. Set Expected Attendees: 100
6. Set Support Staff Needed: 5
7. Select Event Type: "🎤 Music Festival"
8. Add Date: Tomorrow's date
9. Set Start Time: 10:00 AM
10. Set End Time: 6:00 PM
11. Click "Create Event"

### Expected Results:
- ✅ Form submits successfully
- ✅ Redirects to event detail page
- ✅ Event appears in dashboard
- ✅ All data saved correctly

---

## 3. Event View & Edit

### Test Steps:
1. From dashboard, click on any event
2. Verify event detail page loads
3. Check all sections visible:
   - Basic Information
   - Event Schedule
   - Budget
   - Tasks
   - Collaborators
   - Staff
   - Messages
   - Maps & Pins
4. Click "Edit" button
5. Modify event name
6. Save changes

### Expected Results:
- ✅ Event detail page loads
- ✅ All sections visible
- ✅ Edit form works
- ✅ Changes save correctly

---

## 4. Task Management

### Test Steps:
1. Navigate to an event detail page
2. Scroll to "Task Management" section
3. Click "Add Task"
4. Fill in task details:
   - Title: "Test Task"
   - Description: "Testing task creation"
   - Priority: High
   - Due Date: Tomorrow
   - Start Date: Today
5. Save task
6. Test Kanban drag-and-drop:
   - Drag task from "Not Started" to "In Progress"
   - Drag task to "Completed"
7. Test filtering:
   - Filter by High Priority
   - Filter by Medium Priority
8. Test sorting:
   - Sort by Due Date
   - Sort by Priority
   - Sort by Title
9. Edit a task
10. Delete a task

### Expected Results:
- ✅ Tasks create successfully
- ✅ Drag-and-drop works smoothly
- ✅ Status updates save
- ✅ Filtering works correctly
- ✅ Sorting works correctly
- ✅ Edit/delete functions work

---

## 5. Budget Management

### Test Steps:
1. Navigate to event detail page
2. Scroll to "Budget" section
3. Click "Add Budget Item"
4. Enter:
   - Category: "Catering"
   - Item: "Food & Beverages"
   - Amount: $5000
   - Notes: "Test budget item"
5. Save item
6. Verify auto-save works (make changes and wait)
7. Edit budget item
8. Delete budget item
9. Check budget summary totals

### Expected Results:
- ✅ Budget items create successfully
- ✅ Auto-save works (saves after typing)
- ✅ Totals calculate correctly
- ✅ Edit/delete functions work

---

## 6. Collaboration Features

### Test Steps:
1. Navigate to event detail page
2. Scroll to "Collaborators" section
3. Click "Invite Collaborator"
4. Enter email: "test@example.com"
5. Select role: "Editor"
6. Send invitation
7. Verify invitation appears in "Pending Invitations"
8. View active collaborators list
9. Test role update (if collaborator exists)
10. Test remove collaborator (if applicable)

### Expected Results:
- ✅ Invitation sends successfully
- ✅ Pending invitation appears in list
- ✅ Active collaborators display correctly
- ✅ Role updates work
- ✅ Remove function works

---

## 7. Staff Management

### Test Steps:
1. Navigate to event detail page
2. Scroll to "Staff" section
3. Click "Add Staff" or use multi-add
4. Add staff member:
   - Name: "John Doe"
   - Role: "Security"
   - Shift: "Morning"
   - Contact: "john@example.com"
   - Confirmed: Yes
5. Save staff member
6. Test inline editing (click on any field)
7. Test filtering:
   - Filter by "Confirmed"
   - Filter by "Pending"
8. Test sorting:
   - Sort by Name
   - Sort by Role
   - Sort by Shift
9. Test export (copy to clipboard)
10. Delete staff member

### Expected Results:
- ✅ Staff members add successfully
- ✅ Inline editing works
- ✅ Filtering works correctly
- ✅ Sorting works correctly
- ✅ Export copies data correctly
- ✅ Delete function works

---

## 8. AI Document Features

### Test Steps:
1. Navigate to event detail page
2. Scroll to "Task Management" section
3. Click "Create tasks using AI!"
4. Upload a test document (PDF, Word, or Excel)
5. Wait for processing
6. Review AI task suggestions
7. Select tasks to create
8. Click "Create Selected Tasks"
9. Verify tasks appear in task list
10. Delete uploaded document

### Expected Results:
- ✅ Document uploads successfully
- ✅ AI processing completes
- ✅ Task suggestions appear
- ✅ Selected tasks create successfully
- ✅ Document deletion works

---

## 9. Messaging/Chat

### Test Steps:
1. Navigate to event detail page
2. Scroll to "Messages" section
3. View existing message threads
4. Click "New Message" or reply to existing thread
5. Type message: "Test message from browser testing"
6. Send message
7. Verify message appears in thread
8. Test message history loading

### Expected Results:
- ✅ Message threads load
- ✅ New messages send successfully
- ✅ Replies work correctly
- ✅ Message history displays

---

## 10. Vendor Management

### Test Steps:
1. Navigate to dashboard
2. Go to Vendors section (if available)
3. OR navigate to `#/vendor-form`
4. Create vendor profile:
   - Business Name: "Test Vendor"
   - Category: Select appropriate category
   - Description: "Test vendor description"
   - Contact information
5. Save vendor
6. View vendor profile
7. Edit vendor profile
8. Link vendor to event (from event detail page)
9. View linked vendors in event

### Expected Results:
- ✅ Vendor profile creates successfully
- ✅ Vendor profile displays correctly
- ✅ Edit function works
- ✅ Vendor linking works
- ✅ Linked vendors appear in event

---

## 11. Event Maps & Pins

### Test Steps:
1. Navigate to event detail page
2. Scroll to "Maps & Pins" section
3. View event map
4. Click "Add Pin" or click on map
5. Enter pin details:
   - Name: "Test Pin"
   - Description: "Testing pin creation"
   - Type: Select appropriate type
6. Save pin
7. Drag pin on map
8. Edit pin details
9. Assign vendor to pin (if applicable)
10. Delete pin

### Expected Results:
- ✅ Map displays correctly
- ✅ Pins add successfully
- ✅ Pin dragging works
- ✅ Pin editing works
- ✅ Vendor assignment works
- ✅ Pin deletion works

---

## 12. Knowledge Base

### Test Steps:
1. Navigate to event detail page
2. Scroll to "Knowledge Base" section OR navigate to `#/knowledge`
3. View existing documents
4. Upload new document
5. View document in viewer
6. Delete document

### Expected Results:
- ✅ Knowledge base loads
- ✅ Documents upload successfully
- ✅ Document viewer works
- ✅ Document deletion works

---

## 13. Notifications

### Test Steps:
1. Click notifications icon/badge (if visible)
2. OR navigate to notifications section
3. View notifications list
4. Click on a notification
5. Mark notification as read
6. Clear notifications

### Expected Results:
- ✅ Notifications list loads
- ✅ Notifications are clickable
- ✅ Mark as read works
- ✅ Clear function works

---

## 14. Profile & Settings

### Test Steps:
1. Click on user email/avatar
2. OR navigate to `#/settings`
3. View profile settings
4. Edit profile information:
   - First Name
   - Last Name
   - Email (if allowed)
5. Update password (if needed)
6. Check notification preferences
7. Save changes

### Expected Results:
- ✅ Profile settings load
- ✅ Edit form works
- ✅ Changes save correctly
- ✅ Notification preferences save

---

## 15. Mobile Responsiveness

### Test Steps:
1. Open browser DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device (iPhone, iPad, etc.)
4. Test all major features on mobile:
   - Dashboard navigation
   - Event creation
   - Task management
   - Budget management
   - Staff management
5. Check mobile bottom navigation
6. Test touch interactions

### Expected Results:
- ✅ All features work on mobile
- ✅ Layout is responsive
- ✅ Touch targets are adequate (44px minimum)
- ✅ Mobile navigation works

---

## 16. Error Handling

### Test Steps:
1. Try submitting forms with invalid data
2. Test network error scenarios (disable network temporarily)
3. Test permission errors (try accessing restricted features)
4. Check error messages are user-friendly
5. Verify loading states appear

### Expected Results:
- ✅ Validation errors display correctly
- ✅ Network errors handled gracefully
- ✅ Permission errors show clear messages
- ✅ Loading states visible during operations

---

## 17. Performance Testing

### Test Steps:
1. Monitor page load times
2. Check for console errors (F12 → Console)
3. Test with many events/tasks loaded
4. Check for memory leaks (keep browser open, perform many operations)
5. Verify smooth animations

### Expected Results:
- ✅ Pages load quickly (< 3 seconds)
- ✅ No console errors
- ✅ Performance acceptable with large datasets
- ✅ No memory leaks
- ✅ Animations are smooth

---

## Test Results Summary

After completing all tests, document:
- ✅ Passed tests
- ❌ Failed tests
- ⚠️ Issues found
- 📝 Notes and observations

---

## Quick Test URLs

- Dashboard: `http://localhost:8000/#/dashboard`
- Create Event: `http://localhost:8000/#/event-form`
- View Event: `http://localhost:8000/#/event/view/{event-id}`
- Edit Event: `http://localhost:8000/#/event/edit/{event-id}`
- Settings: `http://localhost:8000/#/settings`
- Knowledge Base: `http://localhost:8000/#/knowledge`
- Feedback: `http://localhost:8000/#/feedback`
