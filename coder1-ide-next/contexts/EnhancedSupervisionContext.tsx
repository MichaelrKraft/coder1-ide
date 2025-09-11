'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { getSocket } from '../lib/socket';
import { claudeAPI } from '../services/claude-api';
import type { 
  SupervisionConfig, 
  SupervisionState, 
  SupervisionTemplate, 
  SupervisionInteraction,
  SupervisionAnalytics,
  ConfigurationValidation,
  ConfigurationError
} from '@/types/supervision';

// ================================================================================
// Enhanced Context Interface (Backward Compatible)
// ================================================================================

interface EnhancedSupervisionContextType {
  // Legacy compatibility (from original SupervisionContext)
  isSupervisionActive: boolean;
  supervisionStatus: string;
  lastSupervisionCheck: Date | null;
  enableSupervision: () => void;
  disableSupervision: () => void;
  toggleSupervision: () => void;
  updateSupervisionStatus: (status: string) => void;

  // Enhanced configuration management
  configurations: SupervisionConfig[];
  activeConfiguration: SupervisionConfig | null;
  defaultConfiguration: SupervisionConfig | null;
  templates: SupervisionTemplate[];
  
  // Configuration operations
  saveConfiguration: (config: SupervisionConfig) => Promise<void>;
  loadConfiguration: (configId: string) => Promise<SupervisionConfig | null>;
  deleteConfiguration: (configId: string) => Promise<void>;
  setActiveConfiguration: (config: SupervisionConfig | null) => void;
  setDefaultConfiguration: (configId: string) => void;
  
  // Custom supervision operations
  enableCustomSupervision: (config: SupervisionConfig) => Promise<void>;
  generateSupervisionPrompt: (config: SupervisionConfig) => string;
  validateConfiguration: (config: Partial<SupervisionConfig>) => ConfigurationValidation;
  
  // Advanced features
  supervisionHistory: SupervisionInteraction[];
  analytics: SupervisionAnalytics | null;
  isConfigModalOpen: boolean;
  setConfigModalOpen: (open: boolean) => void;
  
  // Smart supervision
  recordInteraction: (interaction: Omit<SupervisionInteraction, 'id' | 'timestamp'>) => void;
  getSupervisionRecommendations: () => string[];
  exportConfiguration: (configId: string) => string;
  importConfiguration: (configData: string) => Promise<SupervisionConfig>;
}

const EnhancedSupervisionContext = createContext<EnhancedSupervisionContextType | undefined>(undefined);

// ================================================================================
// Configuration Storage and Management
// ================================================================================

class SupervisionConfigManager {
  private static readonly STORAGE_KEY = 'coder1-supervision-configs';
  private static readonly ACTIVE_CONFIG_KEY = 'coder1-active-supervision-config';
  private static readonly HISTORY_KEY = 'coder1-supervision-history';

  static saveConfigurations(configs: SupervisionConfig[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save supervision configurations:', error);
    }
  }

