'use client';

import React from 'react';
import { Monitor, Server, Layers, TestTube, Cloud, Code2 } from 'lucide-react';
import type { OnboardingRole } from '@/types/onboarding';

interface OnboardingRoleSelectorProps {
  onSelect: (role: OnboardingRole) => void;
}

interface RoleCard {
  role: OnboardingRole;
  label: string;
  description: string;
  Icon: React.ElementType;
}

const ROLES: RoleCard[] = [
  {
    role: 'frontend',
    label: 'Frontend',
    description: 'UI components, styles, and user interactions',
    Icon: Monitor,
  },
  {
    role: 'backend',
    label: 'Backend',
    description: 'APIs, databases, and server-side logic',
    Icon: Server,
  },
  {
    role: 'fullstack',
    label: 'Fullstack',
    description: 'End-to-end features across the stack',
    Icon: Layers,
  },
  {
    role: 'qa',
    label: 'QA',
    description: 'Testing, quality assurance, and bug hunting',
    Icon: TestTube,
  },
  {
    role: 'devops',
    label: 'DevOps',
    description: 'Deployment, infrastructure, and CI/CD',
    Icon: Cloud,
  },
  {
    role: 'general',
    label: 'General',
    description: 'General contribution across the codebase',
    Icon: Code2,
  },
];

export default function OnboardingRoleSelector({
  onSelect,
}: OnboardingRoleSelectorProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">
          What is your primary role?
        </h3>
        <p className="text-sm text-text-muted mt-1">
          We&apos;ll personalize your onboarding milestones based on this.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ROLES.map(({ role, label, description, Icon }) => (
          <button
            key={role}
            onClick={() => onSelect(role)}
            className="group flex items-start gap-3 p-4 bg-bg-primary border border-border-default rounded-lg
              hover:border-orange-500/50 hover:bg-orange-500/5
              transition-all duration-150 text-left"
          >
            <div className="mt-0.5 p-2 bg-bg-secondary rounded-md group-hover:bg-orange-500/10 transition-colors">
              <Icon className="w-4 h-4 text-text-muted group-hover:text-orange-400 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary group-hover:text-orange-300 transition-colors">
                {label}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
