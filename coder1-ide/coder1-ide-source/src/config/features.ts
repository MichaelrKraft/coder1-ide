/**
 * Feature flags configuration for Coder1 V2
 * Controls which features are enabled/disabled across the application
 */

declare global {
  var __FEATURE_FLAGS_LOGGED__: boolean | undefined;
}

export interface FeatureFlags {
  // Terminal-independent features (ready now)
  FILE_SEARCH: boolean;
  THINKING_MODE_TOGGLE: boolean;
  SESSION_CHECKPOINTS: boolean;
  TOOL_DASHBOARD: boolean;
  PRD_PIPELINE_VISUALIZER: boolean;
  
  // Terminal-dependent features (waiting for terminal fix)
  TERMINAL_EXECUTION: boolean;
  AGENT_EXECUTION: boolean;
  PERMISSION_SYSTEM: boolean;
  
  // Preview Enhancement Features (Phase 1)
  PREVIEW_COMPONENT_GENERATION: boolean;    // Enable /ui create commands
  PREVIEW_IFRAME_SANDBOX: boolean;          // Enable iframe component rendering
  PREVIEW_ERROR_BOUNDARY: boolean;          // Enable error boundary protection
  PREVIEW_LIVE_UPDATES: boolean;            // Enable real-time preview updates
  
  // Preview Enhancement Features (Phase 2)
  PREVIEW_VARIANT_GENERATION: boolean;      // Enable /ui variant commands
  PREVIEW_RESPONSIVE_MODE: boolean;         // Enable responsive breakpoint testing
  PREVIEW_PROPS_MANIPULATION: boolean;      // Enable /ui props commands
  
  // Preview Enhancement Features (Phase 3)
  PREVIEW_AI_AGENTS: boolean;               // Enable multi-agent component generation
  PREVIEW_OPTIMIZATION: boolean;            // Enable /ui optimize commands
  PREVIEW_TEST_GENERATION: boolean;         // Enable /ui test commands
  
  // Preview Enhancement Features (Phase 4)
  PREVIEW_DESIGN_SYSTEM: boolean;           // Enable design system integration
  PREVIEW_MARKETPLACE: boolean;             // Enable component marketplace
  PREVIEW_EXPORT_TOOLS: boolean;            // Enable component export functionality
  
  // Experimental features
  MULTI_AGENT_VIEW: boolean;
  COLLABORATION_MODE: boolean;
  AI_MODEL_SWITCHING: boolean;
}

// Default feature configuration (immutable)
const DEFAULT_FEATURES: FeatureFlags = {
  // Enable terminal-independent features
  FILE_SEARCH: true,
  THINKING_MODE_TOGGLE: true,
  SESSION_CHECKPOINTS: true,
  TOOL_DASHBOARD: true,
  PRD_PIPELINE_VISUALIZER: true,
  
  // Disable terminal-dependent features for now
  TERMINAL_EXECUTION: false,
  AGENT_EXECUTION: false,
  PERMISSION_SYSTEM: false,
  
  // Preview Enhancement Features (Phase 1) - ENABLED
  PREVIEW_COMPONENT_GENERATION: true,     // Enable /ui create commands
  PREVIEW_IFRAME_SANDBOX: true,           // Enable iframe component rendering
  PREVIEW_ERROR_BOUNDARY: true,           // Enable error boundary protection
  PREVIEW_LIVE_UPDATES: true,             // Enable real-time preview updates
  
  // Preview Enhancement Features (Phase 2) - DISABLED (not implemented yet)
  PREVIEW_VARIANT_GENERATION: false,      // Enable /ui variant commands
  PREVIEW_RESPONSIVE_MODE: false,         // Enable responsive breakpoint testing
  PREVIEW_PROPS_MANIPULATION: false,      // Enable /ui props commands
  
  // Preview Enhancement Features (Phase 3) - DISABLED (not implemented yet)
  PREVIEW_AI_AGENTS: false,               // Enable multi-agent component generation
  PREVIEW_OPTIMIZATION: false,            // Enable /ui optimize commands
  PREVIEW_TEST_GENERATION: false,         // Enable /ui test commands
  
  // Preview Enhancement Features (Phase 4) - DISABLED (not implemented yet)
  PREVIEW_DESIGN_SYSTEM: false,           // Enable design system integration
  PREVIEW_MARKETPLACE: false,             // Enable component marketplace
  PREVIEW_EXPORT_TOOLS: false,            // Enable component export functionality
  
  // Experimental features
  MULTI_AGENT_VIEW: false,
  COLLABORATION_MODE: false,
  AI_MODEL_SWITCHING: false,
};

// Internal mutable state for runtime changes
let currentFeatures: FeatureFlags = { ...DEFAULT_FEATURES };

// Feature flag checker with type safety
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return currentFeatures[feature] ?? false;
}

// Get all current feature flags (returns a copy)
export function getCurrentFeatures(): FeatureFlags {
  return { ...currentFeatures };
}

// Update feature flags (immutable)
export function updateFeatureFlag(feature: keyof FeatureFlags, enabled: boolean): void {
  // Create new state instead of mutating
  currentFeatures = {
    ...currentFeatures,
    [feature]: enabled
  };
  
  // Persist to localStorage for dev/testing
  if (typeof window !== 'undefined') {
    try {
      const savedFlags = localStorage.getItem('coder1-feature-flags');
      const flags = savedFlags ? JSON.parse(savedFlags) : {};
      flags[feature] = enabled;
      localStorage.setItem('coder1-feature-flags', JSON.stringify(flags));
      
      // Dispatch custom event for real-time updates
      window.dispatchEvent(new CustomEvent('featureFlagsUpdated', {
        detail: { feature, enabled, allFlags: getCurrentFeatures() }
      }));
    } catch (e) {
      console.error('Failed to save feature flags:', e);
    }
  }
}

