# 🗄️ Production SQL Scripts Deployment Guide

## ⚠️ CRITICAL: Backup Production Database First
**BEFORE RUNNING ANY SCRIPTS:**
1. Create a full backup of the production database
2. Test scripts on a copy of production data first
3. Run scripts during low-traffic periods
4. Monitor for any errors during execution

## 📋 Script Execution Order

### Phase 1: Core System Scripts (Run First)
These scripts fix fundamental system issues and must be run first:

```sql
-- Script 183: Fix messaging RLS policies
-- File: supabase_operations/183_fix_messaging_policies_corrected.sql
-- Purpose: Fix messaging system RLS policies to prevent infinite recursion

-- Script 195: Fix notification RLS policies  
-- File: supabase_operations/195_fix_notifications_rls_final.sql
-- Purpose: Fix notification system RLS policies

-- Script 197: Complete notification system
-- File: supabase_operations/197_fix_notification_rls_policies_final.sql
-- Purpose: Complete notification system setup

-- Script 200: Comprehensive notification fixes
-- File: supabase_operations/200_fix_notification_policies_comprehensive.sql
-- Purpose: Comprehensive notification system fixes

-- Script 203: Final notification system
-- File: supabase_operations/203_comprehensive_notification_system_fix.sql
-- Purpose: Final notification system implementation

-- Script 207: Task notification policies
-- File: supabase_operations/207_fix_task_notification_policies_all_roles.sql
-- Purpose: Fix task notification policies for all user roles
```

### Phase 2: Budget System Scripts
These scripts set up the budget management system:

```sql
-- Script 211: Create event_budget_items table
-- File: supabase_operations/211_migrate_budget_data_to_table.sql
-- Purpose: Create event_budget_items table for budget management

-- Custom Script: Budget RLS policies
-- File: fix-event-budget-items-rls.sql
-- Purpose: Add RLS policies for event_budget_items table
-- Note: This script was created during development and needs to be run
```

### Phase 3: Event System Scripts
These scripts fix event ownership and collaboration:

```sql
-- Script 191: Fix event ownership
-- File: supabase_operations/191_fix_event_ownership_cascading.sql
-- Purpose: Fix event ownership cascading issues

-- Script 194: Fix collaborator data
-- File: supabase_operations/194_fix_existing_collaborator_data.sql
-- Purpose: Fix existing collaborator data integrity

-- Script 201: Complete event ownership fix
-- File: supabase_operations/201_fix_event_ownership_cascading.sql
-- Purpose: Complete event ownership fixes
```

### Phase 4: Final System Scripts
These scripts complete the system setup:

```sql
-- Script 192: Complete system reset
-- File: supabase_operations/192_complete_system_reset.sql
-- Purpose: Complete system reset and cleanup

-- Script 198: Final notification RLS
-- File: supabase_operations/198_fix_notification_rls_complete.sql
-- Purpose: Final notification RLS policies

-- Script 199: Fix notification UUID casting
-- File: supabase_operations/199_fix_notification_uuid_casting.sql
-- Purpose: Fix notification UUID casting issues

-- Script 202: Final notification table fixes
-- File: supabase_operations/202_fix_notifications_table_final.sql
-- Purpose: Final notification table structure fixes

-- Script 204: Working notification system
-- File: supabase_operations/204_notification_system_working_fix.sql
-- Purpose: Working notification system implementation

-- Script 205: Simple notification fixes
-- File: supabase_operations/205_simple_notification_fix.sql
-- Purpose: Simple notification system fixes

-- Script 206: Disable problematic RLS temporarily
-- File: supabase_operations/206_disable_notifications_rls.sql
-- Purpose: Temporarily disable problematic RLS policies

-- Script 208: Complete RLS disable
-- File: supabase_operations/208_disable_notifications_rls_completely.sql
-- Purpose: Completely disable problematic RLS policies

-- Script 209: Task assignment system
-- File: supabase_operations/209_create_task_assignment_system.sql
-- Purpose: Create task assignment system

-- Script 210: Task assignment tokens
-- File: supabase_operations/210_add_task_assignment_tokens.sql
-- Purpose: Add task assignment tokens
```

### Phase 5: Feature Enhancement Scripts
These scripts add new features and enhancements:

```sql
-- Script 212: Add Support Staff Needed field
-- File: supabase_operations/212_add_support_staff_needed_to_events.sql
-- Purpose: Add support_staff_needed column to events table for staff planning
-- Note: This adds a new integer field to track support staff requirements

-- Custom Script: Budget RLS policies
-- File: fix-event-budget-items-rls.sql
-- Purpose: Add RLS policies for event_budget_items table
-- Note: This script enables RLS and creates policies for budget items

-- Custom Script: Pins RLS policies  
-- File: fix-pins-rls.sql
-- Purpose: Add RLS policies for pins table
-- Note: This script enables RLS and creates policies for event map pins
```

## 🔍 Script Verification

After running each script, verify:

1. **No Errors**: Check that no errors occurred during execution
2. **Table Creation**: Verify new tables were created successfully
3. **RLS Policies**: Check that RLS policies were created correctly
4. **Data Integrity**: Ensure existing data is not corrupted
5. **Functionality**: Test that the affected features work correctly

## 📊 Expected Results

After running all scripts, you should have:

- ✅ **Messaging System**: Working with proper RLS policies
- ✅ **Notification System**: Complete notification system with RLS
- ✅ **Budget System**: event_budget_items table with RLS policies
- ✅ **Event Maps**: Pins table with RLS policies
- ✅ **Task System**: Task assignment system with notifications
- ✅ **Collaboration**: Fixed event ownership and collaborator data
- ✅ **Support Staff Planning**: support_staff_needed field in events table

## 🚨 Rollback Plan

If any script fails or causes issues:

1. **Stop execution** immediately
2. **Restore from backup** if necessary
3. **Check error logs** for specific issues
4. **Fix the problematic script** before continuing
5. **Test on development** before retrying production

## 📝 Post-Deployment Verification

After all scripts are run:

1. **Test all features** in production environment
2. **Verify RLS policies** are working correctly
3. **Check notification system** is functional
4. **Test budget system** with real data
5. **Verify event maps** and pins work correctly
6. **Test task assignments** and notifications
7. **Test support staff field** in create/edit event forms and event displays
8. **Monitor error logs** for any issues

## 🔧 Troubleshooting

Common issues and solutions:

- **Infinite Recursion**: Usually fixed by scripts 183, 195, 197
- **RLS Policy Conflicts**: Scripts 206, 208 disable problematic policies
- **Missing Tables**: Scripts 211, 209, 210 create required tables
- **Permission Issues**: Scripts 191, 194, 201 fix ownership issues

## 📞 Support

If you encounter issues during script execution:

1. **Check the specific script** that failed
2. **Review error messages** carefully
3. **Test on development** first
4. **Contact development team** with specific error details
