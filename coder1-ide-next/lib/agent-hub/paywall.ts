// lib/agent-hub/paywall.ts
import { isProLicenseActive } from '@/lib/pro-license';

export interface SubscriptionStatus {
  isPaid: boolean;
  plan: 'pro' | 'free';
}

export async function checkSubscription(
  // _userId kept for API compatibility — future per-user billing will use it
  _userId: string
): Promise<SubscriptionStatus> {
  const paid = isProLicenseActive();
  return {
    isPaid: paid,
    plan: paid ? 'pro' : 'free',
  };
}
