import { logger } from './logger';

/**
 * Configuration and Feature Flag Management for Coder1 IDE
 * Centralizes environment variables and feature toggles
 */

export interface FeatureFlags {
  aiConsultation: boolean;
  agentDashboard: boolean;
  tweakcc: boolean;
  containers: boolean;
}

export interface ServerConfig {
  apiUrl: string;
  expressBackendUrl: string;
  websocketUrl: string;
}

/**
 * Client-side feature flags (using NEXT_PUBLIC_ variables)
 */
export const clientFeatures: FeatureFlags = {
  aiConsultation: process.env.NEXT_PUBLIC_ENABLE_AI_CONSULTATION === 'true',
  agentDashboard: process.env.NEXT_PUBLIC_ENABLE_AGENT_DASHBOARD === 'true',
  tweakcc: process.env.NEXT_PUBLIC_ENABLE_TWEAKCC === 'true',
  containers: process.env.NEXT_PUBLIC_ENABLE_CONTAINERS === 'true',
};

/**
 * Server-side feature flags (direct environment variables)
 */
export const serverFeatures: FeatureFlags = {
  aiConsultation: process.env.ENABLE_AI_CONSULTATION === 'true',
  agentDashboard: process.env.ENABLE_AGENT_DASHBOARD === 'true', 
  tweakcc: process.env.ENABLE_TWEAKCC === 'true',
  containers: process.env.ENABLE_CONTAINERS === 'true',
};

/**
 * Get current domain for production deployments
 */
const getCurrentDomain = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3001';
};

/**
 * Server configuration
 */
export const serverConfig: ServerConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || getCurrentDomain(),
  expressBackendUrl: process.env.EXPRESS_BACKEND_URL || process.env.NEXT_PUBLIC_EXPRESS_BACKEND_URL || 'http://localhost:3001',
  websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || `wss://${process.env.VERCEL_URL}` || 'ws://localhost:3001',
};

/**
 * Client configuration
 */
export const clientConfig: ServerConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || getCurrentDomain(),
  expressBackendUrl: process.env.NEXT_PUBLIC_EXPRESS_BACKEND_URL || 'http://localhost:3001',
  websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || `wss://${process.env.VERCEL_URL}` || 'ws://localhost:3001',
};

/**
 * Container mode configuration
 */
export const containerConfig = {
  enabled: process.env.ENABLE_CONTAINERS === 'true',
  maxContainers: parseInt(process.env.MAX_CONTAINERS || '20', 10),
  defaultMemory: process.env.CONTAINER_DEFAULT_MEMORY || '256m',
  defaultCpu: process.env.CONTAINER_DEFAULT_CPU || '0.5',
  idleTimeout: parseInt(process.env.CONTAINER_IDLE_TIMEOUT || '300', 10), // 5 minutes
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Check if we're in production mode
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Utility function to log current configuration (development only)
 */
export function logConfig() {
  if (!isDevelopment) return;
  
  logger.debug('🔧 Coder1 IDE Configuration:');
  logger.debug('  Client Features:', clientFeatures);
  logger.debug('  Server Features:', serverFeatures);
  logger.debug('  Container Config:', containerConfig);
  logger.debug('  Server Config:', serverConfig);
}

/**
 * Utility function to check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags, isClient = false): boolean {
  const features = isClient ? clientFeatures : serverFeatures;
  return features[feature] || false;
}

/**
 * Container-specific utilities
 */
export const containerUtils = {
  isEnabled: () => containerConfig.enabled,
  getMaxContainers: () => containerConfig.maxContainers,
  shouldFallbackToTmux: () => !containerConfig.enabled,
  
  // Enable container mode (runtime toggle)
  enable: () => {
    if (isDevelopment) {
      process.env.ENABLE_CONTAINERS = 'true';
      logger.debug('🐳 Container mode enabled (development)');
    }
  },
  
  // Disable container mode (runtime toggle)
  disable: () => {
    if (isDevelopment) {
      process.env.ENABLE_CONTAINERS = 'false';
      logger.debug('🐳 Container mode disabled (development)');
    }
  }
};