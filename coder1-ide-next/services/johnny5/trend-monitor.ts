/**
 * Johnny5 Trend Monitor Service
 *
 * Monitors X (Twitter), GitHub, HackerNews, and competitor websites for
 * opportunities that Johnny5 can act on.
 *
 * "Need more input!" - Johnny5
 */

import type {
  Johnny5TrendAlert,
  Johnny5TrendMonitorConfig,
} from '@/types/johnny5';

// ============================================================================
// Types
// ============================================================================

export interface TrendMonitorState {
  isMonitoring: boolean;
  lastChecked: Date | null;
  alerts: Johnny5TrendAlert[];
  config: Johnny5TrendMonitorConfig;
  errors: TrendMonitorError[];
}

export interface TrendMonitorError {
  source: Johnny5TrendAlert['source'];
  message: string;
  timestamp: Date;
}

export type TrendActionType = 'build' | 'research' | 'ignored' | 'snoozed';

export interface TrendAction {
  alertId: string;
  action: TrendActionType;
  timestamp: Date;
  notes?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const DEFAULT_CONFIG: Johnny5TrendMonitorConfig = {
  xAccounts: [
    '@levelsio',
    '@theprimeagen',
    '@dan_abramov',
    '@swyx',
    '@jaredpalmer',
  ],
  xKeywords: [
    '#buildinpublic',
    '#indie',
    'ai coding',
    'vibe coding',
    'claude code',
  ],
  githubRepos: [
    'anthropics/claude-code',
    'vercel/next.js',
    'facebook/react',
    'tailwindlabs/tailwindcss',
  ],
  hackerNewsKeywords: [
    'AI IDE',
    'code generation',
    'Claude',
    'cursor alternative',
    'developer tools',
  ],
  competitorWebsites: [
    'cursor.sh',
    'bolt.new',
    'replit.com',
    'windsurf.com',
  ],
  industryNewsRss: [
    'https://news.ycombinator.com/rss',
    'https://this-week-in-rust.org/rss.xml',
  ],
  customWebhooks: [],
};

// Generate mock alerts for demo
function generateMockAlerts(): Johnny5TrendAlert[] {
  const now = new Date();

  return [
    {
      id: 'trend-001',
      timestamp: new Date(now.getTime() - 5 * 60 * 1000), // 5 mins ago
      source: 'x',
      title: '@levelsio just launched Photo AI 2.0',
      description:
        'New version includes AI-powered background removal and style transfer. Getting massive engagement with 2.5k likes in first hour.',
      url: 'https://x.com/levelsio/status/123456789',
      relevance: 'high',
      opportunity:
        'Build a similar photo editing feature for Coder1. Could integrate with the component studio.',
      dismissed: false,
    },
    {
      id: 'trend-002',
      timestamp: new Date(now.getTime() - 15 * 60 * 1000), // 15 mins ago
      source: 'github',
      title: 'Next.js 15.2 Released',
      description:
        'Major performance improvements and new experimental features including enhanced streaming and partial prerendering.',
      url: 'https://github.com/vercel/next.js/releases/tag/v15.2.0',
      relevance: 'high',
      opportunity:
        'Update Coder1 to Next.js 15.2 for performance gains. Document new features for users.',
      dismissed: false,
    },
    {
      id: 'trend-003',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000), // 30 mins ago
      source: 'hackernews',
      title: 'Show HN: I built an AI that writes tests for you',
      description:
        'Top of HN with 350 points. Automatically generates unit tests from function signatures. Comments discussing limitations.',
      url: 'https://news.ycombinator.com/item?id=987654',
      relevance: 'medium',
      opportunity:
        'Research their approach. Could add auto-test generation to Johnny5 capabilities.',
      dismissed: false,
    },
    {
      id: 'trend-004',
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      source: 'competitor',
      title: 'Cursor adds multi-file editing feature',
      description:
        'New Cursor update allows editing multiple files simultaneously with AI. Users praising the feature on Twitter.',
      url: 'https://cursor.sh/changelog',
      relevance: 'high',
      opportunity:
        'Coder1 already has this! Create comparison content showing our implementation. Update marketing.',
      dismissed: false,
    },
    {
      id: 'trend-005',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      source: 'x',
      title: '#buildinpublic trend: Solo devs shipping faster with AI',
      description:
        'Multiple tweets about productivity gains using AI coding tools. Strong sentiment for transparent AI tools.',
      url: 'https://x.com/search?q=%23buildinpublic%20AI',
      relevance: 'medium',
      opportunity:
        'Create a case study showing Coder1 productivity gains. Share on social.',
      dismissed: false,
    },
    {
      id: 'trend-006',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      source: 'github',
      title: 'Tailwind CSS v4 beta released',
      description:
        'Major rewrite with improved performance and new features. Breaking changes from v3.',
      url: 'https://github.com/tailwindlabs/tailwindcss/releases/tag/v4.0.0-beta.1',
      relevance: 'medium',
      opportunity:
        'Start testing Tailwind v4 compatibility. Create migration guide for users.',
      dismissed: false,
    },
    {
      id: 'trend-007',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
      source: 'hackernews',
      title: 'Discussion: What makes a good AI IDE?',
      description:
        'Active discussion about features developers want. Top comment mentions transparency in AI operations.',
      url: 'https://news.ycombinator.com/item?id=456789',
      relevance: 'high',
      opportunity:
        "Johnny5's transparency features directly address this! Craft a response highlighting our approach.",
      dismissed: false,
    },
    {
      id: 'trend-008',
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
      source: 'custom',
      title: 'Weekly AI Newsletter: Focus on Code Security',
      description:
        'Industry newsletter highlighting importance of AI security. Mentions prompt injection risks.',
      url: 'https://newsletter.example.com/issue-42',
      relevance: 'low',
      opportunity:
        'Write a blog post about Johnny5 security features. Pitch to newsletter.',
      dismissed: false,
    },
    {
      id: 'trend-009',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      source: 'competitor',
      title: 'Bolt.new raises Series A',
      description:
        'Competitor raises $30M for AI-powered development platform. Focus on enterprise features.',
      url: 'https://techcrunch.com/bolt-series-a',
      relevance: 'medium',
      opportunity:
        'Position Coder1 as the indie-friendly alternative. Update pricing page messaging.',
      dismissed: true,
    },
    {
      id: 'trend-010',
      timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 2 days ago
      source: 'x',
      title: '@swyx predicts AI tooling consolidation',
      description:
        'Thread about the future of AI development tools. Predicts integrated platforms will win.',
      url: 'https://x.com/swyx/status/987654321',
      relevance: 'low',
      opportunity:
        'Coder1 is already integrated! Share thread internally for strategy discussion.',
      dismissed: true,
    },
  ];
}

