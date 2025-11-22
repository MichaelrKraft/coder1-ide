# Alpha Signup Testing Guide

## 🧪 Quick Test (Before Reddit Launch)

### 1. Restart Server
```bash
cd ~/autonomous_vibe_interface/coder1-ide-next
# Kill existing server
lsof -ti:3001 | xargs kill -9

# Start fresh
npm run dev
```

Wait for "✓ Ready" message.

### 2. Test Signup Page
Open browser: `http://localhost:3001/alpha`

**What you should see:**
- Coder1 logo and alpha branding
- Download bridge section
- **"Join Alpha Waitlist - Free"** button (NOT "Start Free Trial")
- Three form fields:
  1. Email (required)
  2. Name (optional)
  3. Reddit username (optional)

### 3. Submit Test Signup
Fill out form:
- Email: `your-test@email.com`
- Name: Your name
- Reddit Username: Your Reddit username

Click "Join Alpha Waitlist - Free"

**Expected behavior:**
- Button changes to "Joining Waitlist..."
- Redirects to `/alpha/success` page
- Shows "Welcome to Coder1 Alpha!" message

### 4. Verify Database
```bash
cd ~/autonomous_vibe_interface/coder1-ide-next
sqlite3 db/alpha-waitlist.db "SELECT * FROM alpha_waitlist"
```

Should show your test signup with all fields.

### 5. Test Duplicate Email
Try signing up again with same email.

**Expected:**
- Alert: "This email is already on our waitlist!"
- Page stays on signup form (doesn't redirect)

### 6. Check Stats
```bash
curl http://localhost:3001/api/alpha/waitlist
```

Should return: `{"totalSignups":1,"message":"Waitlist statistics"}`

### 7. Export CSV (Admin)
```bash
curl -H "Authorization: Bearer coder1-alpha-2025" \
  http://localhost:3001/api/alpha/export \
  -o test-export.csv

cat test-export.csv
```

Should show CSV with your test signup.

---

## 🚀 Production Readiness Checklist

Before posting on Reddit:

- [ ] Server starts without errors
- [ ] Alpha page loads at http://localhost:3001/alpha
- [ ] Form submission works
- [ ] Success page shows after signup
- [ ] Duplicate email detection works
- [ ] CSV export works with admin token
- [ ] Database file created successfully

---

## 📝 Reddit Post Testing

### Test Scenario 1: First-Time User
1. Visit `/alpha` page
2. See compelling copy and UI
3. Fill out form (all 3 fields)
4. Submit successfully
5. See success page
6. Verify in database

### Test Scenario 2: Original 40 Reddit User
1. Visit `/alpha` page
2. Enter email + **Reddit username**
3. Submit successfully
4. Admin can filter by Reddit username for priority access

### Test Scenario 3: Someone Tries Twice
1. Submit email once (success)
2. Try same email again
3. See "already on waitlist" message
4. No duplicate entry in database

---

## 🐛 Troubleshooting

### "Page not found" at /alpha
**Solution**: Restart server. New API routes need fresh server start.

### Form submits but no redirect
**Solution**: Check browser console for errors. Verify `/api/alpha/waitlist` endpoint responds.

### Database file not created
**Solution**: Check `db/` directory exists. API will create it automatically on first signup.

### CSV export returns 401 Unauthorized
**Solution**: Add `Authorization: Bearer coder1-alpha-2025` header to request.

---

## 📊 Monitoring During Launch

### Real-time signup count (updates every 5 seconds):
```bash
watch -n 5 'curl -s http://localhost:3001/api/alpha/waitlist | jq ".totalSignups"'
```

### View recent signups:
```bash
sqlite3 db/alpha-waitlist.db "SELECT email, reddit_username, signup_date FROM alpha_waitlist ORDER BY signup_date DESC LIMIT 10"
```

### Export every hour during high traffic:
```bash
# Run in cron or manually
curl -H "Authorization: Bearer coder1-alpha-2025" \
  http://localhost:3001/api/alpha/export \
  -o "alpha-waitlist-$(date +%Y%m%d-%H%M%S).csv"
```

---

## ✅ Success Criteria

**Before Reddit Launch:**
- [ ] All 7 quick tests pass
- [ ] Success page loads correctly
- [ ] CSV export downloads successfully
- [ ] Database contains test data

**During Reddit Launch:**
- [ ] Monitor signup count every 5 minutes
- [ ] Export CSV every hour (backup)
- [ ] Respond to Reddit comments with `/alpha` link

**After 24 Hours:**
- [ ] Export final CSV
- [ ] Identify original 40 by Reddit username
- [ ] Plan outreach sequence

---

**Last Updated**: January 18, 2025
