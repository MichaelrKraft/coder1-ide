/**
 * Activity Tracker V2 Service
 * Phase 1 - Safe, isolated activity tracking with automatic safeguards
 * Features complete isolation, performance monitoring, and instant disable
 */

import { featureFlags, FEATURE_FLAGS } from '@/config/feature-flags';
import { safeguardMonitor } from './safeguard-monitor';
import { EventEmitter } from 'events';

export interface ActivityEvent {
  id: string;
  timestamp: number;
  type: 'file-change' | 'terminal-command' | 'api-call' | 'error' | 'navigation';
  data: any;
  sessionId?: string;
}

export interface ActivityMetrics {
  eventsTracked: number;
  memoryUsageMB: number;
  processingTimeMs: number;
  bufferSize: number;
  droppedEvents: number;
}

export class ActivityTrackerV2 extends EventEmitter {
  private static instance: ActivityTrackerV2;
  private isEnabled = false;
  private buffer: ActivityEvent[] = [];
  private maxBufferSize = 1000;
  private samplingRate = 0.1; // Start with 10% sampling
  private eventsTracked = 0;
  private droppedEvents = 0;
  private lastFlush = Date.now();
  private flushInterval = 30000; // 30 seconds
  private performanceCheckInterval: NodeJS.Timeout | null = null;
  private customListeners: Map<string, Function> = new Map();
  
  private constructor() {
    super();
  }
  
  static getInstance(): ActivityTrackerV2 {
    if (!ActivityTrackerV2.instance) {
      ActivityTrackerV2.instance = new ActivityTrackerV2();
    }
    return ActivityTrackerV2.instance;
  }
  
  /**
   * Initialize activity tracking with safety checks
   */
  async initialize(): Promise<void> {
    console.log('🎯 Initializing ActivityTrackerV2...');
    
    // Check feature flag first
    if (!featureFlags.isEnabled(FEATURE_FLAGS.ACTIVITY_TRACKING)) {
      console.log('Activity tracking disabled via feature flag');
      return;
    }
    
    // Load configuration
    const config = featureFlags.getConfig(FEATURE_FLAGS.ACTIVITY_TRACKING);
    if (config) {
      this.maxBufferSize = config.maxBufferSize || 1000;
      this.samplingRate = config.samplingRate || 0.1;
      this.flushInterval = config.flushIntervalMs || 30000;
    }
    
    // Check system health before enabling
    const health = await this.checkSystemHealth();
    if (!health.canEnable) {
      console.warn(`Cannot enable activity tracking: ${health.reason}`);
      await this.disable();
      return;
    }
    
    // Enable tracking
    this.isEnabled = true;
    this.startTracking();
    this.startPerformanceMonitoring();
    
    console.log('✅ ActivityTrackerV2 initialized successfully');
    console.log(`   Sampling rate: ${this.samplingRate * 100}%`);
    console.log(`   Max buffer size: ${this.maxBufferSize}`);
    console.log(`   Flush interval: ${this.flushInterval}ms`);
  }
  
  /**
   * Start tracking activities
   */
  private startTracking(): void {
    if (!this.isEnabled) return;
    
    // Only attach listeners if in log-only mode initially
    const config = featureFlags.getConfig(FEATURE_FLAGS.ACTIVITY_TRACKING);
    if (config?.logOnly) {
      console.log('📝 Activity tracking in LOG-ONLY mode (safe)');
    }
    
    this.attachFileChangeListener();
    this.attachTerminalListener();
    this.attachNavigationListener();
    
    // Set up periodic flush
    setInterval(() => {
      if (this.shouldFlush()) {
        this.flush();
      }
    }, 5000);
  }
  
  /**
   * Track file change events
   */
  private attachFileChangeListener(): void {
    // Listen for Monaco editor changes if available
    if (typeof window !== 'undefined') {
      const fileChangeHandler = (event: any) => {
        if (!this.shouldSample()) return;
        
        this.trackEvent({
          type: 'file-change',
          data: {
            file: event.detail?.file,
            changeType: event.detail?.changeType,
            linesChanged: event.detail?.linesChanged
          }
        });
      };
      
      window.addEventListener('monaco-file-change', fileChangeHandler);
      this.customListeners.set('file-change', fileChangeHandler);
    }
  }
  
  /**
   * Track terminal commands
   */
  private attachTerminalListener(): void {
    if (typeof window !== 'undefined') {
      const terminalHandler = (event: any) => {
        if (!this.shouldSample()) return;
        
        // Only track command execution, not output
        if (event.detail?.type === 'command') {
          this.trackEvent({
            type: 'terminal-command',
            data: {
              command: this.sanitizeCommand(event.detail?.command),
              timestamp: Date.now()
            }
          });
        }
      };
      
      window.addEventListener('terminal-command', terminalHandler);
      this.customListeners.set('terminal-command', terminalHandler);
    }
  }
  
  /**
   * Track navigation events
   */
  private attachNavigationListener(): void {
    if (typeof window !== 'undefined') {
      const navigationHandler = (event: any) => {
        if (!this.shouldSample()) return;
        
        this.trackEvent({
          type: 'navigation',
          data: {
            from: event.detail?.from,
            to: event.detail?.to
          }
        });
      };
      
      window.addEventListener('app-navigation', navigationHandler);
      this.customListeners.set('navigation', navigationHandler);
    }
  }
  
  /**
   * Track an activity event
   */
  trackEvent(event: Omit<ActivityEvent, 'id' | 'timestamp'>): void {
    if (!this.isEnabled) return;
    
    // Check buffer size
    if (this.buffer.length >= this.maxBufferSize) {
      this.droppedEvents++;
      
      // Drop oldest event
      this.buffer.shift();
    }
    
    // Add event to buffer
    const activityEvent: ActivityEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      ...event,
      sessionId: this.getCurrentSessionId()
    };
    
