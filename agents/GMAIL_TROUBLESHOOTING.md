# 🔧 Gmail Authentication Issue

## Current Status

The email system is **almost working** but Gmail is rejecting the login with error:
```
Invalid login: 535-5.7.8 Username and Password not accepted
```

## What This Means

Gmail is saying the username or password is incorrect. This typically happens when:

1. **App Password is incorrect** - The most likely cause
2. **2-Step Verification not enabled** - Required for app passwords
3. **App Password format wrong** - Should be 16 characters, no spaces

## Current Configuration

From your `.env` file:
- **SMTP_USER**: `support@callspot.ai` ✅
- **SMTP_PASS**: `udtxqwphmjaczeif` ✅ (format looks correct - 16 chars, no spaces)
- **SMTP_HOST**: `smtp.gmail.com` ✅
- **SMTP_PORT**: `587` ✅

## Possible Issues & Solutions

### Issue #1: Wrong Gmail Account

**Question**: Is `support@callspot.ai` a Gmail account?

- ✅ **If YES**: The password `udtxqwphmjaczeif` might be incorrect
- ❌ **If NO** (it's a custom domain): You need different SMTP settings

**For Custom Domain (like @callspot.ai)**:

If `support@callspot.ai` is NOT a Gmail account (e.g., it's hosted on Google Workspace, Office 365, or another provider), you need to check where it's hosted and use those SMTP settings.

**Google Workspace**: Same settings should work if 2-Step is enabled
**Office 365/Outlook**: Different SMTP settings needed
**Other Provider**: Contact your email provider

### Issue #2: App Password Incorrect

**Steps to regenerate app password**:

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with the account: `support@callspot.ai`
3. Delete the old "Coder1 Automation" app password if it exists
4. Create a new one:
   - App: Mail
   - Device: Other (Custom name)
   - Name: Coder1 Automation V2
5. Copy the EXACT 16-character password (it will look like: `abcd efgh ijkl mnop`)
6. Remove ALL spaces: `abcdefghijklmnop`
7. Update `.env`:
   ```bash
   nano /Users/michaelkraft/autonomous_vibe_interface/agents/.env
   # Find: SMTP_PASS=udtxqwphmjaczeif
   # Replace with: SMTP_PASS=abcdefghijklmnop
   # Save: Ctrl+X, Y, Enter
   ```

### Issue #3: 2-Step Verification Not Enabled

App passwords REQUIRE 2-Step Verification to be enabled.

**Check if enabled**:
1. Go to: https://myaccount.google.com/security
2. Look for "2-Step Verification"
3. If it says "OFF", click it and enable it
4. Then generate a new app password (see Issue #2)

### Issue #4: App Password Revoked

Sometimes Google automatically revokes app passwords for security.

**Solution**: Generate a fresh app password (see Issue #2)

## Quick Test

Once you update the password, test immediately:

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/agents
node -r dotenv/config growth-agent/digest-emailer.js
```

**Success looks like**:
```
✅ Email sent successfully to: support@callspot.ai
   Message ID: <some-id@smtp.gmail.com>
```

**Failure looks like**:
```
❌ Email send error: Invalid login: 535-5.7.8 Username and Password not accepted
```

## Alternative: Use Different Email Account

If `support@callspot.ai` is causing issues, you can use a regular Gmail account instead:

1. **Create or use a Gmail account** (e.g., `coder1automation@gmail.com`)
2. **Enable 2-Step Verification** on that account
3. **Generate app password** for that account
4. **Update `.env`**:
   ```env
   SMTP_USER=coder1automation@gmail.com
   SMTP_PASS=your-new-app-password-here
   APPROVAL_EMAIL=support@callspot.ai  # Keep this - it's where emails go TO
   ```

Note: `SMTP_USER` is the account that SENDS emails. `APPROVAL_EMAIL` is where emails are SENT TO. They can be different!

## Still Not Working?

If you've tried all the above and it still fails, the issue might be:

1. **Corporate/Workspace restrictions**: Your Google Workspace admin may have disabled app passwords
2. **Region restrictions**: Some regions have additional security
3. **Account age**: Very new accounts sometimes need 24hrs before app passwords work

**Workaround**: Use SendGrid (free tier - 100 emails/day):
1. Sign up: https://signup.sendgrid.com
2. Get API key: https://app.sendgrid.com/settings/api_keys
3. Update `.env`:
   ```env
   SENDGRID_API_KEY=SG.your-api-key-here
   # Comment out or remove SMTP_* lines
   ```

---

## Summary

**Most Likely Solution**: Generate a fresh app password

1. Visit: https://myaccount.google.com/apppasswords
2. Sign in with `support@callspot.ai`
3. Create new app password
4. Copy it (remove spaces)
5. Update `.env` file with the new password
6. Test: `node -r dotenv/config growth-agent/digest-emailer.js`

**If that doesn't work**: Let me know:
- Is `support@callspot.ai` a Gmail account or custom domain?
- Can you access https://myaccount.google.com/apppasswords when signed in as support@callspot.ai?
- Do you see any error messages when trying to create an app password?

---

**Status**: Waiting for Gmail app password verification
**Next Step**: Generate fresh app password and test
