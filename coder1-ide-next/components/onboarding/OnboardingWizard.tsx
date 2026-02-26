'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import type { OnboardingSession, OnboardingRole, OnboardingPhase } from '@/types/onboarding';
import OnboardingProgress from './OnboardingProgress';
import OnboardingRoleSelector from './OnboardingRoleSelector';
import OnboardingMilestoneList from './OnboardingMilestoneList';
import OnboardingArchitectureTour from './OnboardingArchitectureTour';
import OnboardingWorkflowStep from './OnboardingWorkflowStep';
import OnboardingChecklist from './OnboardingChecklist';
import OnboardingComplete from './OnboardingComplete';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type WizardPhase = 'role-select' | OnboardingPhase | 'complete';

export interface OnboardingWizardProps {
  teamId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const PHASE_ORDER: WizardPhase[] = [
  'role-select',
  'architecture',
  'workflow',
  'contribution',
  'complete',
];

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export default function OnboardingWizard({
  teamId,
  userId,
  isOpen,
  onClose,
}: OnboardingWizardProps): React.ReactElement | null {
  const [phase, setPhase] = useState<WizardPhase>('role-select');
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // Load existing session on open
  useEffect(() => {
    if (!isOpen || !teamId || !userId) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/team/${teamId}/onboarding?userId=${encodeURIComponent(userId)}`
        );
        if (res.ok) {
          const body = await res.json() as { session: OnboardingSession | null };
          if (body.session) {
            setSession(body.session);
            setPhase(body.session.completedAt ? 'complete' : body.session.currentPhase);
          }
        }
      } catch {
        // non-fatal — start fresh
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [isOpen, teamId, userId]);

  // Create session after role selection
  const handleRoleSelect = useCallback(async (role: OnboardingRole) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/team/${teamId}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, userId }),
      });
      if (res.ok) {
        const body = await res.json() as { session: OnboardingSession };
        setSession(body.session);
        setPhase('architecture');
      }
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  }, [teamId, userId]);

  // Update milestone
  const handleMilestoneUpdate = useCallback(
    async (milestoneId: string, status: 'completed' | 'skipped') => {
      try {
        const res = await fetch(
          `/api/team/${teamId}/onboarding/milestone/${milestoneId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, userId }),
          }
        );
        if (res.ok) {
          const body = await res.json() as { session: OnboardingSession };
          setSession(body.session);
        }
      } catch {
        // non-fatal
      }
    },
    [teamId, userId]
  );

  const handleSkipForNow = async () => {
    setIsSkipping(true);
    try {
      await fetch(`/api/team/${teamId}/onboarding/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch {
      // non-fatal
    } finally {
      setIsSkipping(false);
      onClose();
    }
  };

  const goNext = () => {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < PHASE_ORDER.length - 1) {
      const next = PHASE_ORDER[idx + 1];
      setPhase(next);
    }
  };

  const goBack = () => {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx > 0) {
      setPhase(PHASE_ORDER[idx - 1]);
    }
  };

  if (!isOpen) return null;

  const showSidebar = phase !== 'role-select' && phase !== 'complete' && session;
  const showNav = phase !== 'role-select' && phase !== 'complete';
  const canGoBack = PHASE_ORDER.indexOf(phase) > 1; // don't go back to role-select once started
  const progressPercent = session?.progressPercent ?? 0;
  const currentPhase: OnboardingPhase =
    phase === 'role-select' || phase === 'complete' ? 'architecture' : phase;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-border-default rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <h2 className="text-lg font-semibold text-text-primary">
            Welcome to Your Team
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSkipForNow}
              disabled={isSkipping}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              {isSkipping ? 'Skipping...' : 'Skip for now'}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar (only shown after role selection) */}
        {phase !== 'role-select' && (
          <OnboardingProgress
            currentPhase={currentPhase}
            progressPercent={progressPercent}
          />
        )}

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Step content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full gap-2 text-text-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : phase === 'role-select' ? (
              <OnboardingRoleSelector onSelect={handleRoleSelect} />
            ) : phase === 'architecture' && session ? (
              <OnboardingArchitectureTour teamContext={session.teamContext} />
            ) : phase === 'workflow' && session ? (
              <div className="flex flex-col gap-6">
                <OnboardingWorkflowStep
                  teamContext={session.teamContext}
                  teamId={teamId}
                  onCommandsInstalled={() =>
                    handleMilestoneUpdate('workflow-install-commands', 'completed')
                  }
                />
                <div className="border-t border-border-default pt-4">
                  <OnboardingChecklist teamId={teamId} />
                </div>
              </div>
            ) : phase === 'contribution' && session ? (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Your First Contribution</h3>
                  <p className="text-sm text-text-muted mt-1">
                    Follow the team&apos;s branching and commit conventions to make your first contribution.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {session.milestones
                    .filter((m) => m.phase === 'contribution')
                    .map((m) => (
                      <div
                        key={m.id}
                        className={`p-4 border rounded-lg ${
                          m.status === 'completed'
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-border-default bg-bg-primary'
                        }`}
                      >
                        <p className="text-sm font-medium text-text-primary">{m.title}</p>
                        <p className="text-xs text-text-muted mt-1">{m.description}</p>
                        {m.status === 'pending' && (
                          <button
                            onClick={() => handleMilestoneUpdate(m.id, 'completed')}
                            className="mt-2 text-xs px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded hover:bg-orange-500/20 transition-colors"
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ) : phase === 'complete' && session ? (
              <OnboardingComplete
                role={session.role}
                teamId={teamId}
                onClose={onClose}
              />
            ) : null}
          </div>

          {/* Milestone sidebar */}
          {showSidebar && session && (
            <div className="w-56 border-l border-border-default p-4 overflow-y-auto bg-bg-primary/50">
              <OnboardingMilestoneList
                milestones={session.milestones}
                onComplete={(id) => handleMilestoneUpdate(id, 'completed')}
                onSkip={(id) => handleMilestoneUpdate(id, 'skipped')}
              />
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {showNav && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border-default">
            <button
              onClick={goBack}
              disabled={!canGoBack}
              className="flex items-center gap-1 px-3 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={goNext}
              className="flex items-center gap-1 px-4 py-2 text-sm bg-orange-500/20 text-orange-400 border border-orange-500/50 rounded hover:bg-orange-500/30 transition-all"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
