/**
 * Claude Statusline Configuration System
 * 
 * TOML-style configuration with localStorage persistence
 * Manages all statusline component settings and layouts
 */

'use client';

import { logger } from './logger';
import { StatuslineComponent } from './claude-statusline-service';

// Configuration interfaces
export interface StatuslineLayout {
  lines: number; // 1-9 configurable lines
  components: StatuslineComponentLayout[];
  height: number;
  position: 'top' | 'bottom';
  theme: string;
}

export interface StatuslineComponentLayout {
  component: StatuslineComponent;
  line: number; // Which line (1-9)
  position: number; // Position on line (1-n)
  width?: string; // CSS width (e.g., 'auto', '200px', '20%')
  format: string; // Display template
  enabled: boolean;
}

export interface StatuslineTheme {
  name: string;
  colors: {
    background: string;
    text: string;
    accent: string;
    border: string;
    error: string;
    warning: string;
    success: string;
  };
  fonts: {
    family: string;
    size: string;
    weight: string;
  };
  effects: {
    blur: string;
    shadow: string;
    glow: boolean;
  };
}

export interface StatuslineSettings {
  enabled: boolean;
  shadowMode: boolean;
  performanceMode: boolean;
  updateInterval: number;
  maxUpdateTime: number;
  layout: StatuslineLayout;
  theme: StatuslineTheme;
  components: {
    [K in StatuslineComponent]: {
      enabled: boolean;
      updateInterval?: number;
      cacheTimeout?: number;
      settings?: Record<string, any>;
    };
  };
}

// Default themes
const DEFAULT_THEMES: Record<string, StatuslineTheme> = {
  coder1: {
    name: 'Coder1',
    colors: {
      background: 'rgba(0, 0, 0, 0.8)',
      text: '#E5E5E5',
      accent: '#00D9FF',
      border: '#00D9FF',
      error: '#EF4444',
      warning: '#F59E0B',
      success: '#10B981'
    },
    fonts: {
      family: 'Inter, system-ui, sans-serif',
      size: '11px',
      weight: '400'
    },
    effects: {
      blur: 'blur(8px)',
      shadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
      glow: true
    }
  },
  minimal: {
    name: 'Minimal',
    colors: {
      background: 'rgba(0, 0, 0, 0.95)',
      text: '#FFFFFF',
      accent: '#FFFFFF',
      border: '#333333',
      error: '#FF5555',
      warning: '#FFAA00',
      success: '#00AA00'
    },
    fonts: {
      family: 'SF Mono, Monaco, Consolas, monospace',
      size: '10px',
      weight: '400'
    },
    effects: {
      blur: 'none',
      shadow: 'none',
      glow: false
    }
  },
  pro: {
    name: 'Professional',
    colors: {
      background: 'rgba(15, 23, 42, 0.95)',
      text: '#CBD5E1',
      accent: '#3B82F6',
      border: '#475569',
      error: '#DC2626',
      warning: '#D97706',
      success: '#059669'
    },
    fonts: {
      family: 'JetBrains Mono, monospace',
      size: '11px',
      weight: '500'
    },
    effects: {
      blur: 'blur(4px)',
      shadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      glow: false
    }
  }
};

// Default component layouts
const DEFAULT_COMPONENT_LAYOUTS: StatuslineComponentLayout[] = [
  {
    component: 'model_info',
    line: 1,
    position: 1,
    format: '{icon} {name}',
    enabled: true
  },
  {
    component: 'cost_daily',
    line: 1,
    position: 2,
    format: '📊 ${daily}',
    enabled: true
  },
  {
    component: 'cost_live',
    line: 1,
    position: 3,
    format: '💰 {current}',
    enabled: false // Start disabled for safety
  },
  {
    component: 'repo_info',
    line: 1,
    position: 4,
    format: '📁 {directory} {statusIcon}',
    enabled: true
  },
  {
    component: 'commits',
    line: 1,
    position: 5,
    format: '📝 {count}',
    enabled: true
  },
  {
    component: 'mcp_status',
    line: 1,
    position: 6,
    format: '🔗 {ratio}',
    enabled: true
  },
  {
    component: 'time_display',
    line: 1,
    position: 7,
    format: '{time}',
    enabled: true
  }
];

// Default configuration
const DEFAULT_SETTINGS: StatuslineSettings = {
  enabled: false, // Start disabled for safety
  shadowMode: true, // Start in shadow mode
  performanceMode: false,
  updateInterval: 5000,
  maxUpdateTime: 50,
  layout: {
    lines: 1,
    components: DEFAULT_COMPONENT_LAYOUTS,
    height: 40,
    position: 'bottom',
    theme: 'coder1'
  },
  theme: DEFAULT_THEMES.coder1,
  components: {
    model_info: { enabled: true, cacheTimeout: 30000 },
    cost_daily: { enabled: true, cacheTimeout: 30000 },
    cost_live: { enabled: false, updateInterval: 2000 },
    time_display: { enabled: true, updateInterval: 1000 },
    repo_info: { enabled: true, cacheTimeout: 10000, updateInterval: 15000 },
    commits: { enabled: true, cacheTimeout: 30000, updateInterval: 60000 },
    mcp_status: { enabled: true, cacheTimeout: 15000, updateInterval: 30000 }
  }
};

export class StatuslineConfigManager {
  private static instance: StatuslineConfigManager;
  private config: StatuslineSettings;
  private subscribers: Set<(config: StatuslineSettings) => void> = new Set();
  private storageKey = 'claude-statusline-config';

  private constructor() {
    this.config = { ...DEFAULT_SETTINGS };
    this.loadConfiguration();
  }

  public static getInstance(): StatuslineConfigManager {
    if (!StatuslineConfigManager.instance) {
      StatuslineConfigManager.instance = new StatuslineConfigManager();
    }
    return StatuslineConfigManager.instance;
  }

  // Configuration Management
  public getConfig(): StatuslineSettings {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<StatuslineSettings>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.saveConfiguration();
    this.notifySubscribers();
    
    logger.debug('[StatuslineConfig] Configuration updated:', updates);
  }

  public resetToDefaults(): void {
    this.config = { ...DEFAULT_SETTINGS };
    this.saveConfiguration();
    this.notifySubscribers();
    
    logger.debug('[StatuslineConfig] Configuration reset to defaults');
  }

  // Component Management
  public enableComponent(component: StatuslineComponent): void {
    this.config.components[component].enabled = true;
    
    // Also enable in layout if exists
    const layoutComponent = this.config.layout.components.find(c => c.component === component);
    if (layoutComponent) {
      layoutComponent.enabled = true;
    }
    
    this.saveConfiguration();
    this.notifySubscribers();
  }

  public disableComponent(component: StatuslineComponent): void {
    this.config.components[component].enabled = false;
    
    // Also disable in layout if exists
    const layoutComponent = this.config.layout.components.find(c => c.component === component);
    if (layoutComponent) {
      layoutComponent.enabled = false;
    }
    
    this.saveConfiguration();
    this.notifySubscribers();
  }

  public updateComponentSettings(
    component: StatuslineComponent,
    settings: Partial<StatuslineSettings['components'][StatuslineComponent]>
  ): void {
    this.config.components[component] = {
      ...this.config.components[component],
      ...settings
    };
    
    this.saveConfiguration();
    this.notifySubscribers();
  }

  // Layout Management
  public updateLayout(layout: Partial<StatuslineLayout>): void {
    this.config.layout = { ...this.config.layout, ...layout };
    this.saveConfiguration();
    this.notifySubscribers();
  }

