/**
 * Claude Code Enhanced Statusline Service
 * 
 * Inspired by claude-code-statusline (github.com/rz1989s/claude-code-statusline)
 * Provides professional-grade statusline with modular components
 * 
 * SAFETY FEATURES:
 * - Feature flags for each component
 * - Layout measurement and validation
 * - Non-blocking updates with fallbacks
 * - Complete isolation from existing terminal UI
 */

'use client';

import { logger } from './logger';

// Component Types
export type StatuslineComponent = 
  | 'model_info'
  | 'cost_live' 
  | 'cost_daily'
  | 'time_display'
  | 'repo_info'
  | 'commits'
  | 'mcp_status';

// Feature Flag Configuration
export interface StatuslineFeatureFlags {
  enabled: boolean;
  components: {
    model_info: boolean;
    cost_live: boolean;
    cost_daily: boolean;
    time_display: boolean;
    repo_info: boolean;
    commits: boolean;
    mcp_status: boolean;
  };
  shadowMode: boolean;  // Hidden display for testing
  performanceMode: boolean;  // Reduced update frequency
}

// Component Configuration
export interface StatuslineConfig {
  updateInterval: number;  // ms between updates
  maxUpdateTime: number;   // max time per update (50ms target)
  components: {
    [K in StatuslineComponent]: {
      enabled: boolean;
      position: number;  // Display order
      format: string;    // Display format template
    };
  };
  layout: {
    height: number;      // 40px to match existing
    position: 'relative' | 'absolute';
    zIndex: number;      // 10 (below dropdowns)
  };
}

// Component Data Interface
export interface ComponentData {
  component: StatuslineComponent;
  data: any;
  timestamp: number;
  error?: string;
  cached?: boolean;
}

// Layout Measurement Interface
export interface LayoutMeasurement {
  terminalHeight: number;
  statuslineHeight: number;
  scrollableArea: number;
  dropdownPositions: DOMRect | null;
  timestamp: number;
}

class ClaudeStatuslineService {
  private static instance: ClaudeStatuslineService;
  private config: StatuslineConfig;
  private featureFlags: StatuslineFeatureFlags;
  private componentData: Map<StatuslineComponent, ComponentData>;
  private updateInterval: NodeJS.Timeout | null = null;
  private layoutBaseline: LayoutMeasurement | null = null;
  private subscribers: Set<(data: ComponentData) => void> = new Set();

  private constructor() {
    this.componentData = new Map();
    
    // Default configuration - all components disabled initially for safety
    this.featureFlags = {
      enabled: false,  // Master switch
      shadowMode: true,  // Start in shadow mode
      performanceMode: false,
      components: {
        model_info: false,
        cost_live: false,
        cost_daily: false,
        time_display: false,
        repo_info: false,
        commits: false,
        mcp_status: false,
      }
    };

    this.config = {
      updateInterval: 5000,  // 5 seconds
      maxUpdateTime: 50,     // 50ms target
      components: {
        model_info: { enabled: false, position: 1, format: '{icon} {name}' },
        cost_live: { enabled: false, position: 2, format: '💰 {amount}' },
        cost_daily: { enabled: false, position: 3, format: '📊 ${daily}' },
        time_display: { enabled: false, position: 4, format: '{time}' },
        repo_info: { enabled: false, position: 5, format: '📁 {repo}' },
        commits: { enabled: false, position: 6, format: '📝 {count}' },
        mcp_status: { enabled: false, position: 7, format: '🔗 {status}' },
      },
      layout: {
        height: 40,
        position: 'relative',
        zIndex: 10,
      }
    };

    this.loadConfiguration();
  }

  public static getInstance(): ClaudeStatuslineService {
    if (!ClaudeStatuslineService.instance) {
      ClaudeStatuslineService.instance = new ClaudeStatuslineService();
    }
    return ClaudeStatuslineService.instance;
  }

  // Configuration Management
  private loadConfiguration(): void {
    try {
      const savedFlags = localStorage.getItem('claude-statusline-flags');
      const savedConfig = localStorage.getItem('claude-statusline-config');
      
      if (savedFlags) {
        this.featureFlags = { ...this.featureFlags, ...JSON.parse(savedFlags) };
      }
      
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
      
      logger.debug('[StatuslineService] Configuration loaded', {
        flags: this.featureFlags,
        config: this.config
      });
    } catch (error) {
      logger.error('[StatuslineService] Failed to load configuration:', error);
    }
  }