  static loadConfigurations(): SupervisionConfig[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const configs = JSON.parse(stored);
      // Migrate old configurations if needed
      return configs.map((config: any) => this.migrateConfig(config));
    } catch (error) {
      console.error('Failed to load supervision configurations:', error);
      return [];
    }
  }

  static setActiveConfig(configId: string | null): void {
    try {
      if (configId) {
        localStorage.setItem(this.ACTIVE_CONFIG_KEY, configId);
      } else {
        localStorage.removeItem(this.ACTIVE_CONFIG_KEY);
      }
    } catch (error) {
      console.error('Failed to set active configuration:', error);
    }
  }

  static getActiveConfigId(): string | null {
    try {
      return localStorage.getItem(this.ACTIVE_CONFIG_KEY);
    } catch (error) {
      logger?.error('Failed to get active configuration:', error);
      return null;
    }
  }

  static saveHistory(history: SupervisionInteraction[]): void {
    try {
      // Keep only last 1000 interactions to prevent storage bloat
      const trimmedHistory = history.slice(-1000);
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(trimmedHistory));
    } catch (error) {
      logger?.error('Failed to save supervision history:', error);
    }
  }

  static loadHistory(): SupervisionInteraction[] {
    try {
      const stored = localStorage.getItem(this.HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger?.error('Failed to load supervision history:', error);
      return [];
    }
  }

  // Migration helper for configuration schema updates
  private static migrateConfig(config: any): SupervisionConfig {
    // Ensure all required fields exist with defaults
    return {
      id: config.id || `migrated_${Date.now()}`,
      version: config.version || 1,
      name: config.name || 'Unnamed Configuration',
      description: config.description,
      createdAt: config.createdAt ? new Date(config.createdAt) : new Date(),
      updatedAt: config.updatedAt ? new Date(config.updatedAt) : new Date(),
      projectType: config.projectType || 'react-app',
      projectDescription: config.projectDescription || '',
      personality: config.personality || 'helpful-guide',
      goals: config.goals || ['best-practices'],
      focusAreas: config.focusAreas || [],
      alertThreshold: config.alertThreshold || 'moderate',
      contextAwareness: config.contextAwareness ?? true,
      learningEnabled: config.learningEnabled ?? true,
      customInstructions: config.customInstructions || '',
      customRules: config.customRules || [],
      triggerPatterns: config.triggerPatterns || [],
      ignoredPatterns: config.ignoredPatterns || [],
      environmentContext: config.environmentContext,
      teamSettings: config.teamSettings,
      isActive: config.isActive ?? false,
      isDefault: config.isDefault ?? false,
      tags: config.tags || []
    };
  }
}

// ================================================================================
// Supervision Prompt Generator
// ================================================================================

class SupervisionPromptGenerator {
  static generate(config: SupervisionConfig): string {
    const personalityInstructions = this.getPersonalityInstructions(config.personality);
    const goalInstructions = this.getGoalInstructions(config.goals);
    const thresholdInstructions = this.getThresholdInstructions(config.alertThreshold);
    const contextInstructions = this.getContextInstructions(config);

    return `
You are an AI supervision assistant for a ${config.projectType} project.

PROJECT CONTEXT:
${config.projectDescription ? `Project: ${config.projectDescription}` : ''}
Focus Areas: ${config.focusAreas.join(', ') || 'General development'}

SUPERVISION PERSONALITY:
${personalityInstructions}

PRIMARY OBJECTIVES:
${goalInstructions}

ALERT CONFIGURATION:
${thresholdInstructions}

CUSTOM INSTRUCTIONS:
${config.customInstructions || 'None specified'}

CONTEXT AWARENESS:
${config.contextAwareness ? 'Remember previous interactions and build context over time' : 'Treat each interaction independently'}

LEARNING CAPABILITY:
${config.learningEnabled ? 'Adapt based on user feedback and patterns' : 'Maintain consistent behavior without adaptation'}

MONITORING RULES:
${config.customRules.length > 0 ? 
  config.customRules.map(rule => `- ${rule.name}: ${rule.description}`).join('\n') : 
  'Use standard supervision patterns'}

${contextInstructions}

Monitor all terminal commands, code changes, and development activities. Provide contextual warnings, suggestions, and guidance based on this configuration. Always be helpful and constructive in your supervision.
    `.trim();
  }

  private static getPersonalityInstructions(personality: string): string {
    switch (personality) {
      case 'strict-mentor':
        return 'Act as a strict but caring mentor. Provide immediate warnings about potential issues, maintain high standards, and don\'t let mistakes slide. Be direct but constructive.';
      case 'helpful-guide':
        return 'Act as a helpful guide. Offer constructive suggestions with clear explanations. Balance being supportive with being informative.';
      case 'educational-coach':
        return 'Act as an educational coach. Focus on teaching and explaining concepts. Help the user understand the "why" behind your suggestions. Be patient and thorough in explanations.';
      case 'collaborative-partner':
        return 'Act as a collaborative partner. Work together with the user as an equal. Engage in discussions, ask clarifying questions, and work through problems together.';
      default:
        return 'Act as a balanced AI assistant, providing helpful guidance and suggestions.';
    }
  }

