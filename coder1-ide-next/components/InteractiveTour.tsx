'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface InteractiveTourProps {
  onClose: () => void;
  onStepChange?: (stepId: string) => void;
}

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  hasSubSteps?: boolean;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome-overview',
    title: 'Welcome to Coder1 IDE',
    content: 'This is your AI-powered development environment. Let\'s take a quick tour of the key features.',
    target: 'ide-interface',
    position: 'bottom'
  },
  {
    id: 'smart-prd-generator',
    title: 'Smart PRD Generator',
    content: 'Click this button to generate Product Requirements Documents with AI assistance.',
    target: 'prd-generator-button',
    position: 'top'
  },
  {
    id: 'file-explorer',
    title: 'File Explorer',
    content: 'Navigate your project files, sessions, and memory in these organized tabs.',
    target: 'file-explorer',
    position: 'right'
  },
  {
    id: 'code-editor',
    title: 'Monaco Code Editor',
    content: 'Full-featured code editor with syntax highlighting, IntelliSense, and VS Code features.',
    target: 'monaco-editor',
    position: 'top'
  },
  {
    id: 'timeline-checkpoint',
    title: 'Timeline & Checkpoint',
    content: 'Save checkpoints and track your development timeline with these powerful tools.',
    target: 'status-bar',
    position: 'top',
    hasSubSteps: true
  },
  {
    id: 'terminal',
    title: 'Integrated Terminal',
    content: 'Full terminal with AI supervision. Type "claude" to get intelligent assistance.',
    target: 'terminal',
    position: 'top'
  },
  {
    id: 'session-summary',
    title: 'Session Summary',
    content: 'Generate comprehensive session reports for handoffs and documentation.',
    target: 'session-summary',
    position: 'top'
  }
];

export default function InteractiveTour({ onClose, onStepChange }: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSubStep, setCurrentSubStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const currentStepData = tourSteps[currentStep];

  // Handle step changes
  const handleNext = () => {
    console.log('🔵 handleNext called!', { currentStep, currentSubStep });
    
    if (currentStep < tourSteps.length - 1) {
      const nextStep = currentStep + 1;
      console.log('➡️ Moving to next main step:', nextStep);
      setCurrentStep(nextStep);
      setCurrentSubStep(0);
      onStepChange?.(tourSteps[nextStep].id);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      setCurrentSubStep(0);
      onStepChange?.(tourSteps[prevStep].id);
    }
  };

  // Position tooltip based on target element
  useEffect(() => {
    const updateTooltipPosition = () => {
      const targetElement = document.querySelector(`[data-tour="${currentStepData.target}"]`);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const tooltip = document.querySelector('.tour-tooltip');
        
        let x = rect.left + rect.width / 2;
        let y = rect.top + rect.height / 2;

        // Adjust position based on preferred position and viewport
        switch (currentStepData.position) {
          case 'top':
            y = rect.top - 20;
            break;
          case 'bottom':
            y = rect.bottom + 20;
            break;
          case 'left':
            x = rect.left - 20;
            break;
          case 'right':
            x = rect.right + 20;
            break;
        }

        // Prevent tooltip from going off-screen
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (tooltip) {
          const tooltipRect = tooltip.getBoundingClientRect();
          
          // Horizontal bounds checking
          if (x + tooltipRect.width / 2 > viewportWidth - 20) {
            x = viewportWidth - tooltipRect.width / 2 - 20;
          }
          if (x - tooltipRect.width / 2 < 20) {
            x = tooltipRect.width / 2 + 20;
          }
          
          // Vertical bounds checking  
          if (y + tooltipRect.height > viewportHeight - 20) {
            y = viewportHeight - tooltipRect.height - 20;
          }
          if (y < 20) {
            y = 20;
          }
        }

        setTooltipPosition({ x, y });
      }
    };

    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    
    return () => window.removeEventListener('resize', updateTooltipPosition);
  }, [currentStep, currentStepData]);

  // Add orange borders for Step 5 (Timeline & Checkpoint)
  useEffect(() => {
    if (currentStepData.id === 'timeline-checkpoint') {
      const checkpointBtn = document.querySelector('[data-tour="checkpoint-timeline"]');
      const timelineBtn = document.querySelector('[data-tour="timeline-button"]');
      const sessionBtn = document.querySelector('[data-tour="session-summary"]');
      
      [checkpointBtn, timelineBtn, sessionBtn].forEach(btn => {
        if (btn) {
          (btn as HTMLElement).style.boxShadow = '0 0 15px rgba(251, 146, 60, 0.8), 0 0 25px rgba(251, 146, 60, 0.4)';
          (btn as HTMLElement).style.border = '2px solid rgba(251, 146, 60, 0.8)';
        }
      });

      return () => {
        [checkpointBtn, timelineBtn, sessionBtn].forEach(btn => {
          if (btn) {
            (btn as HTMLElement).style.boxShadow = '';
            (btn as HTMLElement).style.border = '';
          }
        });
      };
    }
  }, [currentStep, currentStepData.id]);

  // Highlight target element
  useEffect(() => {
    const targetElement = document.querySelector(`[data-tour="${currentStepData.target}"]`);
    if (targetElement) {
      // Add blue glow for general highlighting
      (targetElement as HTMLElement).style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.6), inset 0 0 10px rgba(59, 130, 246, 0.2)';
      (targetElement as HTMLElement).style.border = '2px solid rgba(59, 130, 246, 0.5)';
      (targetElement as HTMLElement).style.borderRadius = '8px';

      return () => {
        (targetElement as HTMLElement).style.boxShadow = '';
        (targetElement as HTMLElement).style.border = '';
        (targetElement as HTMLElement).style.borderRadius = '';
      };
    }
  }, [currentStep, currentStepData]);

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay - with pointer-events-none to allow interaction with highlighted elements */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      
      {/* SVG Mask for highlighting */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="black" />
            <rect 
              x={tooltipPosition.x - 100} 
              y={tooltipPosition.y - 100} 
              width="200" 
              height="200" 
              fill="white" 
              rx="8" 
            />
          </mask>
        </defs>
        <rect 
          width="100%" 
          height="100%" 
          fill="rgba(0, 0, 0, 0.3)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Tour Tooltip */}
      <div
        className="tour-tooltip absolute bg-bg-secondary border border-border-default rounded-lg shadow-2xl p-6 max-w-sm"
        style={{
          left: tooltipPosition.x - 200,
          top: tooltipPosition.y - 100,
          zIndex: 100,
          pointerEvents: 'auto'  // Ensure tooltip can receive clicks
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-bg-tertiary transition-colors"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>

        {/* Step Counter */}
        <div className="text-xs text-text-muted mb-2">
          Step {currentStep + 1} of {tourSteps.length}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {currentStepData.title}
        </h3>

        {/* Content */}
        <p className="text-text-secondary mb-4">
          {currentStepData.content}
        </p>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm bg-bg-tertiary text-text-secondary rounded-md hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <button
            onClick={(e) => {
              console.log('🟢 Next button clicked!', e);
              e.stopPropagation();
              handleNext();
            }}
            className="px-4 py-2 text-sm bg-coder1-cyan text-black rounded-md hover:bg-coder1-cyan/80 transition-colors"
          >
            {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}