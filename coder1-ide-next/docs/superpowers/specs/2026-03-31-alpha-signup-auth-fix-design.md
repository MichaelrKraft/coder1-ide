# Alpha Signup Authentication Flow Fix

**Date**: 2026-03-31
**Status**: Approved Design
**Complexity**: Medium
**Files Modified**: 1 primary file

---

## Context

Users experience a broken authentication flow when signing up via the alpha waitlist page:

1. User enters email on `/alpha` page
2. Sees "Welcome to Coder1 Alpha!" success page
3. Clicks "Open IDE" button
4. **Problem**: Redirected to login page (should be auto-logged in)
5. **Problem**: Trying to create account again causes Internal Server Error

### Root Causes Identified

**Issue 1: Disconnected Signup Flows**
- Alpha waitlist endpoint (`/api/alpha/waitlist`) only stores email in database
- Does NOT create user account or establish session
- User reaches success page with no authentication
- "Open IDE" button has no auth cookies → middleware redirects to login

**Issue 2: Missing Error Handling**
- When user tries to signup again, database UNIQUE constraint fails
- `createUser()` in `lib/auth/db.ts` has no error handling for duplicates
- Returns generic 500 error instead of proper 409 Conflict

**Issue 3: Cookie-Based Auth Fragility**
- Even in working flows, auth relies solely on httpOnly cookies
- No fallback if cookies don't survive navigation

---

## Solution: Enhanced Waitlist Endpoint

### User Requirements

1. **Auto-create account + auto-login** when email submitted
2. **Auto-generate credentials**: username from email, random password
3. **Handle duplicates gracefully**: auto-login if email already exists

### Architecture

```
User submits email on /alpha page
         ↓
POST /api/alpha/waitlist
         ↓
Check if email exists in database
         ↓
    ┌────┴────┐
  YES       NO
    │         │
    │         └→ Generate username from email (mike@example.com → "mike")
    │         └→ Handle collisions (→ "mike1", "mike2", etc.)
    │         └→ Generate secure random password
    │         └→ Create user account (role='alpha')
    │         └→ Create session record
    │
    └→ Find existing user
         ↓
    Generate JWT access + refresh tokens
         ↓
    Set httpOnly cookies (auth-token, refresh-token)
         ↓
    Return success
         ↓
User clicks "Open IDE"
         ↓
Middleware finds auth-token cookie → allows access ✓
         ↓
User lands in IDE authenticated
```

---

## Implementation Details

### Primary File: `/app/api/alpha/waitlist/route.ts`

#### New Logic Flow

```typescript
export async function POST(request: Request) {
  const { email, name } = await request.json();

  try {
    // Step 1: Check if email already registered
    const existingUser = await db.getUserByEmail(email);

    if (existingUser) {
      // User exists → create session and auto-login
      const { accessToken, refreshToken } = generateTokens(existingUser);
      await db.createSession(existingUser.id, refreshToken);

      const response = NextResponse.json({
        success: true,
        message: 'Welcome back! Logging you in...',
      });

      setAuthCookies(response, accessToken, refreshToken);
      return response;
    }

    // Step 2: Generate unique username from email
    const baseUsername = email.split('@')[0];
    const username = await findAvailableUsername(baseUsername);

    // Step 3: Generate secure random password
    const password = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 4: Create user account
    const user = await db.createUser({
      email,
      username,
      password: hashedPassword,
      displayName: name || username,
      role: 'alpha',
    });

    // Step 5: Create session
    const { accessToken, refreshToken } = generateTokens(user);
    await db.createSession(user.id, refreshToken);

    // Step 6: Add to waitlist for analytics
    await db.addToWaitlist(email, name);

    // Step 7: Set auth cookies and return success
    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully!',
    });

    setAuthCookies(response, accessToken, refreshToken);
    return response;

  } catch (error) {
    console.error('[AlphaWaitlist] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process signup' },
      { status: 500 }
    );
  }
}
```

#### Helper Functions

**Username Deduplication**:
```typescript
async function findAvailableUsername(base: string): Promise<string> {
  // Sanitize base: alphanumeric + underscores only
  const sanitized = base.toLowerCase().replace(/[^a-z0-9_]/g, '');

  let username = sanitized;
  let suffix = 1;

  while (await db.getUserByUsername(username)) {
    username = `${sanitized}${suffix}`;
    suffix++;
  }

  return username;
}
```

