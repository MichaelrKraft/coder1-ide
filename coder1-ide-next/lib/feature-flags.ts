/**
 * Feature Flags Configuration
 * Central location for all feature flags in Coder1 IDE
 */

export interface FeatureFlags {
  memoryContextEnabled: boolean;
  memoryAutoInject: boolean;
  enhancedSupervision: boolean;
  cliPuppeteer: boolean;
  errorDoctor: boolean;
  sessionSummary: boolean;
  voiceCommands: boolean;
  timeCapsules: boolean;
  teamFeatures: boolean;
  multiAIPlatformsEnabled: boolean;
  agentHub: boolean;
}

// Get feature flags from environment or use defaults
export const getFeatureFlags = (): FeatureFlags => {
  const isClient = typeof window !== 'undefined';
  
  return {
    memoryContextEnabled: process.env.NEXT_PUBLIC_MEMORY_CONTEXT_ENABLED === 'true' || false,
    memoryAutoInject: process.env.NEXT_PUBLIC_MEMORY_AUTO_INJECT === 'true' || false,
    enhancedSupervision: process.env.NEXT_PUBLIC_ENHANCED_SUPERVISION === 'true' || true,
    cliPuppeteer: process.env.NEXT_PUBLIC_CLI_PUPPETEER === 'true' || false,
    errorDoctor: process.env.NEXT_PUBLIC_ERROR_DOCTOR === 'true' || true,
    sessionSummary: process.env.NEXT_PUBLIC_SESSION_SUMMARY === 'true' || true,
    voiceCommands: process.env.NEXT_PUBLIC_VOICE_COMMANDS === 'true' || false,
    timeCapsules: process.env.NEXT_PUBLIC_TIME_CAPSULES === 'true' || false,
    teamFeatures: process.env.NEXT_PUBLIC_ENABLE_TEAM_FEATURES === 'true',
    multiAIPlatformsEnabled: process.env.NEXT_PUBLIC_ENABLE_MULTI_AI_DETECTION === 'true',
    agentHub: process.env.NEXT_PUBLIC_ENABLE_AGENT_HUB === 'true',
  };
};

// Singleton instance
let featuresInstance: FeatureFlags | null = null;

export const features = (): FeatureFlags => {
  if (!featuresInstance) {
    featuresInstance = getFeatureFlags();
  }
  return featuresInstance;
};

// Reset features (useful for testing)
export const resetFeatures = () => {
  featuresInstance = null;
};