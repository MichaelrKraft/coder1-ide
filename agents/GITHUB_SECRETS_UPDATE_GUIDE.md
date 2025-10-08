# 🔐 GitHub Secrets Update Guide - Safe Configuration

**Date**: October 6, 2025  
**User Concern**: Don't break existing GitHub issue responder workflow

---

## ✅ Current Status

You have **TWO workflows** in GitHub:

1. **GitHub Agent** (Issue Responder) - `.github/workflows/github-agent.yml`
   - Uses: `ANTHROPIC_API_KEY`, `SMTP_USER`, `SMTP_PASS`, `APPROVAL_EMAIL`
   - Status: **Working correctly**

2. **Content Automation** - `.github/workflows/content-automation.yml`
   - Uses: `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `SENDGRID_API_KEY`
   - Status: **SendGrid not configured, needs Gmail SMTP**

---

## 🎯 What You Need To Do

**Good News**: Both workflows can share the **SAME secrets** for email configuration!

### Step 1: Current Secrets Status
✅ Already set (from GitHub Agent workflow):
- `ANTHROPIC_API_KEY` - Claude API key
- `SMTP_USER` - Email sender address
- `SMTP_PASS` - Gmail app password
- `APPROVAL_EMAIL` - Where emails go TO

❌ Missing (content automation uses SendGrid):
- `SENDGRID_API_KEY` - You don't have/want this

### Step 2: Verify Current Secrets in GitHub

1. Go to: https://github.com/MichaelrKraft/coder1-ide/settings/secrets/actions
2. You should see these secrets:
   - `ANTHROPIC_API_KEY` ✅
   - `APPROVAL_EMAIL` ✅
   - `SMTP_USER` ✅
   - `SMTP_PASS` ✅
   - `GITHUB_TOKEN` (automatic, no action needed) ✅

3. Check the values:
   - `SMTP_USER` should be: `poolkraftllc@gmail.com`
   - `SMTP_PASS` should be: `jsdjmtcvwikoaijw`
   - `APPROVAL_EMAIL` should be: `support@callspot.ai`

**If they're correct**: ✅ Skip to Step 3  
**If they're wrong**: Update them by clicking each secret → "Update secret"

---

## 🔧 Step 3: Update Email Sender to Support SMTP

The content automation workflow needs to be updated to use SMTP instead of SendGrid.

### Option A: Use SMTP Configuration from Environment (RECOMMENDED)

Add SMTP environment variables to the content automation workflow:

**File**: `.github/workflows/content-automation.yml`

**Changes Needed**:

1. **Blog Generation Job** (lines 52-58):
```yaml
- name: Generate blog posts
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    # Add SMTP configuration
    SMTP_HOST: smtp.gmail.com
    SMTP_PORT: 587
    SMTP_SECURE: false
    SMTP_USER: ${{ secrets.SMTP_USER }}
    SMTP_PASS: ${{ secrets.SMTP_PASS }}
    APPROVAL_EMAIL: ${{ secrets.APPROVAL_EMAIL }}
  run: |
    cd agents
    node content-agent/blog-generator.js
```

2. **YouTube Scripts Job** (lines 80-85):
```yaml
- name: Generate YouTube scripts
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    # Add SMTP configuration
    SMTP_HOST: smtp.gmail.com
    SMTP_PORT: 587
    SMTP_SECURE: false
    SMTP_USER: ${{ secrets.SMTP_USER }}
    SMTP_PASS: ${{ secrets.SMTP_PASS }}
    APPROVAL_EMAIL: ${{ secrets.APPROVAL_EMAIL }}
  run: |
    cd agents
    node content-agent/youtube-scripter.js
```

3. **Case Studies Job** (lines 107-112):
```yaml
- name: Generate case studies
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    # Add SMTP configuration
    SMTP_HOST: smtp.gmail.com
    SMTP_PORT: 587
    SMTP_SECURE: false
    SMTP_USER: ${{ secrets.SMTP_USER }}
    SMTP_PASS: ${{ secrets.SMTP_PASS }}
    APPROVAL_EMAIL: ${{ secrets.APPROVAL_EMAIL }}
  run: |
    cd agents
    node content-agent/case-study-creator.js
