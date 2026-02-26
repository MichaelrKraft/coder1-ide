'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY || initialized.current) return;
    initialized.current = true;

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false, // We handle this manually below
      capture_pageleave: true,
      persistence: 'localStorage',
      // Don't track admin pages
      loaded: (ph) => {
        if (window.location.pathname.startsWith('/admin')) {
          ph.opt_out_capturing();
        }
      },
    });
  }, []);

  // Track pageviews on route changes (excluding admin)
  useEffect(() => {
    if (!POSTHOG_KEY || !initialized.current) return;
    if (pathname.startsWith('/admin')) return;

    posthog.capture('$pageview', {
      $current_url: window.location.href,
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}

// Typed helper so pages can track feature events without importing posthog directly
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  posthog.capture(event, properties);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  posthog.identify(userId, traits);
}
