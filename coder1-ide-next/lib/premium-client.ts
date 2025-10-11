/**
 * Premium API Client
 * Client library for integrating with Coder1 Premium API
 * 
 * Provides access to:
 * - Eternal Memory (session storage & retrieval)
 * - AI Supervision (real-time code guidance)
 * - Trial Management (7-day trial tracking)
 * - Billing (Stripe subscription management)
 */

export interface TrialStatus {
  success: boolean;
  userId: string;
  trialStartDate: string | null;
  trialEndDate: string | null;
  daysRemaining: number;
  status: 'active' | 'expired' | 'never_started';
  isPro: boolean;
  timestamp: string;
}

export interface MemorySession {
  id: string;
  userId: string;
  sessionId: string;
  sessionData: SessionData;
  createdAt: string;
  updatedAt: string;
}

export interface SessionData {
  files?: Record<string, string>;
  terminalHistory?: string[];
  openFiles?: string[];
  editorState?: any;
  metadata?: Record<string, any>;
}

export interface SupervisionAnalysis {
  success: boolean;
  guidance: string;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
    suggestion?: string;
  }>;
  suggestions: string[];
  timestamp: string;
}

export interface SubscriptionStatus {
  success: boolean;
  userId: string;
  subscriptionId: string | null;
  plan: 'free' | 'pro';
  status: string;
  amount: number;
  currency: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  timestamp: string;
}

export class PremiumClient {
  private baseURL: string;
  private userId: string | null = null;

  constructor(baseURL: string = 'http://localhost:3003') {
    this.baseURL = baseURL;
  }

  /**
   * Set the current user ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.userId;
  }

  // ============================================================================
  // TRIAL API
  // ============================================================================

  /**
   * Get trial status for current user
   */
  async getTrialStatus(): Promise<TrialStatus | null> {
    if (!this.userId) {
      console.warn('No userId set - trial status unavailable');
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/premium/trial/status/${this.userId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get trial status:', error);
      return null;
    }
  }

  /**
   * Start 7-day trial for current user
   */
  async startTrial(): Promise<{ success: boolean; message: string } | null> {
    if (!this.userId) {
      console.warn('No userId set - cannot start trial');
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/premium/trial/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to start trial:', error);
      return null;
    }
  }

  // ============================================================================
  // MEMORY API
  // ============================================================================

  /**
   * Store session data in Eternal Memory
   */
  async storeMemory(sessionId: string, sessionData: SessionData): Promise<boolean> {
    if (!this.userId) {
      console.warn('No userId set - cannot store memory');
      return false;
    }

    const status = await this.getTrialStatus();
    if (!status || (!status.isPro && status.status !== 'active')) {
      console.info('Memory storage requires active trial or Pro subscription');
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/premium/memory/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          sessionId,
          sessionData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to store memory:', error);
      return false;
    }
  }

  /**
   * Retrieve memory context for a session
   */
  async getMemoryContext(sessionId: string): Promise<SessionData | null> {
    if (!this.userId) {
      console.warn('No userId set - cannot retrieve memory');
      return null;
    }

    const status = await this.getTrialStatus();
    if (!status || (!status.isPro && status.status !== 'active')) {
      console.info('Memory retrieval requires active trial or Pro subscription');
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseURL}/api/premium/memory/context/${sessionId}?userId=${this.userId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.context;
    } catch (error) {
      console.error('Failed to get memory context:', error);
      return null;
    }
  }

  /**
   * List all sessions for current user
   */
  async listSessions(): Promise<MemorySession[]> {
    if (!this.userId) {
      console.warn('No userId set - cannot list sessions');
      return [];
    }

    const status = await this.getTrialStatus();
    if (!status || (!status.isPro && status.status !== 'active')) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.baseURL}/api/premium/memory/sessions?userId=${this.userId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.sessions || [];
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }
  }

  /**
   * Delete a session from memory
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    if (!this.userId) {
      console.warn('No userId set - cannot delete session');
      return false;
    }

    try {
      const response = await fetch(
        `${this.baseURL}/api/premium/memory/${sessionId}?userId=${this.userId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  // ============================================================================
  // SUPERVISION API
  // ============================================================================

  /**
   * Enable AI supervision for current session
   */
  async enableSupervision(sessionId: string): Promise<boolean> {
    if (!this.userId) {
      console.warn('No userId set - cannot enable supervision');
      return false;
    }

    const status = await this.getTrialStatus();
    if (!status || (!status.isPro && status.status !== 'active')) {
      console.info('Supervision requires active trial or Pro subscription');
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/premium/supervision/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, sessionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to enable supervision:', error);
      return false;
    }
  }

  /**
   * Disable AI supervision
   */
  async disableSupervision(sessionId: string): Promise<boolean> {
    if (!this.userId) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/premium/supervision/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, sessionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to disable supervision:', error);
      return false;
    }
  }

  /**
   * Analyze code with AI supervision
   */
  async analyzeCode(code: string, context?: any): Promise<SupervisionAnalysis | null> {
    if (!this.userId) {
      console.warn('No userId set - cannot analyze code');
      return null;
    }

    const status = await this.getTrialStatus();
    if (!status || (!status.isPro && status.status !== 'active')) {
      console.info('Code analysis requires active trial or Pro subscription');
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/premium/supervision/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, code, context }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to analyze code:', error);
      return null;
    }
  }

  /**
   * Get supervision status
   */
  async getSupervisionStatus(sessionId: string): Promise<any> {
    if (!this.userId) {
      return { active: false, status: 'inactive' };
    }

    try {
      const response = await fetch(
        `${this.baseURL}/api/premium/supervision/status?userId=${this.userId}&sessionId=${sessionId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get supervision status:', error);
      return { active: false, status: 'inactive' };
    }
  }

  // ============================================================================
  // BILLING API
  // ============================================================================

  /**
   * Create Stripe Checkout session to upgrade to Pro
   */
  async createCheckoutSession(
    email: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ checkoutUrl: string; sessionId: string } | null> {
    if (!this.userId) {
      console.warn('No userId set - cannot create checkout');
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/premium/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          email,
          successUrl,
          cancelUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      return null;
    }
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    if (!this.userId) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseURL}/api/premium/billing/status?userId=${this.userId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return null;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    if (!this.userId) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/premium/billing/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, subscriptionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return false;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if premium features are available
   */
  async hasPremiumAccess(): Promise<boolean> {
    const status = await this.getTrialStatus();
    return status ? (status.isPro || status.status === 'active') : false;
  }

  /**
   * Check if user is on Pro plan
   */
  async isPro(): Promise<boolean> {
    const status = await this.getTrialStatus();
    return status ? status.isPro : false;
  }

  /**
   * Check if trial is active
   */
  async isTrialActive(): Promise<boolean> {
    const status = await this.getTrialStatus();
    return status ? (status.status === 'active' && !status.isPro) : false;
  }
}

// Singleton instance
export const premiumClient = new PremiumClient();
