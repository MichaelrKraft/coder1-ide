// lib/agent-hub/paywall.ts
// Wraps subscription check for Agent Hub paid features

export interface SubscriptionStatus {
  isPaid: boolean;
  plan?: string;
}

export async function checkSubscription(userId: string): Promise<SubscriptionStatus> {
  // TODO: wire up to Stripe/Supabase subscription when available
  // For now, check AGENT_HUB_PAID_USERS env var (comma-separated user IDs) for beta testing
  const paidUsers = (process.env.AGENT_HUB_PAID_USERS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    isPaid: paidUsers.length === 0 || paidUsers.includes(userId),
    plan: 'team',
  };
}
