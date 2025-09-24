# 🔧 GitHub App Setup Guide

> **Step-by-Step Instructions for GitHub App Registration**

*Last Updated: September 24, 2025*

---

## 🎯 Quick Start

**Time Required**: 30 minutes  
**Prerequisites**: GitHub account with admin access

---

## 📝 Step 1: Create GitHub App

### Navigate to GitHub Apps
1. Go to https://github.com/settings/apps
2. Click **"New GitHub App"**

### Basic Information
```yaml
GitHub App name: Coder1 IDE
Homepage URL: https://coder1.dev
Description: AI-powered IDE with Eternal Memory - works with your Claude Code CLI
```

### Identifying and Authorizing Users
```yaml
Callback URL: https://coder1.dev/api/auth/github/callback
Setup URL (optional): https://coder1.dev/setup
Webhook URL: https://coder1.dev/api/webhooks/github
Webhook secret: [Generate a secure secret]
```

### Permissions

#### Repository Permissions
- **Contents**: Read (to access code)
- **Metadata**: Read (always required)
- **Pull requests**: Write (for PR creation)
- **Issues**: Write (for issue management)
- **Actions**: Read (optional)

#### Account Permissions
- **Email addresses**: Read
- **Profile information**: Read

#### Subscribe to Events
- [x] Marketplace purchase
- [x] Push
- [x] Pull request
- [x] Issues
- [x] Repository

### Where can this GitHub App be installed?
- ✅ Any account (for marketplace distribution)

---

## 🔑 Step 2: Generate Private Key

After creating the app:
1. Scroll to **"Private keys"**
2. Click **"Generate a private key"**
3. Save the `.pem` file securely
4. Store in environment variable

```bash
# Convert to single line for env variable
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private-key.pem
```

---

## 📋 Step 3: Configure OAuth

### OAuth Settings
1. Go to app settings
2. Find **"OAuth credentials"**
3. Note your Client ID
4. Generate a Client Secret
5. Save both securely

### Environment Variables
```env
GITHUB_APP_ID=123456
GITHUB_APP_NAME=coder1-ide
GITHUB_CLIENT_ID=Iv1.abc123def456
GITHUB_CLIENT_SECRET=1234567890abcdef
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

---

## 🏪 Step 4: Marketplace Listing

### Enable Marketplace
1. Go to **"Marketplace listing"**
2. Click **"List in Marketplace"**

### Pricing Plans

#### Free Plan
```yaml
Name: Free Forever
Price: $0
Description: Full IDE with Claude Code CLI integration
Features:
  - Unlimited Claude Code CLI usage
  - PRD Generator
  - Basic memory (24 hours)
  - All core features
```

#### Pro Plan
```yaml
Name: Pro - Eternal Memory
Price: $29/month
Description: Never lose context with eternal memory persistence
Features:
  - Everything in Free
  - Eternal memory persistence
  - Unlimited memory storage
  - Advanced session summaries
  - Priority support
```

### Listing Details
```yaml
Category: Developer tools
Listing summary: The only IDE that works with your Claude Code CLI - no API keys needed
```

### Screenshots Required
1. Main IDE interface (1280x800)
2. PRD Generator (1280x800)
3. Memory persistence demo (1280x800)
4. Terminal integration (1280x800)

---

## 🔒 Step 5: Security Configuration

### Webhook Security
```typescript
// Verify webhook signature
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = 'sha256=' + hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

### Token Security
- Store tokens encrypted
- Use short expiration times
- Implement refresh tokens
- Rate limit API calls

---

## 🧪 Step 6: Testing

### Test Installation
1. Install on test repository
2. Verify permissions work
3. Test OAuth flow
4. Check webhook delivery

### Test URLs
```bash
# OAuth Authorization
https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3001/api/auth/github/callback

# API Testing
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user/marketplace_purchases
```

---

## 📊 Step 7: Analytics Setup

### Track Key Events
```javascript
// Installation tracking
app.post('/api/webhooks/github', (req, res) => {
  const event = req.headers['x-github-event'];
  
  switch(event) {
    case 'marketplace_purchase':
      track('app.purchased', {
        account: req.body.marketplace_purchase.account,
        plan: req.body.marketplace_purchase.plan
      });
      break;
    case 'installation':
      track('app.installed', {
        account: req.body.installation.account
      });
      break;
  }
});
```

---

## ✅ Verification Checklist

### Before Submission
- [ ] App name is unique and descriptive
- [ ] Description clearly explains value
- [ ] All required permissions justified
- [ ] OAuth flow tested
- [ ] Webhooks responding correctly
- [ ] Private key stored securely
- [ ] Environment variables configured
- [ ] Error handling implemented
- [ ] Rate limiting in place
- [ ] Analytics tracking working

### After Approval
- [ ] Test marketplace installation
- [ ] Verify billing webhooks
- [ ] Check subscription status API
- [ ] Test upgrade/downgrade flows
- [ ] Monitor error rates
- [ ] Set up alerts

---

## 🚨 Common Issues & Solutions

### "App name already taken"
- Add suffix like "-ide" or "-dev"
- Use "Coder1" instead of "CoderOne"

### OAuth redirect mismatch
- Ensure exact URL match
- Include trailing slashes
- Use HTTPS in production

### Webhook not receiving
- Check webhook secret
- Verify URL is accessible
- Check firewall rules

### Marketplace not showing
- Complete all required fields
- Add screenshots
- Set up pricing plans

---

## 📚 Resources

- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [Marketplace Guidelines](https://docs.github.com/en/developers/github-marketplace)
- [OAuth Apps vs GitHub Apps](https://docs.github.com/en/developers/apps/differences-between-apps)
- [Webhook Events](https://docs.github.com/en/developers/webhooks-and-events)

---

## 🎯 Next Steps

1. **Immediate**: Start app registration (2-week review)
2. **Day 1**: Complete OAuth implementation
3. **Day 2**: Test with beta users
4. **Week 2**: Submit to marketplace
5. **Week 4**: Launch publicly

---

*"The best time to start was yesterday. The next best time is now."*

**Register your GitHub App TODAY - the review process takes 2 weeks!**