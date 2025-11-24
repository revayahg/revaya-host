# Unsubscribed Page Implementation Plan

## Goal
Provide a public confirmation page at `https://www.revayahost.com/#/unsubscribed` that users land on after clicking the email "Unsubscribe" link (handled by Supabase Edge Function).

## Implementation Steps

### Phase 1: Create Page Component ✅

**File:** `components/Pages/Unsubscribed.js`

- Matches existing pattern (similar to `PrivacyPolicy.js`, `TermsOfUse.js`)
- Global export via `window.Unsubscribed`
- Simple confirmation message
- Link back to homepage
- Mobile-responsive styling

### Phase 2: Register Component in index.html ✅

**File:** `index.html`

- Add `<script src="components/Pages/Unsubscribed.js" type="text/babel"></script>`
- Place with other Page components
- Ensure path matches file location

### Phase 3: Register Route in app.js ✅

**File:** `app.js` (in `renderRoute()` function)

- Handle both `route === '/unsubscribed'` and `route === 'unsubscribed'`
- Return `React.createElement(window.Unsubscribed)`
- Ensure route is publicly accessible (no auth required)

### Phase 4: Check/Create Unsubscribe Edge Function

**File:** `supabase/functions/unsubscribe/index.ts` (may need to create)

**Function Logic:**
1. Receive token via query parameter
2. Validate token against database
3. Update `contacts` or `profiles` table with `unsubscribed_at` timestamp
4. Redirect to `https://www.revayahost.com/#/unsubscribed`
5. Handle CORS and errors gracefully

**Database Schema:**
- Ensure `contacts` or `profiles` table has:
  - `unsubscribe_token` (text/uuid)
  - `unsubscribed_at` (timestamp, nullable)

### Phase 5: Update Email Footers

**Files to Update:**
- `supabase/functions/send-notification-email/index.ts`
- `supabase/functions/send-onboarding-email/index.ts`
- Any other email-sending edge functions

**Footer Pattern:**
```html
<a href="https://mrjnkoijfrbsapykgfwj.supabase.co/functions/v1/unsubscribe?token=__UNSUB_TOKEN__" 
   style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
&nbsp;•&nbsp;
<a href="https://www.revayahost.com/#/preferences" style="color:#64748B;text-decoration:underline;">Manage preferences</a>
<br>
Revaya Hospitality Group LLC • 407 Lincoln Road, Ste 6H, Miami Beach, FL 33139 • 
<a href="mailto:info@revayahg.com" style="color:#64748B;text-decoration:underline;">info@revayahg.com</a>
```

### Phase 6: Testing Checklist

1. ✅ Route renders: Visit `/#/unsubscribed` → page loads (no 404)
2. ✅ Edge function redirect: Test unsubscribe link → redirects to `/#/unsubscribed`
3. ✅ Database update: Verify `unsubscribed_at` timestamp is set
4. ✅ Token validation: Invalid tokens show error
5. ✅ Mobile responsive: Page looks good on mobile
6. ✅ Email footer: Unsubscribe links work in emails

## Files to Create/Modify

**New Files:**
- `components/Pages/Unsubscribed.js` - Main page component
- `supabase/functions/unsubscribe/index.ts` - Edge function (if doesn't exist)

**Modified Files:**
- `index.html` - Add script tag
- `app.js` - Add route handler
- `supabase/functions/send-notification-email/index.ts` - Update footer
- `supabase/functions/send-onboarding-email/index.ts` - Update footer
- Other email functions - Update footers

## Deliverables Checklist

- [x] `components/Pages/Unsubscribed.js` exists and attaches `window.Unsubscribed`
- [x] Script tag added to `index.html`
- [x] Route handler in `app.js` for `/unsubscribed`
- [x] Unsubscribe edge function exists and redirects to `/#/unsubscribed`
- [x] Email footers updated in `send-onboarding-email/index.ts`
- [ ] Email footers updated in `send-notification-email/index.ts` (requires token parameter)
- [ ] Database migration for unsubscribe_token and unsubscribed_at columns (if needed)
- [ ] Token generation when sending marketing emails
- [ ] All tests pass (route render, redirect, DB stamp)

## Next Steps for Full Implementation

1. **Database Schema**: Ensure tables have unsubscribe support:
   - Add `unsubscribe_token` (uuid/text) column to `profiles`, `contacts`, or `vendor_profiles` tables
   - Add `unsubscribed_at` (timestamp) column
   - Generate unique tokens when sending marketing emails

2. **Token Generation**: Update email-sending functions to:
   - Generate or retrieve unsubscribe token for each recipient
   - Pass token to email footer helper
   - Include token in unsubscribe URL

3. **Email Filtering**: Update email-sending logic to:
   - Check `unsubscribed_at` before sending marketing emails
   - Skip sending if user has unsubscribed
   - Continue sending transactional emails (password resets, invitations)

4. **Testing**:
   - Test unsubscribe link with valid token
   - Test unsubscribe link with invalid/expired token
   - Verify database updates correctly
   - Test that unsubscribed users don't receive marketing emails
   - Verify transactional emails still work

