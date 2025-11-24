# Production Deployment Order - Version 0.1.1-alpha.5

## Overview
This document outlines the logical deployment order for all new features developed in the development environment. All features are fully implemented and tested, ready for production deployment.

## Current Status
- **Development Environment**: All features fully implemented and tested
- **Production Environment**: Version 0.1.1-alpha.4 (stable)
- **Target Version**: 0.1.1-alpha.5 (with Staff Management, Email Unsubscribe System, Privacy Policy updates, and Terms of Use)

## Deployment Order (Logical Sequence)

### Phase 1: Database Schema Updates
**Priority: HIGH** - Must be deployed first as other features depend on these

#### 1.1 Core Database Migrations
- [ ] `20251023000001_add_start_date_to_tasks.sql` - Add start_date to tasks table
- [ ] `20250123000001_change_task_status_pending_to_not_started.sql` - Update task status labels
- [ ] `20251028000001_create_event_documents_table.sql` - Create event_documents table
- [ ] `20251028000007_create_event_staff_table.sql` - Create event_staff table (Staff Management feature)
- [ ] `20251102000001_add_unsubscribe_fields.sql` - Add unsubscribe_token and unsubscribed_at columns to profiles and vendor_profiles tables (Email Unsubscribe System)
- [ ] `20250124000001_create_get_invitation_by_token_function.sql` - Create RPC function to query collaborator invitations by token (bypasses RLS for invitation acceptance flow)

⚠️ **IMPORTANT SECURITY NOTE:** Do NOT run these development-only migrations on production:
- `20251028000005_fix_database_rls_simple.sql` - Contains permissive `WITH CHECK (true)` policies (development only)
- `20251028000006_allow_all_storage.sql` - Contains permissive storage policies (development only)
These are superseded by `20251028000008_restore_proper_rls_policies.sql` which has proper security policies.

#### 1.2 RLS Policy Updates
- [ ] `20251028000008_restore_proper_rls_policies.sql` - Restore proper security policies for event_documents
- [ ] `20251028000011_fix_event_staff_rls_copy_tasks_pattern.sql` - Fix event_staff RLS policies (matches working tasks pattern)
  - **Note:** This migration uses the exact same RLS pattern as the working `tasks` table to ensure consistency
  - Must run AFTER `20251028000007_create_event_staff_table.sql` (creates the table)
- [ ] `20251111000019_align_pins_with_unified_policies.sql` - Align `pins` table with unified event helpers and defaults
- [ ] `20251111000020_align_remaining_event_policies.sql` - Apply helper-first RLS for `event_dates`, vendor tables, activity log, and knowledge documents
- [ ] `20251111000021_align_messaging_policies.sql` - Rebuild messaging (`message_threads`, `message_participants`, `messages`) policies using the helpers
- [ ] `20251111000024_recreate_notifications_policy.sql` - Update notifications insert policy to rely on helpers and invitation metadata
- [ ] Verify all RLS policies are working correctly
- [ ] Test cross-tenant data isolation

### Phase 2: Storage Infrastructure
**Priority: HIGH** - Required for AI Document feature

#### 2.1 Storage Bucket Creation
- [ ] Create `event-documents` storage bucket in production
- [ ] Configure bucket settings:
  - Public: false
  - File size limit: 10MB
  - Allowed MIME types: PDF, Word, Excel, Images
- [ ] Apply RLS policies to storage bucket
- [ ] Test file upload/download functionality

### Phase 3: Edge Functions
**Priority: MEDIUM** - Backend services for AI features

#### 3.1 AI Document Analysis Function
- [ ] Deploy `analyze-document-for-tasks` Edge Function to production
- [ ] Set `OPENAI_API_KEY` secret in production Supabase
- [ ] Test AI analysis with production database
- [ ] Monitor OpenAI API usage and costs

#### 3.2 Email Unsubscribe Function
- [ ] Deploy `unsubscribe` Edge Function to production
- [ ] Verify unsubscribe URL redirects correctly in production
- [ ] Test token validation and database updates
- [ ] Verify environment-aware redirects (production URL)

