'use client';

import React, { useState, useCallback } from 'react';
import { X, ArrowLeft, ArrowRight, Save, Sparkles, Brain, CheckCircle, ChevronDown } from '@/lib/icons';
import type {
  SupervisionConfig,
  SupervisionTemplate,
} from '@/types/supervision';

interface SupervisionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: SupervisionConfig) => void;
  currentConfig?: SupervisionConfig | null;
  templates: SupervisionTemplate[];
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
}: SupervisionConfigModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('learning-assistant');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState<'minimal' | 'moderate' | 'comprehensive'>('moderate');
  const [customInstructions, setCustomInstructions] = useState('');
  const [configName, setConfigName] = useState('');
  const [previewContent, setPreviewContent] = useState('');

  const selectedTemplate = DEFAULT_TEMPLATES.find(t => t.id === selectedTemplateId) ?? DEFAULT_TEMPLATES[0];

  const handleSave = useCallback(() => {
    const template = DEFAULT_TEMPLATES.find(t => t.id === selectedTemplateId) ?? DEFAULT_TEMPLATES[0];
    const finalConfig: SupervisionConfig = {
      id: currentConfig?.id || `supervision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      version: 1,
      name: configName.trim() || template.name,
      description: template.description,
      createdAt: currentConfig?.createdAt || new Date(),
      updatedAt: new Date(),
      projectType: template.config.projectType!,
      projectDescription: '',
      personality: template.config.personality!,
      goals: template.config.goals || [],
      focusAreas: template.config.focusAreas || [],
      alertThreshold: alertThreshold,
      contextAwareness: template.config.contextAwareness ?? true,
      learningEnabled: template.config.learningEnabled ?? true,
      customInstructions: customInstructions,
      customRules: [],
      triggerPatterns: [],
      ignoredPatterns: [],
      isActive: true,
      isDefault: false,
      tags: []
    };
    onSave(finalConfig);
    onClose();
  }, [selectedTemplateId, configName, alertThreshold, customInstructions, currentConfig, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] mx-4 bg-bg-secondary border border-coder1-cyan/30 rounded-xl shadow-lg flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-coder1-cyan to-coder1-purple rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">AI Supervision</h2>
              <p className="text-xs text-text-muted">
                {step === 1 ? 'Choose how to monitor your session' : 'Review and activate'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1 Content */}
        {step === 1 && (
          <div className="p-5 space-y-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {DEFAULT_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedTemplateId === template.id
                      ? 'border-coder1-cyan bg-coder1-cyan/10'
                      : 'border-border-default bg-bg-tertiary hover:border-coder1-cyan/40'
                  }`}
                >
                  <div className="text-2xl mb-2">{template.icon}</div>
                  <div className="font-medium text-text-primary text-sm mb-1">{template.name}</div>
                  <p className="text-xs text-text-muted leading-relaxed">{template.description}</p>
                </button>
              ))}
            </div>

            {/* Advanced collapsible */}
            <div>
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors py-1"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                Advanced options
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-3 pl-2 border-l border-border-default">
                  {/* Config name */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Configuration name (optional)</label>
                    <input
                      type="text"
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                      placeholder={selectedTemplate.name}
                      className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded text-sm text-text-primary focus:border-coder1-cyan focus:outline-none"
                    />
                  </div>

                  {/* Alert sensitivity */}
                  <div>
                    <label className="block text-xs text-text-muted mb-2">Sensitivity</label>
                    <div className="flex gap-2">
                      {(['minimal', 'moderate', 'comprehensive'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setAlertThreshold(level)}
                          className={`flex-1 py-1.5 px-2 rounded text-xs border transition-colors ${
                            alertThreshold === level
                              ? 'border-coder1-cyan bg-coder1-cyan/10 text-coder1-cyan'
                              : 'border-border-default text-text-muted hover:border-coder1-cyan/40'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom instructions */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Custom instructions (optional)</label>
                    <textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      rows={3}
                      placeholder="Any specific rules or context for your project..."
                      className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded text-sm text-text-primary focus:border-coder1-cyan focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2 Content */}
        {step === 2 && (
          <div className="p-8 flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="text-5xl mb-2">{selectedTemplate.icon}</div>
            <div>
              <h3 className="text-xl font-semibold text-text-primary">{selectedTemplate.name}</h3>
              <p className="text-sm text-text-muted mt-1">{selectedTemplate.description}</p>
            </div>

            <div className="w-full max-w-sm text-left space-y-2 mt-2">
              <p className="text-xs text-text-muted uppercase tracking-wider">Your supervisor will:</p>
              {(selectedTemplate.config.goals || []).map((goal) => (
                <div key={goal} className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle className="w-4 h-4 text-coder1-cyan flex-shrink-0" />
                  <span className="capitalize">{goal.replace(/-/g, ' ')}</span>
                </div>
              ))}
              {selectedTemplate.config.alertThreshold === 'comprehensive' && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle className="w-4 h-4 text-coder1-cyan flex-shrink-0" />
                  <span>Comprehensive monitoring</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border-default">
          <button
            onClick={() => step === 2 ? setStep(1) : onClose()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 2 ? 'Back' : 'Cancel'}
          </button>

          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-coder1-cyan to-coder1-purple text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-coder1-cyan to-coder1-purple text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              <Save className="w-4 h-4" />
              Activate Supervision
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
