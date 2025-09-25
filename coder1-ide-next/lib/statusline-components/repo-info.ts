/**
 * Repository Info Component
 * 
 * Git repository status and directory information
 * Based on claude-code-statusline repo_info.sh
 */

'use client';

// Mock logger for client-side usage
const logger = {
  debug: (...args: any[]) => console.debug('[RepoInfo]', ...args),
  info: (...args: any[]) => console.info('[RepoInfo]', ...args),
  warn: (...args: any[]) => console.warn('[RepoInfo]', ...args),
  error: (...args: any[]) => console.error('[RepoInfo]', ...args),
};

export interface RepoInfo {
  directory: string;
  repositoryRoot: string | null;
  branch: string | null;
  status: 'clean' | 'dirty' | 'unknown' | 'no-repo';
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
  remote: string | null;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    timestamp: number;
  } | null;
  stashes: number;
}

export class RepoInfoComponent {
  private cachedData: RepoInfo | null = null;
  private cacheExpiry = 0;
  private cacheTimeout = 10000; // 10 seconds
  private subscribers: Set<(data: RepoInfo) => void> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    logger.debug('[RepoInfo] Component initialized');
  }

  /**
   * Start automatic repository monitoring
   */
  public start(): void {
    this.update();
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update every 15 seconds
    this.updateInterval = setInterval(() => {
      this.update();
    }, 15000);

    logger.debug('[RepoInfo] Started monitoring');
  }

  /**
   * Stop automatic updates
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    logger.debug('[RepoInfo] Stopped monitoring');
  }

  /**
   * Get current repository information
   */
  public async getRepoInfo(forceRefresh = false): Promise<RepoInfo> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (!forceRefresh && this.cachedData && now < this.cacheExpiry) {
      return this.cachedData;
    }

    try {
      const repoInfo = await this.gatherRepoInfo();
      
      this.cachedData = repoInfo;
      this.cacheExpiry = now + this.cacheTimeout;
      
      return repoInfo;
    } catch (error) {
      logger.error('[RepoInfo] Failed to get repo info:', error);
      
      // Return cached data or fallback
      return this.cachedData || this.createFallbackInfo();
    }
  }

  /**
   * Format repository info for display
   */
  public formatDisplay(template: string = '📁 {directory}', data?: RepoInfo): string {
    const repoInfo = data || this.cachedData || this.createFallbackInfo();
    
    const statusIcon = this.getStatusIcon(repoInfo.status);
    const branchInfo = repoInfo.branch 
      ? `${repoInfo.branch}${this.getBranchStatusSuffix(repoInfo)}`
      : 'no-branch';
    
    const directoryName = repoInfo.directory.split('/').pop() || repoInfo.directory;
    const shortHash = repoInfo.lastCommit?.hash.substring(0, 7) || '';

    return template
      .replace('{directory}', directoryName)
      .replace('{repo}', directoryName)
      .replace('{branch}', repoInfo.branch || 'no-branch')
      .replace('{status}', repoInfo.status)
      .replace('{statusIcon}', statusIcon)
      .replace('{branchInfo}', branchInfo)
      .replace('{ahead}', repoInfo.ahead.toString())
      .replace('{behind}', repoInfo.behind.toString())
      .replace('{staged}', repoInfo.staged.toString())
      .replace('{unstaged}', repoInfo.unstaged.toString())
      .replace('{untracked}', repoInfo.untracked.toString())
      .replace('{stashes}', repoInfo.stashes.toString())
      .replace('{hash}', shortHash)
      .replace('{remote}', repoInfo.remote || 'no-remote');
  }

  /**
   * Subscribe to repository updates
   */
  public subscribe(callback: (data: RepoInfo) => void): () => void {
    this.subscribers.add(callback);
    
    // Send current data immediately if available
    if (this.cachedData) {
      try {
        callback(this.cachedData);
      } catch (error) {
        logger.error('[RepoInfo] Immediate callback error:', error);
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
   * Check if current directory is a git repository
   */
  public async isGitRepository(): Promise<boolean> {
    try {
      const response = await fetch('/api/git/is-repo', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.isRepo === true;
      }
    } catch (error) {
      // Silent fail - API might not be available
    }

    // Fallback: check for .git directory in current path
    return typeof window !== 'undefined' && window.location.pathname !== '/';
  }

  /**
   * Get detailed git status
   */
  public async getDetailedStatus(): Promise<{
    files: Array<{ path: string; status: string; staged: boolean }>;
    summary: { staged: number; unstaged: number; untracked: number };
  } | null> {
    try {
      const response = await fetch('/api/git/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      logger.error('[RepoInfo] Failed to get detailed status:', error);
    }
    
    return null;
  }

  // Private methods

  private async update(): Promise<void> {
    try {
      const repoInfo = await this.getRepoInfo(true);
      this.notifySubscribers(repoInfo);
    } catch (error) {
      logger.error('[RepoInfo] Update error:', error);
    }
  }

  private async gatherRepoInfo(): Promise<RepoInfo> {
    const directory = await this.getCurrentDirectory();
    const isRepo = await this.isGitRepository();
    
    if (!isRepo) {
      return {
        directory,
        repositoryRoot: null,
        branch: null,
        status: 'no-repo',
        ahead: 0,
        behind: 0,
        staged: 0,
        unstaged: 0,
        untracked: 0,
        remote: null,
        lastCommit: null,
        stashes: 0
      };
    }

    // Gather git information
    const [
      repoRoot,
      branch,
      gitStatus,
      remote,
      lastCommit,
      stashCount
    ] = await Promise.allSettled([
      this.getRepositoryRoot(),
      this.getCurrentBranch(),
      this.getGitStatus(),
      this.getRemoteInfo(),
      this.getLastCommit(),
      this.getStashCount()
    ]);

    return {
      directory,
      repositoryRoot: repoRoot.status === 'fulfilled' ? repoRoot.value : null,
      branch: branch.status === 'fulfilled' ? branch.value : null,
      status: gitStatus.status === 'fulfilled' ? gitStatus.value.status : 'unknown',
      ahead: gitStatus.status === 'fulfilled' ? gitStatus.value.ahead : 0,
      behind: gitStatus.status === 'fulfilled' ? gitStatus.value.behind : 0,
      staged: gitStatus.status === 'fulfilled' ? gitStatus.value.staged : 0,
      unstaged: gitStatus.status === 'fulfilled' ? gitStatus.value.unstaged : 0,
      untracked: gitStatus.status === 'fulfilled' ? gitStatus.value.untracked : 0,
      remote: remote.status === 'fulfilled' ? remote.value : null,
      lastCommit: lastCommit.status === 'fulfilled' ? lastCommit.value : null,
      stashes: stashCount.status === 'fulfilled' ? stashCount.value : 0
    };
  }

  private async getCurrentDirectory(): Promise<string> {
    try {
      const response = await fetch('/api/git/pwd');
      if (response.ok) {
        const data = await response.json();
        return data.directory || process.cwd();
      }
    } catch (error) {
      // Silent fail
    }
    
    // Fallback to browser location or default
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    
    return '/workspace';
  }

  private async getRepositoryRoot(): Promise<string | null> {
    try {
      const response = await fetch('/api/git/root');
      if (response.ok) {
        const data = await response.json();
        return data.root;
      }
    } catch (error) {
      // Silent fail
    }
    return null;
  }

  private async getCurrentBranch(): Promise<string | null> {
    try {
      const response = await fetch('/api/git/branch');
      if (response.ok) {
        const data = await response.json();
        return data.branch;
      }
    } catch (error) {
      // Silent fail
    }
    return null;
  }

  private async getGitStatus(): Promise<{
    status: 'clean' | 'dirty';
    ahead: number;
    behind: number;
    staged: number;
    unstaged: number;
    untracked: number;
  }> {
    try {
      const response = await fetch('/api/git/detailed-status');
      if (response.ok) {
        const data = await response.json();
        
        const total = data.staged + data.unstaged + data.untracked;
        const status = total > 0 ? 'dirty' : 'clean';
        
        return {
          status,
          ahead: data.ahead || 0,
          behind: data.behind || 0,
          staged: data.staged || 0,
          unstaged: data.unstaged || 0,
          untracked: data.untracked || 0
        };
      }
    } catch (error) {
      // Silent fail
    }
    
    return {
      status: 'unknown',
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0
    };
  }

  private async getRemoteInfo(): Promise<string | null> {
    try {
      const response = await fetch('/api/git/remote');
      if (response.ok) {
        const data = await response.json();
        return data.remote;
      }
    } catch (error) {
      // Silent fail
    }
    return null;
  }

  private async getLastCommit(): Promise<RepoInfo['lastCommit']> {
    try {
      const response = await fetch('/api/git/last-commit');
      if (response.ok) {
        const data = await response.json();
        return {
          hash: data.hash,
          message: data.message,
          author: data.author,
          timestamp: new Date(data.date).getTime()
        };
      }
    } catch (error) {
      // Silent fail
    }
    return null;
  }

  private async getStashCount(): Promise<number> {
    try {
      const response = await fetch('/api/git/stash-count');
      if (response.ok) {
        const data = await response.json();
        return data.count || 0;
      }
    } catch (error) {
      // Silent fail
    }
    return 0;
  }

  private getStatusIcon(status: RepoInfo['status']): string {
    switch (status) {
      case 'clean': return '✅';
      case 'dirty': return '🔶';
      case 'no-repo': return '📁';
      default: return '❓';
    }
  }

  private getBranchStatusSuffix(info: RepoInfo): string {
    const parts = [];
    
    if (info.ahead > 0) parts.push(`↑${info.ahead}`);
    if (info.behind > 0) parts.push(`↓${info.behind}`);
    if (info.staged > 0) parts.push(`+${info.staged}`);
    if (info.unstaged > 0) parts.push(`~${info.unstaged}`);
    if (info.untracked > 0) parts.push(`?${info.untracked}`);
    
    return parts.length > 0 ? ` (${parts.join(',')})` : '';
  }

  private createFallbackInfo(): RepoInfo {
    return {
      directory: '/workspace',
      repositoryRoot: null,
      branch: null,
      status: 'unknown',
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
      remote: null,
      lastCommit: null,
      stashes: 0
    };
  }

  private notifySubscribers(data: RepoInfo): void {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('[RepoInfo] Subscriber callback error:', error);
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
export const repoInfoComponent = new RepoInfoComponent();