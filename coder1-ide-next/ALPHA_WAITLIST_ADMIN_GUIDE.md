# Alpha Waitlist Admin Guide

## 🎯 Overview

The Alpha Waitlist system is a lightweight signup infrastructure for collecting early user registrations before the full authentication system is deployed.

## 📊 Database

**Location**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/db/alpha-waitlist.db`

**Schema**: See `db/alpha-waitlist-schema.sql`

**Table**: `alpha_waitlist`
- `id` - Auto-incrementing primary key
- `email` - Unique email address (required)
- `name` - User's name (optional)
- `reddit_username` - Reddit username for priority access (optional)
- `signup_date` - Automatic timestamp
- `invite_sent` - Boolean flag for tracking invites
- `invite_sent_date` - When invite was sent
- `invite_code` - Unique code for alpha access
- `source` - Where they signed up from (website, reddit, etc.)
- `notes` - Admin notes
- `ip_address` - IP for fraud detection
- `user_agent` - Browser info

## 🔌 API Endpoints

### 1. Submit Signup (POST)
```bash
POST /api/alpha/waitlist
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "redditUsername": "johndoe",
  "source": "reddit_post"
}
```

**Responses:**
- `200` - Success
- `400` - Invalid email
- `409` - Email already exists
- `500` - Server error

### 2. Get Stats (GET)
```bash
GET /api/alpha/waitlist
```

Returns total signup count.

### 3. Export CSV (GET)
```bash
GET /api/alpha/export
Authorization: Bearer coder1-alpha-2025
```

**Headers Required:**
- `Authorization: Bearer <ALPHA_ADMIN_TOKEN>`

**Default Admin Token**: `coder1-alpha-2025`
(Change via environment variable `ALPHA_ADMIN_TOKEN`)

**Returns**: CSV file with all signups

## 📥 Export Signups (Admin)

### Using curl:
```bash
curl -H "Authorization: Bearer coder1-alpha-2025" \
  http://localhost:3001/api/alpha/export \
  -o alpha-waitlist-$(date +%Y-%m-%d).csv
```

### Using Browser:
```
http://localhost:3001/api/alpha/export
```
(Browser will prompt for auth - enter token when asked)

### CSV Format:
```csv
ID,Email,Name,Reddit Username,Signup Date,Invite Sent,Invite Date,Invite Code,Source,Notes
1,"user@example.com","John Doe","johndoe","2025-01-18 10:30:00",No,,"","reddit_post",""
```

## 🎯 Workflow for Reddit Launch

### Day 1: Launch & Collect
1. Post comeback story on Reddit
2. Users sign up at `http://localhost:3001/alpha`
3. Monitor signups in real-time:
   ```bash
   watch -n 5 'curl -s http://localhost:3001/api/alpha/waitlist'
   ```

### Day 2: Export & Reach Out
1. Export waitlist:
   ```bash
   curl -H "Authorization: Bearer coder1-alpha-2025" \
     http://localhost:3001/api/alpha/export > waitlist.csv
   ```

2. Open in spreadsheet program

3. Priority order:
   - Original 40 from 2 weeks ago (match by Reddit username)
   - New signups with Reddit username
   - Everyone else

### Day 3-7: Send Invites
1. Mark as invited in database:
   ```bash
   sqlite3 db/alpha-waitlist.db "UPDATE alpha_waitlist SET invite_sent=1, invite_sent_date=datetime('now'), invite_code='<unique-code>' WHERE email='user@example.com'"
   ```

2. Send personal email with:
   - Thank you for waiting
   - Invite code: `CODER1ALPHA2025-<unique>`
   - Setup instructions
   - Discord invite
   - Personal note about their Reddit comment (if applicable)

## 🔍 Query Examples

### Count total signups:
```bash
sqlite3 db/alpha-waitlist.db "SELECT COUNT(*) FROM alpha_waitlist"
```

### Find Reddit users:
```bash
sqlite3 db/alpha-waitlist.db "SELECT email, reddit_username FROM alpha_waitlist WHERE reddit_username IS NOT NULL ORDER BY signup_date"
```

### Signups in last 24 hours:
```bash
sqlite3 db/alpha-waitlist.db "SELECT * FROM alpha_waitlist WHERE signup_date > datetime('now', '-1 day') ORDER BY signup_date DESC"
```

### Mark user as invited:
```bash
sqlite3 db/alpha-waitlist.db "UPDATE alpha_waitlist SET invite_sent=1, invite_sent_date=datetime('now'), invite_code='ALPHA-<random>' WHERE email='user@example.com'"
```

### Export to JSON (for automation):
```bash
sqlite3 db/alpha-waitlist.db -json "SELECT * FROM alpha_waitlist ORDER BY signup_date DESC" > waitlist.json
```

## 🚨 Security Notes

1. **Admin Token**: Change default token in production:
   ```bash
   export ALPHA_ADMIN_TOKEN="your-secure-token-here"
   ```

2. **Rate Limiting**: Consider adding rate limiting for production

3. **Email Validation**: Already implemented in API

4. **HTTPS**: Always use HTTPS in production to protect emails

## 🔄 Migration to Full Auth

When ready to move to full authentication system:

1. Export current waitlist
2. Create user accounts in main `users` table
3. Send "Your account is ready" emails
4. Mark as migrated in waitlist table

Migration script can be:
```sql
INSERT INTO users (email, username, subscription_tier)
SELECT 
  email,
  COALESCE(reddit_username, SUBSTR(email, 1, INSTR(email, '@')-1)),
  'pro'
FROM alpha_waitlist
WHERE invite_sent = 1;
```

## 📞 Support

Questions? Email: alpha@coder1.app

---

**Last Updated**: January 18, 2025
**Database Version**: 1.0
**API Version**: 1.0
