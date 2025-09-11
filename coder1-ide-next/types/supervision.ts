/**
 * Supervision Configuration Types
 * 
 * Comprehensive type system for custom supervision bot programming
 * Designed for maximum extensibility and type safety
 */

// ================================================================================
// Core Configuration Types
// ================================================================================

export type SupervisionPersonality = 
  | 'strict-mentor'     // Immediate warnings, high standards, focused on preventing mistakes
  | 'helpful-guide'     // Constructive suggestions with explanations
  | 'educational-coach' // Teaching-focused, explains concepts and reasoning
  | 'collaborative-partner' // Discussion-oriented, works with you as peer

export type SupervisionGoal = 
  | 'security'          // Security vulnerabilities, authentication, data protection
  | 'performance'       // Memory usage, runtime optimization, bundle size
  | 'best-practices'    // Code conventions, patterns, maintainability
  | 'accessibility'     // WCAG compliance, screen reader support
  | 'testing'          // Test coverage, testing patterns, quality assurance
  | 'documentation'    // Code comments, API docs, README completeness

export type ProjectType = 
  | 'react-app'         // React/Next.js frontend application
  | 'node-api'          // Node.js/Express backend API
  | 'full-stack'        // Full-stack application (frontend + backend)
  | 'mobile-app'        // React Native or mobile development
  | 'library'           // NPM package or reusable library
  | 'prototype'         // MVP, proof of concept, experimental project
  | 'enterprise'        // Large-scale, production enterprise application
  | 'learning'          // Educational project, tutorial, learning exercise

export type AlertThreshold = 'minimal' | 'moderate' | 'comprehensive' | 'maximum';

// ================================================================================
// Configuration Schema with Versioning
// ================================================================================

export interface SupervisionConfig {
  // Metadata
  id: string;
  version: number;                    // For configuration migration
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Project Context
  projectType: ProjectType;
  projectDescription: string;         // User's description of what they're building
  
  // Supervision Behavior
  personality: SupervisionPersonality;
  goals: SupervisionGoal[];
  focusAreas: string[];              // Custom focus areas beyond standard goals
  
  // Intelligence Settings
  alertThreshold: AlertThreshold;
  contextAwareness: boolean;         // Should supervision remember previous interactions?
  learningEnabled: boolean;          // Should supervision adapt based on user feedback?
  
  // Custom Instructions
  customInstructions: string;        // Free-form instructions for specific requirements
  customRules: SupervisionRule[];    // Structured custom rules
  
  // Advanced Configuration
  triggerPatterns: string[];         // Specific patterns that should trigger supervision
  ignoredPatterns: string[];         // Patterns to ignore
  environmentContext?: string;       // Development environment info
  teamSettings?: TeamSupervisionSettings;
  
  // Metadata
  isActive: boolean;
  isDefault: boolean;               // Is this the default config for new projects?
  tags: string[];                   // User-defined tags for organization
}

export interface SupervisionRule {
  id: string;
  name: string;
  description: string;
  condition: string;                // Pattern or condition to match
  action: 'warn' | 'suggest' | 'block' | 'explain';
  message: string;                  // Custom message to show user
  enabled: boolean;
}

export interface TeamSupervisionSettings {
  shared: boolean;                  // Is this config shared with team?
  teamId?: string;
  permissions: {
    canEdit: string[];              // Team member IDs who can edit
    canUse: string[];               // Team member IDs who can use
  };
  lastSyncedAt?: Date;
}

// ================================================================================
// Configuration Templates and Presets
// ================================================================================

export interface SupervisionTemplate {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'performance' | 'learning' | 'team' | 'custom';
  icon: string;
  config: Partial<SupervisionConfig>;
  popularity: number;               // For sorting popular templates
  createdBy?: string;               // For community templates
}

// ================================================================================
// State Management Types
// ================================================================================

export interface SupervisionState {
  // Configuration Management
  configs: SupervisionConfig[];
  activeConfig: SupervisionConfig | null;
  defaultConfig: SupervisionConfig | null;
  
  // Templates and Presets
  templates: SupervisionTemplate[];
  customTemplates: SupervisionTemplate[];
  
  // UI State
  isConfiguring: boolean;
  isModalOpen: boolean;
  currentStep: ConfigurationStep;
  
  // Runtime State
  isActive: boolean;
  lastPromptGenerated?: string;
  supervisionHistory: SupervisionInteraction[];
  
  // Performance Metrics
  metrics: {
    totalInteractions: number;
    userFeedback: { positive: number; negative: number; };
    averageResponseTime: number;
    configurationSuccessRate: number;
  };
}

export type ConfigurationStep = 
  | 'project-context'    // Understanding the project
  | 'supervision-goals'  // What to supervise
  | 'personality'        // How to supervise  
  | 'custom-rules'       // Specific rules and patterns
  | 'preview'            // Preview generated prompt
  | 'save-config'        // Save and activate

export interface SupervisionInteraction {
  id: string;
  timestamp: Date;
  type: 'warning' | 'suggestion' | 'explanation' | 'question';
  trigger: string;                  // What triggered the supervision
  message: string;                  // What was communicated to user
  userFeedback?: 'helpful' | 'unhelpful' | 'ignored';
  context: {
    command?: string;
    file?: string;
    codeSnippet?: string;
  };
}

// ================================================================================
// Advanced Types for Future Extensions
// ================================================================================

export interface SupervisionPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  goals: SupervisionGoal[];
  install: () => Promise<void>;
  uninstall: () => Promise<void>;
  createRules: (config: SupervisionConfig) => SupervisionRule[];
}

export interface SupervisionAnalytics {
  configId: string;
  sessionId: string;
  effectiveness: {
    issuesFound: number;
    issuesPrevented: number;
    falsePositives: number;
    userSatisfaction: number; // 1-10 rating
  };
  performance: {
    averageResponseTime: number;
    tokensUsed: number;
    apiCalls: number;
  };
  behavioral: {
    mostTriggeredRules: string[];
    leastUsefulRules: string[];
    userPreferences: Record<string, any>;
  };
}

// ================================================================================
// Error Handling and Validation Types
// ================================================================================

export interface ConfigurationError {
  field: keyof SupervisionConfig;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestedFix?: string;
}

export interface ConfigurationValidation {
  isValid: boolean;
  errors: ConfigurationError[];
  warnings: ConfigurationError[];
  suggestions: string[];
}

// Note: Types exported above via interface declarations