# 🚀 Quick Start: 10-Minute Setup Guide

**Total Time**: ~10 minutes  
**Result**: Fully automated content & growth system

---

## Step 1: Gmail App Password (2 minutes)

### Why You Need This
Gmail requires an "App Password" for applications to send email via SMTP. This is a special 16-character password different from your regular Gmail password.

### Instructions

1. **Open Google Account Security Settings**
   - Click this link: https://myaccount.google.com/security
   - Sign in with your Google account (support@callspot.ai)

2. **Enable 2-Step Verification** (if not already enabled)
   - Look for "2-Step Verification" section
   - Click "2-Step Verification"
   - If it says "OFF", click it and follow prompts to turn it on
   - If it says "ON", you're good - proceed to next step

3. **Generate App Password**
   - Click this direct link: https://myaccount.google.com/apppasswords
   - OR navigate: Security → 2-Step Verification → App passwords (at bottom)
   
4. **Create the Password**
   - Under "Select app": Choose **"Mail"**
   - Under "Select device": Choose **"Other (Custom name)"**
   - Type: **"Coder1 Automation"**
   - Click **"Generate"**

5. **Copy the Password**
   - You'll see a yellow box with a 16-character password like: `abcd efgh ijkl mnop`
   - **IMPORTANT**: Copy this password (you'll need it in next step)
   - Click **"Done"**

6. **Update Your .env File**
   ```bash
   # Open the .env file
   nano /Users/michaelkraft/autonomous_vibe_interface/agents/.env
   ```

7. **Find and Replace the SMTP_PASS Line**
   - Press `Ctrl + W` to search
   - Type: `SMTP_PASS`
   - Press Enter
   - You'll see: `SMTP_PASS=your-gmail-app-password-here`
   - Replace `your-gmail-app-password-here` with your 16-character password
   - **Remove the spaces** (make it: `abcdefghijklmnop`)
   - Should look like: `SMTP_PASS=abcdefghijklmnop`

8. **Save and Exit**
   - Press `Ctrl + X` to exit
   - Press `Y` to save
   - Press `Enter` to confirm

✅ **Gmail App Password Complete!**

---

## Step 2: GitHub Secrets (5 minutes)

### Why You Need This
GitHub Actions needs your API keys to run the automation. We store them as "secrets" so they're encrypted and never visible in code.

### Instructions

1. **Open GitHub Repository Secrets Page**
   - Click this link: https://github.com/MichaelrKraft/coder1-ide/settings/secrets/actions
   - You should see a page titled "Actions secrets and variables"

2. **Add Secret #1: ANTHROPIC_API_KEY**
   - Click the green **"New repository secret"** button (top right)
   - In the **"Name"** field, type exactly: `ANTHROPIC_API_KEY`
   - In the **"Secret"** field, paste: `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`
   - Click **"Add secret"** button
   - You should see: "Secret ANTHROPIC_API_KEY was successfully created"

3. **Add Secret #2: SMTP_PASS**
   - Click **"New repository secret"** again
   - In the **"Name"** field, type exactly: `SMTP_PASS`
   - In the **"Secret"** field, paste your 16-character Gmail app password from Step 1
   - Click **"Add secret"**

4. **Add Secret #3: SMTP_USER**
   - Click **"New repository secret"** again
   - In the **"Name"** field, type exactly: `SMTP_USER`
   - In the **"Secret"** field, type exactly: `support@callspot.ai`
   - Click **"Add secret"**

5. **Add Secret #4: SMTP_HOST**
   - Click **"New repository secret"** again
   - In the **"Name"** field, type exactly: `SMTP_HOST`
   - In the **"Secret"** field, type exactly: `smtp.gmail.com`
   - Click **"Add secret"**

6. **Add Secret #5: APPROVAL_EMAIL**
   - Click **"New repository secret"** again
   - In the **"Name"** field, type exactly: `APPROVAL_EMAIL`
   - In the **"Secret"** field, type exactly: `support@callspot.ai`
   - Click **"Add secret"**

7. **Verify All Secrets**
   - You should now see 5 secrets listed:
     - ✅ ANTHROPIC_API_KEY
     - ✅ SMTP_PASS
     - ✅ SMTP_USER
     - ✅ SMTP_HOST
     - ✅ APPROVAL_EMAIL

8. **Enable GitHub Actions** (if needed)
   - Click this link: https://github.com/MichaelrKraft/coder1-ide/actions
   - If you see a green banner saying "Workflows have been disabled"
   - Click **"I understand my workflows, go ahead and enable them"**
   - If you don't see this banner, Actions are already enabled ✅

✅ **GitHub Secrets Complete!**

---

## Step 3: Test Email Locally (2 minutes)

### Why You Need This
Before running automated workflows, let's verify email is working correctly on your local machine.

### Instructions

1. **Open Terminal**
   - Press `Cmd + Space` to open Spotlight
   - Type: `Terminal`
   - Press Enter

2. **Navigate to Agents Directory**
   ```bash
   cd /Users/michaelkraft/autonomous_vibe_interface/agents
   ```

3. **Run the Digest Emailer Test**
   ```bash
   node -r dotenv/config growth-agent/digest-emailer.js
   ```

4. **Watch for Success**
   You should see output like:
   ```
   📧 Sending daily digest email...
   ✅ Email sent successfully to support@callspot.ai
   ```

5. **Check Your Email**
   - Open Gmail: https://mail.google.com
   - Look for email with subject: "📝 Coder1 Daily Digest - [Today's Date]"
   - It should contain:
     - Pending review items
     - Growth metrics summary
     - Links to review queue

### If Email Doesn't Arrive

**Wait 2-3 minutes** - Gmail can have slight delays

**Check Spam Folder** - First emails sometimes go to spam

**Verify your .env file**:
```bash
cat .env | grep SMTP
```

You should see:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=support@callspot.ai
SMTP_PASS=abcdefghijklmnop  # Your actual app password
```

**Try again**:
```bash
node -r dotenv/config growth-agent/digest-emailer.js
```

✅ **Email Test Complete!**

---

## Step 4: Run First GitHub Workflow (1 minute)

### Why You Need This
This tests that GitHub Actions can run your automation successfully with the secrets you configured.

### Instructions

1. **Open GitHub Actions Page**
   - Click this link: https://github.com/MichaelrKraft/coder1-ide/actions

2. **Find the Workflow**
   - On the left sidebar, click **"Content & Growth Automation"**
   - You should see the workflow details page

3. **Run the Workflow Manually**
   - Click the **"Run workflow"** dropdown button (top right, blue button)
   - You'll see a dropdown menu with options:
     - Use workflow from: `Branch: master` (leave as is)
     - Task to run: Click the dropdown
   
4. **Select a Task**
   - Choose **"blog-posts"** from the dropdown
   - Click the green **"Run workflow"** button

5. **Watch the Workflow Run**
   - The page will refresh
   - You'll see a new workflow run appear with a yellow dot (⚫) - this means it's running
   - Click on the workflow run title to see details
   - Click on the job name to see live logs

6. **Wait for Completion (~30-60 seconds)**
   - The yellow dot will turn to:
     - ✅ Green checkmark = Success!
     - ❌ Red X = Failed (check logs for errors)

7. **Verify Success**
   If successful, you'll see in the logs:
   ```
   📊 Generating 5 blog posts for the week...
   💰 Request cost: $0.00XX
   ✅ Generated: [Topic Name]
   📋 Saved to review queue
   ```

8. **Check Your Email**
   - A digest email should have been sent (if you configured email)
   - Subject: "📝 Coder1 Blog Posts Ready for Review"

### If Workflow Fails

**Check the Error Logs**:
- Click on the failed workflow
- Click on the job name
- Scroll through the logs to find the error message
- Common issues:
  - Missing secret: Go back to Step 2 and verify all secrets are added
  - API key invalid: Check your ANTHROPIC_API_KEY is correct
  - Email failed: Verify SMTP_PASS is correct

**Try Running Again**:
- Click "Re-run all jobs" button
- Or go back and run workflow again from step 3

✅ **First Workflow Complete!**

---

## 🎉 You're Done! What Happens Now?

### Automatic Execution Schedule

Your automation now runs automatically on these schedules:

| What | When | What It Does |
|------|------|--------------|
| **Blog Posts** | Tuesday & Thursday, 10 AM UTC | Generates 5 AI blog posts |
| **YouTube Scripts** | Monday, 1 PM UTC | Creates 2 video scripts |
| **Case Studies** | Friday, 2 PM UTC | Produces 1 case study |
| **Daily Digest** | Every day, 9 AM UTC | Emails you summary |
| **Repo Starring** | Every 6 hours | Stars 3-5 relevant repos |

### You'll Receive Daily Emails

Every morning at 9 AM UTC (adjust for your timezone), you'll get:
- ✉️ Subject: "📝 Coder1 Daily Digest"
- 📋 List of pending content to review
- 📊 Growth metrics (stars, referrals, costs)
- 🔗 Links to approve/reject items

### Monitoring Your Automation

**View Workflow History**:
- https://github.com/MichaelrKraft/coder1-ide/actions
- See all past runs, success/failure rates, execution times

**Check Generated Content**:
```bash
# View pending review items
ls -la /Users/michaelkraft/autonomous_vibe_interface/agents/review-queue/pending/

# Read a blog post
cat review-queue/pending/blog-*.json | jq .content -r
```

**Check Cost Tracking**:
```bash
cat /Users/michaelkraft/autonomous_vibe_interface/agents/data/cost-tracker.json
```

**View Growth Stats**:
```bash
node growth-agent/referral-manager.js
node growth-agent/attribution-tracker.js
```

---

## 🚀 Manual Workflow Triggers

You can manually run any automation task anytime:

1. **Go to Actions**: https://github.com/MichaelrKraft/coder1-ide/actions
2. **Click**: "Content & Growth Automation"
3. **Click**: "Run workflow" dropdown
4. **Choose Task**:
   - `blog-posts` - Generate 5 blog posts
   - `youtube-scripts` - Create 2 YouTube scripts
   - `case-studies` - Produce 1 case study
   - `docs-update` - Update documentation
   - `repo-star` - Star relevant repositories
   - `daily-digest` - Send email summary
   - `all-content` - Run all 3 content generators
5. **Click**: "Run workflow"

---

## 📊 Expected Results

### Within 1 Week
- ✅ 10+ blog posts generated (2 runs × 5 posts)
- ✅ 2 YouTube scripts created
- ✅ 1 case study produced
- ✅ 7 daily digest emails received
- ✅ 15-25 GitHub repos starred
- ✅ Total cost: ~$0.50-1.00

### Within 1 Month
- ✅ 40+ blog posts (quality content for marketing)
- ✅ 8+ YouTube scripts (ready to record)
- ✅ 4+ case studies (social proof)
- ✅ 90-150 new GitHub stars (organic growth)
- ✅ Complete referral system data
- ✅ Total cost: ~$10-20

---

## 🆘 Need Help?

### Documentation
- **Complete Guide**: `/agents/SETUP_COMPLETE_GUIDE.md`
- **Testing Report**: `/agents/TEST_REPORT_COMPLETE.md`
- **System Overview**: `/agents/AUTOMATION_README.md`

### Common Issues

**"Email not sending"**
```bash
# Verify SMTP settings
cat .env | grep SMTP

# Test email
node -r dotenv/config growth-agent/digest-emailer.js
```

**"Workflow failing"**
- Check GitHub Actions logs for specific error
- Verify all 5 secrets are configured
- Confirm ANTHROPIC_API_KEY is valid

**"No content generated"**
- Check workflow logs for API errors
- Verify cost tracker isn't at limit
- Try running locally first

**"Content quality low"**
- Review generated content in `/review-queue/pending/`
- Adjust prompts in content generator files
- Switch to Sonnet model for better quality (costs more)

---

## ✅ Setup Checklist

Use this to track your progress:

- [ ] **Step 1: Gmail App Password**
  - [ ] Enabled 2-Step Verification
  - [ ] Generated app password
  - [ ] Updated SMTP_PASS in .env
  - [ ] Saved .env file

- [ ] **Step 2: GitHub Secrets**
  - [ ] Added ANTHROPIC_API_KEY
  - [ ] Added SMTP_PASS
  - [ ] Added SMTP_USER
  - [ ] Added SMTP_HOST
  - [ ] Added APPROVAL_EMAIL
  - [ ] Enabled GitHub Actions

- [ ] **Step 3: Test Email**
  - [ ] Ran digest emailer locally
  - [ ] Received email at support@callspot.ai
  - [ ] Verified email content looks good

- [ ] **Step 4: First Workflow**
  - [ ] Ran blog-posts workflow
  - [ ] Workflow completed successfully
  - [ ] Checked logs for success messages
  - [ ] (Optional) Received workflow email

---

## 🎊 Congratulations!

You now have a fully automated content creation and growth system that:

✅ Generates 20+ blog posts per month  
✅ Creates 8+ YouTube scripts monthly  
✅ Produces 4+ case studies  
✅ Stars 90-150 relevant GitHub repos  
✅ Tracks all growth metrics  
✅ Emails you daily summaries  
✅ Costs only ~$10-20/month  
✅ Saves you 100+ hours/month  

**Your automation is now running!** Check your email tomorrow morning for your first daily digest.

---

**Quick Start Guide Version**: 1.0.0  
**Last Updated**: October 6, 2025  
**Total Setup Time**: ~10 minutes  
**Status**: Ready to Go! 🚀
