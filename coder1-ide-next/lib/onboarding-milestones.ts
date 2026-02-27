/**
 * Default milestone definitions for the Team Onboarding Wizard.
 * Returns a set of milestones with role-specific filtering applied.
 */

import type {
  OnboardingMilestone,
  OnboardingRole,
} from '@/types/onboarding';

// All milestones with their role restrictions
const ALL_MILESTONES: Omit<OnboardingMilestone, 'status'>[] = [
  // ── Phase 1: Architecture ──────────────────────────────────────────────
  {
    id: 'arch-read-claude-md',
    phase: 'architecture',
    title: 'Read CLAUDE.md',
    description:
      'Review the team CLAUDE.md to understand coding standards, conventions, and project context.',
    verificationType: 'manual',
    roles: [], // all roles
  },
  {
    id: 'arch-explore-codebase',
    phase: 'architecture',
    title: 'Explore the project structure',
    description:
      'Browse the codebase directories to understand how the project is organized.',
    verificationType: 'manual',
    roles: [], // all roles
  },
  {
    id: 'arch-understand-auth',
    phase: 'architecture',
    title: 'Understand the authentication flow',
    description:
      'Trace the auth flow from login to protected routes. Understand session management.',
    verificationType: 'manual',
    roles: ['backend', 'fullstack'],
  },

  // ── Phase 2: Workflow ──────────────────────────────────────────────────
  {
    id: 'workflow-install-commands',
    phase: 'workflow',
    title: 'Install team slash commands',
    description:
      'Sync and install the team slash commands so you have access to shared workflows.',
    verificationType: 'auto-detect',
    autoDetectConfig: {
      type: 'command-run',
      target: 'commands:synced',
    },
    roles: [], // all roles
  },
  {
    id: 'workflow-setup-env',
    phase: 'workflow',
    title: 'Complete environment setup',
    description:
      'Configure your local environment: .env file, dependencies installed, dev server running.',
    verificationType: 'manual',
    roles: [], // all roles
  },
  {
    id: 'workflow-first-agent',
    phase: 'workflow',
    title: 'Use a team agent',
    description:
      'Trigger one of the team\'s activated agents to get familiar with the AI-assisted workflow.',
    verificationType: 'manual',
    roles: [], // all roles
  },

  // ── Phase 3: Contribution ──────────────────────────────────────────────
  {
    id: 'contrib-first-branch',
    phase: 'contribution',
    title: 'Create your first feature branch',
    description:
      'Create a new branch following the team\'s branching conventions (e.g. feature/your-name-feature).',
    verificationType: 'manual',
    roles: [], // all roles
  },
  {
    id: 'contrib-first-commit',
    phase: 'contribution',
    title: 'Make your first commit',
    description:
      'Commit a change following the team\'s commit message conventions.',
    verificationType: 'manual',
    roles: [], // all roles
  },
  {
    id: 'contrib-first-pr',
    phase: 'contribution',
    title: 'Open your first pull request',
    description:
      'Open a PR for review — even if small. Get comfortable with the review process.',
    verificationType: 'manual',
    roles: [], // all roles
  },
];

/**
 * Returns the default milestones for a given role, filtering out milestones
 * that are restricted to other roles. All milestones start with 'pending' status.
 */
export function getDefaultMilestones(role: OnboardingRole): OnboardingMilestone[] {
  return ALL_MILESTONES.filter(
    (m) => m.roles.length === 0 || m.roles.includes(role)
  ).map((m) => ({
    ...m,
    status: 'pending' as const,
  }));
}

/**
 * Calculate progress percent (0–100) from a list of milestones.
 */
export function calculateProgressPercent(milestones: OnboardingMilestone[]): number {
  if (milestones.length === 0) return 0;
  const done = milestones.filter(
    (m) => m.status === 'completed' || m.status === 'skipped'
  ).length;
  return Math.round((done / milestones.length) * 100);
}
