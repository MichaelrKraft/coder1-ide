'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { OnboardingPhase } from '@/types/onboarding';

interface OnboardingProgressProps {
  currentPhase: OnboardingPhase;
  progressPercent: number;
}

const PHASES: { id: OnboardingPhase; label: string }[] = [
  { id: 'architecture', label: 'Architecture' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'contribution', label: 'Contribution' },
];

const PHASE_ORDER: OnboardingPhase[] = ['architecture', 'workflow', 'contribution'];

export default function OnboardingProgress({
  currentPhase,
  progressPercent,
}: OnboardingProgressProps): React.ReactElement {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  return (
    <div className="px-6 py-4 border-b border-border-default">
      {/* Phase indicators */}
      <div className="flex items-center justify-center gap-0 mb-4">
        {PHASES.map((phase, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <React.Fragment key={phase.id}>
              {/* Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : isActive
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                      : 'bg-bg-primary border-border-default text-text-muted'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-1 text-xs font-medium whitespace-nowrap ${
                    isActive
                      ? 'text-orange-400'
                      : isCompleted
                      ? 'text-green-400'
                      : isPending
                      ? 'text-text-muted'
                      : 'text-text-muted'
                  }`}
                >
                  {phase.label}
                </span>
              </div>

              {/* Connector line */}
              {index < PHASES.length - 1 && (
                <div
                  className={`h-0.5 w-16 mb-4 transition-all ${
                    index < currentIndex ? 'bg-green-500' : 'bg-border-default'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="text-xs text-text-muted text-center mt-1">
        {progressPercent}% complete
      </p>
    </div>
  );
}
