/**
 * Feature Gating System
 * Controls access to premium features based on license tier
 */

import { licenseService, LicenseFeatures } from '@/services/license-service';
import { memoryService } from '@/services/memory-service';

export interface FeatureGateResult {
  allowed: boolean;
  reason?: string;
  upgradeUrl?: string;
}

export class FeatureGate {
  private static instance: FeatureGate;
  private features: LicenseFeatures | null = null;
  private lastCheck: Date | null = null;
  private checkInterval = 60 * 1000; // Check every minute

  private constructor() {}

  static getInstance(): FeatureGate {
    if (!FeatureGate.instance) {
      FeatureGate.instance = new FeatureGate();
    }
    return FeatureGate.instance;
  }

  /**
   * Check if features need to be refreshed
   */
  private async refreshFeaturesIfNeeded(): Promise<void> {
    const now = new Date();
    
    if (!this.features || !this.lastCheck || 
        (now.getTime() - this.lastCheck.getTime()) > this.checkInterval) {
      
      const status = await licenseService.getLicenseStatus();
      this.features = status.features || licenseService.getFeaturesForTier('free');
      this.lastCheck = now;
    }
  }

  /**
   * Check if memory persistence is allowed
   */
  async canPersistMemory(): Promise<FeatureGateResult> {
    await this.refreshFeaturesIfNeeded();

    if (this.features?.memoryPersistence) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Memory persistence is a Pro feature. Your sessions will expire after 24 hours.',
      upgradeUrl: '/pricing'
    };
  }

  /**
   * Check if user can create more projects
   */
  async canCreateProject(): Promise<FeatureGateResult> {
    await this.refreshFeaturesIfNeeded();

    if (this.features?.unlimitedProjects) {
      return { allowed: true };
    }

    // Free tier: Check project limit
    const stats = await memoryService.getStatistics();
    if (stats.totalProjects >= 3) {
      return {
        allowed: false,
        reason: 'Free tier is limited to 3 projects. Upgrade to Pro for unlimited projects.',
        upgradeUrl: '/pricing'
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user can search history
   */
  async canSearchHistory(): Promise<FeatureGateResult> {
    await this.refreshFeaturesIfNeeded();

    if (this.features?.searchHistory) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Search across all conversations is a Pro feature.',
      upgradeUrl: '/pricing'
    };
  }

  /**
   * Check if team collaboration is allowed
   */
  async canUseTeamFeatures(): Promise<FeatureGateResult> {
    await this.refreshFeaturesIfNeeded();

    if (this.features?.teamCollaboration) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Team collaboration requires a Team license.',
      upgradeUrl: '/pricing?plan=team'
    };
  }

  /**
   * Get upgrade prompt for a feature
   */
  getUpgradePrompt(feature: keyof LicenseFeatures): {
    title: string;
    message: string;
    benefits: string[];
    ctaText: string;
    ctaUrl: string;
  } {
    const prompts = {
      memoryPersistence: {
        title: 'Never Lose Your Context Again',
        message: 'With Coder1 Pro, Claude remembers everything between sessions.',
        benefits: [
          'Infinite memory persistence',
          'Resume exactly where you left off',
          'Search across all conversations',
          'No more context rebuilding'
        ],
        ctaText: 'Upgrade to Pro - $29/month',
        ctaUrl: '/pricing'
      },
      unlimitedProjects: {
        title: 'Work on Unlimited Projects',
        message: 'Remove project limits with Coder1 Pro.',
        benefits: [
          'Unlimited projects',
          'Switch between projects instantly',
          'Maintain context for each project',
          'Full project history'
        ],
        ctaText: 'Get Unlimited Projects',
        ctaUrl: '/pricing'
      },
      searchHistory: {
        title: 'Search Your Entire History',
        message: 'Find anything from any conversation with powerful search.',
        benefits: [
          'Search across all conversations',
          'Find code snippets instantly',
          'Filter by project or date',
          'Export search results'
        ],
        ctaText: 'Enable Search with Pro',
        ctaUrl: '/pricing'
      },
      teamCollaboration: {
        title: 'Collaborate with Your Team',
        message: 'Share context and work together seamlessly.',
        benefits: [
          'Share conversations with team',
          'Collaborative coding sessions',
          'Team-wide memory',
          'Role-based access control'
        ],
        ctaText: 'Get Team License',
        ctaUrl: '/pricing?plan=team'
      },
      prioritySupport: {
        title: 'Get Priority Support',
        message: 'Direct access to our support team.',
        benefits: [
          '24/7 priority support',
          'Direct Slack channel',
          'Screen sharing sessions',
          'Custom onboarding'
        ],
        ctaText: 'Upgrade for Support',
        ctaUrl: '/pricing'
      },
      customIntegrations: {
        title: 'Custom Integrations',
        message: 'Connect Coder1 to your workflow.',
        benefits: [
          'GitHub integration',
          'Custom API access',
          'Webhook support',
          'Enterprise SSO'
        ],
        ctaText: 'Contact Sales',
        ctaUrl: '/contact-sales'
      }
    };

    return prompts[feature] || prompts.memoryPersistence;
  }

  /**
   * Apply feature gates to API response
   */
  async applyFeatureGates(data: any, feature: keyof LicenseFeatures): Promise<any> {
    const gate = await this.checkFeature(feature);
    
    if (!gate.allowed) {
      // Add upgrade prompt to response
      return {
        ...data,
        featureGated: true,
        upgradePrompt: this.getUpgradePrompt(feature)
      };
    }

    return data;
  }

  /**
   * Generic feature check
   */
  async checkFeature(feature: keyof LicenseFeatures): Promise<FeatureGateResult> {
    await this.refreshFeaturesIfNeeded();

    if (this.features?.[feature]) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `This feature requires a paid license.`,
      upgradeUrl: '/pricing'
    };
  }

  /**
   * Clean up expired free tier sessions
   */
  async enforceFreeTierLimits(): Promise<void> {
    const status = await licenseService.getLicenseStatus();
    
    if (status.tier === 'free') {
      // Clean up sessions older than 1 day for free tier
      const deleted = await memoryService.cleanupOldSessions(1);
      if (deleted > 0) {
        console.log(`Cleaned up ${deleted} expired sessions (free tier limit)`);
      }
    }
  }

  /**
   * Get feature status for UI display
   */
  async getFeatureStatus(): Promise<{
    tier: string;
    features: Record<string, boolean>;
    limits: Record<string, any>;
  }> {
    await this.refreshFeaturesIfNeeded();
    const status = await licenseService.getLicenseStatus();
    const stats = await memoryService.getStatistics();

    return {
      tier: status.tier,
      features: {
        memoryPersistence: this.features?.memoryPersistence || false,
        unlimitedProjects: this.features?.unlimitedProjects || false,
        searchHistory: this.features?.searchHistory || false,
        teamCollaboration: this.features?.teamCollaboration || false,
        prioritySupport: this.features?.prioritySupport || false,
        customIntegrations: this.features?.customIntegrations || false
      },
      limits: {
        projectsUsed: stats.totalProjects,
        projectLimit: this.features?.unlimitedProjects ? 'Unlimited' : 3,
        memoryExpiration: this.features?.memoryPersistence ? 'Never' : '24 hours',
        searchEnabled: this.features?.searchHistory
      }
    };
  }
}

// Export singleton instance
export const featureGate = FeatureGate.getInstance();

// Export convenience functions
export async function requireProFeature(
  feature: keyof LicenseFeatures
): Promise<void> {
  const gate = await featureGate.checkFeature(feature as any);
  if (!gate.allowed) {
    throw new Error(gate.reason || 'This feature requires a Pro license');
  }
}

export async function withFeatureGate<T>(
  feature: keyof LicenseFeatures,
  callback: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  const gate = await featureGate.checkFeature(feature as any);
  
  if (gate.allowed) {
    return callback();
  }

  if (fallback) {
    return fallback();
  }

  throw new Error(gate.reason || 'Feature not available');
}