# How to Deploy Updated Email Templates to Supabase

## The Problem
Your emails look wrong in Outlook because the **OLD email templates** are still deployed on Supabase. The local files have been updated with Outlook compatibility, but they haven't been deployed yet.

## Solution: Deploy via Supabase Dashboard

### Step 1: Go to Your Supabase Dashboard
1. Open: https://supabase.com/dashboard/project/drhzvzimmmdbsvwhlsxm
2. Navigate to **Edge Functions** in the left sidebar
3. Click on **`send-notification-email`**

### Step 2: Update the Function
1. Click **"Edit function"** or the code editor
2. **Delete all the old code**
3. **Copy the entire contents** of this file:
   ```
   supabase/functions/send-notification-email/index.ts
   ```
4. **Paste it** into the Supabase code editor
5. Click **"Deploy"** or **"Save"**

### Step 3: Verify Deployment
1. Check that the deployment timestamp updates to today
2. The version number should increment

### Step 4: Test Your Emails
1. Send a test notification from your app
2. Check the email in:
   - ✅ Outlook (Windows/Mac) - Light & Dark mode
   - ✅ Gmail
   - ✅ Apple Mail

## What Was Fixed

### ✅ Outlook Dark Mode Support
- Added `[data-ogsc]` CSS selectors to force colors
- Added VML namespace for proper button rendering
- Added MSO conditional comments

### ✅ Text Readability
- Changed text colors from light (#4a5568) to dark (#1f2937)
- Ensures text is readable in both light and dark modes

### ✅ Color Preservation  
- Solid header colors (no gradients)
- Explicit inline styles with `!important`
- Table-based layouts instead of DIVs

### ✅ Button Compatibility
- VML roundrect for Outlook
- Proper button colors that show in all clients

## Expected Result

After deployment, your emails will:
- ✅ Show proper colors in Outlook (purples, blues, greens)
- ✅ Have readable text in both light and dark modes
- ✅ Look consistent across Gmail, Outlook, and Apple Mail
- ✅ Display buttons correctly in all email clients

## Files to Deploy

**Primary (Most Important):**
- `supabase/functions/send-notification-email/index.ts`

**If you send other types of emails, also deploy:**
- `supabase/functions/send-invitation-email/index.ts` (if exists)
- `supabase/functions/send-collaborator-invitation/index.ts` (if exists)

## Alternative: Install Supabase CLI

If you prefer command-line deployment:

```bash
# Install Homebrew first (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Supabase CLI
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref drhzvzimmmdbsvwhlsxm

# Deploy the function
supabase functions deploy send-notification-email
```

## Need Help?

If you encounter any issues during deployment:
1. Make sure you have access to edit Edge Functions in your Supabase project
2. Check that the file syntax is valid (no TypeScript errors)
3. Verify your project is on a paid plan (Edge Functions require Pro tier)

The updated files are ready - they just need to be deployed to take effect!