  public saveConfiguration(): void {
    try {
      localStorage.setItem('claude-statusline-flags', JSON.stringify(this.featureFlags));
      localStorage.setItem('claude-statusline-config', JSON.stringify(this.config));
      logger.debug('[StatuslineService] Configuration saved');
    } catch (error) {
      logger.error('[StatuslineService] Failed to save configuration:', error);
    }
  }

  // Feature Flag Management
  public setFeatureFlag(component: StatuslineComponent | 'enabled' | 'shadowMode' | 'performanceMode', value: boolean): void {
    if (component === 'enabled' || component === 'shadowMode' || component === 'performanceMode') {
      this.featureFlags[component] = value;
    } else {
      this.featureFlags.components[component] = value;
      this.config.components[component].enabled = value;
    }
    
    this.saveConfiguration();
    
    if (component === 'enabled' && value) {
      this.startUpdates();
    } else if (component === 'enabled' && !value) {
      this.stopUpdates();
    }
  }

  public getFeatureFlag(component: StatuslineComponent | 'enabled' | 'shadowMode' | 'performanceMode'): boolean {
    if (component === 'enabled' || component === 'shadowMode' || component === 'performanceMode') {
      return this.featureFlags[component];
    }
    return this.featureFlags.components[component];
  }

  public getFeatureFlags(): StatuslineFeatureFlags {
    return { ...this.featureFlags };
  }

  // Layout Measurement and Validation
  public captureLayoutBaseline(
    terminalRef: React.RefObject<HTMLDivElement>,
    settingsButtonRef: React.RefObject<HTMLButtonElement>,
    xtermRef: React.RefObject<any>
  ): void {
    try {
      this.layoutBaseline = {
        terminalHeight: terminalRef.current?.offsetHeight || 0,
        statuslineHeight: this.config.layout.height,
        scrollableArea: xtermRef.current?.element?.scrollHeight || 0,
        dropdownPositions: settingsButtonRef.current?.getBoundingClientRect() || null,
        timestamp: Date.now()
      };
      
      logger.debug('[StatuslineService] Layout baseline captured:', this.layoutBaseline);
    } catch (error) {
      logger.error('[StatuslineService] Failed to capture layout baseline:', error);
    }
  }

  public validateLayout(
    terminalRef: React.RefObject<HTMLDivElement>,
    settingsButtonRef: React.RefObject<HTMLButtonElement>,
    xtermRef: React.RefObject<any>
  ): string[] {
    if (!this.layoutBaseline) {
      return ['No baseline measurement available'];
    }

    const issues: string[] = [];
    
    try {
      const current: LayoutMeasurement = {
        terminalHeight: terminalRef.current?.offsetHeight || 0,
        statuslineHeight: this.config.layout.height,
        scrollableArea: xtermRef.current?.element?.scrollHeight || 0,
        dropdownPositions: settingsButtonRef.current?.getBoundingClientRect() || null,
        timestamp: Date.now()
      };

      if (Math.abs(current.terminalHeight - this.layoutBaseline.terminalHeight) > 5) {
        issues.push(`Terminal height changed: ${this.layoutBaseline.terminalHeight}px → ${current.terminalHeight}px`);
      }

      if (current.scrollableArea < this.layoutBaseline.scrollableArea * 0.9) {
        issues.push(`Scrollable area reduced: ${this.layoutBaseline.scrollableArea}px → ${current.scrollableArea}px`);
      }

      if (this.layoutBaseline.dropdownPositions && current.dropdownPositions) {
        const basePos = this.layoutBaseline.dropdownPositions;
        const currPos = current.dropdownPositions;
        
        if (Math.abs(basePos.top - currPos.top) > 10 || Math.abs(basePos.left - currPos.left) > 10) {
          issues.push('Settings button position shifted significantly');
        }
      }

      logger.debug('[StatuslineService] Layout validation:', {
        baseline: this.layoutBaseline,
        current: current,
        issues: issues
      });

    } catch (error) {
      logger.error('[StatuslineService] Layout validation failed:', error);
      issues.push('Layout validation error: ' + (error as Error).message);
    }

    return issues;
  }