```

4. **Daily Digest Job** (lines 160-166):
```yaml
- name: Send daily digest
  env:
    # Add SMTP configuration
    SMTP_HOST: smtp.gmail.com
    SMTP_PORT: 587
    SMTP_SECURE: false
    SMTP_USER: ${{ secrets.SMTP_USER }}
    SMTP_PASS: ${{ secrets.SMTP_PASS }}
    APPROVAL_EMAIL: ${{ secrets.APPROVAL_EMAIL }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    cd agents
    node growth-agent/digest-emailer.js
```

5. **Docs Update Job** (lines 189-194):
```yaml
- name: Update documentation
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    # Add SMTP configuration
    SMTP_HOST: smtp.gmail.com
    SMTP_PORT: 587
    SMTP_SECURE: false
    SMTP_USER: ${{ secrets.SMTP_USER }}
    SMTP_PASS: ${{ secrets.SMTP_PASS }}
    APPROVAL_EMAIL: ${{ secrets.APPROVAL_EMAIL }}
  run: |
    cd agents
    node content-agent/docs-generator.js
```

---

## ✅ Why This is Safe

### 1. No Secrets Changed
- Uses **existing** `SMTP_USER`, `SMTP_PASS`, `APPROVAL_EMAIL` secrets
- GitHub Agent workflow continues to work exactly as before
- Both workflows share the same Gmail account

### 2. Email Sender Logic Already Supports SMTP
Your `/agents/email/sender.js` already has this code (lines 22-32):
```javascript
} else if (process.env.SMTP_HOST) {
  // Generic SMTP configuration
  this.transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}
```

So it will automatically use SMTP when those environment variables are present!

### 3. SendGrid Fallback Still Works
If SendGrid is ever configured later, it will be used first (lines 12-21 check for `SENDGRID_API_KEY` first).

---

## 📋 Step-by-Step Execution

### 1. Update Workflow File

I'll update the workflow file for you:

```bash
cd /Users/michaelkraft/autonomous_vibe_interface
# Edit .github/workflows/content-automation.yml to add SMTP env vars
```

### 2. Test Locally (Optional but Recommended)

Before pushing to GitHub, test that email works locally:

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/agents

# Test blog generator
node content-agent/blog-generator.js

# Should see: "✅ Email sent successfully"
```

### 3. Commit and Push Workflow Update

```bash
cd /Users/michaelkraft/autonomous_vibe_interface

git add .github/workflows/content-automation.yml
git commit -m "feat: Add SMTP email support to content automation workflow"
git push origin master
```

### 4. Run First Workflow Test

1. Go to: https://github.com/MichaelrKraft/coder1-ide/actions
2. Click "Content & Growth Automation"
3. Click "Run workflow" button
4. Select "blog-posts" from dropdown
5. Click "Run workflow" green button
6. Wait 30-60 seconds
7. Click on the workflow run to see results

**Expected Success Output**:
```
✅ Workflow completed successfully
📝 Generated 1-5 blog posts
💰 Cost: $0.002-0.01
📋 Saved to review queue
📧 Email sent to support@callspot.ai
```

---

## 🔍 Verification Checklist

After workflow runs:

- [ ] Workflow completed with green checkmark
- [ ] No email errors in workflow logs
- [ ] Email received at `support@callspot.ai`
- [ ] Generated content saved to review queue
- [ ] Cost tracking shows API usage
- [ ] GitHub Agent workflow still works (test by opening an issue)

---

## 🚨 Troubleshooting

### Workflow Fails with Email Error

**Symptom**: "Email send error: Invalid login"

**Solution**: Verify GitHub secrets are correct:
```bash
# Check secrets at:
https://github.com/MichaelrKraft/coder1-ide/settings/secrets/actions

# Should be:
SMTP_USER=poolkraftllc@gmail.com
SMTP_PASS=jsdjmtcvwikoaijw
APPROVAL_EMAIL=support@callspot.ai
```

### GitHub Agent Stops Working

**Symptom**: Issue responder no longer sends emails

**Cause**: Secrets were changed incorrectly

**Solution**: Verify `github-agent.yml` workflow secrets match content automation secrets

### Content Generation Works But No Email

**Symptom**: Content generated but no email received

**Check**: 
1. Workflow logs show email sending step
2. Sender code in `/agents/email/sender.js` is using SMTP
3. SMTP environment variables are set in workflow

---

## 📊 Summary

**What This Does**:
- ✅ Adds SMTP email support to content automation
- ✅ Uses existing GitHub secrets (no new secrets needed)
- ✅ Both workflows share same Gmail account
- ✅ No breaking changes to GitHub Agent workflow
- ✅ SendGrid can be added later if desired

**What You Need**:
- Update workflow file with SMTP env vars (I'll do this)
- Verify GitHub secrets are correct (you already did this)
- Test first workflow run (next step after this)

**Result**: Complete automation system with email notifications using your Gmail account!

---

**Ready to proceed?** I'll update the workflow file now and prepare it for commit.