  private static getGoalInstructions(goals: string[]): string {
    const goalDescriptions = {
      security: 'Monitor for security vulnerabilities, authentication issues, data validation problems, and potential attack vectors',
      performance: 'Watch for performance bottlenecks, memory leaks, inefficient algorithms, and optimization opportunities',
      'best-practices': 'Enforce coding standards, design patterns, maintainability practices, and industry conventions',
      accessibility: 'Ensure WCAG compliance, screen reader support, keyboard navigation, and inclusive design practices',
      testing: 'Promote test coverage, testing strategies, test quality, and testable code design',
      documentation: 'Encourage clear documentation, code comments, API documentation, and maintainable code'
    };

    return goals.map(goal => `- ${goalDescriptions[goal as keyof typeof goalDescriptions] || goal}`).join('\n');
  }

  private static getThresholdInstructions(threshold: string): string {
    switch (threshold) {
      case 'minimal':
        return 'Only alert for critical issues that could cause significant problems. Be selective and focus on high-impact items.';
      case 'moderate':
        return 'Alert for important issues and potential improvements. Balance being helpful with not being overwhelming.';
      case 'comprehensive':
        return 'Provide detailed feedback on all aspects of code quality, potential improvements, and best practices.';
      case 'maximum':
        return 'Be extremely thorough. Comment on all aspects of development, including minor optimizations and style preferences.';
      default:
        return 'Provide balanced feedback appropriate to the situation.';
    }
  }

  private static getContextInstructions(config: SupervisionConfig): string {
    let instructions = '';
    
    if (config.triggerPatterns.length > 0) {
      instructions += `\nTRIGGER PATTERNS (pay special attention to):\n${config.triggerPatterns.map(p => `- ${p}`).join('\n')}`;
    }
    
    if (config.ignoredPatterns.length > 0) {
      instructions += `\nIGNORED PATTERNS (don't supervise these):\n${config.ignoredPatterns.map(p => `- ${p}`).join('\n')}`;
    }

    if (config.environmentContext) {
      instructions += `\nENVIRONMENT CONTEXT:\n${config.environmentContext}`;
    }

    return instructions;
  }
}

// ================================================================================
// Enhanced Supervision Provider
// ================================================================================