    this.buffer.push(activityEvent);
    this.eventsTracked++;
    
    // Emit for real-time processing if needed
    this.emit('activity', activityEvent);
    
    // Check if we should flush
    if (this.shouldFlush()) {
      this.flush();
    }
  }
  
  /**
   * Get current activity metrics
   */
  getMetrics(): ActivityMetrics {
    const memUsage = process.memoryUsage();
    
    return {
      eventsTracked: this.eventsTracked,
      memoryUsageMB: memUsage.heapUsed / 1024 / 1024,
      processingTimeMs: 0, // Will be calculated during processing
      bufferSize: this.buffer.length,
      droppedEvents: this.droppedEvents
    };
  }
  
  /**
   * Get buffered events
   */
  getBufferedEvents(): ActivityEvent[] {
    return [...this.buffer];
  }
  
  /**
   * Flush buffer to storage
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const config = featureFlags.getConfig(FEATURE_FLAGS.ACTIVITY_TRACKING);
    
    // In log-only mode, just log and clear
    if (config?.logOnly) {
      console.log(`📊 Activity buffer: ${this.buffer.length} events (log-only mode)`);
      this.buffer = [];
      this.lastFlush = Date.now();
      return;
    }
    
    // In production, would persist to storage
    try {
      // Store events (placeholder for actual implementation)
      await this.persistEvents(this.buffer);
      
      // Clear buffer after successful persistence
      this.buffer = [];
      this.lastFlush = Date.now();
      
    } catch (error) {
      console.error('Failed to flush activity buffer:', error);
      // Keep buffer for retry
    }
  }
  
  /**
   * Persist events to storage
   */
  private async persistEvents(events: ActivityEvent[]): Promise<void> {
    // Placeholder for actual persistence
    // In production, this would save to database or file system
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('activity-events') || '[]';
      const existing = JSON.parse(stored);
      existing.push(...events);
      
      // Keep only last 1000 events in localStorage
      const trimmed = existing.slice(-1000);
      localStorage.setItem('activity-events', JSON.stringify(trimmed));
    }
  }
  
  /**
   * Check if we should flush buffer
   */
  private shouldFlush(): boolean {
    const timeSinceFlush = Date.now() - this.lastFlush;
    
    return (
      this.buffer.length >= this.maxBufferSize * 0.8 || // 80% full
      timeSinceFlush >= this.flushInterval // Time threshold
    );
  }
  
  /**
   * Check if event should be sampled
   */
  private shouldSample(): boolean {
    return Math.random() < this.samplingRate;
  }
  
  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.performanceCheckInterval = setInterval(async () => {
      const health = await this.checkSystemHealth();
      
      if (!health.canEnable) {
        console.warn(`Activity tracking auto-disabled: ${health.reason}`);
        await this.disable();
      }
      
      // Report metrics to safeguard monitor
      const metrics = this.getMetrics();
      if (metrics.memoryUsageMB > 50) {
        console.warn(`Activity tracking using ${metrics.memoryUsageMB.toFixed(2)}MB memory`);
      }
      
    }, 10000); // Check every 10 seconds
  }
  
  /**
   * Check system health
   */
  private async checkSystemHealth(): Promise<{ canEnable: boolean; reason?: string }> {
    const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    const config = featureFlags.getConfig(FEATURE_FLAGS.ACTIVITY_TRACKING);
    const maxMemory = config?.maxMemoryMB || 50;
    
    if (memUsage > maxMemory) {
      return {
        canEnable: false,
        reason: `Memory usage (${memUsage.toFixed(2)}MB) exceeds limit (${maxMemory}MB)`
      };
    }
    
    // Check if safeguard monitor reports issues
    const health = safeguardMonitor.getCurrentStatus();
    if (health && health.overall === 'critical') {
      return {
        canEnable: false,
        reason: 'System health is critical'
      };
    }
    
    return { canEnable: true };
  }
  
  /**
   * Disable activity tracking
   */
  async disable(): Promise<void> {
    console.log('🛑 Disabling ActivityTrackerV2...');
    
    this.isEnabled = false;
    
    // Remove all event listeners
    this.removeAllCustomListeners();
    
    // Clear performance monitoring
    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval);
      this.performanceCheckInterval = null;
    }
    
    // Final flush attempt
    await this.flush();
    
    // Clear buffer
    this.buffer = [];
    this.eventsTracked = 0;
    this.droppedEvents = 0;
    
    console.log('✅ ActivityTrackerV2 disabled successfully');
  }
  
  /**
   * Remove all event listeners
   */
  private removeAllCustomListeners(): void {
    if (typeof window !== 'undefined') {
      for (const [event, handler] of this.customListeners.entries()) {
        window.removeEventListener(event as any, handler as any);
      }
    }
    this.customListeners.clear();
  }
  
  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Get current session ID
   */
  private getCurrentSessionId(): string | undefined {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentSessionId') || undefined;
    }
    return undefined;
  }
  
  /**
   * Sanitize command for storage
   */
  private sanitizeCommand(command: string): string {
    if (!command) return '';
    
    // Remove sensitive information like API keys, tokens, etc.
    return command
      .replace(/--api-key[= ]\S+/gi, '--api-key=***')
      .replace(/--token[= ]\S+/gi, '--token=***')
      .replace(/--password[= ]\S+/gi, '--password=***')
      .substring(0, 200); // Limit length
  }
}

// Export singleton instance
export const activityTracker = ActivityTrackerV2.getInstance();