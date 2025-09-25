/**
 * Live Cost Component
 * 
 * Real-time billing block cost monitoring during Claude sessions
 * Based on claude-code-statusline cost_live.sh
 */

'use client';

// Mock logger for client-side usage
const logger = {
  debug: (...args: any[]) => console.debug('[CostLive]', ...args),
  info: (...args: any[]) => console.info('[CostLive]', ...args),
  warn: (...args: any[]) => console.warn('[CostLive]', ...args),
  error: (...args: any[]) => console.error('[CostLive]', ...args),
};

export interface LiveCostData {
  currentBlockCost: number;
  projectedCost: number;
  currency: string;
  blockStartTime: number;
  sessionDuration: number;
  tokensUsed: number;
  averageCostPerMinute: number;
  status: 'idle' | 'active' | 'calculating' | 'error';
  model: string;
}

export interface CostSession {
  id: string;
  startTime: number;
  endTime?: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

// Real-time pricing for cost projections
const LIVE_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4.1': { input: 0.015, output: 0.075 },
  'claude-sonnet-4': { input: 0.003, output: 0.015 },
  'claude-sonnet-3.7': { input: 0.003, output: 0.015 },
  'claude-3.5-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
  'default': { input: 0.003, output: 0.015 }
};

export class LiveCostComponent {
  private currentSession: CostSession | null = null;
  private sessions: CostSession[] = [];
  private cachedData: LiveCostData | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private subscribers: Set<(data: LiveCostData) => void> = new Set();
  private tokenCounter = { input: 0, output: 0 };
  private lastUpdateTime = 0;

  constructor() {
    this.loadSessions();
    logger.debug('[LiveCost] Component initialized');
  }

  /**
   * Start a new cost tracking session
   */
  public startSession(model: string): string {
    // End current session if exists
    if (this.currentSession) {
      this.endCurrentSession();
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      model,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0
    };

    this.tokenCounter = { input: 0, output: 0 };
    this.startLiveUpdates();
    
    logger.debug('[LiveCost] Started session:', sessionId, 'Model:', model);
    this.notifySubscribers();
    
    return sessionId;
  }

  /**
   * Add tokens to current session
   */
  public addTokens(inputTokens: number, outputTokens: number): void {
    if (!this.currentSession) {
      logger.warn('[LiveCost] No active session for token addition');
      return;
    }

    this.currentSession.inputTokens += inputTokens;
    this.currentSession.outputTokens += outputTokens;
    this.tokenCounter.input += inputTokens;
    this.tokenCounter.output += outputTokens;

    // Calculate current cost
    const pricing = LIVE_PRICING[this.currentSession.model] || LIVE_PRICING.default;
    this.currentSession.cost = 
      (this.currentSession.inputTokens / 1000 * pricing.input) +
      (this.currentSession.outputTokens / 1000 * pricing.output);

    this.lastUpdateTime = Date.now();
    this.clearCache();
    
    logger.debug('[LiveCost] Added tokens:', { inputTokens, outputTokens, totalCost: this.currentSession.cost });
    this.notifySubscribers();
  }

  /**
   * End current session
   */
  public endCurrentSession(): CostSession | null {
    if (!this.currentSession) {
      return null;
    }

    this.currentSession.endTime = Date.now();
    this.sessions.push({ ...this.currentSession });
    this.saveSessions();

    const endedSession = this.currentSession;
    this.currentSession = null;
    this.tokenCounter = { input: 0, output: 0 };
    
    this.stopLiveUpdates();
    this.clearCache();
    
    logger.debug('[LiveCost] Ended session:', endedSession.id, 'Final cost:', endedSession.cost);
    this.notifySubscribers();
    
    return endedSession;
  }

  /**
   * Get current live cost data
   */
  public getLiveCostData(): LiveCostData {
    if (this.cachedData && Date.now() - this.lastUpdateTime < 1000) {
      return this.cachedData;
    }

    if (!this.currentSession) {
      this.cachedData = {
        currentBlockCost: 0,
        projectedCost: 0,
        currency: 'USD',
        blockStartTime: 0,
        sessionDuration: 0,
        tokensUsed: 0,
        averageCostPerMinute: 0,
        status: 'idle',
        model: 'unknown'
      };
      return this.cachedData;
    }

    const now = Date.now();
    const sessionDuration = now - this.currentSession.startTime;
    const durationMinutes = sessionDuration / (1000 * 60);
    
    // Calculate projected cost based on current rate
    let projectedCost = this.currentSession.cost;
    let averageCostPerMinute = 0;
    
    if (durationMinutes > 0) {
      averageCostPerMinute = this.currentSession.cost / durationMinutes;
      
      // Project cost for next 5 minutes based on current rate
      projectedCost = this.currentSession.cost + (averageCostPerMinute * 5);
    }

    this.cachedData = {
      currentBlockCost: Math.round(this.currentSession.cost * 10000) / 10000,
      projectedCost: Math.round(projectedCost * 10000) / 10000,
      currency: 'USD',
      blockStartTime: this.currentSession.startTime,
      sessionDuration: Math.round(sessionDuration / 1000), // seconds
      tokensUsed: this.currentSession.inputTokens + this.currentSession.outputTokens,
      averageCostPerMinute: Math.round(averageCostPerMinute * 10000) / 10000,
      status: this.determineStatus(),
      model: this.currentSession.model
    };

    return this.cachedData;
  }

