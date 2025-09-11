'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Users, Terminal, Eye } from '@/lib/icons';

interface OnboardingTooltip {
  id: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  icon: React.ReactNode;
  action?: {
    text: string;
    onClick: () => void;
  };
}

interface EnhancedAgentsOnboardingProps {
  isVisible: boolean;
  onClose: () => void;
}

const EnhancedAgentsOnboarding: React.FC<EnhancedAgentsOnboardingProps> = ({
  isVisible,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isEnhancedAgentsEnabled, setIsEnhancedAgentsEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isEnabled = process.env.NODE_ENV === 'development' && 
                       localStorage.getItem('coder1-enable-enhanced-agents') === 'true';
      setIsEnhancedAgentsEnabled(isEnabled);
    }
  }, []);

  const steps = [
    {
      id: 'welcome',
      title: '🚀 Welcome to Enhanced Agents!',
      description: 'Discover AI-powered team coordination that makes coding faster and more intuitive.',
      icon: <Sparkles className="w-6 h-6 text-cyan-400" />,
    },
    {
      id: 'test-first',
      title: '🧪 Try it Safely First?',
      description: 'New to this? Test in our safe environment first before using the real IDE. No risk of breaking anything!',
      icon: <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">T</div>,
      action: {
        text: 'Open Safe Test Environment',
        onClick: () => {
          window.open('/test-enhanced-agents', '_blank');
        }
      }
    },
    {
      id: 'enable',
      title: '🔧 Ready to Enable?',
      description: isEnhancedAgentsEnabled 
        ? 'Enhanced agents are already enabled! You can start using them right away.' 
        : 'Enable enhanced agents to unlock AI team coordination in this IDE.',
      icon: <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>,
      action: isEnhancedAgentsEnabled 
        ? undefined 
        : {
            text: 'Enable Enhanced Agents',
            onClick: () => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('coder1-enable-enhanced-agents', 'true');
                localStorage.setItem('coder1-agent-visualization', 'true');
                localStorage.setItem('coder1-natural-handoffs', 'true');
                window.location.reload();
              }
            }
          }
    },
    {
      id: 'terminal',
      title: '🖥️ Enhanced Terminal',
      description: 'Type "claude" commands to get intelligent responses. Complex requests trigger AI team suggestions.',
      icon: <Terminal className="w-6 h-6 text-green-400" />,
    },
    {
      id: 'preview',
      title: '👁️ Agent Dashboard',
      description: 'Watch agents assemble and coordinate in real-time in the Preview Panel → Agent Dashboard tab.',
      icon: <Eye className="w-6 h-6 text-purple-400" />,
    },
    {
      id: 'teams',
      title: '👥 AI Team Assembly',
      description: 'Complex commands like "claude build a dashboard" trigger team suggestions with live agent visualization.',
      icon: <Users className="w-6 h-6 text-yellow-400" />,
    },
  ];

  const currentStepData = steps[currentStep];

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-coder1-cyan/50 rounded-lg shadow-2xl shadow-coder1-cyan/20 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <div className="flex items-center gap-3">
            {currentStepData.icon}
            <h2 className="text-lg font-semibold text-text-primary">
              {currentStepData.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-tertiary rounded transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-text-secondary leading-relaxed mb-6">
            {currentStepData.description}
          </p>

          {/* Special content for first step if enhanced agents are disabled */}
          {currentStep === 0 && !isEnhancedAgentsEnabled && (
            <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-400">⚠️</span>
                <span className="text-yellow-400 font-medium">Enhanced Agents Disabled</span>
              </div>
              <p className="text-yellow-200 text-sm">
                Click the button below to activate enhanced agents and unlock AI team coordination features.
              </p>
            </div>
          )}

          {/* Try it examples */}
          {currentStep === 1 && (
            <div className="bg-bg-tertiary rounded-lg p-4 mb-6">
              <h4 className="text-text-primary font-medium mb-2">Try these commands:</h4>
              <div className="space-y-2 font-mono text-sm">
                <div className="text-green-400">claude fix this bug</div>
                <div className="text-cyan-400">claude build a dashboard</div>
                <div className="text-purple-400">claude create a full app</div>
              </div>
            </div>
          )}

          {/* Action button */}
          {currentStepData.action && (
            <button
              onClick={currentStepData.action.onClick}
              className="w-full px-4 py-3 bg-gradient-to-r from-coder1-purple to-coder1-cyan text-white font-semibold rounded-lg hover:from-coder1-purple/80 hover:to-coder1-cyan/80 transition-all duration-200 mb-4"
            >
              {currentStepData.action.text}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border-default">
          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-coder1-cyan' 
                    : index < currentStep 
                      ? 'bg-coder1-purple' 
                      : 'bg-border-default'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-3 py-1 text-text-secondary hover:text-text-primary transition-colors"
              >
                Previous
              </button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-4 py-2 bg-coder1-cyan hover:bg-coder1-cyan/80 text-black font-medium rounded transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-coder1-purple hover:bg-coder1-purple/80 text-white font-medium rounded transition-colors"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAgentsOnboarding;