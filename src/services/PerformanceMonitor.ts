export interface PerformanceMetrics {
  id: string;
  workspaceId: string;
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  buildTime?: number;
  testExecutionTime?: number;
  bundleSize?: number;
  renderTime?: number;
}

export interface PerformanceAlert {
  id: string;
  workspaceId: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'build' | 'bundle_size';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceThresholds {
  cpu: number;
  memory: number;
  disk: number;
  networkLatency: number;
  buildTime: number;
  bundleSize: number;
  renderTime: number;
}

export interface PerformanceReport {
  workspaceId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  startTime: Date;
  endTime: Date;
  metrics: PerformanceMetrics[];
  alerts: PerformanceAlert[];
  summary: PerformanceSummary;
  recommendations: string[];
}

export interface PerformanceSummary {
  averageCpuUsage: number;
  averageMemoryUsage: number;
  averageBuildTime: number;
  totalAlerts: number;
  criticalAlerts: number;
  performanceScore: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private alerts: Map<string, PerformanceAlert[]> = new Map();
  private thresholds: PerformanceThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(thresholds: PerformanceThresholds = {
    cpu: 80,
    memory: 85,
    disk: 90,
    networkLatency: 1000,
    buildTime: 30000,
    bundleSize: 5000000,
    renderTime: 100
  }) {
    this.thresholds = thresholds;
  }

  async startMonitoring(workspaceId: string, intervalMs: number = 5000): Promise<void> {
    if (this.monitoringIntervals.has(workspaceId)) {
      console.warn(`Performance monitoring is already running for workspace ${workspaceId}`);
      return;
    }

    const interval = setInterval(() => {
      this.collectMetrics(workspaceId);
    }, intervalMs);

    this.monitoringIntervals.set(workspaceId, interval);
    console.log(`Performance monitoring started for workspace ${workspaceId}`);
  }

  async stopMonitoring(workspaceId: string): Promise<void> {
    const interval = this.monitoringIntervals.get(workspaceId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(workspaceId);
    }
    console.log(`Performance monitoring stopped for workspace ${workspaceId}`);
  }

  private async collectMetrics(workspaceId: string): Promise<void> {
    try {
      const metrics: PerformanceMetrics = {
        id: this.generateMetricId(),
        workspaceId,
        timestamp: new Date(),
        cpuUsage: await this.getCpuUsage(),
        memoryUsage: await this.getMemoryUsage(),
        diskUsage: await this.getDiskUsage(),
        networkLatency: await this.getNetworkLatency()
      };

      this.storeMetrics(workspaceId, metrics);
      this.checkThresholds(workspaceId, metrics);
    } catch (error) {
      console.error('Error collecting performance metrics:', error);
    }
  }

  private async getCpuUsage(): Promise<number> {
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const usage = process.cpuUsage();
      return Math.round((usage.user + usage.system) / 1000000 * 100) / 100;
    }
    return Math.random() * 100;
  }