#### 3.3 Email Functions Updates
- [ ] Deploy updated `send-onboarding-email` Edge Function with unsubscribe token generation
- [ ] Deploy updated `send-notification-email` Edge Function with unsubscribe footer
- [ ] Verify unsubscribe links are included in all marketing emails
- [ ] Test unsubscribe check prevents sending to unsubscribed users
- [ ] Redeploy `check-user-exists` Edge Function after setting `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets; verify it returns `{"exists": true|false}`

#### 3.4 Existing Edge Functions (if needed)
- [ ] Verify existing Edge Functions are working
- [ ] Update CORS policies if needed
- [ ] Test email notifications

### Phase 4: Frontend Components
**Priority: MEDIUM** - User interface updates

#### 4.1 Core Component Updates
- [ ] Deploy updated `EditEventForm.js` with userRole logic
- [ ] Deploy updated `ViewEventDetailContent.js` with Staff button
- [ ] Deploy updated `TaskManager.js` with AI integration and improved filter/sort layout
- [ ] Deploy updated `CollaboratorInviteResponse.js` with RPC function support and improved error handling (fixes invitation acceptance flow)
- [ ] Deploy updated `index.html` with new script references
- [ ] Deploy updated `app.js` with Terms of Use routing

#### 4.2 New Components
- [ ] Deploy `AIDocumentUploader.js` component
- [ ] Deploy `AITaskSuggestionsModal.js` component
- [ ] Deploy `StaffManager.js` component
- [ ] Deploy `staffAPI.js` utility

#### 4.3 Legal Pages (Privacy & Terms)
- [ ] Deploy updated `components/Pages/PrivacyPolicy.js` with new content (roles, retention policies)
- [ ] Deploy new `components/Pages/TermsOfUse.js` component
- [ ] Verify routing works for `/privacy` and `/terms`
- [ ] Test links on production site

#### 4.4 Email Unsubscribe Page
- [ ] Deploy `components/Pages/Unsubscribed.js` component
- [ ] Verify routing works for `/unsubscribed`
- [ ] Test unsubscribe confirmation page displays correctly
- [ ] Verify "Back to Revaya Host" button works

### Phase 5: Testing & Validation
**Priority: HIGH** - Ensure everything works correctly

#### 5.1 Feature Testing
- [ ] Test AI Document-to-Tasks feature end-to-end
- [ ] Test Staff Management feature end-to-end
- [ ] Test Email Unsubscribe System end-to-end:
  - [ ] Test unsubscribe page loads at `/unsubscribed`
  - [ ] Test unsubscribe link in emails redirects correctly
  - [ ] Test token validation and database updates
  - [ ] Test unsubscribed users don't receive marketing emails
  - [ ] Test unsubscribe token generation for new users
- [ ] Test Collaborator Invitation Acceptance flow end-to-end:
  - [ ] Test invitation link from email loads correctly
  - [ ] Test RPC function `get_invitation_by_token` works correctly
  - [ ] Test invitation acceptance with matching email
  - [ ] Test error handling for mismatched email addresses
  - [ ] Test invitation acceptance redirects to dashboard
  - [ ] Test invitation decline functionality
- [ ] Test Privacy Policy page accessibility and content accuracy
- [ ] Test Terms of Use page accessibility and content accuracy
- [ ] Test Unsubscribe page accessibility and functionality
- [ ] Test role-based permissions for all features
- [ ] Test mobile responsiveness (including legal pages and unsubscribe page)
- [ ] Test error handling and edge cases

#### 5.2 Security Testing
- [ ] Verify RLS policies prevent cross-tenant access
- [ ] Test file upload security
- [ ] Verify API authentication
- [ ] Test CORS policies

#### 5.3 Performance Testing
- [ ] Test database query performance
- [ ] Test file upload/download speeds
- [ ] Test AI analysis response times
- [ ] Monitor resource usage

### Phase 6: Monitoring & Documentation
**Priority: LOW** - Post-deployment tasks

#### 6.1 Monitoring Setup
- [ ] Set up OpenAI API usage monitoring
- [ ] Set up error tracking for new features
- [ ] Monitor database performance
- [ ] Set up alerts for critical issues

#### 6.2 Documentation Updates
- [ ] Update production documentation
- [ ] Update user guides
- [ ] Update API documentation
- [ ] Update security documentation
- [ ] Verify Privacy Policy and Terms of Use pages are accessible
- [ ] Verify Unsubscribe page is accessible
- [ ] Update footer/legal links if applicable
- [ ] Document unsubscribe system functionality for compliance

## Critical Dependencies

### Database Dependencies
1. **event_documents table** → Required for AI Document feature
2. **event_staff table** → Required for Staff Management feature
3. **profiles.unsubscribe_token & unsubscribed_at** → Required for Email Unsubscribe System
4. **vendor_profiles.unsubscribe_token & unsubscribed_at** → Required for Email Unsubscribe System (vendor emails)
5. **get_invitation_by_token() RPC function** → Required for collaborator invitation acceptance flow (bypasses RLS)
6. **RLS policies** → Required for security
   - `event_documents` RLS policies (via 20251028000008)
   - `event_staff` RLS policies (via 20251028000011 - matches tasks pattern)
   - `pins`, messaging, dates/vendor/activity/knowledge tables, notifications policies (via 20251111000019, 20, 21, 24)

### Storage Dependencies
1. **event-documents bucket** → Required for AI Document feature
2. **Storage RLS policies** → Required for security

### API Dependencies
1. **OpenAI API key** → Required for AI analysis
2. **Edge Functions** → Required for AI processing and unsubscribe handling
   - `analyze-document-for-tasks` → AI document analysis
   - `unsubscribe` → Email unsubscribe processing
   - `send-onboarding-email` → Updated with unsubscribe tokens
   - `send-notification-email` → Updated with unsubscribe footer

### Frontend Dependencies
1. **Database tables** → Required for data display and unsubscribe tracking
2. **Storage bucket** → Required for file operations
3. **Edge Functions** → Required for AI processing and unsubscribe handling
4. **Unsubscribe page component** → Required for unsubscribe confirmation
5. **get_invitation_by_token() RPC function** → Required for CollaboratorInviteResponse component to query invitations

## Rollback Plan

### If Database Issues Occur
1. Revert database migrations in reverse order
2. Restore previous RLS policies
3. Drop RPC function if needed: `DROP FUNCTION IF EXISTS public.get_invitation_by_token(TEXT);`
4. Verify data integrity

### If Storage Issues Occur
1. Disable AI Document feature
2. Remove storage bucket
3. Update frontend to hide AI features

### If Edge Function Issues Occur
1. Disable AI Document feature
2. Remove Edge Function
3. Update frontend to hide AI features

### If Frontend Issues Occur
1. Revert to previous component versions
2. Remove new script references
3. Test core functionality

## Success Criteria

### Phase 1 Success
- [ ] All database migrations applied successfully
- [ ] No data loss or corruption
- [ ] RLS policies working correctly
- [ ] RPC function `get_invitation_by_token` exists and is callable

### Phase 2 Success
- [ ] Storage bucket created and accessible
- [ ] File upload/download working
- [ ] Security policies enforced

### Phase 3 Success
- [ ] Edge Functions deployed and accessible
- [ ] AI analysis working correctly
- [ ] API costs within expected range

### Phase 4 Success
- [ ] All components loading correctly
- [ ] No JavaScript errors
- [ ] Mobile responsiveness working

### Phase 5 Success
- [ ] All features working end-to-end
- [ ] Security tests passing
- [ ] Performance within acceptable limits

### Phase 6 Success
- [ ] Monitoring in place
- [ ] Documentation updated
- [ ] Team trained on new features

## Timeline Estimate

### Phase 1: Database Updates (1-2 hours)
- Migration deployment: 30-45 minutes
- Testing and validation: 30-60 minutes
- **Note:** Includes unsubscribe fields migration (20251102000001) and invitation RPC function (20250124000001)

### Phase 2: Storage Infrastructure (30 minutes)
- Bucket creation: 15 minutes
- Policy configuration: 15 minutes

### Phase 3: Edge Functions (1.5-2 hours)
- AI function deployment: 30 minutes
- Unsubscribe function deployment: 15 minutes
- Email functions updates deployment: 30 minutes
- API key configuration: 15 minutes
- Testing: 30 minutes
- **Note:** Includes unsubscribe edge function and email function updates

### Phase 4: Frontend Components (45 minutes)
- Component deployment: 20 minutes
- Unsubscribe page deployment: 10 minutes
- Testing: 15 minutes
- **Note:** Includes Unsubscribed page component

### Phase 5: Testing & Validation (2-3 hours)
- Feature testing: 1-2 hours
- Security testing: 30 minutes
- Performance testing: 30 minutes

### Phase 6: Monitoring & Documentation (1 hour)
- Monitoring setup: 30 minutes
- Documentation updates: 30 minutes

**Total Estimated Time: 6-8 hours** (includes Email Unsubscribe System)

## Risk Assessment

### High Risk
- **Database migrations**: Potential data loss if not done correctly
- **RLS policy changes**: Could break existing functionality

### Medium Risk
- **Edge Function deployment**: Could affect AI features
- **Storage bucket creation**: Could affect file operations

### Low Risk
- **Frontend component updates**: Easy to rollback
- **Documentation updates**: No functional impact

## Pre-Deployment Checklist

### Environment Preparation
- [ ] Production database backup created
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Monitoring tools ready

### Code Preparation
- [ ] All migrations tested in development
- [ ] All components tested in development
- [ ] All Edge Functions tested in development
- [ ] All documentation updated

### Security Preparation
- [ ] RLS policies reviewed and tested
- [ ] API keys secured
- [ ] CORS policies configured
- [ ] File upload security verified

## Post-Deployment Checklist

### Immediate (0-1 hour)
- [ ] All features working correctly
- [ ] No critical errors in logs
- [ ] Database performance normal
- [ ] User access working

### Short-term (1-24 hours)
- [ ] Monitor error rates
- [ ] Monitor API usage
- [ ] Monitor user feedback
- [ ] Monitor performance metrics

### Long-term (1-7 days)
- [ ] Full feature testing
- [ ] User acceptance testing
- [ ] Performance optimization
- [ ] Documentation finalization
