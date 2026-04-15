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
  // Alpha/beta: open to all users. Set AGENT_HUB_OPEN_BETA=false to enable gating.
  if (process.env.AGENT_HUB_OPEN_BETA !== 'false') {
    return { isPaid: true, plan: 'pro' };
  }
  const paid = isProLicenseActive();
  return {
    isPaid: paid,
    plan: paid ? 'pro' : 'free',
  };
}
