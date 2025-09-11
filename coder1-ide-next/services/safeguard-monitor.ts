/**
 * Safeguard Monitor Service
 * Monitors system health and triggers automatic rollbacks when thresholds are exceeded
 */

import { featureFlags, PERFORMANCE_THRESHOLDS } from '@/config/feature-flags';

export interface HealthMetrics {
  memoryUsageMB: number;
  cpuUsagePercent: number;
  errorRate: number;
  responseTimeMs: number;
  timestamp: number;
}

export interface HealthStatus {
  performance: 'healthy' | 'degraded' | 'critical';
  errors: 'healthy' | 'degraded' | 'critical';
  memory: 'healthy' | 'degraded' | 'critical';
  overall: 'healthy' | 'degraded' | 'critical';
  metrics: HealthMetrics;
  recommendations: string[];
}

export class SafeguardMonitor {
  private static instance: SafeguardMonitor;
  private monitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsHistory: HealthMetrics[] = [];
  private maxHistorySize = 100;
  private errorCount = 0;
  private requestCount = 0;
  private lastCheckTime = Date.now();
  
  private constructor() {}
  
  static getInstance(): SafeguardMonitor {
    if (!SafeguardMonitor.instance) {
      SafeguardMonitor.instance = new SafeguardMonitor();
    }
    return SafeguardMonitor.instance;
  }
  
  /**
   * Start monitoring system health
   */
  startMonitoring(intervalMs: number = 10000): void {
    if (this.monitoring) {
      console.log('Safeguard monitoring already active');
      return;
    }
    
    console.log('🛡️ Starting safeguard monitoring...');
    this.monitoring = true;
    
    // Initial check
    this.runHealthCheck();
    
    // Set up interval
    this.monitoringInterval = setInterval(() => {
      this.runHealthCheck();
    }, intervalMs);
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.monitoring) return;
    
    console.log('🛑 Stopping safeguard monitoring');
    this.monitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<HealthStatus> {
    const metrics = await this.collectMetrics();
    this.metricsHistory.push(metrics);
    
    // Keep history size in check
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
    
    const status: HealthStatus = {
      performance: this.checkPerformance(metrics),
      errors: this.checkErrors(metrics),
      memory: this.checkMemory(metrics),
      overall: 'healthy',
      metrics,
      recommendations: []
    };
    
    // Determine overall status
    const statuses = [status.performance, status.errors, status.memory];
    if (statuses.includes('critical')) {
      status.overall = 'critical';
    } else if (statuses.includes('degraded')) {
      status.overall = 'degraded';
    }
    
    // Generate recommendations
    status.recommendations = this.generateRecommendations(status);
    
    // Take action based on status
    await this.handleHealthStatus(status);
    
    return status;
  }
  
  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<HealthMetrics> {
    const memUsage = process.memoryUsage();
    const currentTime = Date.now();
    const timeDelta = currentTime - this.lastCheckTime;
    
    // Calculate error rate
    const errorRate = this.requestCount > 0 
      ? this.errorCount / this.requestCount 
      : 0;
    
    // Reset counters
    this.errorCount = 0;
    this.requestCount = 0;
    this.lastCheckTime = currentTime;
    
    return {
      memoryUsageMB: memUsage.heapUsed / 1024 / 1024,
      cpuUsagePercent: await this.getCPUUsage(),
      errorRate,
      responseTimeMs: await this.getAverageResponseTime(),
      timestamp: currentTime
    };
  }
  
  /**
   * Check performance metrics
   */
  private checkPerformance(metrics: HealthMetrics): 'healthy' | 'degraded' | 'critical' {
    if (metrics.responseTimeMs > PERFORMANCE_THRESHOLDS.maxLatencyMs * 2) {
      return 'critical';
    }
    if (metrics.responseTimeMs > PERFORMANCE_THRESHOLDS.maxLatencyMs) {
      return 'degraded';
    }
    return 'healthy';
  }
  
  /**
   * Check error rate
   */
  private checkErrors(metrics: HealthMetrics): 'healthy' | 'degraded' | 'critical' {
    if (metrics.errorRate > PERFORMANCE_THRESHOLDS.maxErrorRate * 2) {
      return 'critical';
    }
    if (metrics.errorRate > PERFORMANCE_THRESHOLDS.maxErrorRate) {
      return 'degraded';
    }
    return 'healthy';
  }
  
  /**
   * Check memory usage
   */
  private checkMemory(metrics: HealthMetrics): 'healthy' | 'degraded' | 'critical' {
    if (metrics.memoryUsageMB > PERFORMANCE_THRESHOLDS.maxMemoryMB * 1.5) {
      return 'critical';
    }
    if (metrics.memoryUsageMB > PERFORMANCE_THRESHOLDS.maxMemoryMB) {
      return 'degraded';
    }
    return 'healthy';
  }
  
