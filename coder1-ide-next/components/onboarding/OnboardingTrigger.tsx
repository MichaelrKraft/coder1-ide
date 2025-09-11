'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X } from '@/lib/icons';

interface OnboardingTriggerProps {
  onTrigger: () => void;
}

const OnboardingTrigger: React.FC<OnboardingTriggerProps> = ({ onTrigger }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const [isEnhancedAgentsEnabled, setIsEnhancedAgentsEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenOnboarding = localStorage.getItem('coder1-onboarding-seen');
      const isEnabled = process.env.NODE_ENV === 'development' && 
                       localStorage.getItem('coder1-enable-enhanced-agents') === 'true';
      
      setHasSeenOnboarding(!!hasSeenOnboarding);
      setIsEnhancedAgentsEnabled(isEnabled);
      
      // Show trigger if they haven't seen onboarding OR if enhanced agents aren't enabled
      if (!hasSeenOnboarding || !isEnabled) {
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 3000); // Show after 3 seconds
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('coder1-onboarding-trigger-dismissed', 'true');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 animate-bounce">
      <div className="bg-gradient-to-r from-coder1-purple to-coder1-cyan p-4 rounded-lg shadow-2xl border border-white/20 max-w-xs">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <h3 className="text-white font-semibold text-sm">
              {!isEnhancedAgentsEnabled ? 'Try Enhanced Agents!' : 'New to Enhanced Agents?'}
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        
        <p className="text-white/90 text-xs mb-3">
          {!isEnhancedAgentsEnabled 
            ? 'Unlock AI team coordination and agent assembly visualization!'
            : 'Learn how to use AI team coordination and agent assembly!'
          }
        </p>
        
        <button
          onClick={onTrigger}
          className="w-full px-3 py-2 bg-white/20 hover:bg-white/30 text-white font-medium rounded text-sm transition-colors backdrop-blur-sm"
        >
          {!isEnhancedAgentsEnabled ? 'Enable & Learn' : 'Show Tutorial'}
        </button>
      </div>
    </div>
  );
};

export default OnboardingTrigger;