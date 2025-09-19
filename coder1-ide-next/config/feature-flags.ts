/**
 * Feature Flags Configuration
 * Central control for all enhanced features with safety thresholds
 */

export interface FeatureFlag {
  enabled: boolean;
  rolloutPercentage?: number;
  enabledUsers?: string[];
  config?: Record<string, any>;
}

export interface PerformanceThresholds {
  maxLatencyMs: number;
  maxMemoryMB: number;
  maxErrorRate: number;
  maxCPUPercent: number;
}

class FeatureFlagManager {
  private flags: Record<string, FeatureFlag> = {
    // Master switch for all enhanced features
    ENHANCED_SESSIONS: {
      enabled: false,
      rolloutPercentage: 0,
      enabledUsers: [],
      config: {
        emergencyRollback: false,
        lastRollbackReason: null,
        enabledAt: null,
        disabledAt: null
      }
    },
    
    // Phase 1: Activity tracking
    ACTIVITY_TRACKING: {
      enabled: false,
      rolloutPercentage: 0,
      config: {
        logOnly: true,
        maxMemoryMB: 50,
        samplingRate: 0.1,
        maxBufferSize: 1000,
        flushIntervalMs: 30000
      }
    },
    
    // Phase 2: Dynamic titles
    DYNAMIC_TITLES: {
      enabled: false,
      rolloutPercentage: 0,
      config: {
        fallbackEnabled: true,
        maxGenerationTimeMs: 100,
        cacheResults: true,
        updateIntervalMs: 60000
      }
    },
    
    // Phase 3: Memory panel v2
    MEMORY_PANEL_V2: {
      enabled: false,
      rolloutPercentage: 0,
      config: {
        showToggle: true,
        lazyLoad: true,
        searchIndexing: false,
        maxSearchResults: 50
      }
    }
  };
  
  private thresholds: PerformanceThresholds = {
    maxLatencyMs: 100,
    maxMemoryMB: 100,
    maxErrorRate: 0.01,
    maxCPUPercent: 50
  };
  
  /**
   * Check if a feature is enabled for a specific user
   */
  isEnabled(featureName: string, userId?: string): boolean {
    const feature = this.flags[featureName];
    if (!feature || !feature.enabled) {
      return false;
    }
    
    // Check emergency rollback
    if (this.flags.ENHANCED_SESSIONS.config?.emergencyRollback) {
      return false;
    }
    
    // Check specific user enablement
    if (userId && feature.enabledUsers?.length) {
      return feature.enabledUsers.includes(userId);
    }
    
    // Check rollout percentage
    if (feature.rolloutPercentage !== undefined && userId) {
      return this.isUserInRollout(userId, feature.rolloutPercentage);
    }
    
    return feature.enabled;
  }
  
  /**
   * Enable a feature with optional rollout percentage
   */
  async enableFeature(
    featureName: string, 
    options?: { 
      percentage?: number; 
      users?: string[];
      config?: Record<string, any>;
    }
  ): Promise<void> {
    const feature = this.flags[featureName];
    if (!feature) {
      throw new Error(`Feature ${featureName} not found`);
    }
    
    // Check system health before enabling
    const health = await this.checkSystemHealth();
    if (!health.canEnableFeatures) {
      throw new Error(`Cannot enable feature: ${health.reason}`);
    }
    
    feature.enabled = true;
    feature.rolloutPercentage = options?.percentage ?? 100;
    feature.enabledUsers = options?.users ?? [];
    feature.config = { ...feature.config, ...options?.config };
    
    // Log enablement
    this.logFeatureChange(featureName, 'enabled', options);
    
    // Update persistence
    await this.persist();
  }
  
  /**
   * Disable a feature immediately
   */
  async disableFeature(featureName: string, reason?: string): Promise<void> {
    const feature = this.flags[featureName];
    if (!feature) {
      throw new Error(`Feature ${featureName} not found`);
    }
    
    feature.enabled = false;
    feature.config = {
      ...feature.config,
      disabledAt: new Date().toISOString(),
      disableReason: reason
    };
    
    // Log disablement
    this.logFeatureChange(featureName, 'disabled', { reason });
    
    // Update persistence
    await this.persist();
  }
  
