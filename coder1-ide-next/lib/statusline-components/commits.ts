/**
 * Commits Component
 * 
 * Commit count tracking and repository commit information
 * Based on claude-code-statusline commits.sh
 */

'use client';

// Mock logger for client-side usage
const logger = {
  debug: (...args: any[]) => console.debug('[Commits]', ...args),
  info: (...args: any[]) => console.info('[Commits]', ...args),
  warn: (...args: any[]) => console.warn('[Commits]', ...args),
  error: (...args: any[]) => console.error('[Commits]', ...args),
};

export interface CommitsData {
  totalCommits: number;
  commitsToday: number;
  commitsThisWeek: number;
  commitsThisMonth: number;
  lastCommit: {
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    date: string;
    timestamp: number;
    filesChanged: number;
  } | null;
  branchCommits: {
    ahead: number;
    behind: number;
    branch: string;
  } | null;
  commitActivity: Array<{
    date: string;
    count: number;
  }>;
}

export class CommitsComponent {
  private cachedData: CommitsData | null = null;
  private cacheExpiry = 0;
  private cacheTimeout = 30000; // 30 seconds
  private subscribers: Set<(data: CommitsData) => void> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    logger.debug('[Commits] Component initialized');
  }

  /**
   * Start automatic commit monitoring
   */
  public start(): void {
    this.update();
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update every 60 seconds (commits don't change that frequently)
    this.updateInterval = setInterval(() => {
      this.update();
    }, 60000);

    logger.debug('[Commits] Started monitoring');
  }

  /**
   * Stop automatic updates
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    logger.debug('[Commits] Stopped monitoring');
  }

  /**
   * Get commit data
   */
  public async getCommitsData(forceRefresh = false): Promise<CommitsData> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (!forceRefresh && this.cachedData && now < this.cacheExpiry) {
      return this.cachedData;
    }

    try {
      const commitsData = await this.gatherCommitsData();
      
      this.cachedData = commitsData;
      this.cacheExpiry = now + this.cacheTimeout;
      
      return commitsData;
    } catch (error) {
      logger.error('[Commits] Failed to get commits data:', error);
      
      // Return cached data or fallback
      return this.cachedData || this.createFallbackData();
    }
  }

  /**
   * Format commits info for display
   */
  public formatDisplay(template: string = '📝 {count}', data?: CommitsData): string {
    const commitsData = data || this.cachedData || this.createFallbackData();
    
    const lastCommitShort = commitsData.lastCommit?.shortHash || 'none';
    const branchStatus = commitsData.branchCommits 
      ? `${commitsData.branchCommits.ahead}↑${commitsData.branchCommits.behind}↓`
      : '';

    return template
      .replace('{count}', commitsData.totalCommits.toString())
      .replace('{total}', commitsData.totalCommits.toString())
      .replace('{today}', commitsData.commitsToday.toString())
      .replace('{week}', commitsData.commitsThisWeek.toString())
      .replace('{month}', commitsData.commitsThisMonth.toString())
      .replace('{last}', lastCommitShort)
      .replace('{hash}', lastCommitShort)
      .replace('{branch}', commitsData.branchCommits?.branch || 'unknown')
      .replace('{ahead}', commitsData.branchCommits?.ahead.toString() || '0')
      .replace('{behind}', commitsData.branchCommits?.behind.toString() || '0')
      .replace('{status}', branchStatus);
  }

  /**
   * Subscribe to commits updates
   */
  public subscribe(callback: (data: CommitsData) => void): () => void {
    this.subscribers.add(callback);
    
    // Send current data immediately if available
    if (this.cachedData) {
      try {
        callback(this.cachedData);
      } catch (error) {
        logger.error('[Commits] Immediate callback error:', error);
      }
    } else {
      // Trigger initial update
      this.update();
    }
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get commit activity for the last N days
   */
  public async getCommitActivity(days: number = 7): Promise<Array<{ date: string; count: number }>> {
    try {
      const response = await fetch(`/api/git/commit-activity?days=${days}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return data.activity || [];
      }
    } catch (error) {
      logger.error('[Commits] Failed to get commit activity:', error);
    }

    return [];
  }

  /**
   * Get commits by author
   */
  public async getCommitsByAuthor(limit: number = 10): Promise<Array<{ author: string; count: number }>> {
    try {
      const response = await fetch(`/api/git/commits-by-author?limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return data.authors || [];
      }
    } catch (error) {
      logger.error('[Commits] Failed to get commits by author:', error);
    }

    return [];
  }

  /**
   * Get recent commits
   */
  public async getRecentCommits(limit: number = 10): Promise<Array<CommitsData['lastCommit']>> {
    try {
      const response = await fetch(`/api/git/recent-commits?limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return data.commits || [];
      }
    } catch (error) {
      logger.error('[Commits] Failed to get recent commits:', error);
    }

    return [];
  }

  // Private methods

  private async update(): Promise<void> {
    try {
      const commitsData = await this.getCommitsData(true);
      this.notifySubscribers(commitsData);
    } catch (error) {
      logger.error('[Commits] Update error:', error);
    }
  }

  private async gatherCommitsData(): Promise<CommitsData> {
    // Gather all commit information in parallel
    const [
      totalCommits,
      lastCommit,
      branchInfo,
      commitCounts,
      activity
    ] = await Promise.allSettled([
      this.getTotalCommitCount(),
      this.getLastCommitInfo(),
      this.getBranchCommitInfo(),
      this.getCommitCounts(),
      this.getCommitActivity(30) // Last 30 days
    ]);

    const counts = commitCounts.status === 'fulfilled' ? commitCounts.value : { today: 0, week: 0, month: 0 };

    return {
      totalCommits: totalCommits.status === 'fulfilled' ? totalCommits.value : 0,
      commitsToday: counts.today,
      commitsThisWeek: counts.week,
      commitsThisMonth: counts.month,
      lastCommit: lastCommit.status === 'fulfilled' ? lastCommit.value : null,
      branchCommits: branchInfo.status === 'fulfilled' ? branchInfo.value : null,
      commitActivity: activity.status === 'fulfilled' ? activity.value : []
    };
  }

  private async getTotalCommitCount(): Promise<number> {
    try {
      const response = await fetch('/api/git/commit-count', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return data.count || 0;
      }
    } catch (error) {
      // Silent fail
    }

    return 0;
  }

  private async getLastCommitInfo(): Promise<CommitsData['lastCommit']> {
    try {
      const response = await fetch('/api/git/last-commit-detailed', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          hash: data.hash,
          shortHash: data.hash.substring(0, 7),
          message: data.message,
          author: data.author,
          date: data.date,
          timestamp: new Date(data.date).getTime(),
          filesChanged: data.filesChanged || 0
        };
      }
    } catch (error) {
      // Silent fail
    }

    return null;
  }

  private async getBranchCommitInfo(): Promise<CommitsData['branchCommits']> {
    try {
      const response = await fetch('/api/git/branch-commits', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          ahead: data.ahead || 0,
          behind: data.behind || 0,
          branch: data.branch || 'unknown'
        };
      }
    } catch (error) {
      // Silent fail
    }

    return null;
  }

  private async getCommitCounts(): Promise<{ today: number; week: number; month: number }> {
    try {
      const response = await fetch('/api/git/commit-counts', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          today: data.today || 0,
          week: data.week || 0,
          month: data.month || 0
        };
      }
    } catch (error) {
      // Silent fail
    }

    // Fallback: calculate from activity if available
    const activity = await this.getCommitActivity(30);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    activity.forEach(entry => {
      const entryDate = new Date(entry.date);
      
      if (entry.date === today) todayCount += entry.count;
      if (entryDate >= weekAgo) weekCount += entry.count;
      if (entryDate >= monthAgo) monthCount += entry.count;
    });

    return { today: todayCount, week: weekCount, month: monthCount };
  }

  private createFallbackData(): CommitsData {
    return {
      totalCommits: 0,
      commitsToday: 0,
      commitsThisWeek: 0,
      commitsThisMonth: 0,
      lastCommit: null,
      branchCommits: null,
      commitActivity: []
    };
  }

  private notifySubscribers(data: CommitsData): void {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('[Commits] Subscriber callback error:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stop();
    this.subscribers.clear();
    this.cachedData = null;
  }
}

// Export singleton instance
export const commitsComponent = new CommitsComponent();