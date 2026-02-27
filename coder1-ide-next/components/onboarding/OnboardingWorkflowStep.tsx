'use client';

import React, { useState } from 'react';
import { Slash, Bot, CheckCircle2, Loader2 } from 'lucide-react';
import type { OnboardingSession } from '@/types/onboarding';

interface OnboardingWorkflowStepProps {
  teamContext: OnboardingSession['teamContext'];
  teamId: string;
  onCommandsInstalled: () => void;
}

export default function OnboardingWorkflowStep({
  teamContext,
  teamId,
  onCommandsInstalled,
}: OnboardingWorkflowStepProps): React.ReactElement {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installDone, setInstallDone] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  const { teamCommands, activeAgents } = teamContext;

  const handleInstallCommands = async () => {
    setIsInstalling(true);
    setInstallError(null);

    try {
      const res = await fetch(`/api/commands/sync?teamId=${teamId}`, {
        method: 'POST',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      setInstallDone(true);
      onCommandsInstalled();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to install commands';
      setInstallError(message);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">Team Workflow</h3>
        <p className="text-sm text-text-muted mt-1">
          Set up the team&apos;s shared tools and workflows on your machine.
        </p>
      </div>

      {/* Team slash commands */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Slash className="w-4 h-4 text-orange-400" />
          <h4 className="text-sm font-medium text-text-primary">Team Slash Commands</h4>
        </div>

        {teamCommands.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {teamCommands.map((cmd) => (
              <span
                key={cmd}
                className="px-2 py-1 text-xs font-mono bg-bg-primary border border-border-default rounded text-text-secondary"
              >
                /{cmd}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted mb-3">No team commands configured yet.</p>
        )}

        {installDone ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Commands installed successfully!
          </div>
        ) : (
          <div>
            <button
              onClick={handleInstallCommands}
              disabled={isInstalling}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-500/20 text-orange-400 border border-orange-500/50 rounded hover:bg-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isInstalling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Slash className="w-4 h-4" />
              )}
              {isInstalling ? 'Installing...' : 'Install All Commands'}
            </button>
            {installError && (
              <p className="text-xs text-red-400 mt-1">{installError}</p>
            )}
          </div>
        )}
      </div>

      {/* Active agents */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-orange-400" />
          <h4 className="text-sm font-medium text-text-primary">Active Team Agents</h4>
        </div>

        {activeAgents.length > 0 ? (
          <div className="flex flex-col gap-2">
            {activeAgents.map((agent) => (
              <div
                key={agent}
                className="flex items-center gap-3 p-2 bg-bg-primary border border-border-default rounded"
              >
                <div className="w-6 h-6 bg-orange-500/10 rounded flex items-center justify-center">
                  <Bot className="w-3 h-3 text-orange-400" />
                </div>
                <span className="text-sm text-text-secondary">{agent}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            No agents activated for this team yet.
          </p>
        )}
      </div>
    </div>
  );
}