  /**
   * Emergency rollback - disable all enhanced features
   */
  async emergencyRollback(reason: string): Promise<void> {
    console.error(`🚨 EMERGENCY ROLLBACK: ${reason}`);
    
    // Disable all features
    for (const featureName of Object.keys(this.flags)) {
      this.flags[featureName].enabled = false;
    }
    
    // Set emergency flag
    this.flags.ENHANCED_SESSIONS.config = {
      ...this.flags.ENHANCED_SESSIONS.config,
      emergencyRollback: true,
      lastRollbackReason: reason,
      rollbackAt: new Date().toISOString()
    };
    
    // Persist immediately
    await this.persist();
    
    // Notify monitoring
    await this.notifyEmergencyRollback(reason);
  }
  
  /**
   * Get current feature configuration
   */
  getConfig(featureName: string): Record<string, any> | undefined {
    return this.flags[featureName]?.config;
  }
  
  /**
   * Update feature configuration
   */
  async updateConfig(featureName: string, config: Record<string, any>): Promise<void> {
    const feature = this.flags[featureName];
    if (!feature) {
      throw new Error(`Feature ${featureName} not found`);
    }
    
    feature.config = { ...feature.config, ...config };
    await this.persist();
  }
  
  /**
   * Get all feature statuses
   */
  getAllStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    
    for (const [name, flag] of Object.entries(this.flags)) {
      statuses[name] = {
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        userCount: flag.enabledUsers?.length || 0,
        config: flag.config
      };
    }
    
    return statuses;
  }
  
  /**
   * Check if user is in rollout percentage
   */
  private isUserInRollout(userId: string, percentage: number): boolean {
    // Use consistent hashing for stable assignment
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash) % 100 < percentage;
  }
  
  /**
   * Check system health before enabling features
   */
  private async checkSystemHealth(): Promise<{ canEnableFeatures: boolean; reason?: string }> {
    try {
      // Check memory usage
      const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      if (memUsage > this.thresholds.maxMemoryMB) {
        return { 
          canEnableFeatures: false, 
          reason: `Memory usage too high: ${memUsage.toFixed(2)}MB` 
        };
      }
      
      // Additional health checks can be added here
      
      return { canEnableFeatures: true };
    } catch (error) {
      return { 
        canEnableFeatures: false, 
        reason: `Health check failed: ${error}` 
      };
    }
  }
  
  /**
   * Log feature changes for audit
   */
  private logFeatureChange(
    featureName: string, 
    action: 'enabled' | 'disabled', 
    details?: any
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      feature: featureName,
      action,
      details,
      userId: 'system' // Can be enhanced to track who made the change
    };
    
    console.log(`Feature flag change:`, logEntry);
    
    // TODO: Send to monitoring service
  }
  
  /**
   * Persist feature flags to storage
   */
  private async persist(): Promise<void> {
    // For now, store in localStorage
    // In production, this would sync with a database
    if (typeof window !== 'undefined') {
      localStorage.setItem('feature-flags', JSON.stringify(this.flags));
    }
  }
  
  /**
   * Load feature flags from storage
   */
  async load(): Promise<void> {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('feature-flags');
      if (stored) {
        try {
          this.flags = JSON.parse(stored);
        } catch (error) {
          console.error('Failed to load feature flags:', error);
        }
      }
    }
  }
  
  /**
   * Notify monitoring service of emergency rollback
   */
  private async notifyEmergencyRollback(reason: string): Promise<void> {
    try {
      await fetch('/api/monitoring/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          reason,
          features: Object.keys(this.flags),
          systemState: await this.collectSystemState()
        })
      });
    } catch (error) {
      console.error('Failed to notify rollback:', error);
    }
  }
  
  /**
   * Collect current system state for monitoring
   */
  private async collectSystemState(): Promise<any> {
    return {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      features: this.getAllStatuses(),
      timestamp: Date.now()
    };
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagManager();

// Helper function for components
export function useFeatureFlag(featureName: string, userId?: string): boolean {
  return featureFlags.isEnabled(featureName, userId);
}

// Export for testing
export const FEATURE_FLAGS = {
  ENHANCED_SESSIONS: 'ENHANCED_SESSIONS',
  ACTIVITY_TRACKING: 'ACTIVITY_TRACKING',
  DYNAMIC_TITLES: 'DYNAMIC_TITLES',
  MEMORY_PANEL_V2: 'MEMORY_PANEL_V2'
} as const;

// Export thresholds for monitoring
export const PERFORMANCE_THRESHOLDS = {
  maxLatencyMs: 100,
  maxMemoryMB: 100,
  maxErrorRate: 0.01,
  maxCPUPercent: 50
} as const;