# Database Synchronization Guide

## Your Current Setup

You have **TWO Supabase projects**:

1. **Production** (`mrjnkoijfrbsapykgfwj`) - "Revaya Host"
   - ✅ Currently linked (●)
   - ✅ All migrations applied
   - Used by: `www.revayahost.com`

2. **Development** (`drhzvzimmmdbsvwhlsxm`) - "revaya-host-dev"  
   - ⚠️ Not linked
   - ⚠️ **May need migrations applied**
   - Used by: `localhost:8000` (when you run locally)

## Answer: Do You Need to Update Development Database?

**YES, you should sync it!** 

Since you use the development database when running locally (`localhost` uses `drhzvzimmmdbsvwhlsxm`), and we've applied critical fixes to production, your development database should have the same fixes.

## How to Sync Development Database

### Quick Sync (Recommended)

```bash
# 1. Link to development project
npx supabase link --project-ref drhzvzimmmdbsvwhlsxm

# 2. Apply all migrations (will only apply new ones)
npx supabase db push --linked

# 3. Switch back to production (optional, for future work)
npx supabase link --project-ref mrjnkoijfrbsapykgfwj
```

### Verify It Worked

After syncing, you can verify:
```bash
# Check migration status
npx supabase migration list --linked

# Or check if specific functions exist
npx supabase db remote exec --linked "SELECT proname FROM pg_proc WHERE proname LIKE '%invitation%';"
```

## Critical Migrations That Should Be in Development

These are the key fixes we applied to production that should also be in dev:

1. ✅ `20251124000018_disable_event_name_propagation_triggers.sql` - **CRITICAL** - Fixes event editing
2. ✅ `20251124000016_remove_nonexistent_updated_at_column.sql` - Fixes invitation acceptance
3. ✅ `20251124000015_fix_ambiguous_column_reference.sql` - Fixes invitation acceptance
4. ✅ `20251124000012_final_working_accept_invitation.sql` - Fixes invitation acceptance
5. ✅ All the collaborator invitation fixes

## Best Practice Workflow Going Forward

### Option 1: Sync Both Environments (Recommended)
1. **Create migration** → Save to `supabase/migrations/`
2. **Test locally** → Apply to development database
3. **Deploy to production** → Apply same migration to production
4. **Keep them in sync** → Same migrations in both

### Option 2: Production-First (Current Approach)
1. **Fix production issues** → Apply migrations directly
2. **Sync to development** → Apply same migrations after
3. **Document changes** → Keep notes of what changed

## Important Notes

1. **Migrations are idempotent** - Running them twice is safe (they check if already applied)
2. **Use `--linked` flag** - This targets the currently linked project
3. **Check migration status** - Use `npx supabase migration list` to see what's applied
4. **Never skip migrations** - Each one builds on the previous ones

## Commands Reference

```bash
# List Supabase projects
npx supabase projects list

# Link to a project
npx supabase link --project-ref <project-ref>

# See which project is linked
npx supabase projects list

# Apply migrations to linked project
npx supabase db push --linked

# Apply migrations to local database (no --linked)
npx supabase db push

# List applied migrations
npx supabase migration list --linked

# Reset local database (applies all migrations fresh)
npx supabase db reset
```
