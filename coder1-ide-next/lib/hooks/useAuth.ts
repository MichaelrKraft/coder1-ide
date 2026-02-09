'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type AuthUser } from '@/stores/useAuthStore';

// ================================================================================
// useAuth — wraps AuthStore with API calls
// ================================================================================

export function useAuth() {
  const router = useRouter();
  const { user, isLoading, error, setUser, setLoading, setError, clear } = useAuthStore();
  const didCheckRef = useRef(false);

  // On mount: check /me to see if user is already authenticated
  useEffect(() => {
    if (didCheckRef.current) return; // prevent double-call in StrictMode
    didCheckRef.current = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/v2/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user as AuthUser);
        } else {
          // 401 = not logged in (not an error)
          setUser(null);
        }
      } catch {
        setUser(null);
        setError('Network error — could not verify session');
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Proactive token refresh — runs every 13 minutes to refresh before the 15-min expiry
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/v2/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          // Token refreshed — schedule next refresh
          scheduleRefresh();
        } else {
          // Refresh token expired or invalid — user must re-login
          clear();
          router.push('/login');
        }
      } catch {
        // Network error — try again in 1 minute
        refreshTimerRef.current = setTimeout(() => scheduleRefresh(), 60_000);
      }
    }, 13 * 60 * 1000); // 13 minutes
  }, [clear, router]);

  // Start the refresh timer once authenticated
  useEffect(() => {
    if (user) {
      scheduleRefresh();
    }
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [user, scheduleRefresh]);

  // Also refresh on visibility change (handles laptop sleep/wake)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        // Tab became visible — check if token is still valid
        const res = await fetch('/api/v2/auth/me', { credentials: 'include' });
        if (!res.ok) {
          // Token expired during sleep — try refresh
          const refreshRes = await fetch('/api/v2/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });
          if (refreshRes.ok) {
            scheduleRefresh();
          } else {
            clear();
            router.push('/login');
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, clear, router, scheduleRefresh]);

  // Login
  const login = useCallback(async (
    emailOrUsername: string,
    password: string,
    rememberMe: boolean,
  ): Promise<boolean> => {
    try {
      setError(null);
      const res = await fetch('/api/v2/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emailOrUsername, password, rememberMe }),
      });

      if (res.ok) {
        // Fetch canonical user data from /me (cookies are now set)
        const meRes = await fetch('/api/v2/auth/me', { credentials: 'include' });
        if (meRes.ok) {
          const data = await meRes.json();
          setUser(data.user as AuthUser);
          return true;
        }
      }

      // Handle error responses
      const data = await res.json().catch(() => ({ error: 'Login failed' }));
      setError(data.error || 'Login failed');
      return false;
    } catch {
      setError('Network error — please try again');
      return false;
    }
  }, [setUser, setError]);

  // Register
  const register = useCallback(async (
    email: string,
    username: string,
    password: string,
  ): Promise<boolean> => {
    try {
      setError(null);
      const res = await fetch('/api/v2/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, username, password }),
      });

      if (res.ok || res.status === 201) {
        // Fetch canonical user data from /me
        const meRes = await fetch('/api/v2/auth/me', { credentials: 'include' });
        if (meRes.ok) {
          const data = await meRes.json();
          setUser(data.user as AuthUser);
          return true;
        }
      }

      const data = await res.json().catch(() => ({ error: 'Registration failed' }));
      setError(data.error || 'Registration failed');
      return false;
    } catch {
      setError('Network error — please try again');
      return false;
    }
  }, [setUser, setError]);

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/v2/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Proceed with client-side cleanup even if API fails
    }
    clear();
    router.push('/login');
  }, [clear, router]);

  // Clear error
  const clearError = useCallback(() => setError(null), [setError]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    register,
    logout,
    clearError,
  };
}
