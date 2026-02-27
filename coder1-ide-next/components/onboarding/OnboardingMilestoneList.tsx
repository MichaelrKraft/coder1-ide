'use client';

import React from 'react';
import { CheckCircle2, Circle, SkipForward } from 'lucide-react';
import type { OnboardingMilestone, OnboardingPhase } from '@/types/onboarding';

interface OnboardingMilestoneListProps {
  milestones: OnboardingMilestone[];
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
}

const PHASE_LABELS: Record<OnboardingPhase, string> = {
  architecture: 'Architecture',
  workflow: 'Workflow',
  contribution: 'Contribution',
};

const PHASES: OnboardingPhase[] = ['architecture', 'workflow', 'contribution'];

export default function OnboardingMilestoneList({
  milestones,
  onComplete,
  onSkip,
}: OnboardingMilestoneListProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Milestones
      </h4>

      {PHASES.map((phase) => {
        const phaseMilestones = milestones.filter((m) => m.phase === phase);
        if (phaseMilestones.length === 0) return null;

        return (
          <div key={phase}>
            <p className="text-xs text-text-muted mb-2 font-medium">
              {PHASE_LABELS[phase]}
            </p>
            <div className="flex flex-col gap-2">
              {phaseMilestones.map((m) => {
                const isDone = m.status === 'completed' || m.status === 'skipped';
                const isSkipped = m.status === 'skipped';
                const isPending = m.status === 'pending' || m.status === 'in_progress';

                return (
                  <div
                    key={m.id}
                    className={`p-2 rounded border transition-colors ${
                      isDone
                        ? 'bg-bg-primary border-border-default opacity-60'
                        : 'bg-bg-primary border-border-default'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {m.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      ) : isSkipped ? (
                        <SkipForward className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-medium leading-tight ${
                            isDone ? 'line-through text-text-muted' : 'text-text-primary'
                          }`}
                        >
                          {m.title}
                        </p>

                        {isPending && m.verificationType === 'manual' && (
                          <div className="flex gap-1 mt-1.5">
                            <button
                              onClick={() => onComplete(m.id)}
                              className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded hover:bg-green-500/20 transition-colors"
                            >
                              Done
                            </button>
                            <button
                              onClick={() => onSkip(m.id)}
                              className="text-xs px-2 py-0.5 text-text-muted border border-border-default rounded hover:bg-bg-secondary transition-colors"
                            >
                              Skip
                            </button>
                          </div>
                        )}

                        {isPending && m.verificationType === 'auto-detect' && (
                          <p className="text-xs text-text-muted mt-1">
                            Auto-detected
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
