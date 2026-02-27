'use client';

import React from 'react';
import { PartyPopper, Rocket } from 'lucide-react';
import type { OnboardingRole } from '@/types/onboarding';

interface OnboardingCompleteProps {
  role: OnboardingRole;
  teamId: string;
  onClose: () => void;
}

const NEXT_ACTIONS: Record<OnboardingRole, string> = {
  frontend: 'Pick up a UI task from the backlog and open a feature branch.',
  backend: 'Check the API documentation and explore the database schema.',
  fullstack: 'Look at open issues and find one that spans frontend and backend.',
  qa: 'Review the test suite and identify any gaps in coverage.',
  devops: 'Review the CI/CD pipeline and deployment configuration.',
  general: 'Browse open issues and pick something that interests you.',
};

export default function OnboardingComplete({
  role,
  teamId,
  onClose,
}: OnboardingCompleteProps): React.ReactElement {
  const nextAction = NEXT_ACTIONS[role];

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 text-center">
      <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center">
        <PartyPopper className="w-8 h-8 text-orange-400" />
      </div>

      <div>
        <h3 className="text-2xl font-bold text-text-primary">
          You&apos;re ready to contribute!
        </h3>
        <p className="text-text-muted mt-2 max-w-sm">
          You&apos;ve completed your onboarding for team{' '}
          <span className="text-orange-400 font-medium">{teamId}</span>.
        </p>
      </div>

      <div className="w-full max-w-sm p-4 bg-bg-primary border border-border-default rounded-lg text-left">
        <div className="flex items-start gap-2">
          <Rocket className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-text-primary">Suggested next step</p>
            <p className="text-sm text-text-muted mt-1">{nextAction}</p>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
      >
        <Rocket className="w-4 h-4" />
        Start Coding
      </button>
    </div>
  );
}
