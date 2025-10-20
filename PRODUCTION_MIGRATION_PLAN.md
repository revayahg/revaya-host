# 🚀 PRODUCTION DATABASE MIGRATION PLAN

## 🎯 **ZERO-RISK MIGRATION STRATEGY**

### **Phase 1: Backup & Analysis** (CRITICAL)
- [ ] **Full production database backup** before any changes
- [ ] **Document current production schema** and data
- [ ] **Identify differences** between dev and production
- [ ] **Test migration scripts** on a copy of production data

### **Phase 2: Safe Schema Updates** (NON-BREAKING)
- [ ] **Add missing columns** (if any) with default values
- [ ] **Create missing tables** (if any) without affecting existing data
- [ ] **Add missing indexes** for performance
- [ ] **Update RLS policies** to match development

### **Phase 3: Data Integrity Fixes** (CAREFUL)
- [ ] **Add missing event owner roles** to `event_user_roles`
- [ ] **Fix any orphaned records** without data loss
- [ ] **Ensure all users have profiles** in the profiles table
- [ ] **Verify email system** configuration

### **Phase 4: Email Notification System Migration** (COMPLETE)
- [x] **Deploy unified edge function** `send-notification-email` to production
- [x] **Configure RESEND_API_KEY** environment variable in production Supabase
- [x] **Test all notification types** with production email delivery
- [x] **Monitor delivery rates** in Resend dashboard
- [x] **Keep old edge functions** running for 1 week as backup
- [x] **Remove legacy functions** after stable operation

### **Phase 4.2: Email Reminder & Onboarding System Migration** (NEW)
- [ ] **Deploy email tracking tables** `210_create_email_tracking_tables.sql` to production
- [ ] **Deploy invitation reminder function** `send-invitation-reminder` to production
- [ ] **Deploy onboarding email function** `send-onboarding-email` to production
- [ ] **Deploy background job function** `process-email-reminders` to production
- [ ] **Configure RESEND_API_KEY** environment variable (if not already set)
- [ ] **Test all email reminder functions** with production email delivery
- [ ] **Set up cron job** for daily processing of reminders and onboarding emails
- [ ] **Monitor delivery rates** and system performance

### **Phase 4.1: Database Schema Verification** (CRITICAL)
- [ ] **Verify production database schema** matches development
- [ ] **Test two-step query approach** for `event_user_roles` and `profiles` tables
- [ ] **Ensure RLS policies** allow access to collaborator data for notifications
- [ ] **Test event update notifications** go to collaborators, not the editor
- [ ] **Verify date/time fields** work correctly in production environment

### **Phase 5: Testing & Validation** (COMPREHENSIVE)
- [ ] **Test all features** with production data
- [ ] **Verify user authentication** works
- [ ] **Test unified email notifications** with real Resend API
- [ ] **Validate all user data** is accessible
- [ ] **Test notification rate limiting** for chat messages

## 🔧 **REQUIRED MIGRATION SCRIPTS**

### **1. Access Control System** (CRITICAL)
```sql
-- fix_access_code_issue.sql - Fix access code validation RPC function
-- Ensures MHP2026 access code works properly in production
-- Creates/updates access_codes and access_visits tables
-- Fixes validate_access_code RPC function to return proper JSONB format
```

### **2. RLS Policy Updates** (SAFE)
```sql
-- These are the critical RLS policy fixes needed in production
-- They make the system more permissive, not restrictive
```

### **2. Missing Event Owner Roles** (SAFE)
```sql
-- Add missing admin roles for event owners
-- This only adds data, doesn't modify existing
```

### **3. Profile System Enhancements** (SAFE)
```sql
-- Ensure all users have proper profiles
-- Add missing columns with defaults
```

## 🚨 **CRITICAL CONSIDERATIONS**

### **What WON'T Break:**
- ✅ **User authentication** - uses same auth.users table
- ✅ **Existing user data** - all preserved
- ✅ **Event data** - all preserved
- ✅ **Vendor data** - all preserved

### **What MIGHT Need Updates:**
- ⚠️ **RLS policies** - need to be updated to match dev
- ⚠️ **Missing roles** - some event owners might need admin roles
- ⚠️ **Email system** - needs Resend API configuration

### **What's SAFE to Update:**
- ✅ **RLS policies** - making them more permissive
- ✅ **Adding missing roles** - only adds data
- ✅ **Profile enhancements** - only adds columns with defaults

## 🎯 **MIGRATION EXECUTION PLAN**

### **Step 1: Create Migration Scripts**
- [ ] **Extract only the SAFE changes** from development
- [ ] **Create production-specific migration scripts**
- [ ] **Test on production database copy**

### **Step 2: Pre-Migration Testing**
- [ ] **Run migration scripts on production copy**
- [ ] **Verify all features work** with production data
- [ ] **Test user authentication** and data access
- [ ] **Validate email system** works correctly

### **Step 3: Production Deployment**
- [ ] **Apply migration scripts** to production database
- [ ] **Deploy application** to Vercel
- [ ] **Monitor for any issues**
- [ ] **Verify all users can access their data**

## 🔒 **ROLLBACK PLAN**

If anything goes wrong:
1. **Revert RLS policies** to previous state
2. **Remove any added roles** if they cause issues
3. **Keep application on Trickle.io** as backup
4. **Restore from backup** if necessary

## 📊 **SUCCESS METRICS**

- [ ] **All existing users can log in**
- [ ] **All user data is accessible**
- [ ] **All features work identically**
- [ ] **No data loss or corruption**
- [ ] **Performance is maintained or improved**
