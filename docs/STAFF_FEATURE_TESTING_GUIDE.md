# Staff Management Feature - Testing Guide

## Prerequisites

Before testing, ensure:
1. **Database Migration Applied**: Run `database/migrations/20251028000007_create_event_staff_table.sql` on your Supabase database
2. **Verification**: Run `database/scripts/verify_event_staff_table.sql` to confirm table exists
3. **Permissions**: You have access to an event as owner or editor

## Testing Checklist

### 1. Basic CRUD Operations

#### ✅ Create Staff Member
- [ ] Navigate to an event's "Staff" tab (must be owner or editor)
- [ ] Click "Add New Staff Member" form
- [ ] Fill in required field: **Name**
- [ ] Fill in optional fields: Role, Shift, Contact, Notes
- [ ] Toggle "Confirmed" checkbox
- [ ] Click "Add Staff" button
- [ ] Verify success toast appears
- [ ] Verify staff member appears in table
- [ ] Verify stats update (Total increases)

#### ✅ Edit Staff Member (Inline)
- [ ] Click on any editable field (name, role, shift, contact, notes, confirmed)
- [ ] Modify the value
- [ ] Press Enter or click outside to save
- [ ] Verify change is saved
- [ ] Verify success toast appears
- [ ] Verify updated data in table

#### ✅ Delete Staff Member
- [ ] Click delete button (trash icon) on a staff member
- [ ] Confirm deletion
- [ ] Verify staff member is removed
- [ ] Verify stats update (Total decreases)

### 2. Multi-Add Feature

#### ✅ Multi-Add
- [ ] Click "Multi-Add" button
- [ ] Enter number between 1-20 (e.g., 5)
- [ ] Click "Add X Rows"
- [ ] Verify 5 empty rows appear in table
- [ ] Fill in data for each row
- [ ] Verify all rows save correctly
- [ ] Test edge cases: 1 row, 20 rows
- [ ] Test invalid input: 0, 21, negative numbers (should show error)

### 3. Filtering

#### ✅ Filter by Status
- [ ] Add staff members with different confirmed statuses
- [ ] Select "All" filter → Verify all staff shown
- [ ] Select "Confirmed" filter → Verify only confirmed staff shown
- [ ] Select "Pending" filter → Verify only unconfirmed staff shown
- [ ] Verify stats match filtered results

### 4. Sorting

#### ✅ Sort by Name
- [ ] Click sort dropdown → Select "Name"
- [ ] Toggle sort order (ascending/descending)
- [ ] Verify staff sorted alphabetically
- [ ] Test with names starting with lowercase/uppercase

#### ✅ Sort by Role
- [ ] Select "Role" sort
- [ ] Toggle sort order
- [ ] Verify staff sorted by role

#### ✅ Sort by Shift
- [ ] Select "Shift" sort
- [ ] Toggle sort order
- [ ] Verify staff sorted by shift

#### ✅ Sort by Status (Confirmed/Pending)
- [ ] Select "Status" sort
- [ ] Toggle sort order
- [ ] Verify confirmed staff grouped together

### 5. Copy to Clipboard

#### ✅ Copy Functionality
- [ ] Add multiple staff members
- [ ] Click "Copy to Clipboard" button
- [ ] Verify success toast appears
- [ ] Paste into Excel/Google Sheets
- [ ] Verify data pastes correctly:
  - Tab-separated columns
  - Headers: Name, Role, Shift, Contact, Confirmed, Notes
  - All staff data present
  - Confirmed shows as "Yes"/"No"

### 6. Statistics Display

#### ✅ Stats Update
- [ ] Verify stats display: Total, Confirmed, Pending
- [ ] Add confirmed staff → Verify stats update
- [ ] Add unconfirmed staff → Verify stats update
- [ ] Toggle confirmed status → Verify stats update
- [ ] Delete staff → Verify stats update

### 7. Permissions & RLS

#### ✅ Owner Permissions
- [ ] Login as event owner
- [ ] Verify can view all staff
- [ ] Verify can add staff
- [ ] Verify can edit staff
- [ ] Verify can delete staff

#### ✅ Editor Permissions
- [ ] Login as event editor (collaborator with editor role)
- [ ] Verify can view all staff
- [ ] Verify can add staff
- [ ] Verify can edit staff
- [ ] Verify can delete staff

