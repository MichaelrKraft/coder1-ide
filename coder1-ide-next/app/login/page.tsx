'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

// ================================================================================
// Login Page — Single page with Sign In / Sign Up toggle
// ================================================================================

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, isAuthenticated, error, login, register, clearError } = useAuth();

  // Form state
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Inline validation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Invite params
  const inviteToken = searchParams.get('invite');
  const teamName = searchParams.get('team') ? decodeURIComponent(searchParams.get('team')!) : null;
  const inviteError = searchParams.get('inviteError');
  const redirectTo = searchParams.get('redirect') || '/ide';

  // If already authenticated, handle invite join or redirect
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const joinAndRedirect = async () => {
      if (inviteToken) {
        try {
          const res = await fetch('/api/team/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token: inviteToken }),
          });
          const data = await res.json();
          if (!data.success) {
            console.warn('[Login] Team join failed:', data.error);
          }
        } catch {
          console.warn('[Login] Team join network error');
        }
      }
      router.push(redirectTo);
    };

    joinAndRedirect();
  }, [isAuthenticated, isLoading, inviteToken, redirectTo, router]);

  // Clear error when switching modes
  useEffect(() => {
    clearError();
    setFieldErrors({});
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side validation for sign up
  const validateSignUp = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email || !email.includes('@')) {
      errors.email = 'Valid email is required';
    }

    if (!username || username.length < 3 || username.length > 20) {
      errors.username = 'Username must be 3-20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username = 'Only letters, numbers, and underscores';
    }

    if (!password || password.length < 8) {
      errors.password = 'At least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Needs an uppercase letter';
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'Needs a lowercase letter';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Needs a number';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    clearError();
    setFieldErrors({});

    let success = false;

    if (mode === 'signin') {
      success = await login(emailOrUsername, password, rememberMe);
    } else {
      if (!validateSignUp()) {
        setSubmitting(false);
        return;
      }
      success = await register(email, username, password);
    }

    if (success) {
      // useEffect above handles invite join + redirect
      // If no invite, redirect immediately
      if (!inviteToken) {
        router.push(redirectTo);
      }
    }

    setSubmitting(false);
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-[#00D9FF] text-lg">Loading...</div>
      </div>
    );
  }

  // If already authenticated and waiting for redirect
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-[#00D9FF] text-lg">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0f' }}>
      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1
            className="text-3xl font-bold"
            style={{
              color: '#00D9FF',
              textShadow: '0 0 20px rgba(0, 217, 255, 0.4)',
            }}
          >
            Coder1
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
            The AI-Powered IDE
          </p>
        </div>

        {/* Invite Banner */}
        {teamName && !inviteError && (
          <div
            className="p-3 rounded-lg text-sm text-center"
            style={{
              background: 'rgba(0, 217, 255, 0.08)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              color: '#00D9FF',
            }}
          >
            You&apos;ve been invited to join <strong>{teamName}</strong>
          </div>
        )}

        {/* Invite Error Banner */}
        {inviteError && (
          <div
            className="p-3 rounded-lg text-sm text-center"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
            }}
          >
            {inviteError === 'expired' && 'This invitation has expired.'}
            {inviteError === 'used' && 'This invitation has already been used.'}
            {inviteError === 'notfound' && 'Invitation not found.'}
            {!['expired', 'used', 'notfound'].includes(inviteError) && 'Invalid invitation.'}
          </div>
        )}

        {/* Auth Error */}
        {error && (
          <div
            className="p-3 rounded-lg text-sm text-center"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            type="button"
            onClick={() => setMode('signin')}
            className="flex-1 py-2.5 text-sm font-medium transition-colors"
            style={{
              background: mode === 'signin' ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
              color: mode === 'signin' ? '#00D9FF' : '#6b7280',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className="flex-1 py-2.5 text-sm font-medium transition-colors"
            style={{
              background: mode === 'signup' ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
              color: mode === 'signup' ? '#00D9FF' : '#6b7280',
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signin' ? (
            <>
              {/* Sign In Fields */}
              <div>
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="Email or username"
                  autoComplete="username"
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(0, 217, 255, 0.5)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                />
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(0, 217, 255, 0.5)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm" style={{ color: '#6b7280' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded"
                />
                Remember me
              </label>
            </>
          ) : (
            <>
              {/* Sign Up Fields */}
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: fieldErrors.email ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = fieldErrors.email ? 'rgba(239, 68, 68, 0.5)' : 'rgba(0, 217, 255, 0.5)'; }}
                  onBlur={(e) => { e.target.style.borderColor = fieldErrors.email ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.1)'; }}
                />
                {fieldErrors.email && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{fieldErrors.email}</p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  autoComplete="username"
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: fieldErrors.username ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = fieldErrors.username ? 'rgba(239, 68, 68, 0.5)' : 'rgba(0, 217, 255, 0.5)'; }}
                  onBlur={(e) => { e.target.style.borderColor = fieldErrors.username ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.1)'; }}
                />
                {fieldErrors.username && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{fieldErrors.username}</p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: fieldErrors.password ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = fieldErrors.password ? 'rgba(239, 68, 68, 0.5)' : 'rgba(0, 217, 255, 0.5)'; }}
                  onBlur={(e) => { e.target.style.borderColor = fieldErrors.password ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.1)'; }}
                />
                {fieldErrors.password && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{fieldErrors.password}</p>
                )}
                {mode === 'signup' && !fieldErrors.password && (
                  <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                    Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
                  </p>
                )}
              </div>
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: 'rgba(0, 217, 255, 0.2)',
              color: '#00D9FF',
              border: '1px solid rgba(0, 217, 255, 0.3)',
            }}
            onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = 'rgba(0, 217, 255, 0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 217, 255, 0.2)'; }}
          >
            {submitting
              ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
              : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <span className="text-xs" style={{ color: '#6b7280' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <a
            href="/api/v2/auth/github"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </a>
          <a
            href="/api/v2/auth/google"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
          <div style={{ color: '#00D9FF' }}>Loading...</div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
