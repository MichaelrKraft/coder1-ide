# Password Reset Flow Implementation

## Task Overview
Implement a complete password reset flow for Viral Growth AI with forgot-password and reset-password pages.

## Todo Items

- [x] Read existing auth patterns (login, signup, supabase client)
- [x] Review auth layout and UI components available
- [x] Create `/src/app/(auth)/forgot-password/page.tsx`
  - Email input form matching login styling
  - Use supabase.auth.resetPasswordForEmail()
  - Set redirectTo to /reset-password
  - Success message state
  - Error handling
  - Link back to login
- [x] Create `/src/app/(auth)/reset-password/page.tsx`
  - Password + confirm password form
  - Use supabase.auth.updateUser({ password })
  - Validate passwords match (8+ chars)
  - Success state and redirect to login
  - Handle expired/invalid tokens

## Design Requirements
- [x] Match dark theme with slate-800/50 inputs, purple accents
- [x] Use existing spinner pattern for loading states
- [x] Mobile responsive (already handled by layout)
- [x] lucide-react icons for visual elements

## Review Section

### Changes Made:

**1. `/src/app/(auth)/forgot-password/page.tsx`** (NEW FILE)
- Email-only form with controlled input state
- Uses `supabase.auth.resetPasswordForEmail()` with redirect to `/reset-password`
- Success state shows confirmation with email sent to
- Includes helpful tips (check spam, 1-hour expiry)
- "Try again" button to resend
- Back to login link with arrow icon
- lucide-react icons: Mail, ArrowLeft, CheckCircle

**2. `/src/app/(auth)/reset-password/page.tsx`** (NEW FILE)
- Token validation on mount via `supabase.auth.getSession()`
- Three states: loading, invalid token, valid form
- Password + confirm password with show/hide toggles
- Real-time validation indicators (8+ chars, passwords match)
- Uses `supabase.auth.updateUser({ password })`
- Signs out after successful reset for security
- Success state with link to login
- Invalid/expired token state with link to request new reset
- lucide-react icons: KeyRound, CheckCircle, AlertCircle, Eye, EyeOff

### Design Consistency:
- Identical input styling to login/signup pages
- Same purple gradient buttons with shadows
- Same error message styling (red-500/10 bg, red-500/20 border)
- Same spinner animation for loading states
- Auth layout provides consistent background and card wrapper

### User Flow:
1. User clicks "Forgot password?" on login page
2. User enters email on forgot-password page
3. Supabase sends reset email with link to `/reset-password?token=...`
4. User clicks link, arrives at reset-password page
5. Supabase auto-authenticates via recovery session
6. User enters new password (validated in real-time)
7. Password updated, user signed out, redirected to login

### Error Handling:
- Invalid/expired tokens detected and shown with helpful message
- Network errors caught with generic "unexpected error" message
- Form validation before submission (8+ chars, passwords match)
- Supabase-specific errors displayed to user
