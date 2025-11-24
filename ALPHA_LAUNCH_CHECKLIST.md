# ✅ Coder1 Alpha Launch Checklist

**Quick reference for launching to 38 Reddit signups**

---

## ✅ Code Changes (COMPLETE)

- [x] Billing service updated with 30-day trial (`/coder1-premium/src/services/billing-service.ts`)
- [x] Pricing changed from $29 to $9 (900 cents)
- [x] Alpha landing page with signup form (`/coder1-ide-next/app/alpha/page.tsx`)
- [x] Success page created (`/coder1-ide-next/app/alpha/success/page.tsx`)
- [x] Database schema file (`/coder1-premium/schema.sql`)
- [x] Environment examples updated

---

## ⏳ Stripe Configuration (PENDING)

- [ ] Get Stripe API keys from dashboard
- [ ] Create webhook endpoint
- [ ] Verify Price ID: `price_1SPZH7Ry8ot1yV5EJ3iKKNMa`
- [ ] Test with Stripe test card

**Time**: ~15 minutes  
**Reference**: ALPHA_LAUNCH_SETUP_GUIDE.md → Phase 1

---

## ⏳ Database Setup (PENDING)

- [ ] Run schema.sql to create subscriptions table
- [ ] Verify table created correctly
- [ ] Test connection from application

**Commands**:
```bash
psql your_database_name -f coder1-premium/schema.sql
psql your_database_name -c "SELECT * FROM subscriptions;"
```

**Time**: ~5 minutes  
**Reference**: ALPHA_LAUNCH_SETUP_GUIDE.md → Phase 2

---

## ⏳ Environment Variables (PENDING)

**Premium Service** (`/coder1-premium/.env`):
- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_WEBHOOK_SECRET
- [ ] STRIPE_PRICE_ID=price_1SPZH7Ry8ot1yV5EJ3iKKNMa
- [ ] DATABASE_URL
- [ ] PORT=3003

**IDE Service** (`/coder1-ide-next/.env.local`):
- [ ] NEXT_PUBLIC_STRIPE_PUBLIC_KEY
- [ ] NEXT_PUBLIC_PREMIUM_API_URL=http://localhost:3003

**Time**: ~5 minutes  
**Reference**: ALPHA_LAUNCH_SETUP_GUIDE.md → Phase 3

---

## ⏳ Testing (PENDING)

- [ ] Start premium service (port 3003)
- [ ] Start IDE service (port 3001)
- [ ] Test signup flow with Stripe test card: `4242 4242 4242 4242`
- [ ] Verify redirect to /alpha/success
- [ ] Check subscription in database
- [ ] Verify 30-day trial in Stripe dashboard
- [ ] Test webhook with Stripe CLI

**Time**: ~30 minutes  
**Reference**: ALPHA_LAUNCH_SETUP_GUIDE.md → Phase 4

---

## ⏳ Deployment (PENDING)

- [ ] Commit and push code to production
- [ ] Set production environment variables
- [ ] Update Stripe webhook URL to production
- [ ] Test production signup flow

**Time**: ~20 minutes  
**Reference**: ALPHA_LAUNCH_SETUP_GUIDE.md → Phase 5

---

## ⏳ Launch (PENDING)

- [ ] Draft email to 38 Reddit users
- [ ] Send invitations
- [ ] Monitor signups for first 24 hours
- [ ] Respond to support questions

**Time**: ~15 minutes + ongoing monitoring  
**Reference**: ALPHA_LAUNCH_SETUP_GUIDE.md → Phase 6

---

## 🎯 Success Criteria

**Week 1**:
- 20+ of 38 users start trial (52% conversion)
- Zero payment errors
- User feedback collected

**Month 1**:
- 30% trial → paid conversion (6-10 paid subscribers)
- User testimonials
- Feature usage data

---

## 📞 Quick Support

**Issues During Testing?**
1. Check ALPHA_LAUNCH_SETUP_GUIDE.md → Troubleshooting
2. Verify environment variables are set correctly
3. Check service logs for errors
4. Test Stripe connection with curl

**Ready to Launch?**
1. All checkboxes above must be checked ✅
2. Test signup completed successfully
3. Database verified with test subscription
4. Production deployment tested

---

## 🚀 Launch Command

When ready:
```bash
# Send email to 38 Reddit users
# Subject: 🎉 Your Coder1 Alpha Access is Ready!
# Body: See ALPHA_LAUNCH_SETUP_GUIDE.md → Phase 6 → Step 1
```

**Total Time from Here**: ~2 hours to launch! 🎉

---

**Last Updated**: January 2025  
**Current Status**: Code complete, ready for configuration and testing