// ============================================================================
// Trend Monitor Service Class
// ============================================================================

class TrendMonitorService {
  private state: TrendMonitorState;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.state = {
      isMonitoring: false,
      lastChecked: null,
      alerts: generateMockAlerts(),
      config: DEFAULT_CONFIG,
      errors: [],
    };
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Get current monitoring state
   */
  getState(): TrendMonitorState {
    return { ...this.state };
  }

  /**
   * Get all alerts (optionally filtered)
   */
  getAlerts(options?: {
    source?: Johnny5TrendAlert['source'];
    relevance?: Johnny5TrendAlert['relevance'];
    includeDismissed?: boolean;
  }): Johnny5TrendAlert[] {
    let alerts = [...this.state.alerts];

    if (options?.source) {
      alerts = alerts.filter((a) => a.source === options.source);
    }

    if (options?.relevance) {
      alerts = alerts.filter((a) => a.relevance === options.relevance);
    }

    if (!options?.includeDismissed) {
      alerts = alerts.filter((a) => !a.dismissed);
    }

    // Sort by timestamp (newest first), then by relevance
    const relevanceOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => {
      const timeDiff =
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (Math.abs(timeDiff) < 1000 * 60 * 60) {
        // Within an hour, sort by relevance
        return relevanceOrder[a.relevance] - relevanceOrder[b.relevance];
      }
      return timeDiff;
    });