export function EnhancedSupervisionProvider({ children }: { children: ReactNode }) {
  // Legacy state (backward compatibility)
  const [isSupervisionActive, setIsSupervisionActive] = useState(false);
  const [supervisionStatus, setSupervisionStatus] = useState('inactive');
  const [lastSupervisionCheck, setLastSupervisionCheck] = useState<Date | null>(null);

  // Enhanced state
  const [configurations, setConfigurations] = useState<SupervisionConfig[]>([]);
  const [activeConfiguration, setActiveConfiguration] = useState<SupervisionConfig | null>(null);
  const [defaultConfiguration, setDefaultConfiguration] = useState<SupervisionConfig | null>(null);
  const [templates, setTemplates] = useState<SupervisionTemplate[]>([]);
  const [supervisionHistory, setSupervisionHistory] = useState<SupervisionInteraction[]>([]);
  const [analytics, setAnalytics] = useState<SupervisionAnalytics | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadedConfigs = SupervisionConfigManager.loadConfigurations();
    setConfigurations(loadedConfigs);
    
    const activeConfigId = SupervisionConfigManager.getActiveConfigId();
    if (activeConfigId) {
      const activeConfig = loadedConfigs.find(config => config.id === activeConfigId);
      if (activeConfig) {
        setActiveConfiguration(activeConfig);
      }
    }

    const defaultConfig = loadedConfigs.find(config => config.isDefault);
    setDefaultConfiguration(defaultConfig || null);

    const history = SupervisionConfigManager.loadHistory();
    setSupervisionHistory(history);
  }, []);

  // Auto-save configurations when they change
  useEffect(() => {
    SupervisionConfigManager.saveConfigurations(configurations);
  }, [configurations]);

  // Auto-save history when it changes
  useEffect(() => {
    SupervisionConfigManager.saveHistory(supervisionHistory);
  }, [supervisionHistory]);

  // Legacy WebSocket integration (maintain backward compatibility)
  useEffect(() => {
    const socket = getSocket();

    socket.on('supervision:activated', (data: { timestamp: string, triggeredBy: string }) => {
      // REMOVED: // REMOVED: console.log('👁️ Supervision activated by:', data.triggeredBy);
      setIsSupervisionActive(true);
      setSupervisionStatus('active');
      setLastSupervisionCheck(new Date(data.timestamp));
    });

    socket.on('supervision:deactivated', (data: { timestamp: string }) => {
      // REMOVED: // REMOVED: console.log('👁️ Supervision deactivated');
      setIsSupervisionActive(false);
      setSupervisionStatus('inactive');
      setLastSupervisionCheck(new Date(data.timestamp));
    });

    socket.on('supervision:status', (data: { active: boolean, status: string }) => {
      setIsSupervisionActive(data.active);
      setSupervisionStatus(data.status);
    });

    socket.emit('supervision:get-status');

    return () => {
      socket.off('supervision:activated');
      socket.off('supervision:deactivated');
      socket.off('supervision:status');
    };
  }, []);

  // Configuration operations
  const saveConfiguration = useCallback(async (config: SupervisionConfig) => {
    const existingIndex = configurations.findIndex(c => c.id === config.id);
    
    if (existingIndex >= 0) {
      // Update existing configuration
      const updatedConfigs = [...configurations];
      updatedConfigs[existingIndex] = { ...config, updatedAt: new Date() };
      setConfigurations(updatedConfigs);
    } else {
      // Add new configuration
      setConfigurations(prev => [...prev, { ...config, createdAt: new Date(), updatedAt: new Date() }]);
    }
  }, [configurations]);

  const loadConfiguration = useCallback(async (configId: string): Promise<SupervisionConfig | null> => {
    return configurations.find(config => config.id === configId) || null;
  }, [configurations]);

  const deleteConfiguration = useCallback(async (configId: string) => {
    setConfigurations(prev => prev.filter(config => config.id !== configId));
    if (activeConfiguration?.id === configId) {
      setActiveConfiguration(null);
      SupervisionConfigManager.setActiveConfig(null);
    }
  }, [activeConfiguration]);

  const setActiveConfig = useCallback((config: SupervisionConfig | null) => {
    setActiveConfiguration(config);
    SupervisionConfigManager.setActiveConfig(config?.id || null);
  }, []);

  const setDefaultConfig = useCallback((configId: string) => {
    setConfigurations(prev => 
      prev.map(config => ({
        ...config,
        isDefault: config.id === configId
      }))
    );
  }, []);

  // Legacy supervision operations (backward compatibility)
  const enableSupervision = useCallback(() => {
    if (activeConfiguration) {
      enableCustomSupervision(activeConfiguration);
    } else {
      // Fallback to basic supervision
      const socket = getSocket();
      socket.emit('supervision:enable', { 
        source: 'manual',
        timestamp: new Date().toISOString() 
      });
      setIsSupervisionActive(true);
      setSupervisionStatus('active');
      setLastSupervisionCheck(new Date());
    }
  }, [activeConfiguration]);

  const disableSupervision = useCallback(() => {
    const socket = getSocket();
    socket.emit('supervision:disable', { 
      timestamp: new Date().toISOString() 
    });
    setIsSupervisionActive(false);
    setSupervisionStatus('inactive');
  }, []);

  const toggleSupervision = useCallback(() => {
    if (isSupervisionActive) {
      disableSupervision();
    } else {
      // Open configuration modal instead of direct enable
      setIsConfigModalOpen(true);
    }
  }, [isSupervisionActive, disableSupervision]);

  // Custom supervision operations
  const enableCustomSupervision = useCallback(async (config: SupervisionConfig) => {
    try {
      const prompt = SupervisionPromptGenerator.generate(config);
      
      // Send custom supervision prompt to backend
      const socket = getSocket();
      socket.emit('supervision:enable-custom', {
        config: config,
        prompt: prompt,
        timestamp: new Date().toISOString()
      });
      
      setActiveConfiguration(config);
      setIsSupervisionActive(true);
      setSupervisionStatus('active-custom');
      setLastSupervisionCheck(new Date());
      
      // REMOVED: // REMOVED: console.log('🧠 Custom supervision enabled with configuration:', config.name);
    } catch (error) {
      logger?.error('Failed to enable custom supervision:', error);
      throw error;
    }
  }, []);

  const generateSupervisionPrompt = useCallback((config: SupervisionConfig): string => {
    return SupervisionPromptGenerator.generate(config);
  }, []);

  const validateConfiguration = useCallback((config: Partial<SupervisionConfig>): ConfigurationValidation => {
    const errors: ConfigurationError[] = [];
    const warnings: ConfigurationError[] = [];
    const suggestions: string[] = [];

    if (!config.name?.trim()) {
      errors.push({
        field: 'name' as keyof SupervisionConfig,
        message: 'Configuration name is required',
        severity: 'error' as const
      });
    }

    if (!config.goals?.length) {
      errors.push({
        field: 'goals' as keyof SupervisionConfig,
        message: 'At least one supervision goal is required',
        severity: 'error' as const
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }, []);

  // Advanced operations
  const recordInteraction = useCallback((interaction: Omit<SupervisionInteraction, 'id' | 'timestamp'>) => {
    const newInteraction: SupervisionInteraction = {
      ...interaction,
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    setSupervisionHistory(prev => [...prev, newInteraction]);
  }, []);

  const getSupervisionRecommendations = useCallback((): string[] => {
    // Analyze history and provide recommendations
    const recommendations = [];
    
    if (supervisionHistory.length > 10) {
      const recentInteractions = supervisionHistory.slice(-10);
      const ignoredCount = recentInteractions.filter(i => i.userFeedback === 'ignored').length;
      
      if (ignoredCount > 5) {
        recommendations.push('Consider adjusting alert threshold - many recent suggestions were ignored');
      }
    }
    
    return recommendations;
  }, [supervisionHistory]);

  const exportConfiguration = useCallback((configId: string): string => {
    const config = configurations.find(c => c.id === configId);
    if (!config) throw new Error('Configuration not found');
    
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      config: config
    }, null, 2);
  }, [configurations]);

  const importConfiguration = useCallback(async (configData: string): Promise<SupervisionConfig> => {
    try {
      const imported = JSON.parse(configData);
      const config: SupervisionConfig = {
        ...imported.config,
        id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: false,
        isDefault: false
      };
      
      await saveConfiguration(config);
      return config;
    } catch (error) {
      throw new Error('Invalid configuration data');
    }
  }, [saveConfiguration]);

  const updateSupervisionStatus = useCallback((status: string) => {
    setSupervisionStatus(status);
    setLastSupervisionCheck(new Date());
  }, []);

  const value: EnhancedSupervisionContextType = {
    // Legacy compatibility
    isSupervisionActive,
    supervisionStatus,
    lastSupervisionCheck,
    enableSupervision,
    disableSupervision,
    toggleSupervision,
    updateSupervisionStatus,

    // Enhanced features
    configurations,
    activeConfiguration,
    defaultConfiguration,
    templates,
    saveConfiguration,
    loadConfiguration,
    deleteConfiguration,
    setActiveConfiguration: setActiveConfig,
    setDefaultConfiguration: setDefaultConfig,
    enableCustomSupervision,
    generateSupervisionPrompt,
    validateConfiguration,
    supervisionHistory,
    analytics,
    isConfigModalOpen,
    setConfigModalOpen: setIsConfigModalOpen,
    recordInteraction,
    getSupervisionRecommendations,
    exportConfiguration,
    importConfiguration
  };

  return (
    <EnhancedSupervisionContext.Provider value={value}>
      {children}
    </EnhancedSupervisionContext.Provider>
  );
}

export function useEnhancedSupervision() {
  const context = useContext(EnhancedSupervisionContext);
  if (context === undefined) {
    throw new Error('useEnhancedSupervision must be used within an EnhancedSupervisionProvider');
  }
  return context;
}

// Backward compatibility export
export const useSupervision = useEnhancedSupervision;