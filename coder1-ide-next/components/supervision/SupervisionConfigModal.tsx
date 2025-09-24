'use client';

import React, { useState, useReducer, useMemo, useCallback, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Eye, Wand2, Save, SettingsIcon, Sparkles, Brain, Shield, Zap, BookOpen, CheckCircle, AlertCircle, Info } from '@/lib/icons';
import { glows } from '@/lib/design-tokens';
import type { 
  SupervisionConfig, 
  SupervisionTemplate, 
  ProjectType, 
  SupervisionPersonality, 
  SupervisionGoal,
  AlertThreshold,
  ConfigurationStep,
  ConfigurationValidation 
} from '@/types/supervision';

interface SupervisionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: SupervisionConfig) => void;
  currentConfig?: SupervisionConfig | null;
  templates: SupervisionTemplate[];
}

// ================================================================================
// State Management with useReducer for Complex State
// ================================================================================

interface ConfigModalState {
  currentStep: ConfigurationStep;
  config: Partial<SupervisionConfig>;
  validation: ConfigurationValidation;
  isPreviewMode: boolean;
  selectedTemplate: SupervisionTemplate | null;
  customRuleFormVisible: boolean;
  isGeneratingPreview: boolean;
}

type ConfigModalAction = 
  | { type: 'SET_STEP'; step: ConfigurationStep }
  | { type: 'UPDATE_CONFIG'; updates: Partial<SupervisionConfig> }
  | { type: 'SET_TEMPLATE'; template: SupervisionTemplate | null }
  | { type: 'SET_VALIDATION'; validation: ConfigurationValidation }
  | { type: 'TOGGLE_PREVIEW' }
  | { type: 'TOGGLE_CUSTOM_RULES' }
  | { type: 'SET_GENERATING_PREVIEW'; generating: boolean }
  | { type: 'RESET_CONFIG' };

const initialState: ConfigModalState = {
  currentStep: 'project-context',
  config: {
    name: '',
    projectType: 'react-app',
    projectDescription: '',
    personality: 'helpful-guide',
    goals: ['best-practices'],
    alertThreshold: 'moderate',
    customInstructions: '',
    focusAreas: [],
    customRules: [],
    contextAwareness: true,
    learningEnabled: true,
    triggerPatterns: [],
    ignoredPatterns: [],
    tags: []
  },
  validation: { isValid: false, errors: [], warnings: [], suggestions: [] },
  isPreviewMode: false,
  selectedTemplate: null,
  customRuleFormVisible: false,
  isGeneratingPreview: false
};

function configModalReducer(state: ConfigModalState, action: ConfigModalAction): ConfigModalState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'UPDATE_CONFIG':
      return { 
        ...state, 
        config: { ...state.config, ...action.updates }
      };
    case 'SET_TEMPLATE':
      return {
        ...state,
        selectedTemplate: action.template,
        config: action.template ? { ...state.config, ...action.template.config } : state.config
      };
    case 'SET_VALIDATION':
      return { ...state, validation: action.validation };
    case 'TOGGLE_PREVIEW':
      return { ...state, isPreviewMode: !state.isPreviewMode };
    case 'TOGGLE_CUSTOM_RULES':
      return { ...state, customRuleFormVisible: !state.customRuleFormVisible };
    case 'SET_GENERATING_PREVIEW':
      return { ...state, isGeneratingPreview: action.generating };
    case 'RESET_CONFIG':
      return initialState;
    default:
      return state;
  }
}

// ================================================================================
// Pre-defined Templates for Quick Setup
// ================================================================================