    return alerts;
  }

  /**
   * Get a single alert by ID
   */
  getAlert(id: string): Johnny5TrendAlert | undefined {
    return this.state.alerts.find((a) => a.id === id);
  }

  /**
   * Dismiss an alert
   */
  dismissAlert(id: string): boolean {
    const alert = this.state.alerts.find((a) => a.id === id);
    if (alert) {
      alert.dismissed = true;
      return true;
    }
    return false;
  }

  /**
   * Take action on an alert
   */
  takeAction(alertId: string, action: TrendActionType): TrendAction {
    const trendAction: TrendAction = {
      alertId,
      action,
      timestamp: new Date(),
    };

    // If action is 'ignored' or 'snoozed', dismiss the alert
    if (action === 'ignored' || action === 'snoozed') {
      this.dismissAlert(alertId);
    }

    // In a real implementation, this would:
    // - 'build': Create a task in Mission Control
    // - 'research': Queue research task for Johnny5
    // - 'ignored': Mark as not relevant
    // - 'snoozed': Temporarily hide

    return trendAction;
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(config: Partial<Johnny5TrendMonitorConfig>): void {
    this.state.config = { ...this.state.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Johnny5TrendMonitorConfig {
    return { ...this.state.config };
  }

  /**
   * Add a new topic to monitor
   */
  addMonitoredTopic(
    type: keyof Johnny5TrendMonitorConfig,
    value: string
  ): void {
    if (Array.isArray(this.state.config[type])) {
      if (!this.state.config[type].includes(value)) {
        (this.state.config[type] as string[]).push(value);
      }
    }
  }

  /**
   * Remove a monitored topic
   */
  removeMonitoredTopic(
    type: keyof Johnny5TrendMonitorConfig,
    value: string
  ): void {
    if (Array.isArray(this.state.config[type])) {
      const index = (this.state.config[type] as string[]).indexOf(value);
      if (index > -1) {
        (this.state.config[type] as string[]).splice(index, 1);
      }
    }
  }

  /**
   * Start monitoring (in real implementation, would poll APIs)
   */
  startMonitoring(): void {
    if (this.state.isMonitoring) return;

    this.state.isMonitoring = true;
    this.state.lastChecked = new Date();

    // In real implementation, this would set up polling
    console.log('[TrendMonitor] Started monitoring');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.state.isMonitoring = false;
    console.log('[TrendMonitor] Stopped monitoring');
  }

  /**
   * Manually refresh trends (fetch latest)
   */
  async refresh(): Promise<Johnny5TrendAlert[]> {
    this.state.lastChecked = new Date();

    // In real implementation, this would call external APIs
    // For now, we just return existing mock data
    console.log('[TrendMonitor] Refreshed trends');

    return this.getAlerts();
  }

  /**
   * Get statistics about alerts
   */
  getStats(): {
    total: number;
    active: number;
    dismissed: number;
    bySource: Record<Johnny5TrendAlert['source'], number>;
    byRelevance: Record<Johnny5TrendAlert['relevance'], number>;
  } {
    const alerts = this.state.alerts;
    const active = alerts.filter((a) => !a.dismissed);

    return {
      total: alerts.length,
      active: active.length,
      dismissed: alerts.length - active.length,
      bySource: {
        x: alerts.filter((a) => a.source === 'x').length,
        github: alerts.filter((a) => a.source === 'github').length,
        hackernews: alerts.filter((a) => a.source === 'hackernews').length,
        competitor: alerts.filter((a) => a.source === 'competitor').length,
        custom: alerts.filter((a) => a.source === 'custom').length,
      },
      byRelevance: {
        high: alerts.filter((a) => a.relevance === 'high').length,
        medium: alerts.filter((a) => a.relevance === 'medium').length,
        low: alerts.filter((a) => a.relevance === 'low').length,
      },
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

// Export singleton instance
export const trendMonitor = new TrendMonitorService();

// Also export the class for testing
export { TrendMonitorService };