  public addComponent(componentLayout: StatuslineComponentLayout): void {
    // Remove if already exists
    this.config.layout.components = this.config.layout.components.filter(
      c => !(c.component === componentLayout.component && c.line === componentLayout.line)
    );
    
    // Add new layout
    this.config.layout.components.push(componentLayout);
    
    // Sort by line and position
    this.config.layout.components.sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line;
      return a.position - b.position;
    });
    
    this.saveConfiguration();
    this.notifySubscribers();
  }

  public removeComponent(component: StatuslineComponent, line?: number): void {
    if (line !== undefined) {
      this.config.layout.components = this.config.layout.components.filter(
        c => !(c.component === component && c.line === line)
      );
    } else {
      this.config.layout.components = this.config.layout.components.filter(
        c => c.component !== component
      );
    }
    
    this.saveConfiguration();
    this.notifySubscribers();
  }

  public moveComponent(
    component: StatuslineComponent,
    fromLine: number,
    toLine: number,
    toPosition: number
  ): void {
    const componentLayout = this.config.layout.components.find(
      c => c.component === component && c.line === fromLine
    );
    
    if (componentLayout) {
      componentLayout.line = toLine;
      componentLayout.position = toPosition;
      
      // Re-sort
      this.config.layout.components.sort((a, b) => {
        if (a.line !== b.line) return a.line - b.line;
        return a.position - b.position;
      });
      
      this.saveConfiguration();
      this.notifySubscribers();
    }
  }

  // Theme Management
  public setTheme(themeName: string): void {
    const theme = DEFAULT_THEMES[themeName];
    if (theme) {
      this.config.theme = theme;
      this.config.layout.theme = themeName;
      this.saveConfiguration();
      this.notifySubscribers();
    }
  }

  public getAvailableThemes(): StatuslineTheme[] {
    return Object.values(DEFAULT_THEMES);
  }

  public createCustomTheme(theme: StatuslineTheme): void {
    DEFAULT_THEMES[theme.name.toLowerCase()] = theme;
    this.setTheme(theme.name.toLowerCase());
  }

  // TOML-style Configuration Export/Import
  public exportToTOML(): string {
    const config = this.getConfig();
    
    let toml = '# Claude Statusline Configuration\n';
    toml += '# Generated at: ' + new Date().toISOString() + '\n\n';
    
    // General settings
    toml += '[general]\n';
    toml += `enabled = ${config.enabled}\n`;
    toml += `shadow_mode = ${config.shadowMode}\n`;
    toml += `performance_mode = ${config.performanceMode}\n`;
    toml += `update_interval = ${config.updateInterval}\n`;
    toml += `max_update_time = ${config.maxUpdateTime}\n\n`;
    
    // Layout settings
    toml += '[layout]\n';
    toml += `lines = ${config.layout.lines}\n`;
    toml += `height = ${config.layout.height}\n`;
    toml += `position = "${config.layout.position}"\n`;
    toml += `theme = "${config.layout.theme}"\n\n`;
    
    // Component settings
    Object.entries(config.components).forEach(([component, settings]) => {
      toml += `[components.${component}]\n`;
      toml += `enabled = ${settings.enabled}\n`;
      if (settings.updateInterval) {
        toml += `update_interval = ${settings.updateInterval}\n`;
      }
      if (settings.cacheTimeout) {
        toml += `cache_timeout = ${settings.cacheTimeout}\n`;
      }
      toml += '\n';
    });
    
    // Component layouts
    config.layout.components.forEach((layout, index) => {
      toml += `[[layout.components]]\n`;
      toml += `component = "${layout.component}"\n`;
      toml += `line = ${layout.line}\n`;
      toml += `position = ${layout.position}\n`;
      toml += `format = "${layout.format}"\n`;
      toml += `enabled = ${layout.enabled}\n`;
      if (layout.width) {
        toml += `width = "${layout.width}"\n`;
      }
      toml += '\n';
    });
    
    return toml;
  }

  public importFromTOML(tomlString: string): boolean {
    try {
      // Simple TOML parser (for basic key=value pairs)
      const parsed = this.parseTOML(tomlString);
      
      // Apply configuration
      if (parsed.general) {
        this.updateConfig({
          enabled: parsed.general.enabled,
          shadowMode: parsed.general.shadow_mode,
          performanceMode: parsed.general.performance_mode,
          updateInterval: parsed.general.update_interval,
          maxUpdateTime: parsed.general.max_update_time
        });
      }
      
      logger.debug('[StatuslineConfig] Configuration imported from TOML');
      return true;
    } catch (error) {
      logger.error('[StatuslineConfig] Failed to import TOML:', error);
      return false;
    }
  }

  // Subscription Management
  public subscribe(callback: (config: StatuslineSettings) => void): () => void {
    this.subscribers.add(callback);
    
    // Send current config immediately
    callback(this.getConfig());
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Private methods
  private loadConfiguration(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        this.config = this.mergeConfig(DEFAULT_SETTINGS, parsedConfig);
      }
      
      logger.debug('[StatuslineConfig] Configuration loaded');
    } catch (error) {
      logger.error('[StatuslineConfig] Failed to load configuration:', error);
      this.config = { ...DEFAULT_SETTINGS };
    }
  }

  private saveConfiguration(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (error) {
      logger.error('[StatuslineConfig] Failed to save configuration:', error);
    }
  }

  private mergeConfig(base: StatuslineSettings, updates: any): StatuslineSettings {
    const merged = { ...base };
    
    // Deep merge specific sections
    if (updates.layout) {
      merged.layout = { ...base.layout, ...updates.layout };
      if (updates.layout.components) {
        merged.layout.components = updates.layout.components;
      }
    }
    
    if (updates.theme) {
      merged.theme = { ...base.theme, ...updates.theme };
    }
    
    if (updates.components) {
      merged.components = { ...base.components };
      Object.entries(updates.components).forEach(([key, value]) => {
        if (key in merged.components) {
          merged.components[key as StatuslineComponent] = {
            ...merged.components[key as StatuslineComponent],
            ...(value as any)
          };
        }
      });
    }
    
    // Simple merge for other properties
    Object.keys(updates).forEach(key => {
      if (key !== 'layout' && key !== 'theme' && key !== 'components') {
        (merged as any)[key] = updates[key];
      }
    });
    
    return merged;
  }

  private parseTOML(toml: string): any {
    // Simple TOML parser for basic key=value pairs
    // This is a minimal implementation - for full TOML support, use a proper library
    const result: any = {};
    let currentSection: any = result;
    let currentSectionPath = '';
    
    const lines = toml.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Section headers
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const sectionName = trimmed.slice(1, -1);
        currentSectionPath = sectionName;
        
        // Navigate to nested sections
        const parts = sectionName.split('.');
        currentSection = result;
        for (const part of parts) {
          if (!currentSection[part]) {
            currentSection[part] = {};
          }
          currentSection = currentSection[part];
        }
        continue;
      }
      
      // Key-value pairs
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.slice(0, equalIndex).trim();
        const value = trimmed.slice(equalIndex + 1).trim();
        
        // Parse value
        let parsedValue: any = value;
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (/^\d+$/.test(value)) parsedValue = parseInt(value);
        else if (/^\d+\.\d+$/.test(value)) parsedValue = parseFloat(value);
        else if (value.startsWith('"') && value.endsWith('"')) {
          parsedValue = value.slice(1, -1);
        }
        
        currentSection[key] = parsedValue;
      }
    }
    
    return result;
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(this.getConfig());
      } catch (error) {
        logger.error('[StatuslineConfig] Subscriber callback error:', error);
      }
    });
  }
}

// Export singleton instance
export const statuslineConfigManager = StatuslineConfigManager.getInstance();