  /**
   * Format cost for display
   */
  public formatDisplay(template: string = '💰 {amount}', data?: LiveCostData): string {
    const costData = data || this.getLiveCostData();
    
    const currentAmount = costData.currentBlockCost < 0.01 && costData.currentBlockCost > 0
      ? '<$0.01'
      : `$${costData.currentBlockCost.toFixed(4)}`;
    
    const projectedAmount = costData.projectedCost < 0.01 && costData.projectedCost > 0
      ? '<$0.01'
      : `$${costData.projectedCost.toFixed(4)}`;

    const durationStr = this.formatDuration(costData.sessionDuration);
    
    return template
      .replace('{amount}', currentAmount)
      .replace('{current}', currentAmount)
      .replace('{projected}', projectedAmount)
      .replace('{currency}', costData.currency)
      .replace('{duration}', durationStr)
      .replace('{tokens}', costData.tokensUsed.toLocaleString())
      .replace('{rate}', `$${costData.averageCostPerMinute.toFixed(4)}/min`)
      .replace('{status}', costData.status)
      .replace('{model}', costData.model);
  }

  /**
   * Subscribe to live cost updates
   */
  public subscribe(callback: (data: LiveCostData) => void): () => void {
    this.subscribers.add(callback);
    
    // Send current data immediately
    try {
      callback(this.getLiveCostData());
    } catch (error) {
      logger.error('[LiveCost] Immediate callback error:', error);
    }
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get session history
   */
  public getSessionHistory(limit: number = 10): CostSession[] {
    return this.sessions.slice(-limit).reverse();
  }

  /**
   * Get total cost for all sessions
   */
  public getTotalCost(): number {
    const sessionsCost = this.sessions.reduce((sum, session) => sum + session.cost, 0);
    const currentCost = this.currentSession?.cost || 0;
    return sessionsCost + currentCost;
  }

  /**
   * Clear all session data
   */
  public clearHistory(): void {
    this.sessions = [];
    this.saveSessions();
    this.clearCache();
    this.notifySubscribers();
    
    logger.debug('[LiveCost] History cleared');
  }

  /**
   * Get pricing for a model
   */
  public getModelPricing(model: string): { input: number; output: number } {
    return LIVE_PRICING[model] || LIVE_PRICING.default;
  }

  // Private methods

  private startLiveUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update every 2 seconds during active session
    this.updateInterval = setInterval(() => {
      this.clearCache();
      this.notifySubscribers();
    }, 2000);
  }

  private stopLiveUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private determineStatus(): LiveCostData['status'] {
    if (!this.currentSession) return 'idle';
    
    const now = Date.now();
    const timeSinceUpdate = now - this.lastUpdateTime;
    
    if (timeSinceUpdate < 5000) return 'active';
    if (timeSinceUpdate < 30000) return 'calculating';
    
    return 'idle';
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m`;
  }

  private loadSessions(): void {
    try {
      const stored = localStorage.getItem('claude-live-cost-sessions');
      if (stored) {
        this.sessions = JSON.parse(stored);
        logger.debug('[LiveCost] Loaded sessions:', this.sessions.length);
      }
    } catch (error) {
      logger.error('[LiveCost] Failed to load sessions:', error);
      this.sessions = [];
    }
  }

  private saveSessions(): void {
    try {
      // Keep only last 50 sessions to prevent storage bloat
      const recentSessions = this.sessions.slice(-50);
      localStorage.setItem('claude-live-cost-sessions', JSON.stringify(recentSessions));
    } catch (error) {
      logger.error('[LiveCost] Failed to save sessions:', error);
    }
  }

  private clearCache(): void {
    this.cachedData = null;
  }

  private notifySubscribers(): void {
    const data = this.getLiveCostData();
    
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('[LiveCost] Subscriber callback error:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.endCurrentSession();
    this.stopLiveUpdates();
    this.subscribers.clear();
  }
}

// Export singleton instance
export const liveCostComponent = new LiveCostComponent();