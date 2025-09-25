/**
 * Token Usage Tracking Service
 * Monitors Claude Code CLI usage and tracks token consumption
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';

interface TokenUsageSnapshot {
  timestamp: string;
  tokens: number;
  command?: string;
  sessionId?: string;
  responseSize?: number;
}

interface DailyUsageData {
  date: string;
  snapshots: TokenUsageSnapshot[];
  totalTokens: number;
  totalCost: number;
  sessions: number;
  commands: Record<string, number>;
  peakBurnRate: number;
  averageBurnRate: number;
  codingTime: number; // in minutes
  linesWritten: number;
  tasksCompleted: number;
}

export class TokenTracker extends EventEmitter {
  private static instance: TokenTracker;
  private dataDir: string;
  private currentDay: string;
  private dailyData: DailyUsageData | null = null;
  private sessionStartTime: Map<string, number> = new Map();
  private lastSnapshot: TokenUsageSnapshot | null = null;

  private constructor() {
    super();
    this.dataDir = path.join(process.cwd(), 'data', 'usage');
    this.currentDay = new Date().toISOString().split('T')[0];
    this.initialize();
  }

  static getInstance(): TokenTracker {
    if (!TokenTracker.instance) {
      TokenTracker.instance = new TokenTracker();
    }
    return TokenTracker.instance;
  }

  private async initialize() {
    // Ensure data directory exists
    await fs.mkdir(this.dataDir, { recursive: true });
    
    // Load today's data
    await this.loadDailyData();
    
    // Set up daily rollover
    this.scheduleDailyRollover();
  }

  private async loadDailyData() {
    const filePath = path.join(this.dataDir, `${this.currentDay}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.dailyData = JSON.parse(content);
    } catch (error) {
      // Initialize new daily data
      this.dailyData = {
        date: this.currentDay,
        snapshots: [],
        totalTokens: 0,
        totalCost: 0,
        sessions: 0,
        commands: {},
        peakBurnRate: 0,
        averageBurnRate: 0,
        codingTime: 0,
        linesWritten: 0,
        tasksCompleted: 0
      };
    }
  }

  private async saveDailyData() {
    if (!this.dailyData) return;
    
    const filePath = path.join(this.dataDir, `${this.currentDay}.json`);
    await fs.writeFile(filePath, JSON.stringify(this.dailyData, null, 2));
  }

  private scheduleDailyRollover() {
    // Calculate time until midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    
    setTimeout(() => {
      this.rolloverDaily();
      // Schedule next rollover
      setInterval(() => this.rolloverDaily(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  private async rolloverDaily() {
    // Save current day's data
    await this.saveDailyData();
    
    // Reset for new day
    this.currentDay = new Date().toISOString().split('T')[0];
    this.dailyData = {
      date: this.currentDay,
      snapshots: [],
      totalTokens: 0,
      totalCost: 0,
      sessions: 0,
      commands: {},
      peakBurnRate: 0,
      averageBurnRate: 0,
      codingTime: 0,
      linesWritten: 0,
      tasksCompleted: 0
    };
    
    logger.info('Daily token usage rolled over');
  }

  /**
   * Track a Claude Code command execution
   */
  async trackCommand(command: string, sessionId: string, estimatedTokens?: number) {
    if (!this.dailyData) await this.loadDailyData();
    
    // Estimate tokens if not provided (rough approximation)
    const tokens = estimatedTokens || this.estimateTokens(command);
    
    // Create snapshot
    const snapshot: TokenUsageSnapshot = {
      timestamp: new Date().toISOString(),
      tokens,
      command: command.substring(0, 100), // Truncate for storage
      sessionId
    };
    
    // Update daily data
    this.dailyData!.snapshots.push(snapshot);
    this.dailyData!.totalTokens += tokens;
    this.dailyData!.totalCost = this.calculateCost(this.dailyData!.totalTokens);
    
    // Track command frequency
    const cmdType = this.extractCommandType(command);
    this.dailyData!.commands[cmdType] = (this.dailyData!.commands[cmdType] || 0) + 1;
    
    // Calculate burn rate
    if (this.lastSnapshot) {
      const timeDiff = Date.now() - new Date(this.lastSnapshot.timestamp).getTime();
      const burnRate = (tokens / (timeDiff / 60000)); // tokens per minute
      
      if (burnRate > this.dailyData!.peakBurnRate) {
        this.dailyData!.peakBurnRate = burnRate;
      }
      
      // Update average burn rate
      const totalBurnRates = this.dailyData!.snapshots.length > 1 
        ? this.dailyData!.averageBurnRate * (this.dailyData!.snapshots.length - 1) + burnRate
        : burnRate;
      this.dailyData!.averageBurnRate = totalBurnRates / this.dailyData!.snapshots.length;
    }
    
    this.lastSnapshot = snapshot;
    
    // Track session
    if (!this.sessionStartTime.has(sessionId)) {
      this.sessionStartTime.set(sessionId, Date.now());
      this.dailyData!.sessions++;
    }
    
    // Save data
    await this.saveDailyData();
    
    // Emit event for real-time updates
    this.emit('usage-updated', {
      totalTokens: this.dailyData!.totalTokens,
      totalCost: this.dailyData!.totalCost,
      burnRate: this.dailyData!.averageBurnRate
    });
    
    logger.debug(`Tracked command: ${cmdType}, Tokens: ${tokens}, Total: ${this.dailyData!.totalTokens}`);
  }

  /**
   * Track a response from Claude
   */
  async trackResponse(responseSize: number, sessionId: string) {
    // Estimate tokens from response size (rough: 1 token ≈ 4 chars)
    const tokens = Math.ceil(responseSize / 4);
    await this.trackCommand('response', sessionId, tokens);
  }

  /**
   * Update coding metrics
   */
  async updateCodingMetrics(metrics: {
    linesWritten?: number;
    tasksCompleted?: number;
    codingTimeMinutes?: number;
  }) {
    if (!this.dailyData) await this.loadDailyData();
    
    if (metrics.linesWritten !== undefined) {
      this.dailyData!.linesWritten += metrics.linesWritten;
    }
    
    if (metrics.tasksCompleted !== undefined) {
      this.dailyData!.tasksCompleted += metrics.tasksCompleted;
    }
    
    if (metrics.codingTimeMinutes !== undefined) {
      this.dailyData!.codingTime += metrics.codingTimeMinutes;
    }
    
    await this.saveDailyData();
    
    this.emit('metrics-updated', {
      linesWritten: this.dailyData!.linesWritten,
      tasksCompleted: this.dailyData!.tasksCompleted,
      codingTime: this.dailyData!.codingTime
    });
  }

  /**
   * Get current usage data
   */
  async getCurrentUsage(): Promise<DailyUsageData | null> {
    if (!this.dailyData) await this.loadDailyData();
    return this.dailyData;
  }

  /**
   * Get weekly usage data
   */
  async getWeeklyUsage(): Promise<DailyUsageData[]> {
    const weekData: DailyUsageData[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const filePath = path.join(this.dataDir, `${dateStr}.json`);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        weekData.push(JSON.parse(content));
      } catch (error) {
        // Day doesn't exist, add empty data
        weekData.push({
          date: dateStr,
          snapshots: [],
          totalTokens: 0,
          totalCost: 0,
          sessions: 0,
          commands: {},
          peakBurnRate: 0,
          averageBurnRate: 0,
          codingTime: 0,
          linesWritten: 0,
          tasksCompleted: 0
        });
      }
    }
    
    return weekData.reverse();
  }

  /**
   * Calculate session duration
   */
  getSessionDuration(sessionId: string): number {
    const startTime = this.sessionStartTime.get(sessionId);
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 60000); // in minutes
  }

  /**
   * End a session and update coding time
   */
  async endSession(sessionId: string) {
    const duration = this.getSessionDuration(sessionId);
    if (duration > 0) {
      await this.updateCodingMetrics({ codingTimeMinutes: duration });
      this.sessionStartTime.delete(sessionId);
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private calculateCost(tokens: number): number {
    // Claude 3.5 Sonnet pricing: $3 per million input tokens, $15 per million output tokens
    // Using average of $9 per million tokens for simplicity
    return (tokens / 1000000) * 9;
  }

  private extractCommandType(command: string): string {
    // Extract the main command type
    if (command.startsWith('claude ')) {
      const parts = command.substring(7).split(' ');
      return `claude ${parts[0]}`;
    }
    return command.split(' ')[0];
  }
}

// Export singleton instance
export const tokenTracker = TokenTracker.getInstance();