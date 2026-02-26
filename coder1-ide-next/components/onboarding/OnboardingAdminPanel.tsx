'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { TeamOnboardingStatus, OnboardingPhase } from '@/types/onboarding';

interface OnboardingAdminPanelProps {
  teamId: string | null;
}

const PHASE_LABELS: Record<OnboardingPhase, string> = {
  architecture: 'Architecture',
  workflow: 'Workflow',
  contribution: 'Contribution',
};

export default function OnboardingAdminPanel({
  teamId,
}: OnboardingAdminPanelProps): React.ReactElement {
  const [members, setMembers] = useState<TeamOnboardingStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/team/${teamId}/onboarding/admin`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const body = await res.json() as { members: TeamOnboardingStatus[] };
        setMembers(body.members);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teamId]);

  if (!teamId) {
    return (
      <p className="text-sm text-text-muted">No team selected.</p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-muted">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading onboarding data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-400">Error: {error}</p>
    );
  }

  if (members.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-text-muted">
          No team members have started onboarding yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary mb-4">Team Onboarding Progress</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default">
              <th className="text-left py-2 pr-4 text-xs font-medium text-text-muted">Member</th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-text-muted">Role</th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-text-muted">Progress</th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-text-muted">Phase</th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-text-muted">Started</th>
              <th className="text-left py-2 text-xs font-medium text-text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId} className="border-b border-border-default/50">
                <td className="py-2 pr-4 text-text-primary font-medium">
                  {member.userName}
                </td>
                <td className="py-2 pr-4 text-text-secondary capitalize">
                  {member.role}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 bg-bg-primary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${member.progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted">{member.progressPercent}%</span>
                  </div>
                </td>
                <td className="py-2 pr-4 text-text-secondary">
                  {PHASE_LABELS[member.currentPhase]}
                </td>
                <td className="py-2 pr-4 text-text-muted text-xs">
                  {new Date(member.startedAt).toLocaleDateString()}
                </td>
                <td className="py-2">
                  {member.completedAt ? (
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded">
                      Complete
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-xs rounded">
                      In Progress
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