  /**
   * Generate recommendations based on health status
   */
  private generateRecommendations(status: HealthStatus): string[] {
    const recommendations: string[] = [];
    
    if (status.memory === 'degraded') {
      recommendations.push('Consider reducing activity tracking buffer size');
      recommendations.push('Clear unused session data');
    }
    
    if (status.memory === 'critical') {
      recommendations.push('Disable activity tracking immediately');
      recommendations.push('Restart application to free memory');
    }
    
    if (status.performance === 'degraded') {
      recommendations.push('Reduce feature rollout percentage');
      recommendations.push('Disable non-essential features');
    }
    
    if (status.errors === 'degraded') {
      recommendations.push('Check error logs for patterns');
      recommendations.push('Consider rolling back recent changes');
    }
    
    return recommendations;
  }
  
  /**
   * Handle health status and trigger actions
   */
  private async handleHealthStatus(status: HealthStatus): Promise<void> {
    // Log status
    console.log(`Health check: ${status.overall}`, {
      memory: `${status.metrics.memoryUsageMB.toFixed(2)}MB`,
      cpu: `${status.metrics.cpuUsagePercent.toFixed(1)}%`,
      errors: `${(status.metrics.errorRate * 100).toFixed(2)}%`,
      latency: `${status.metrics.responseTimeMs.toFixed(0)}ms`
    });
    
    // Take action based on severity
    if (status.overall === 'critical') {
      await this.triggerRollback('Critical health status detected', status);
    } else if (status.overall === 'degraded') {
      await this.reduceFeatures(status);
    }
  }
  
  /**
   * Trigger emergency rollback
   */
  private async triggerRollback(reason: string, status: HealthStatus): Promise<void> {
    console.error(`🚨 TRIGGERING ROLLBACK: ${reason}`);
    
    // Disable all enhanced features
    await featureFlags.emergencyRollback(reason);
    
    // Notify monitoring
    await this.notifyOps({
      event: 'rollback',
      reason,
      status,
      timestamp: new Date().toISOString()
    });
    
    // Clear any cached data
    await this.clearEnhancedData();
  }
  
  /**
   * Reduce feature enablement when degraded
   */
  private async reduceFeatures(status: HealthStatus): Promise<void> {
    console.warn('⚠️ Reducing feature enablement due to degraded health');
    
    // Get current configurations
    const activityConfig = featureFlags.getConfig('ACTIVITY_TRACKING');
    
    if (activityConfig) {
      // Reduce sampling rate
      const newSamplingRate = Math.max(0.01, (activityConfig.samplingRate || 0.1) * 0.5);
      await featureFlags.updateConfig('ACTIVITY_TRACKING', {
        samplingRate: newSamplingRate
      });
      
      console.log(`Reduced activity tracking sampling to ${newSamplingRate * 100}%`);
    }
  }
  
  /**
   * Track error occurrence
   */
  trackError(): void {
    this.errorCount++;
    this.requestCount++;
  }
  
  /**
   * Track successful request
   */
  trackRequest(): void {
    this.requestCount++;
  }
  
  /**
   * Get current health status without running full check
   */
  getCurrentStatus(): HealthStatus | null {
    if (this.metricsHistory.length === 0) {
      return null;
    }
    
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    
    return {
      performance: this.checkPerformance(latestMetrics),
      errors: this.checkErrors(latestMetrics),
      memory: this.checkMemory(latestMetrics),
      overall: 'healthy', // Simplified for quick check
      metrics: latestMetrics,
      recommendations: []
    };
  }
  
  /**
   * Get metrics history for analysis
   */
  getMetricsHistory(): HealthMetrics[] {
    return [...this.metricsHistory];
  }
  
  /**
   * Clear enhanced feature data
   */
  private async clearEnhancedData(): Promise<void> {
    try {
      // Clear activity tracking data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('activity-tracker-buffer');
        localStorage.removeItem('enhanced-sessions-cache');
      }
      
      console.log('Cleared enhanced feature data');
    } catch (error) {
      console.error('Failed to clear enhanced data:', error);
    }
  }
  
  /**
   * Notify operations team
   */
  private async notifyOps(notification: any): Promise<void> {
    try {
      await fetch('/api/monitoring/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
    } catch (error) {
      console.error('Failed to notify ops:', error);
    }
  }
  
  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    // Simplified CPU calculation
    // In production, use proper CPU monitoring
    const cpuUsage = process.cpuUsage();
    const totalTime = cpuUsage.user + cpuUsage.system;
    const seconds = totalTime / 1000000; // Convert to seconds
    const percentage = (seconds / process.uptime()) * 100;
    
    return Math.min(100, percentage);
  }
  
  /**
   * Get average response time from recent requests
   */
  private async getAverageResponseTime(): Promise<number> {
    // This would integrate with actual request tracking
    // For now, return a simulated value
    return 50 + Math.random() * 50; // 50-100ms
  }
}

// Export singleton instance
export const safeguardMonitor = SafeguardMonitor.getInstance();