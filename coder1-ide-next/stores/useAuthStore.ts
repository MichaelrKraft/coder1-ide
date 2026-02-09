'use client';

import { create } from 'zustand';

// ================================================================================
// Types
// ================================================================================

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  subscriptionTier: string;
  emailVerified: boolean;
}

interface AuthStore {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

// ================================================================================
// Store — NO persist (httpOnly cookies are source of truth)
// ================================================================================

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  isLoading: true, // true until initial /me check completes
  error: null,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clear: () => set({ user: null, isLoading: false, error: null }),
}));