const DEFAULT_TEMPLATES: SupervisionTemplate[] = [
  {
    id: 'security-focused',
    name: 'Security-First Development',
    description: 'Strict security monitoring for production applications handling sensitive data',
    category: 'security',
    icon: '🔐',
    popularity: 9.2,
    config: {
      projectType: 'full-stack',
      personality: 'strict-mentor',
      goals: ['security', 'best-practices'],
      alertThreshold: 'comprehensive',
      customInstructions: 'This application handles sensitive user data. Be extremely vigilant about authentication, authorization, data validation, and potential security vulnerabilities.',
      focusAreas: ['authentication', 'data-validation', 'xss-prevention', 'sql-injection'],
      contextAwareness: true,
      learningEnabled: true
    }
  },
  {
    id: 'learning-assistant',
    name: 'Educational Coding Coach',
    description: 'Patient teacher for developers learning new technologies and best practices',
    category: 'learning',
    icon: '🎓',
    popularity: 8.7,
    config: {
      projectType: 'learning',
      personality: 'educational-coach',
      goals: ['best-practices', 'documentation'],
      alertThreshold: 'moderate',
      customInstructions: 'I am learning to code. Please explain concepts clearly, suggest better approaches, and help me understand why certain practices are recommended.',
      focusAreas: ['code-organization', 'naming-conventions', 'error-handling'],
      contextAwareness: true,
      learningEnabled: true
    }
  },
  {
    id: 'performance-optimizer',
    name: 'Performance Excellence',
    description: 'Focused on speed, efficiency, and optimization for high-traffic applications',
    category: 'performance',
    icon: '⚡',
    popularity: 8.1,
    config: {
      projectType: 'react-app',
      personality: 'collaborative-partner',
      goals: ['performance', 'best-practices'],
      alertThreshold: 'comprehensive',
      customInstructions: 'This application needs to handle high traffic and perform excellently. Focus on bundle size, render performance, memory usage, and optimization opportunities.',
      focusAreas: ['bundle-size', 'render-performance', 'memory-leaks', 'lazy-loading'],
      contextAwareness: true,
      learningEnabled: true
    }
  },
  {
    id: 'team-collaboration',
    name: 'Team Development Standards',
    description: 'Enforce consistent coding standards and practices across development teams',
    category: 'team',
    icon: '👥',
    popularity: 7.9,
    config: {
      projectType: 'enterprise',
      personality: 'helpful-guide',
      goals: ['best-practices', 'documentation', 'testing'],
      alertThreshold: 'moderate',
      customInstructions: 'This is a team project. Enforce consistent coding standards, require proper documentation, and ensure code is maintainable by multiple developers.',
      focusAreas: ['code-consistency', 'documentation', 'test-coverage', 'code-review-readiness'],
      contextAwareness: true,
      learningEnabled: false
    }
  }
];

// ================================================================================
// Main Component
// ================================================================================