  private async getMemoryUsage(): Promise<number> {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return Math.round((usage.heapUsed / usage.heapTotal) * 100);
    }
    return Math.random() * 100;
  }

  private async getDiskUsage(): Promise<number> {
    return Math.random() * 100;
  }

  private async getNetworkLatency(): Promise<number> {
    const start = Date.now();
    try {
      await fetch('http://localhost:3000/health', { 
        method: 'HEAD',
        timeout: 5000 
      } as any);
      return Date.now() - start;
    } catch {
      return 1000;
    }
  }

  async measureBuildTime(workspaceId: string, buildFunction: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    
    try {
      await buildFunction();
      const buildTime = Date.now() - startTime;
      
      this.updateMetricValue(workspaceId, 'buildTime', buildTime);
      this.checkBuildTimeThreshold(workspaceId, buildTime);
      
      return buildTime;
    } catch (error) {
      console.error('Build failed:', error);
      throw error;
    }
  }

  async measureTestExecutionTime(workspaceId: string, testFunction: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    
    try {
      await testFunction();
      const executionTime = Date.now() - startTime;
      
      this.updateMetricValue(workspaceId, 'testExecutionTime', executionTime);
      
      return executionTime;
    } catch (error) {
      console.error('Test execution failed:', error);
      throw error;
    }
  }

  measureBundleSize(workspaceId: string, bundleSize: number): void {
    this.updateMetricValue(workspaceId, 'bundleSize', bundleSize);
    this.checkBundleSizeThreshold(workspaceId, bundleSize);
  }

  measureRenderTime(workspaceId: string, renderTime: number): void {
    this.updateMetricValue(workspaceId, 'renderTime', renderTime);
    this.checkRenderTimeThreshold(workspaceId, renderTime);
  }

  private storeMetrics(workspaceId: string, metrics: PerformanceMetrics): void {
    if (!this.metrics.has(workspaceId)) {
      this.metrics.set(workspaceId, []);
    }
    
    const workspaceMetrics = this.metrics.get(workspaceId)!;
    workspaceMetrics.push(metrics);
    
    if (workspaceMetrics.length > 1000) {
      workspaceMetrics.splice(0, workspaceMetrics.length - 1000);
    }
  }

  private updateMetricValue(workspaceId: string, field: keyof PerformanceMetrics, value: number): void {
    const workspaceMetrics = this.metrics.get(workspaceId);
    if (workspaceMetrics && workspaceMetrics.length > 0) {
      const latestMetric = workspaceMetrics[workspaceMetrics.length - 1];
      (latestMetric as any)[field] = value;
    }
  }

  private checkThresholds(workspaceId: string, metrics: PerformanceMetrics): void {
    this.checkCpuThreshold(workspaceId, metrics.cpuUsage);
    this.checkMemoryThreshold(workspaceId, metrics.memoryUsage);
    this.checkDiskThreshold(workspaceId, metrics.diskUsage);
    this.checkNetworkLatencyThreshold(workspaceId, metrics.networkLatency);
  }

  private checkCpuThreshold(workspaceId: string, cpuUsage: number): void {
    if (cpuUsage > this.thresholds.cpu) {
      this.createAlert(workspaceId, {
        type: 'cpu',
        severity: cpuUsage > 95 ? 'critical' : cpuUsage > 90 ? 'high' : 'medium',
        message: `High CPU usage detected: ${cpuUsage.toFixed(1)}%`,
        threshold: this.thresholds.cpu,
        currentValue: cpuUsage
      });
    }
  }

  private checkMemoryThreshold(workspaceId: string, memoryUsage: number): void {
    if (memoryUsage > this.thresholds.memory) {
      this.createAlert(workspaceId, {
        type: 'memory',
        severity: memoryUsage > 95 ? 'critical' : memoryUsage > 90 ? 'high' : 'medium',
        message: `High memory usage detected: ${memoryUsage.toFixed(1)}%`,
        threshold: this.thresholds.memory,
        currentValue: memoryUsage
      });
    }
  }

  private checkDiskThreshold(workspaceId: string, diskUsage: number): void {
    if (diskUsage > this.thresholds.disk) {
      this.createAlert(workspaceId, {
        type: 'disk',
        severity: diskUsage > 98 ? 'critical' : diskUsage > 95 ? 'high' : 'medium',
        message: `High disk usage detected: ${diskUsage.toFixed(1)}%`,
        threshold: this.thresholds.disk,
        currentValue: diskUsage
      });
    }
  }

  private checkNetworkLatencyThreshold(workspaceId: string, networkLatency: number): void {
    if (networkLatency > this.thresholds.networkLatency) {
      this.createAlert(workspaceId, {
        type: 'network',
        severity: networkLatency > 5000 ? 'critical' : networkLatency > 3000 ? 'high' : 'medium',
        message: `High network latency detected: ${networkLatency}ms`,
        threshold: this.thresholds.networkLatency,
        currentValue: networkLatency
      });
    }
  }

  private checkBuildTimeThreshold(workspaceId: string, buildTime: number): void {
    if (buildTime > this.thresholds.buildTime) {
      this.createAlert(workspaceId, {
        type: 'build',
        severity: buildTime > 120000 ? 'critical' : buildTime > 60000 ? 'high' : 'medium',
        message: `Slow build time detected: ${(buildTime / 1000).toFixed(1)}s`,
        threshold: this.thresholds.buildTime,
        currentValue: buildTime
      });
    }
  }

  private checkBundleSizeThreshold(workspaceId: string, bundleSize: number): void {
    if (bundleSize > this.thresholds.bundleSize) {
      this.createAlert(workspaceId, {
        type: 'bundle_size',
        severity: bundleSize > 10000000 ? 'critical' : bundleSize > 7500000 ? 'high' : 'medium',
        message: `Large bundle size detected: ${(bundleSize / 1000000).toFixed(1)}MB`,
        threshold: this.thresholds.bundleSize,
        currentValue: bundleSize
      });
    }
  }

  private checkRenderTimeThreshold(workspaceId: string, renderTime: number): void {
    if (renderTime > this.thresholds.renderTime) {
      this.createAlert(workspaceId, {
        type: 'bundle_size',
        severity: renderTime > 500 ? 'critical' : renderTime > 300 ? 'high' : 'medium',
        message: `Slow render time detected: ${renderTime}ms`,
        threshold: this.thresholds.renderTime,
        currentValue: renderTime
      });
    }
  }

  private createAlert(workspaceId: string, alertData: Omit<PerformanceAlert, 'id' | 'workspaceId' | 'timestamp' | 'resolved'>): void {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      workspaceId,
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    if (!this.alerts.has(workspaceId)) {
      this.alerts.set(workspaceId, []);
    }

    this.alerts.get(workspaceId)!.push(alert);
    console.warn(`Performance Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);
  }

  generateReport(workspaceId: string, period: PerformanceReport['period'] = 'day'): PerformanceReport {
    const endTime = new Date();
    const startTime = new Date();
    
    switch (period) {
      case 'hour':
        startTime.setHours(startTime.getHours() - 1);
        break;
      case 'day':
        startTime.setDate(startTime.getDate() - 1);
        break;
      case 'week':
        startTime.setDate(startTime.getDate() - 7);
        break;
      case 'month':
        startTime.setMonth(startTime.getMonth() - 1);
        break;
    }

    const metrics = this.getMetricsInRange(workspaceId, startTime, endTime);
    const alerts = this.getAlertsInRange(workspaceId, startTime, endTime);
    const summary = this.generateSummary(metrics, alerts);
    const recommendations = this.generateRecommendations(summary, alerts);

    return {
      workspaceId,
      period,
      startTime,
      endTime,
      metrics,
      alerts,
      summary,
      recommendations
    };
  }

  private getMetricsInRange(workspaceId: string, startTime: Date, endTime: Date): PerformanceMetrics[] {
    const workspaceMetrics = this.metrics.get(workspaceId) || [];
    return workspaceMetrics.filter(metric => 
      metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  private getAlertsInRange(workspaceId: string, startTime: Date, endTime: Date): PerformanceAlert[] {
    const workspaceAlerts = this.alerts.get(workspaceId) || [];
    return workspaceAlerts.filter(alert => 
      alert.timestamp >= startTime && alert.timestamp <= endTime
    );
  }

  private generateSummary(metrics: PerformanceMetrics[], alerts: PerformanceAlert[]): PerformanceSummary {
    if (metrics.length === 0) {
      return {
        averageCpuUsage: 0,
        averageMemoryUsage: 0,
        averageBuildTime: 0,
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        performanceScore: 100,
        trend: 'stable'
      };
    }

    const averageCpuUsage = metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length;
    const averageMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
    const buildTimes = metrics.filter(m => m.buildTime).map(m => m.buildTime!);
    const averageBuildTime = buildTimes.length > 0 ? buildTimes.reduce((sum, t) => sum + t, 0) / buildTimes.length : 0;

    const performanceScore = this.calculatePerformanceScore(averageCpuUsage, averageMemoryUsage, alerts.length);
    const trend = this.calculateTrend(metrics);

    return {
      averageCpuUsage,
      averageMemoryUsage,
      averageBuildTime,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      performanceScore,
      trend
    };
  }

  private calculatePerformanceScore(cpuUsage: number, memoryUsage: number, alertCount: number): number {
    let score = 100;
    
    score -= Math.max(0, cpuUsage - 50) * 0.5;
    score -= Math.max(0, memoryUsage - 50) * 0.5;
    score -= alertCount * 5;
    
    return Math.max(0, Math.round(score));
  }

  private calculateTrend(metrics: PerformanceMetrics[]): 'improving' | 'stable' | 'degrading' {
    if (metrics.length < 10) return 'stable';
    
    const recent = metrics.slice(-5);
    const older = metrics.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, m) => sum + m.cpuUsage + m.memoryUsage, 0) / (recent.length * 2);
    const olderAvg = older.reduce((sum, m) => sum + m.cpuUsage + m.memoryUsage, 0) / (older.length * 2);
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 5) return 'degrading';
    if (difference < -5) return 'improving';
    return 'stable';
  }

  private generateRecommendations(summary: PerformanceSummary, alerts: PerformanceAlert[]): string[] {
    const recommendations: string[] = [];
    
    if (summary.averageCpuUsage > 70) {
      recommendations.push('Consider optimizing CPU-intensive operations or upgrading hardware');
    }
    
    if (summary.averageMemoryUsage > 80) {
      recommendations.push('Review memory usage patterns and consider implementing memory optimization');
    }
    
    if (summary.averageBuildTime > 30000) {
      recommendations.push('Optimize build process by implementing incremental builds or caching');
    }
    
    if (alerts.some(a => a.type === 'bundle_size')) {
      recommendations.push('Consider code splitting and lazy loading to reduce bundle size');
    }
    
    if (summary.criticalAlerts > 0) {
      recommendations.push('Address critical performance issues immediately');
    }
    
    if (summary.trend === 'degrading') {
      recommendations.push('Performance is degrading - investigate recent changes and optimize');
    }
    
    return recommendations;
  }

  getMetrics(workspaceId: string, limit: number = 100): PerformanceMetrics[] {
    const workspaceMetrics = this.metrics.get(workspaceId) || [];
    return workspaceMetrics.slice(-limit);
  }

  getAlerts(workspaceId: string, resolved: boolean = false): PerformanceAlert[] {
    const workspaceAlerts = this.alerts.get(workspaceId) || [];
    return workspaceAlerts.filter(alert => alert.resolved === resolved);
  }

  resolveAlert(alertId: string): boolean {
    this.alerts.forEach((alerts) => {
      const alert = alerts.find((a: PerformanceAlert) => a.id === alertId);
      if (alert) {
        alert.resolved = true;
        return true;
      }
    });
    return false;
  }

  isMonitoring(workspaceId: string): boolean {
    return this.monitoringIntervals.has(workspaceId);
  }

  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  clearMetrics(workspaceId?: string): void {
    if (workspaceId) {
      this.metrics.delete(workspaceId);
      this.alerts.delete(workspaceId);
    } else {
      this.metrics.clear();
      this.alerts.clear();
    }
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isMonitoringActive(): boolean {
    return this.monitoringIntervals.size > 0;
  }
}