**Token Generation** (reuse from `/api/v2/auth/register/route.ts`):
```typescript
function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}
```

**Cookie Setting** (reuse from register route):
```typescript
function setAuthCookies(response, accessToken, refreshToken) {
  response.cookies.set('auth-token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  });

  response.cookies.set('refresh-token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}
```

---

## Files Modified

### Primary Changes
- **`/app/api/alpha/waitlist/route.ts`** - Complete rewrite with account creation + session logic

### Referenced Files (patterns to reuse)
- **`/app/api/v2/auth/register/route.ts`** (lines 98-148) - Token generation & cookie setting
- **`/lib/auth/db.ts`** - Database operations (`createUser`, `createSession`, `getUserByEmail`, `getUserByUsername`)

---

## Testing & Verification

### Manual Test Cases

#### Test 1: New User Signup
1. Navigate to `/alpha`
2. Enter email: `newuser@example.com`, name: "New User"
3. Submit form
4. **Verify**: Redirected to `/alpha/success` page
5. Click "Open IDE" button
6. **Expected**: Land in `/ide` (authenticated, no redirect to login)
7. Open DevTools → Application → Cookies
8. **Verify**: `auth-token` and `refresh-token` cookies present with `httpOnly` flag

#### Test 2: Duplicate Email (Auto-Login)
1. Open incognito/different browser
2. Navigate to `/alpha`
3. Enter same email: `newuser@example.com`
4. Submit form
5. **Verify**: Success page shown
6. Click "Open IDE"
7. **Expected**: Logs into existing account, no error

#### Test 3: Username Collision Handling
1. Signup with `mike@example.com` → creates username "mike"
2. Signup with `mike@different.com` → should create username "mike1"
3. Signup with `mike@another.com` → should create username "mike2"
4. **Verify**: All 3 accounts exist with unique usernames

#### Test 4: Cookie Persistence
1. After signup, refresh the page
2. **Expected**: Still authenticated (cookies persist)
3. Close browser, reopen to `/ide`
4. **Expected**: Still authenticated (if within 7 days)

#### Test 5: Session Validation
1. After signup, call `GET /api/v2/auth/me`
2. **Expected**: Returns user object (authenticated)
3. Delete `auth-token` cookie
4. Call `/api/v2/auth/me` again
5. **Expected**: Returns 401 Unauthorized

### Edge Cases

- **Invalid email format**: Frontend validation should catch, but API should return 400
- **Empty name field**: Use username as displayName fallback
- **Username with special characters**: Sanitize to alphanumeric + underscores

### Rollback Plan

1. Git revert is straightforward (single file change)
2. No database migration required
3. Can feature-flag the new logic if needed
4. Old waitlist behavior was simple - easy to restore

---

## Security Considerations

### Password Generation
- Use `crypto.randomBytes(32)` for cryptographically secure passwords
- Hash with bcrypt before storage (cost factor 10)

### Cookie Security
- `httpOnly: true` - prevents XSS access
- `secure: true` in production - HTTPS only
- `sameSite: 'lax'` - CSRF protection
- Short expiration for access tokens (15min), longer for refresh (7d)

### Rate Limiting
- Consider adding rate limiting to waitlist endpoint (future enhancement)
- Prevent email enumeration attacks

---

## Future Enhancements

### Phase 2 (Post-Launch)
1. **Email notification**: Send welcome email with generated password
2. **Password reset flow**: Allow users to set their own password
3. **Email verification**: Add verification step before IDE access
4. **Analytics dashboard**: Track alpha signup conversion rates

### Phase 3 (If Needed)
1. **Shared auth service**: Extract common logic to `/lib/auth/account-service.ts`
2. **Rate limiting**: Add to prevent abuse
3. **Automated tests**: Integration tests for signup flow

---

## Success Metrics

**Primary**: "Open IDE" button works without redirect
**Secondary**: Zero 500 errors on duplicate signups
**User Experience**: Single-step signup (no additional forms)

---

## Dependencies

- Existing JWT infrastructure (`jsonwebtoken` package)
- bcrypt for password hashing
- Existing database schema (no migration needed)
- Existing middleware for auth validation

---

## Open Questions

None - all requirements clarified and approved.
