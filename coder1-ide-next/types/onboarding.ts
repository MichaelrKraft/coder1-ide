/**
 * Onboarding types for the Team Onboarding Wizard (Feature 4).
 */

export type OnboardingRole =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'qa'
  | 'devops'
  | 'general';

export type OnboardingPhase = 'architecture' | 'workflow' | 'contribution';

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface OnboardingMilestone {
  id: string;
  phase: OnboardingPhase;
  title: string;
  description: string;
  verificationType: 'manual' | 'auto-detect';
  autoDetectConfig?: {
    type: 'command-run' | 'agent-spawned';
    target: string;
  };
  status: MilestoneStatus;
  completedAt?: string;
  /** Empty array means applies to all roles */
  roles: OnboardingRole[];
}

export interface OnboardingSession {
  teamId: string;
  userId: string;
  role: OnboardingRole;
  currentPhase: OnboardingPhase;
  milestones: OnboardingMilestone[];
  teamContext: {
    techStack: string;
    projectDescription: string;
    /** Top 5 team slash command names */
    teamCommands: string[];
    /** Activated agent names */
    activeAgents: string[];
    /** Raw CLAUDE.md content for the wizard */
    claudeMdContent: string;
  };
  /** 0-100 */
  progressPercent: number;
  startedAt: string;
  lastActiveAt: string;
  completedAt?: string;
}

/**
 * Stored in team_assets.data for asset_type='onboarding_progress', asset_key=userId
 */
export interface OnboardingProgressAssetData {
  role: OnboardingRole;
  currentPhase: OnboardingPhase;
  milestones: Array<{
    id: string;
    status: MilestoneStatus;
    completedAt?: string;
  }>;
  teamContext: OnboardingSession['teamContext'];
  startedAt: string;
  completedAt?: string;
  /** ISO timestamp — snooze "skip for now" */
  skippedUntil?: string;
}

export interface TeamOnboardingStatus {
  userId: string;
  userName: string;
  role: OnboardingRole;
  progressPercent: number;
  currentPhase: OnboardingPhase;
  startedAt: string;
  completedAt?: string;
}
