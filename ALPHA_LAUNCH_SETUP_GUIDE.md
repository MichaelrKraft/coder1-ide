# 🚀 Coder1 Alpha Launch - Complete Setup Guide

**Last Updated**: January 2025  
**Target**: Launch to 38 Reddit signups  
**Pricing**: $9.00/month after 30-day free trial

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Stripe Configuration](#phase-1-stripe-configuration)
3. [Phase 2: Database Setup](#phase-2-database-setup)
4. [Phase 3: Environment Variables](#phase-3-environment-variables)
5. [Phase 4: Testing](#phase-4-testing)
6. [Phase 5: Deployment](#phase-5-deployment)
7. [Phase 6: Launch](#phase-6-launch)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

✅ **Already Complete**:
- PostgreSQL database running
- Stripe account created
- Alpha product created in Stripe
- Price ID: `price_1SPZH7Ry8ot1yV5EJ3iKKNMa`

✅ **Code Changes Complete**:
- Billing service updated with 30-day trial
- Pricing changed from $29 to $9
- Alpha landing page with signup form
- Success page created

⏳ **Still Needed**:
- Stripe API keys in environment
- Database schema created
- End-to-end testing
- Email to 38 Reddit users

---

## Phase 1: Stripe Configuration

### Step 1: Get API Keys

1. Go to Stripe Dashboard: https://dashboard.stripe.com/apikeys
2. Copy these keys (keep them secret!):
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`)

### Step 2: Create Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add Endpoint**
3. Set URL to: `https://your-domain.com/api/premium/billing/webhook`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook Secret** (starts with `whsec_...`)

### Step 3: Verify Trial Settings

Your Stripe price already has:
- ✅ Amount: $9.00/month
- ✅ Billing: Monthly
- ⚠️ Trial: Configured in code (30 days)

The 30-day trial is set in `/coder1-premium/src/services/billing-service.ts` at line 96.

---

## Phase 2: Database Setup

### Step 1: Create Subscriptions Table

Your PostgreSQL database needs the subscriptions table:

```bash
# Connect to your database
psql your_database_name

# Run the schema file
\i /path/to/coder1-premium/schema.sql
```

OR manually run:

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'pro',
  status VARCHAR(50) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_id ON subscriptions(user_id);
CREATE INDEX idx_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_status ON subscriptions(status);
```

### Step 2: Verify Table Creation

```sql
-- Check table exists
\dt subscriptions

-- Verify structure
\d subscriptions

-- Should show empty table
SELECT * FROM subscriptions;
```

---

## Phase 3: Environment Variables

### Step 1: Configure Premium Service

Create `/coder1-premium/.env`:

```bash
# Stripe Keys (from Phase 1, Step 1)
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Your Price ID
STRIPE_PRICE_ID=price_1SPZH7Ry8ot1yV5EJ3iKKNMa

# Database (your existing PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name

# Server
PORT=3003
NODE_ENV=production
```

### Step 2: Configure IDE Service

Create `/coder1-ide-next/.env.local`:

```bash
# Stripe Public Key (from Phase 1, Step 1)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_YOUR_PUBLIC_KEY_HERE

# Premium API URL
NEXT_PUBLIC_PREMIUM_API_URL=http://localhost:3003

# Other required variables (copy from .env.example)
NODE_ENV=production
PORT=3001
# ... etc
```

---

## Phase 4: Testing

### Step 1: Start Services Locally

**Terminal 1** - Premium Service:
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-premium
npm install  # If first time
npm run dev
```

**Terminal 2** - IDE Service:
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm install  # If first time
npm run dev
```

### Step 2: Test Signup Flow

1. **Visit Alpha Page**:
   ```
   http://localhost:3001/alpha
   ```

2. **Fill Signup Form**:
   - Enter test email: `your.email+test@gmail.com`
   - Click "Start Free Trial"

3. **Test Stripe Checkout**:
   - Should redirect to Stripe Checkout
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

4. **Verify Success**:
   - Should redirect to `/alpha/success`
   - Should show "Welcome to Coder1 Alpha!"

### Step 3: Verify Database

```sql
-- Check subscription was created
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 1;

-- Verify trial details
SELECT 
  user_id,
  status,
  current_period_end,
  EXTRACT(DAY FROM (current_period_end - current_period_start)) as trial_days
FROM subscriptions 
ORDER BY created_at DESC 
LIMIT 1;

-- Should show:
-- status: 'trialing'
-- trial_days: 30
```

### Step 4: Verify Stripe Dashboard

1. Go to **Customers** in Stripe Dashboard
2. Find your test customer
3. Click to view subscription
4. Verify:
   - ✅ Status: Trialing
   - ✅ Trial ends: 30 days from now
   - ✅ Next payment: $9.00
   - ✅ No charge today

### Step 5: Test Webhook

```bash
# Install Stripe CLI (if not installed)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3003/api/premium/billing/webhook

# In another terminal, trigger a test event
stripe trigger customer.subscription.updated
```

Check your premium service logs - should see webhook event received.

---

## Phase 5: Deployment

### Step 1: Push Code to Production

```bash
cd /Users/michaelkraft/autonomous_vibe_interface

# Review changes
git status
git diff

# Commit changes
git add .
git commit -m "Alpha launch: $9/month with 30-day trial

- Updated billing service with 30-day trial period
- Changed pricing from $29 to $9 for alpha users
- Added signup form to alpha landing page
- Created success page for new signups
- Database schema for subscriptions
- Environment configuration guides"

# Push to production
git push origin master
```

### Step 2: Set Production Environment Variables

In your hosting dashboard (Render, Vercel, etc.):

**Premium Service**:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `DATABASE_URL`
- `PORT=3003`
- `NODE_ENV=production`

**IDE Service**:
- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
- `NEXT_PUBLIC_PREMIUM_API_URL`
- `NODE_ENV=production`
- `PORT=3001`

### Step 3: Update Stripe Webhook URL

1. Go to Stripe **Developers** → **Webhooks**
2. Edit your webhook endpoint
3. Update URL to production: `https://your-domain.com/api/premium/billing/webhook`
4. Test webhook with "Send test webhook" button

### Step 4: Test Production

Same testing steps as Phase 4, but using production URL:
```
https://your-domain.com/alpha
```

---

## Phase 6: Launch

### Step 1: Draft Email to 38 Reddit Users

```
Subject: 🎉 Your Coder1 Alpha Access is Ready!

Hi [Name],

Thank you for signing up for Coder1 alpha access from our Reddit post!

Your exclusive early adopter access is now live:

🎁 What You Get:
• 30-day free trial (no credit card required)
• $9.00/month after trial (50% off forever - normally $18)
• Eternal Memory: Claude never forgets your context
• Terminal Assistant: AI-powered "How do I..." commands
• Priority alpha support

🚀 Get Started:
Visit: https://your-domain.com/alpha
Enter your email and start your free trial!

💎 Early Adopter Bonus:
As one of our first 100 users, you'll keep the $9.00/month pricing 
forever - even after we raise prices to $18/month for everyone else.

Questions? Just reply to this email.

Best,
Mike
Founder, Coder1

P.S. Your trial starts the moment you sign up - no credit card needed 
until day 31. Cancel anytime with one click.
```

### Step 2: Send Invitations

Using your email service, send to all 38 Reddit signups with personalized names.

### Step 3: Monitor First 24 Hours

**Metrics to Track**:
- Signups: Target 20+ of 38 (52%)
- Checkout completions: Target 100%
- Errors: Target 0

**Where to Monitor**:
- Stripe Dashboard → Customers
- PostgreSQL: `SELECT COUNT(*) FROM subscriptions;`
- Application logs for errors
- Email inbox for support questions

---

## Troubleshooting

### Issue: Stripe Checkout Not Opening

**Check**:
1. Browser console for JavaScript errors
2. Network tab for failed API calls
3. Premium service is running on port 3003
4. Environment variable `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` is set

**Fix**:
```bash
# Verify environment variable
echo $NEXT_PUBLIC_STRIPE_PUBLIC_KEY

# Should start with pk_live_ or pk_test_
```

### Issue: "Checkout session creation failed"

**Check**:
1. Premium service logs for errors
2. Stripe Secret Key is correct
3. Price ID matches in .env

**Fix**:
```bash
# Test Price ID
curl -u sk_live_YOUR_KEY: \
  https://api.stripe.com/v1/prices/price_1SPZH7Ry8ot1yV5EJ3iKKNMa
```

### Issue: Database Connection Failed

**Check**:
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Verify subscriptions table exists
psql $DATABASE_URL -c "\dt subscriptions"
```

**Fix**:
Update `DATABASE_URL` in `/coder1-premium/.env`

### Issue: Webhook Not Receiving Events

**Check**:
1. Webhook URL is publicly accessible
2. Webhook secret matches in .env
3. Events are selected in Stripe Dashboard

**Fix**:
```bash
# Test webhook locally
stripe listen --forward-to localhost:3003/api/premium/billing/webhook
```

### Issue: Trial Not 30 Days

**Check**:
Line 96 in `/coder1-premium/src/services/billing-service.ts`:

```typescript
subscription_data: {
  trial_period_days: 30,  // ← Should be 30
  ...
}
```

---

## Success Metrics

### Week 1 Goals:
- ✅ 20+ signups (52% of 38)
- ✅ Zero payment errors
- ✅ User feedback collected

### Month 1 Goals:
- ✅ 30% trial → paid conversion (6-10 paid users)
- ✅ User testimonials
- ✅ Feature usage data

---

## Next Steps After Launch

1. **Monitor Conversion**: Track trial → paid conversion rate
2. **Collect Feedback**: Email users at day 7, 14, 21 for feedback
3. **Iterate**: Fix bugs and improve based on alpha user input
4. **Prepare Beta**: Plan beta launch for next 100 users at $14/month

---

## Support Contacts

- **Technical Issues**: alpha@coder1.app
- **Billing Questions**: billing@coder1.app
- **Feature Requests**: feedback@coder1.app

---

**Total Implementation Time**: ~2 hours  
**Next Agent**: Ready to deploy and launch! 🚀
