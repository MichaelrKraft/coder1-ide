/**
 * Centralized Runtime Configuration System
 * 
 * Eliminates hardcoded ports and URLs
 * Supports environment-specific configs
 * Runtime reconfiguration capability
 * Type-safe configuration access
 */

import { logger } from './logger';

interface ServerConfig {
  expressBackendUrl: string;
  expressBackendPort: number;
  nextjsFrontendUrl: string;
  nextjsFrontendPort: number;
  websocketUrl: string;
}

interface FeatureFlags {
  enableAiConsultation: boolean;
  enableContainers: boolean;
  enableTweakcc: boolean;
  enableSupervision: boolean;
  enableSessionSummary: boolean;
}

interface ApiConfig {
  claudeApiKey?: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  timeout: number;
  maxRetries: number;
}

interface RuntimeConfig {
  env: 'development' | 'staging' | 'production';
  server: ServerConfig;
  features: FeatureFlags;
  api: ApiConfig;
  debug: boolean;
}

class ConfigManager {
  private config: RuntimeConfig;
  private listeners: Map<string, Set<(config: RuntimeConfig) => void>>;
  
  constructor() {
    this.listeners = new Map();
    this.config = this.loadConfig();
    
    // Watch for config changes in development
    if (this.config.env === 'development') {
      this.watchForChanges();
    }
  }
  
  private loadConfig(): RuntimeConfig {
    const env = (process.env.NODE_ENV || 'development') as RuntimeConfig['env'];
    const isDev = env === 'development';
    
    // Server configuration with no hardcoded values
    const server: ServerConfig = {
      expressBackendUrl: process.env.EXPRESS_BACKEND_URL || 
                        process.env.NEXT_PUBLIC_EXPRESS_BACKEND_URL || 
                        (isDev ? 'http://localhost:3000' : ''),
      expressBackendPort: parseInt(process.env.EXPRESS_PORT || '3000', 10),
      nextjsFrontendUrl: process.env.NEXT_PUBLIC_API_URL || 
                        (isDev ? 'http://localhost:3001' : ''),
      nextjsFrontendPort: parseInt(process.env.NEXT_PORT || '3001', 10),
      websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 
                   (isDev ? 'ws://localhost:3000' : '')
    };
    
    // Feature flags from environment
    const features: FeatureFlags = {
      enableAiConsultation: this.parseBoolean(
        process.env.NEXT_PUBLIC_ENABLE_AI_CONSULTATION, 
        true
      ),
      enableContainers: this.parseBoolean(
        process.env.NEXT_PUBLIC_ENABLE_CONTAINERS, 
        true
      ),
      enableTweakcc: this.parseBoolean(
        process.env.NEXT_PUBLIC_ENABLE_TWEAKCC, 
        true
      ),
      enableSupervision: this.parseBoolean(
        process.env.ENABLE_SUPERVISION, 
        true
      ),
      enableSessionSummary: this.parseBoolean(
        process.env.ENABLE_SESSION_SUMMARY, 
        true
      )
    };
    
    // API configuration
    const api: ApiConfig = {
      claudeApiKey: process.env.CLAUDE_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      timeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
      maxRetries: parseInt(process.env.API_MAX_RETRIES || '3', 10)
    };
    
    return {
      env,
      server,
      features,
      api,
      debug: isDev || process.env.DEBUG === 'true'
    };
  }
  
  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }
  
  private watchForChanges(): void {
    // In development, check for config changes periodically
    setInterval(() => {
      const newConfig = this.loadConfig();
      if (JSON.stringify(newConfig) !== JSON.stringify(this.config)) {
        logger.info('Configuration changed, updating...');
        this.updateConfig(newConfig);
      }
    }, 5000);
  }
  
  private updateConfig(newConfig: Partial<RuntimeConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Notify listeners
    this.listeners.forEach((callbacks, key) => {
      callbacks.forEach(callback => {
        try {
          callback(this.config);
        } catch (error) {
          logger.error(`Config listener error for ${key}:`, error);
        }
      });
    });
    
    logger.debug('Configuration updated', { 
      old: oldConfig, 
      new: this.config 
    });
  }
  
  // Public API
  
  get(): RuntimeConfig {
    return { ...this.config };
  }
  
  getServer(): ServerConfig {
    return { ...this.config.server };
  }
  
  getFeatures(): FeatureFlags {
    return { ...this.config.features };
  }
  
  getApi(): ApiConfig {
    return { ...this.config.api };
  }
  
  isProduction(): boolean {
    return this.config.env === 'production';
  }
  
  isDevelopment(): boolean {
    return this.config.env === 'development';
  }
  
  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.config.features[feature];
  }
  
  // Dynamic configuration updates (for runtime changes)
  updateFeature(feature: keyof FeatureFlags, enabled: boolean): void {
    this.updateConfig({
      features: {
        ...this.config.features,
        [feature]: enabled
      }
    });
  }
  
  // Subscribe to config changes
  subscribe(key: string, callback: (config: RuntimeConfig) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }
  
  // Validation
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required server configs
    if (!this.config.server.expressBackendUrl) {
      errors.push('Express backend URL not configured');
    }
    
    if (!this.config.server.nextjsFrontendUrl && this.config.env === 'production') {
      errors.push('Next.js frontend URL required in production');
    }
    
    // Check WebSocket URL
    if (!this.config.server.websocketUrl) {
      errors.push('WebSocket URL not configured');
    }
    
    // Check API keys if features require them
    if (this.config.features.enableAiConsultation && !this.config.api.claudeApiKey) {
      errors.push('Claude API key required for AI consultation');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Export configuration for debugging
  export(): string {
    const safeConfig = { ...this.config };
    
    // Remove sensitive data
    if (safeConfig.api.claudeApiKey) {
      safeConfig.api.claudeApiKey = '***';
    }
    if (safeConfig.api.anthropicApiKey) {
      safeConfig.api.anthropicApiKey = '***';
    }
    if (safeConfig.api.openaiApiKey) {
      safeConfig.api.openaiApiKey = '***';
    }
    
    return JSON.stringify(safeConfig, null, 2);
  }
}

// Create singleton instance
const configManager = new ConfigManager();

// Validate on startup
const validation = configManager.validate();
if (!validation.valid) {
  logger.warn('Configuration validation warnings:', validation.errors);
}

// Export convenience functions
export const config = configManager;
export const getConfig = () => configManager.get();
export const getServerConfig = () => configManager.getServer();
export const getFeatureFlags = () => configManager.getFeatures();
export const isFeatureEnabled = (feature: keyof FeatureFlags) => configManager.isFeatureEnabled(feature);

export default configManager;