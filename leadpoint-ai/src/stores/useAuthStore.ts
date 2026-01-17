import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Subscription } from "@/types";

interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      subscription: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setSubscription: (subscription) =>
        set({
          subscription,
        }),

      setLoading: (isLoading) =>
        set({
          isLoading,
        }),

      logout: () =>
        set({
          user: null,
          subscription: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        subscription: state.subscription,
      }),
    }
  )
);