// Load feature flags from environment variables and localStorage on startup
export function loadFeatureFlags(): FeatureFlags {
  // Start with defaults
  let features = { ...DEFAULT_FEATURES };
  
  // Override with environment variables (React apps use REACT_APP_ prefix)
  if (typeof process !== 'undefined' && process.env) {
    const envOverrides: Partial<FeatureFlags> = {};
    
    // Map environment variables to feature flags
    const envMapping: Record<string, keyof FeatureFlags> = {
      'REACT_APP_PREVIEW_COMPONENT_GENERATION': 'PREVIEW_COMPONENT_GENERATION',
      'REACT_APP_PREVIEW_IFRAME_SANDBOX': 'PREVIEW_IFRAME_SANDBOX',
      'REACT_APP_PREVIEW_ERROR_BOUNDARY': 'PREVIEW_ERROR_BOUNDARY',
      'REACT_APP_PREVIEW_LIVE_UPDATES': 'PREVIEW_LIVE_UPDATES',
      'REACT_APP_PREVIEW_VARIANT_GENERATION': 'PREVIEW_VARIANT_GENERATION',
      'REACT_APP_PREVIEW_RESPONSIVE_MODE': 'PREVIEW_RESPONSIVE_MODE',
      'REACT_APP_PREVIEW_PROPS_MANIPULATION': 'PREVIEW_PROPS_MANIPULATION',
      'REACT_APP_PREVIEW_AI_AGENTS': 'PREVIEW_AI_AGENTS',
      'REACT_APP_PREVIEW_OPTIMIZATION': 'PREVIEW_OPTIMIZATION',
      'REACT_APP_PREVIEW_TEST_GENERATION': 'PREVIEW_TEST_GENERATION',
      'REACT_APP_PREVIEW_DESIGN_SYSTEM': 'PREVIEW_DESIGN_SYSTEM',
      'REACT_APP_PREVIEW_MARKETPLACE': 'PREVIEW_MARKETPLACE',
      'REACT_APP_PREVIEW_EXPORT_TOOLS': 'PREVIEW_EXPORT_TOOLS',
      'REACT_APP_FILE_SEARCH': 'FILE_SEARCH',
      'REACT_APP_THINKING_MODE_TOGGLE': 'THINKING_MODE_TOGGLE',
      'REACT_APP_SESSION_CHECKPOINTS': 'SESSION_CHECKPOINTS',
      'REACT_APP_TOOL_DASHBOARD': 'TOOL_DASHBOARD',
      'REACT_APP_PRD_PIPELINE_VISUALIZER': 'PRD_PIPELINE_VISUALIZER',
      'REACT_APP_TERMINAL_EXECUTION': 'TERMINAL_EXECUTION',
      'REACT_APP_AGENT_EXECUTION': 'AGENT_EXECUTION',
      'REACT_APP_PERMISSION_SYSTEM': 'PERMISSION_SYSTEM',
      'REACT_APP_MULTI_AGENT_VIEW': 'MULTI_AGENT_VIEW',
      'REACT_APP_COLLABORATION_MODE': 'COLLABORATION_MODE',
      'REACT_APP_AI_MODEL_SWITCHING': 'AI_MODEL_SWITCHING'
    };
    
    // Apply environment variable overrides
    Object.entries(envMapping).forEach(([envVar, featureKey]) => {
      const value = process.env[envVar];
      if (value !== undefined) {
        envOverrides[featureKey] = value === 'true' || value === '1';
      }
    });
    
    // Merge environment overrides
    features = {
      ...features,
      ...envOverrides
    };
  }
  
  // Finally, override with localStorage for development/testing
  if (typeof window !== 'undefined') {
    try {
      const savedFlags = localStorage.getItem('coder1-feature-flags');
      if (savedFlags) {
        const flags = JSON.parse(savedFlags);
        const validFlags: Partial<FeatureFlags> = {};
        
        // Only load valid feature flags
        Object.keys(flags).forEach((key) => {
          if (key in DEFAULT_FEATURES) {
            validFlags[key as keyof FeatureFlags] = Boolean(flags[key]);
          }
        });
        
        // Merge with current features (localStorage has highest priority)
        features = {
          ...features,
          ...validFlags
        };
      }
    } catch (e) {
      console.error('Failed to load feature flags from localStorage:', e);
    }
  }
  
  currentFeatures = features;
  return getCurrentFeatures();
}

// Reset feature flags to defaults
export function resetFeatureFlags(): void {
  currentFeatures = { ...DEFAULT_FEATURES };
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('coder1-feature-flags');
    window.dispatchEvent(new CustomEvent('featureFlagsUpdated', {
      detail: { feature: null, enabled: null, allFlags: getCurrentFeatures() }
    }));
  }
}

// Initialize on module load
const loadedFlags = loadFeatureFlags();
// Debug logs only in development mode and only once
if (process.env.NODE_ENV === 'development' && !global.__FEATURE_FLAGS_LOGGED__) {
  console.log('🏁 Feature flags loaded:', Object.keys(loadedFlags).filter(k => loadedFlags[k as keyof FeatureFlags]).join(', '));
  global.__FEATURE_FLAGS_LOGGED__ = true;
}