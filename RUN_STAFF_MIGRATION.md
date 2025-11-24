# Run Staff Migration - Quick Guide

## Option 1: Supabase Dashboard SQL Editor (Recommended)

1. Go to: https://supabase.com/dashboard/project/drhzvzimmmdbsvwhlsxm/sql/new
2. Copy and paste the contents of: `database/migrations/20251028000007_create_event_staff_table.sql`
3. Click "Run" to execute the migration
4. Verify success by running: `database/scripts/verify_event_staff_table.sql`

## Option 2: Supabase CLI (if you have access token)

```bash
# First login
npx supabase login

# Link project
npx supabase link --project-ref drhzvzimmmdbsvwhlsxm

# Run migration
npx supabase db push
```

## Option 3: Direct SQL Connection

If you have psql access to the database:
```bash
psql "postgresql://postgres:[PASSWORD]@db.drhzvzimmmdbsvwhlsxm.supabase.co:5432/postgres" -f database/migrations/20251028000007_create_event_staff_table.sql
```

## Verification

After running the migration, verify it worked:
1. Go to Supabase Dashboard → SQL Editor
2. Run: `database/scripts/verify_event_staff_table.sql`
3. Should see all ✅ checks

## Next Steps

Once migration is complete:
- Refresh the website at http://localhost:8000
- Navigate to an event you own or edit
- Click the "Staff" tab
- Test adding/editing/deleting staff members