  // Component Data Management
  public setComponentData(component: StatuslineComponent, data: any, error?: string): void {
    const componentData: ComponentData = {
      component,
      data,
      timestamp: Date.now(),
      error,
      cached: false
    };
    
    this.componentData.set(component, componentData);
    
    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(componentData);
      } catch (error) {
        logger.error('[StatuslineService] Subscriber callback error:', error);
      }
    });
  }

  public getComponentData(component: StatuslineComponent): ComponentData | undefined {
    return this.componentData.get(component);
  }

  public getAllComponentData(): ComponentData[] {
    return Array.from(this.componentData.values())
      .sort((a, b) => this.config.components[a.component].position - this.config.components[b.component].position);
  }

  // Subscription Management
  public subscribe(callback: (data: ComponentData) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Update Management
  private startUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Only start updates if master switch is enabled
    if (!this.featureFlags.enabled) {
      return;
    }

    this.updateInterval = setInterval(() => {
      this.updateAllComponents();
    }, this.config.updateInterval);

    logger.debug('[StatuslineService] Started update interval');
  }

  private stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    logger.debug('[StatuslineService] Stopped update interval');
  }

  private async updateAllComponents(): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Update components in parallel for performance
      const updatePromises = Object.entries(this.featureFlags.components)
        .filter(([_, enabled]) => enabled)
        .map(([component]) => this.updateComponent(component as StatuslineComponent));

      await Promise.allSettled(updatePromises);
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      if (updateTime > this.config.maxUpdateTime) {
        logger.warn(`[StatuslineService] Update took ${updateTime.toFixed(2)}ms (target: ${this.config.maxUpdateTime}ms)`);
      } else {
        logger.debug(`[StatuslineService] Update completed in ${updateTime.toFixed(2)}ms`);
      }
      
    } catch (error) {
      logger.error('[StatuslineService] Update error:', error);
    }
  }

  private async updateComponent(component: StatuslineComponent): Promise<void> {
    // Component-specific update logic will be implemented in individual modules
    // For now, just set placeholder data
    
    const startTime = performance.now();
    
    try {
      switch (component) {
        case 'model_info':
          this.setComponentData('model_info', { 
            icon: '🎭', 
            name: 'Claude Sonnet 4',
            id: 'claude-sonnet-4' 
          });
          break;
          
        case 'time_display':
          this.setComponentData('time_display', { 
            time: new Date().toLocaleTimeString() 
          });
          break;
          
        case 'cost_daily':
          this.setComponentData('cost_daily', { 
            daily: '0.00',
            currency: 'USD' 
          });
          break;
          
        default:
          // Other components will be implemented in separate modules
          this.setComponentData(component, { status: 'not_implemented' });
      }
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      if (updateTime > 10) { // 10ms warning threshold per component
        logger.warn(`[StatuslineService] ${component} update took ${updateTime.toFixed(2)}ms`);
      }
      
    } catch (error) {
      logger.error(`[StatuslineService] Failed to update ${component}:`, error);
      this.setComponentData(component, null, (error as Error).message);
    }
  }

  // Public API
  public enable(component?: StatuslineComponent): void {
    if (component) {
      this.setFeatureFlag(component, true);
    } else {
      this.setFeatureFlag('enabled', true);
    }
  }

  public disable(component?: StatuslineComponent): void {
    if (component) {
      this.setFeatureFlag(component, false);
    } else {
      this.setFeatureFlag('enabled', false);
    }
  }

  public setShadowMode(enabled: boolean): void {
    this.setFeatureFlag('shadowMode', enabled);
  }

  public isShadowMode(): boolean {
    return this.getFeatureFlag('shadowMode');
  }

  public isEnabled(): boolean {
    return this.getFeatureFlag('enabled');
  }

  // Cleanup
  public destroy(): void {
    this.stopUpdates();
    this.subscribers.clear();
    this.componentData.clear();
  }
}

// Export singleton instance
export const claudeStatuslineService = ClaudeStatuslineService.getInstance();