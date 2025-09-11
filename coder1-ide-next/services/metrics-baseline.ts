/**
 * Metrics Baseline Service
 * Establishes performance baselines before any feature changes
 * Phase 0 - Zero risk, read-only monitoring
 */

import fs from 'fs/promises';
import path from 'path';

export interface BaselineMetric {
  timestamp: number;
  sessionCreationTime: number | null;
  memoryUsageMB: number;
  renderTimeMs: number | null;
  apiResponseTimeMs: number | null;
  errorCount: number;
  requestCount: number;
  activeSessionCount: number;
  cpuUsagePercent: number;
}

export interface BaselineStatistics {
  sessionCreation: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  memory: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  apiResponse: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: {
    min: number;
    max: number;
    avg: number;
  };
}

export class MetricsBaseline {
  private static instance: MetricsBaseline;
  private metrics: BaselineMetric[] = [];
  private isCollecting = false;
  private collectionInterval: NodeJS.Timeout | null = null;
  private dataDir: string;
  private maxMetricsInMemory = 1000;
  private flushThreshold = 100;
  
  // Performance tracking
  private sessionCreationTimes: number[] = [];
  private apiResponseTimes: Map<string, number[]> = new Map();
  private renderTimes: number[] = [];
  private errorCounts = { total: 0, requests: 0 };
  
  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'metrics');
  }
  
  static getInstance(): MetricsBaseline {
    if (!MetricsBaseline.instance) {
      MetricsBaseline.instance = new MetricsBaseline();
    }
    return MetricsBaseline.instance;
  }
  
  /**
   * Start collecting baseline metrics
   */
  async startCollection(intervalMs: number = 60000): Promise<void> {
    if (this.isCollecting) {
      console.log('📊 Baseline collection already running');
      return;
    }
    
    console.log('📊 Starting baseline metrics collection...');
    console.log('   This will run for 48 hours to establish performance baselines');
    console.log('   Collection interval:', intervalMs / 1000, 'seconds');
    
    this.isCollecting = true;
    
    // Ensure data directory exists
    await this.ensureDataDirectory();
    
    // Load any existing metrics
    await this.loadExistingMetrics();
    
    // Start collection
    await this.collectMetrics();
    
    // Set up interval
    this.collectionInterval = setInterval(async () => {
      await this.collectMetrics();
      
      // Flush to disk periodically
      if (this.metrics.length >= this.flushThreshold) {
        await this.flushToDisk();
      }
    }, intervalMs);
    
    // Log initial status
    this.logStatus();
  }
  
  /**
   * Stop collecting metrics
   */
  async stopCollection(): Promise<void> {
    if (!this.isCollecting) return;
    
    console.log('📊 Stopping baseline collection...');
    this.isCollecting = false;
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    
    // Final flush
    await this.flushToDisk();
    
    // Generate final report
    const stats = await this.calculateStatistics();
    await this.saveStatistics(stats);
    
    console.log('📊 Baseline collection complete');
  }
  
  /**
   * Collect current metrics snapshot
   */
  private async collectMetrics(): Promise<void> {
    const metric: BaselineMetric = {
      timestamp: Date.now(),
      sessionCreationTime: this.getRecentAverage(this.sessionCreationTimes),
      memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
      renderTimeMs: this.getRecentAverage(this.renderTimes),
      apiResponseTimeMs: this.getAverageApiResponseTime(),
      errorCount: this.errorCounts.total,
      requestCount: this.errorCounts.requests,
      activeSessionCount: await this.getActiveSessionCount(),
      cpuUsagePercent: await this.getCPUUsage()
    };
    
    this.metrics.push(metric);
    
    // Keep memory usage in check
    if (this.metrics.length > this.maxMetricsInMemory) {
      await this.flushToDisk();
    }
    
    // Reset counters
    this.errorCounts = { total: 0, requests: 0 };
  }
  
  /**
   * Track session creation time
   */
  trackSessionCreation(durationMs: number): void {
    this.sessionCreationTimes.push(durationMs);
    
    // Keep last 100 measurements
    if (this.sessionCreationTimes.length > 100) {
      this.sessionCreationTimes.shift();
    }
  }
  
  /**
   * Track API response time
   */
  trackApiResponse(endpoint: string, durationMs: number): void {
    if (!this.apiResponseTimes.has(endpoint)) {
      this.apiResponseTimes.set(endpoint, []);
    }
    
    const times = this.apiResponseTimes.get(endpoint)!;
    times.push(durationMs);
    
    // Keep last 100 per endpoint
    if (times.length > 100) {
      times.shift();
    }
  }
  
  /**
   * Track render time
   */
  trackRenderTime(durationMs: number): void {
    this.renderTimes.push(durationMs);
    
    // Keep last 100 measurements
    if (this.renderTimes.length > 100) {
      this.renderTimes.shift();
    }
  }
  
  /**
   * Track error occurrence
   */
  trackError(): void {
    this.errorCounts.total++;
  }
  
  /**
   * Track request
   */
  trackRequest(): void {
    this.errorCounts.requests++;
  }
  
  /**
   * Get current baseline statistics
   */
  async getStatistics(): Promise<BaselineStatistics | null> {
    if (this.metrics.length < 10) {
      return null; // Not enough data
    }
    
    return this.calculateStatistics();
  }
  
  /**
   * Check if we have enough baseline data
   */
  hasEnoughData(): boolean {
    // Need at least 48 hours of data (2880 minutes at 1-minute intervals)
    const minDataPoints = 48 * 60; // 48 hours * 60 minutes
    const totalDataPoints = this.metrics.length;
    
    if (totalDataPoints < minDataPoints) {
      const hoursCollected = (totalDataPoints / 60).toFixed(1);
      console.log(`📊 Baseline: ${hoursCollected}/48 hours collected (${(totalDataPoints / minDataPoints * 100).toFixed(1)}%)`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Calculate statistics from collected metrics
   */
  private async calculateStatistics(): Promise<BaselineStatistics> {
    const sessionTimes = this.metrics
      .map(m => m.sessionCreationTime)
      .filter(t => t !== null) as number[];
    
    const memoryUsages = this.metrics.map(m => m.memoryUsageMB);
    
    const apiTimes = this.metrics
      .map(m => m.apiResponseTimeMs)
      .filter(t => t !== null) as number[];
    
    const errorRates = this.metrics.map(m => 
      m.requestCount > 0 ? m.errorCount / m.requestCount : 0
    );
    
    return {
      sessionCreation: this.calculateStats(sessionTimes),
      memory: this.calculateStats(memoryUsages),
      apiResponse: this.calculateStats(apiTimes),
      errorRate: {
        min: Math.min(...errorRates),
        max: Math.max(...errorRates),
        avg: errorRates.reduce((a, b) => a + b, 0) / errorRates.length
      }
    };
  }
  
  /**
   * Calculate percentile statistics
   */
  private calculateStats(values: number[]): any {
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      p50: this.getPercentile(sorted, 50),
      p95: this.getPercentile(sorted, 95),
      p99: this.getPercentile(sorted, 99)
    };
  }
  
  /**
   * Get percentile value
   */
  private getPercentile(sorted: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  /**
   * Get recent average of measurements
   */
  private getRecentAverage(values: number[]): number | null {
    if (values.length === 0) return null;
    
    const recent = values.slice(-10); // Last 10 measurements
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }
  
  /**
   * Get average API response time across all endpoints
   */
  private getAverageApiResponseTime(): number | null {
    const allTimes: number[] = [];
    
    for (const times of this.apiResponseTimes.values()) {
      allTimes.push(...times);
    }
    
    return this.getRecentAverage(allTimes);
  }
  
  /**
   * Get active session count
   */
  private async getActiveSessionCount(): Promise<number> {
    try {
      const response = await fetch('http://localhost:3001/api/sessions');
      const data = await response.json();
      return data.sessions?.length || 0;
    } catch {
      return 0;
    }
  }
  
  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    const usage = process.cpuUsage();
    const totalTime = usage.user + usage.system;
    const seconds = totalTime / 1000000;
    const percentage = (seconds / process.uptime()) * 100;
    return Math.min(100, percentage);
  }
  
  /**
   * Ensure data directory exists
   */
  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create metrics directory:', error);
    }
  }
  
  /**
   * Load existing metrics from disk
   */
  private async loadExistingMetrics(): Promise<void> {
    try {
      const files = await fs.readdir(this.dataDir);
      const metricFiles = files.filter(f => f.startsWith('baseline-') && f.endsWith('.json'));
      
      for (const file of metricFiles) {
        const data = await fs.readFile(path.join(this.dataDir, file), 'utf8');
        const fileMetrics = JSON.parse(data);
        this.metrics.push(...fileMetrics);
      }
      
      console.log(`📊 Loaded ${this.metrics.length} existing baseline metrics`);
    } catch (error) {
      // No existing metrics, start fresh
    }
  }
  
  /**
   * Flush metrics to disk
   */
  private async flushToDisk(): Promise<void> {
    if (this.metrics.length === 0) return;
    
    const timestamp = Date.now();
    const filename = `baseline-${timestamp}.json`;
    const filepath = path.join(this.dataDir, filename);
    
    try {
      await fs.writeFile(filepath, JSON.stringify(this.metrics, null, 2));
      console.log(`📊 Flushed ${this.metrics.length} metrics to ${filename}`);
      
      // Clear memory after successful flush
      this.metrics = [];
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }
  
  /**
   * Save calculated statistics
   */
  private async saveStatistics(stats: BaselineStatistics): Promise<void> {
    const filepath = path.join(this.dataDir, 'baseline-statistics.json');
    
    try {
      await fs.writeFile(filepath, JSON.stringify(stats, null, 2));
      console.log('📊 Saved baseline statistics');
    } catch (error) {
      console.error('Failed to save statistics:', error);
    }
  }
  
  /**
   * Log current collection status
   */
  private logStatus(): void {
    const status = {
      collecting: this.isCollecting,
      metricsCollected: this.metrics.length,
      sessionMeasurements: this.sessionCreationTimes.length,
      apiEndpoints: this.apiResponseTimes.size,
      renderMeasurements: this.renderTimes.length
    };
    
    console.log('📊 Baseline collection status:', status);
  }
}

// Export singleton instance
export const metricsBaseline = MetricsBaseline.getInstance();