#### ✅ Viewer Permissions
- [ ] Login as event viewer (collaborator with viewer role)
- [ ] Verify can view all staff
- [ ] Verify CANNOT see "Add New Staff Member" form
- [ ] Verify CANNOT see edit/delete buttons
- [ ] Verify CANNOT see "Multi-Add" button

### 8. Error Handling

#### ✅ Table Missing Error
- [ ] If table doesn't exist, verify error message displays:
  - Red alert box at top
  - Message: "The event_staff table does not exist. Please run the database migration..."
- [ ] Verify error toast on actions shows helpful message

#### ✅ Permission Errors
- [ ] As viewer, try to edit (should be blocked by UI, not API)
- [ ] Verify permission error messages are user-friendly

#### ✅ Validation Errors
- [ ] Try to add staff without name → Verify error: "Name is required"
- [ ] Verify form prevents submission

### 9. UI/UX

#### ✅ Responsive Design
- [ ] Test on desktop (wide screen)
- [ ] Test on tablet
- [ ] Test on mobile
- [ ] Verify table is scrollable on small screens
- [ ] Verify filters/sorting work on mobile

#### ✅ Loading States
- [ ] Verify loading spinner on initial load
- [ ] Verify smooth transitions between states

#### ✅ Inline Editing UX
- [ ] Click field → Verify it becomes editable
- [ ] Edit value → Press Enter → Verify saves
- [ ] Click outside → Verify saves
- [ ] Press Escape → Verify cancels (if implemented)

### 10. Edge Cases

#### ✅ Empty State
- [ ] Event with no staff → Verify empty state message
- [ ] Verify "Add Staff" form still visible (if editor/owner)

#### ✅ Large Dataset
- [ ] Add 50+ staff members
- [ ] Verify table scrolls correctly
- [ ] Verify filtering/sorting still works
- [ ] Verify stats calculate correctly

#### ✅ Special Characters
- [ ] Test names with: apostrophes, hyphens, accents, emojis
- [ ] Test roles/shifts with special characters
- [ ] Test contact with: phone numbers, emails, special formats

## Expected Behavior Summary

### ✅ Working Features
- All CRUD operations
- Inline editing for all fields
- Multi-add (1-20 rows)
- Filtering (All/Confirmed/Pending)
- Sorting (Name/Role/Shift/Status) with order toggle
- Copy to clipboard (tab-separated, Excel-compatible)
- Real-time statistics
- Permission-based UI (owner/editor can edit, viewer read-only)

### ❌ Known Issues / Limitations
- MutationObserver error (cosmetic, doesn't affect functionality)
- Table must exist in database (migration required)

## Troubleshooting

### Issue: "The event_staff table does not exist"
**Solution**: Run the migration:
```sql
-- Run in Supabase SQL Editor:
-- File: database/migrations/20251028000007_create_event_staff_table.sql
```

### Issue: "Permission denied" when adding staff
**Solution**: 
- Verify you're an event owner or editor
- Check RLS policies are correct
- Verify your collaborator invitation is accepted

### Issue: Staff not appearing after adding
**Solution**:
- Check browser console for errors
- Verify event_id is correct
- Check network tab for API response
- Verify RLS policies allow SELECT

## Test Results Template

```
Test Date: _______________
Tester: _______________
Environment: [ ] Local [ ] Staging [ ] Production

Basic CRUD: [ ] Pass [ ] Fail - Notes: ___________
Multi-Add: [ ] Pass [ ] Fail - Notes: ___________
Filtering: [ ] Pass [ ] Fail - Notes: ___________
Sorting: [ ] Pass [ ] Fail - Notes: ___________
Copy to Clipboard: [ ] Pass [ ] Fail - Notes: ___________
Permissions (Owner): [ ] Pass [ ] Fail - Notes: ___________
Permissions (Editor): [ ] Pass [ ] Fail - Notes: ___________
Permissions (Viewer): [ ] Pass [ ] Fail - Notes: ___________
Error Handling: [ ] Pass [ ] Fail - Notes: ___________
UI/UX: [ ] Pass [ ] Fail - Notes: ___________

Overall Status: [ ] Ready for Production [ ] Needs Fixes
Critical Issues: ___________
Minor Issues: ___________
```