export default function SupervisionConfigModal({
  isOpen,
  onClose,
  onSave,
  currentConfig,
  templates
}: SupervisionConfigModalProps) {
  const [state, dispatch] = useReducer(configModalReducer, initialState);
  const [previewContent, setPreviewContent] = useState<string>('');
  
  // Combine provided templates with defaults
  const allTemplates = useMemo(() => [
    ...DEFAULT_TEMPLATES,
    ...templates
  ], [templates]);

  // Auto-detect project type based on codebase (placeholder for future implementation)
  const detectedProjectType = useMemo((): ProjectType => {
    // TODO: Implement actual project detection based on package.json, file structure, etc.
    // For now, return a sensible default
    return 'react-app';
  }, []);

  // Validation logic
  const validateConfig = useCallback((config: Partial<SupervisionConfig>): ConfigurationValidation => {
    const errors = [];
    const warnings = [];
    const suggestions = [];

    // Required field validation
    if (!config.name?.trim()) {
      errors.push({
        field: 'name' as keyof SupervisionConfig,
        message: 'Configuration name is required',
        severity: 'error' as const,
        suggestedFix: 'Enter a descriptive name for your supervision configuration'
      });
    }

    if (!config.projectDescription?.trim()) {
      warnings.push({
        field: 'projectDescription' as keyof SupervisionConfig,
        message: 'Project description helps create better supervision',
        severity: 'warning' as const,
        suggestedFix: 'Add a brief description of what you\'re building'
      });
    }

    // Logic validation
    if (config.goals?.length === 0) {
      errors.push({
        field: 'goals' as keyof SupervisionConfig,
        message: 'At least one supervision goal is required',
        severity: 'error' as const,
        suggestedFix: 'Select what aspects of your code should be supervised'
      });
    }

    // Suggestions based on configuration
    if (config.projectType === 'learning' && config.alertThreshold === 'minimal') {
      suggestions.push('Consider using "moderate" or "comprehensive" alerts when learning - more feedback helps you improve faster');
    }

    if (config.goals?.includes('security') && !config.goals?.includes('best-practices')) {
      suggestions.push('Security-focused projects often benefit from best practices supervision too');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }, []);

  // Update validation when config changes
  useEffect(() => {
    const validation = validateConfig(state.config);
    dispatch({ type: 'SET_VALIDATION', validation });
  }, [state.config, validateConfig]);

  // Initialize with current config if provided
  useEffect(() => {
    if (currentConfig && isOpen) {
      dispatch({ 
        type: 'UPDATE_CONFIG', 
        updates: currentConfig 
      });
    }
  }, [currentConfig, isOpen]);

  // Step navigation
  const steps: ConfigurationStep[] = [
    'project-context',
    'supervision-goals', 
    'personality',
    'custom-rules',
    'preview',
    'save-config'
  ];

  const currentStepIndex = steps.indexOf(state.currentStep);
  const canGoNext = currentStepIndex < steps.length - 1;
  const canGoPrevious = currentStepIndex > 0;

  const goToStep = useCallback((step: ConfigurationStep) => {
    dispatch({ type: 'SET_STEP', step });
  }, []);

  const goNext = useCallback(() => {
    if (canGoNext) {
      goToStep(steps[currentStepIndex + 1]);
    }
  }, [canGoNext, currentStepIndex, steps, goToStep]);

  const goPrevious = useCallback(() => {
    if (canGoPrevious) {
      goToStep(steps[currentStepIndex - 1]);
    }
  }, [canGoPrevious, currentStepIndex, steps, goToStep]);

  // Generate supervision preview
  const generatePreview = useCallback(async () => {
    dispatch({ type: 'SET_GENERATING_PREVIEW', generating: true });
    
    try {
      // Simulate AI prompt generation (replace with actual Claude API call)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const preview = `
You are an AI supervisor for a ${state.config.projectType} project.

PROJECT: ${state.config.projectDescription || 'User\'s development project'}

SUPERVISION PERSONALITY: ${state.config.personality}
${state.config.personality === 'strict-mentor' ? '- Provide immediate warnings and maintain high standards' :
  state.config.personality === 'helpful-guide' ? '- Offer constructive suggestions with explanations' :
  state.config.personality === 'educational-coach' ? '- Focus on teaching and explaining concepts' :
  '- Collaborate as an equal partner in development'}

PRIMARY FOCUS AREAS: ${state.config.goals?.join(', ')}
ALERT THRESHOLD: ${state.config.alertThreshold}

${state.config.customInstructions ? `CUSTOM INSTRUCTIONS: ${state.config.customInstructions}` : ''}

Monitor all terminal commands, code changes, and development activities.
Provide contextual warnings, suggestions, and guidance based on this configuration.
`;
      
      setPreviewContent(preview.trim());
    } catch (error) {
      setPreviewContent('Error generating preview. Please check your configuration.');
    } finally {
      dispatch({ type: 'SET_GENERATING_PREVIEW', generating: false });
    }
  }, [state.config]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!state.validation.isValid) {
      return;
    }

    const finalConfig: SupervisionConfig = {
      id: currentConfig?.id || `supervision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      version: 1,
      name: state.config.name!,
      description: state.config.projectDescription,
      createdAt: currentConfig?.createdAt || new Date(),
      updatedAt: new Date(),
      projectType: state.config.projectType!,
      projectDescription: state.config.projectDescription || '',
      personality: state.config.personality!,
      goals: state.config.goals || [],
      focusAreas: state.config.focusAreas || [],
      alertThreshold: state.config.alertThreshold!,
      contextAwareness: state.config.contextAwareness || true,
      learningEnabled: state.config.learningEnabled || true,
      customInstructions: state.config.customInstructions || '',
      customRules: state.config.customRules || [],
      triggerPatterns: state.config.triggerPatterns || [],
      ignoredPatterns: state.config.ignoredPatterns || [],
      environmentContext: state.config.environmentContext,
      teamSettings: state.config.teamSettings,
      isActive: true,
      isDefault: currentConfig?.isDefault || false,
      tags: state.config.tags || []
    };

    onSave(finalConfig);
    onClose();
  }, [state.config, state.validation.isValid, currentConfig, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 sm:mx-0 bg-bg-secondary border border-coder1-cyan/50 rounded-lg shadow-glow-cyan flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border-default bg-bg-tertiary">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-coder1-cyan to-coder1-purple rounded-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Program Your AI Supervision Bot
              </h2>
              <p className="text-sm text-text-muted">
                Step {currentStepIndex + 1} of {steps.length}: Create a custom AI assistant for your project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-bg-tertiary">
          <div 
            className="h-full bg-gradient-to-r from-coder1-cyan to-coder1-purple transition-all duration-500"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          {/* Step 1: Project Context */}
          {state.currentStep === 'project-context' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Tell me about your project
                </h3>
                <p className="text-sm text-text-muted mb-6">
                  Help me understand what you're building so I can provide the best supervision
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Configuration Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={state.config.name || ''}
                  onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', updates: { name: e.target.value } })}
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:border-coder1-cyan focus:outline-none focus:ring-1 focus:ring-coder1-cyan/50"
                  placeholder="e.g., My React App Supervisor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Project Type <span className="text-error">*</span>
                </label>
                <select
                  value={state.config.projectType || 'react-app'}
                  onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', updates: { projectType: e.target.value as ProjectType } })}
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:border-coder1-cyan focus:outline-none focus:ring-1 focus:ring-coder1-cyan/50"
                >
                  <option value="react-app">React Application</option>
                  <option value="node-backend">Node.js Backend</option>
                  <option value="full-stack">Full-Stack Application</option>
                  <option value="python-script">Python Project</option>
                  <option value="data-science">Data Science / ML</option>
                  <option value="mobile-app">Mobile Application</option>
                  <option value="enterprise">Enterprise Software</option>
                  <option value="learning">Learning / Tutorial Project</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  What are you building?
                </label>
                <textarea
                  value={state.config.projectDescription || ''}
                  onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', updates: { projectDescription: e.target.value } })}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:border-coder1-cyan focus:outline-none focus:ring-1 focus:ring-coder1-cyan/50 resize-none"
                  rows={4}
                  placeholder="Describe your project in a few sentences. What does it do? Who is it for? What technologies are you using?"
                />
              </div>

              {/* Template suggestions */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Quick Templates
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {allTemplates.slice(0, 4).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => dispatch({ type: 'SET_TEMPLATE', template })}
                      className={`p-3 bg-bg-tertiary border rounded-lg text-left hover:border-coder1-cyan transition-colors ${
                        state.selectedTemplate?.id === template.id ? 'border-coder1-cyan bg-coder1-cyan/10' : 'border-border-default'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{template.icon}</span>
                        <span className="text-sm font-medium text-text-primary">{template.name}</span>
                      </div>
                      <p className="text-xs text-text-muted line-clamp-2">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Supervision Goals */}
          {state.currentStep === 'supervision-goals' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  What should I focus on?
                </h3>
                <p className="text-sm text-text-muted mb-6">
                  Select the areas where you'd like supervision and guidance
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Primary Goals <span className="text-error">*</span>
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'best-practices', label: 'Best Practices', icon: '✨', description: 'Follow industry standards and conventions' },
                    { value: 'security', label: 'Security', icon: '🔐', description: 'Identify vulnerabilities and security issues' },
                    { value: 'performance', label: 'Performance', icon: '⚡', description: 'Optimize speed and efficiency' },
                    { value: 'testing', label: 'Testing', icon: '🧪', description: 'Ensure comprehensive test coverage' },
                    { value: 'documentation', label: 'Documentation', icon: '📚', description: 'Maintain clear code documentation' },
                    { value: 'accessibility', label: 'Accessibility', icon: '♿', description: 'Ensure inclusive user experience' }
                  ].map((goal) => (
                    <label
                      key={goal.value}
                      className="flex items-start gap-3 p-3 bg-bg-tertiary border border-border-default rounded-lg hover:border-coder1-cyan/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={state.config.goals?.includes(goal.value as SupervisionGoal) || false}
                        onChange={(e) => {
                          const currentGoals = state.config.goals || [];
                          const newGoals = e.target.checked
                            ? [...currentGoals, goal.value as SupervisionGoal]
                            : currentGoals.filter(g => g !== goal.value);
                          dispatch({ type: 'UPDATE_CONFIG', updates: { goals: newGoals } });
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span>{goal.icon}</span>
                          <span className="font-medium text-text-primary">{goal.label}</span>
                        </div>
                        <p className="text-xs text-text-muted mt-1">{goal.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Alert Threshold
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'minimal', label: 'Minimal', description: 'Only critical issues' },
                    { value: 'moderate', label: 'Moderate', description: 'Important suggestions' },
                    { value: 'comprehensive', label: 'Comprehensive', description: 'All improvements' }
                  ].map((threshold) => (
                    <button
                      key={threshold.value}
                      onClick={() => dispatch({ type: 'UPDATE_CONFIG', updates: { alertThreshold: threshold.value as AlertThreshold } })}
                      className={`p-3 bg-bg-tertiary border rounded-lg text-center hover:border-coder1-cyan transition-colors ${
                        state.config.alertThreshold === threshold.value ? 'border-coder1-cyan bg-coder1-cyan/10' : 'border-border-default'
                      }`}
                    >
                      <div className="font-medium text-text-primary mb-1">{threshold.label}</div>
                      <p className="text-xs text-text-muted">{threshold.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Personality */}
          {state.currentStep === 'personality' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  How should I communicate?
                </h3>
                <p className="text-sm text-text-muted mb-6">
                  Choose the supervision style that works best for you
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    value: 'helpful-guide',
                    label: 'Helpful Guide',
                    icon: '🤝',
                    description: 'Friendly suggestions and constructive feedback',
                    example: '"Hey! I noticed you might want to add error handling here. This would help prevent crashes when the API fails."'
                  },
                  {
                    value: 'strict-mentor',
                    label: 'Strict Mentor',
                    icon: '👨‍🏫',
                    description: 'Direct warnings and high standards',
                    example: '"⚠️ WARNING: No input validation detected. This creates a security vulnerability. Fix immediately."'
                  },
                  {
                    value: 'educational-coach',
                    label: 'Educational Coach',
                    icon: '🎓',
                    description: 'Teaching-focused with detailed explanations',
                    example: '"Let me explain why this matters: Without error boundaries, one component crash can break your entire app..."'
                  },
                  {
                    value: 'collaborative-partner',
                    label: 'Collaborative Partner',
                    icon: '🤝',
                    description: 'Work together as equals',
                    example: '"What do you think about refactoring this? We could improve performance by memoizing these calculations."'
                  }
                ].map((personality) => (
                  <button
                    key={personality.value}
                    onClick={() => dispatch({ type: 'UPDATE_CONFIG', updates: { personality: personality.value as SupervisionPersonality } })}
                    className={`p-4 bg-bg-tertiary border rounded-lg text-left hover:border-coder1-cyan transition-colors ${
                      state.config.personality === personality.value ? 'border-coder1-cyan bg-coder1-cyan/10' : 'border-border-default'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{personality.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-text-primary mb-1">{personality.label}</div>
                        <p className="text-sm text-text-muted mb-2">{personality.description}</p>
                        <div className="p-2 bg-bg-secondary rounded text-xs text-text-secondary italic">
                          {personality.example}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Custom Rules */}
          {state.currentStep === 'custom-rules' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Custom Instructions (Optional)
                </h3>
                <p className="text-sm text-text-muted mb-6">
                  Add any specific rules or requirements for your project
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Special Instructions
                </label>
                <textarea
                  value={state.config.customInstructions || ''}
                  onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', updates: { customInstructions: e.target.value } })}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:border-coder1-cyan focus:outline-none focus:ring-1 focus:ring-coder1-cyan/50 resize-none"
                  rows={6}
                  placeholder="Example:\n- Always use TypeScript strict mode\n- Prefer functional components over class components\n- Follow our company's specific naming conventions\n- Alert me immediately if I use any deprecated APIs"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Enable Context Awareness
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-bg-tertiary border border-border-default rounded-lg cursor-pointer hover:border-coder1-cyan/50">
                    <input
                      type="checkbox"
                      checked={state.config.contextAwareness !== false}
                      onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', updates: { contextAwareness: e.target.checked } })}
                    />
                    <div>
                      <div className="font-medium text-text-primary">Learn from my patterns</div>
                      <p className="text-xs text-text-muted">Adapt to your coding style over time</p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Enable Learning Mode
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-bg-tertiary border border-border-default rounded-lg cursor-pointer hover:border-coder1-cyan/50">
                    <input
                      type="checkbox"
                      checked={state.config.learningEnabled !== false}
                      onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', updates: { learningEnabled: e.target.checked } })}
                    />
                    <div>
                      <div className="font-medium text-text-primary">Remember preferences</div>
                      <p className="text-xs text-text-muted">Save feedback for future sessions</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Preview */}
          {state.currentStep === 'preview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Review Your Supervision Configuration
                </h3>
                <p className="text-sm text-text-muted mb-6">
                  This is how your AI supervisor will behave
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-bg-tertiary border border-border-default rounded-lg">
                  <h4 className="font-medium text-text-primary mb-3">Configuration Summary</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-text-muted">Name:</dt>
                      <dd className="text-text-primary">{state.config.name || 'Unnamed'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-muted">Project Type:</dt>
                      <dd className="text-text-primary">{state.config.projectType}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-muted">Personality:</dt>
                      <dd className="text-text-primary">{state.config.personality}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-muted">Alert Level:</dt>
                      <dd className="text-text-primary">{state.config.alertThreshold}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-muted">Goals:</dt>
                      <dd className="text-text-primary">{state.config.goals?.join(', ') || 'None'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 bg-bg-tertiary border border-border-default rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-text-primary">AI Prompt Preview</h4>
                    <button
                      onClick={generatePreview}
                      disabled={state.isGeneratingPreview}
                      className="px-3 py-1 bg-coder1-cyan text-white text-sm rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {state.isGeneratingPreview ? (
                        <><Sparkles className="w-4 h-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Generate Preview</>
                      )}
                    </button>
                  </div>
                  {previewContent ? (
                    <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono">
                      {previewContent}
                    </pre>
                  ) : (
                    <p className="text-sm text-text-muted italic">Click "Generate Preview" to see how your supervision will work</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Save */}
          {state.currentStep === 'save-config' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="inline-flex p-4 bg-gradient-to-br from-coder1-cyan to-coder1-purple rounded-full mb-4">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  Your Supervision Bot is Ready!
                </h3>
                <p className="text-sm text-text-muted mb-6">
                  Click "Save & Activate" to start intelligent supervision
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-coder1-cyan/10 border border-coder1-cyan/30 rounded-lg">
                  <h4 className="font-medium text-coder1-cyan mb-2">What happens next?</h4>
                  <ul className="space-y-1 text-sm text-text-secondary">
                    <li>✓ Your custom supervision configuration will be saved</li>
                    <li>✓ AI will monitor your terminal commands and code changes</li>
                    <li>✓ You'll receive contextual guidance based on your settings</li>
                    <li>✓ Supervision adapts to your project over time</li>
                  </ul>
                </div>

                <label className="flex items-center gap-3 p-3 bg-bg-tertiary border border-border-default rounded-lg cursor-pointer hover:border-coder1-cyan/50">
                  <input
                    type="checkbox"
                    checked={currentConfig?.isDefault || false}
                    onChange={(e) => {
                      // This would set as default config
                    }}
                  />
                  <div>
                    <div className="font-medium text-text-primary">Set as default configuration</div>
                    <p className="text-xs text-text-muted">Use this for all new sessions</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-border-default bg-bg-tertiary">
          <button
            onClick={goPrevious}
            disabled={!canGoPrevious}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {/* Validation Status */}
            {state.validation.errors.length > 0 && (
              <div className="flex items-center gap-1 text-sm text-error">
                <AlertCircle className="w-4 h-4" />
                {state.validation.errors.length} error{state.validation.errors.length !== 1 ? 's' : ''}
              </div>
            )}
            {state.validation.warnings.length > 0 && (
              <div className="flex items-center gap-1 text-sm text-warning">
                <Info className="w-4 h-4" />
                {state.validation.warnings.length} warning{state.validation.warnings.length !== 1 ? 's' : ''}
              </div>
            )}
            {state.validation.isValid && (
              <div className="flex items-center gap-1 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" />
                Ready
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {state.currentStep === 'save-config' ? (
              <button
                onClick={handleSave}
                disabled={!state.validation.isValid}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-coder1-cyan to-coder1-purple text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                <Save className="w-4 h-4" />
                Save & Activate
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canGoNext}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-bg-secondary transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}