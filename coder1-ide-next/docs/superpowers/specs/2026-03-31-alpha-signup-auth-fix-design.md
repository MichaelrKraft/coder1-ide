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
4. **Alpha users**: Default `subscription_tier` is 'free' (schema default) - alpha status tracked separately via analytics

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

#### Required Imports

```typescript
import { NextResponse } from 'next/server';
import { createUser, getUserByEmail, getUserByUsername, createSession } from '@/lib/auth/db';
import { generateTokens } from '@/lib/auth/jwt';
import { hashPassword } from '@/lib/auth/bcrypt';
import { randomBytes } from 'crypto';
```

#### New Logic Flow

```typescript
export async function POST(request: Request) {
  const { email, name } = await request.json();

  try {
    // Step 1: Check if email already registered
    const existingUser = getUserByEmail(email);

    if (existingUser) {
      // User exists → create session and auto-login
      const { accessToken, refreshToken, expiresAt } = generateTokens({
        userId: existingUser.id,
        email: existingUser.email,
        username: existingUser.username,
        subscriptionTier: existingUser.subscription_tier,
      });

      // Get request metadata
      const userAgent = request.headers.get('user-agent') || undefined;
      const ip = request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') || undefined;

      createSession({
        user_id: existingUser.id,
        token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        user_agent: userAgent,
        ip_address: ip,
      });

      const response = NextResponse.json({
        success: true,
        message: 'Welcome back! Logging you in...',
      });

      // Set auth cookies
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

      return response;
    }

    // Step 2: Generate unique username from email
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const username = findAvailableUsername(baseUsername);

    // Step 3: Generate secure random password
    const password = randomBytes(32).toString('hex');
    const passwordHash = await hashPassword(password);

    // Step 4: Create user account (with UNIQUE constraint error handling)
    let user;
    try {
      user = createUser({
        email,
        username,
        password_hash: passwordHash,
      });
    } catch (dbError: any) {
      // Handle race condition: username taken between check and insert
      if (dbError.message?.includes('UNIQUE constraint failed')) {
        // Try once more with incremented username
        const retryUsername = `${baseUsername}${Date.now()}`;
        user = createUser({
          email,
          username: retryUsername,
          password_hash: passwordHash,
        });
      } else {
        throw dbError;
      }
    }

    // Step 5: Generate tokens
    const { accessToken, refreshToken, expiresAt } = generateTokens({
      userId: user.id,
      email: user.email,
      username: user.username,
      subscriptionTier: user.subscription_tier,
    });

    // Step 6: Create session
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') || undefined;

    createSession({
      user_id: user.id,
      token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      user_agent: userAgent,
      ip_address: ip,
    });

    // Step 7: Set auth cookies and return success
    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully!',
    }, { status: 201 });

    response.cookies.set('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    response.cookies.set('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

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

#### Helper Function (add to top of route file)

**Username Deduplication**:
```typescript
function findAvailableUsername(base: string): string {
  // Sanitize base: alphanumeric + underscores only
  const sanitized = base.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!sanitized) return 'user'; // Fallback for invalid email prefixes

  let username = sanitized;
  let suffix = 1;

  // Check database for collisions
  while (getUserByUsername(username)) {
    username = `${sanitized}${suffix}`;
    suffix++;
    // Safety: prevent infinite loop
    if (suffix > 1000) {
      username = `${sanitized}${Date.now()}`;
      break;
    }
  }

  return username;
}
```

**Note**: Token generation and session creation use existing exported functions from `/lib/auth/jwt.ts` and `/lib/auth/db.ts`. No additional helpers needed - the imports at the top of the file provide everything required.

---

## Files Modified

### Primary Changes
- **`/app/api/alpha/waitlist/route.ts`** - Complete rewrite with account creation + session logic, add `findAvailableUsername()` helper function

### Referenced Files (NO changes needed, using existing exports)
- **`/lib/auth/db.ts`** - Database operations (`createUser`, `createSession`, `getUserByEmail`, `getUserByUsername`)
- **`/lib/auth/jwt.ts`** - Token generation (`generateTokens`)
- **`/lib/auth/bcrypt.ts`** - Password hashing (`hashPassword`)
- **`/app/api/v2/auth/register/route.ts`** - Reference implementation for auth patterns (lines 70-150)

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

#### Test 6: Middleware Auth Check (**IMPORTANT: Test in Production Mode**)
1. **Set `NODE_ENV=production`** before testing (middleware bypasses auth checks in development)
2. Navigate to `/ide` without auth cookies
3. **Expected**: Redirected to `/login`
4. Complete alpha signup flow
5. **Expected**: `/ide` access works without redirect

**Why**: `/middleware.ts` line 13 skips auth validation in development mode, so testing in dev won't catch the actual bug.

### Edge Cases

- **Invalid email format**: Frontend validation should catch, but API should return 400
- **Empty name field**: Ignored (no displayName field in schema)
- **Username with special characters**: Sanitized to alphanumeric + underscores
- **Very long email prefix**: Truncate to reasonable length before using as username base
- **Race condition on username**: Handled with try-catch and timestamp fallback

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
