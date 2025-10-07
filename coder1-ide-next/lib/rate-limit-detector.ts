import { logger } from './logger';

export interface RateLimitEvent {
  detected: boolean;
  reason: string;
  timestamp: Date;
  suggestGemini: boolean; // Suggest Gemini instead of GLM (no passport required)
  severity: 'warning' | 'error';
  pattern?: string;
}

export class RateLimitDetector {
  private rateLimitPatterns = [
    { pattern: /rate limit/i, severity: 'error' as const, description: 'Rate limit detected' },
    { pattern: /too many requests/i, severity: 'error' as const, description: 'Too many requests' },
    { pattern: /429/, severity: 'error' as const, description: 'HTTP 429 error' },
    { pattern: /quota exceeded/i, severity: 'error' as const, description: 'Quota exceeded' },
    { pattern: /limit reached/i, severity: 'error' as const, description: 'Limit reached' },
    { pattern: /overloaded/i, severity: 'warning' as const, description: 'Service overloaded' },
    { pattern: /capacity/i, severity: 'warning' as const, description: 'At capacity' },
    { pattern: /throttle/i, severity: 'warning' as const, description: 'Request throttled' }
  ];
  
  private recentDetections: RateLimitEvent[] = [];
  private detectionWindow = 60000; // 1 minute
  private maxDetectionsPerWindow = 3;
  
  /**
   * Analyze terminal output for rate limit indicators
   */
  detectRateLimit(terminalOutput: string): RateLimitEvent {
    for (const { pattern, severity, description } of this.rateLimitPatterns) {
      if (pattern.test(terminalOutput)) {
        const event: RateLimitEvent = {
          detected: true,
          reason: description,
          timestamp: new Date(),
          suggestGemini: true, // Suggest Gemini (no passport required!)
          severity,
          pattern: pattern.source
        };
        
        this.recentDetections.push(event);
        this.cleanOldDetections();
        
        logger.warn(`⚠️ Rate limit detected: ${description} (pattern: ${pattern.source})`);
        
        return event;
      }
    }
    
    return {
      detected: false,
      reason: '',
      timestamp: new Date(),
      suggestGemini: false,
      severity: 'warning'
    };
  }
  
  /**
   * Check if we're experiencing repeated rate limits (more aggressive detection)
   */
  isRepeatedRateLimit(): boolean {
    this.cleanOldDetections();
    return this.recentDetections.length >= this.maxDetectionsPerWindow;
  }
  
  /**
   * Get count of recent detections
   */
  getRecentDetectionCount(): number {
    this.cleanOldDetections();
    return this.recentDetections.length;
  }
  
  /**
   * Clear detection history
   */
  clearHistory(): void {
    this.recentDetections = [];
    logger.info('🧹 Cleared rate limit detection history');
  }
  
  /**
   * Remove detections outside the time window
   */
  private cleanOldDetections(): void {
    const now = Date.now();
    this.recentDetections = this.recentDetections.filter(
      event => now - event.timestamp.getTime() < this.detectionWindow
    );
  }
  
  /**
   * Get formatted detection summary
   */
  getDetectionSummary(): string {
    this.cleanOldDetections();
    
    if (this.recentDetections.length === 0) {
      return 'No recent rate limits detected';
    }
    
    const errors = this.recentDetections.filter(e => e.severity === 'error').length;
    const warnings = this.recentDetections.filter(e => e.severity === 'warning').length;
    
    return `${this.recentDetections.length} rate limit events (${errors} errors, ${warnings} warnings) in last minute`;
  }
  
  /**
   * Estimate cooldown time based on detection severity
   */
  estimateCooldownMinutes(): number {
    const recentCount = this.getRecentDetectionCount();
    
    if (recentCount === 0) return 0;
    if (recentCount === 1) return 5;
    if (recentCount === 2) return 10;
    return 15; // Multiple detections = longer cooldown
  }
}
