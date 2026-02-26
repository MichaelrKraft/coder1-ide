'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  isAutoDetect: boolean;
  check?: () => Promise<boolean>;
}

interface ChecklistState {
  status: 'loading' | 'done' | 'not-done';
}

interface OnboardingChecklistProps {
  teamId: string;
}

export default function OnboardingChecklist({
  teamId,
}: OnboardingChecklistProps): React.ReactElement {
  const [states, setStates] = useState<Record<string, ChecklistState>>({});

  const ITEMS: ChecklistItem[] = [
    {
      id: 'bridge-connected',
      label: 'Bridge connected',
      isAutoDetect: true,
      check: async () => {
        try {
          const res = await fetch('/api/health');
          return res.ok;
        } catch {
          return false;
        }
      },
    },
    {
      id: 'api-key-configured',
      label: 'API key configured',
      isAutoDetect: true,
      check: async () => {
        const key =
          typeof window !== 'undefined'
            ? localStorage.getItem('anthropic_api_key') ??
              localStorage.getItem('claudeApiKey') ??
              localStorage.getItem('coder1_api_key')
            : null;
        return Boolean(key && key.length > 10);
      },
    },
    {
      id: 'commands-synced',
      label: 'Commands synced',
      isAutoDetect: false,
    },
  ];

  // Run auto-detect checks on mount
  useEffect(() => {
    const runChecks = async () => {
      for (const item of ITEMS) {
        if (!item.isAutoDetect || !item.check) continue;

        setStates((prev) => ({ ...prev, [item.id]: { status: 'loading' } }));
        try {
          const result = await item.check();
          setStates((prev) => ({
            ...prev,
            [item.id]: { status: result ? 'done' : 'not-done' },
          }));
        } catch {
          setStates((prev) => ({ ...prev, [item.id]: { status: 'not-done' } }));
        }
      }
    };

    runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markDone = (id: string) => {
    setStates((prev) => ({ ...prev, [id]: { status: 'done' } }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">Environment Checklist</h3>
        <p className="text-xs text-text-muted mt-0.5">
          Verify your local setup is ready.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {ITEMS.map((item) => {
          const state = states[item.id];
          const isDone = state?.status === 'done';
          const isLoading = state?.status === 'loading';

          return (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-bg-primary border border-border-default rounded"
            >
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
                ) : isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <Circle className="w-4 h-4 text-text-muted" />
                )}
                <span
                  className={`text-sm ${isDone ? 'text-text-muted line-through' : 'text-text-primary'}`}
                >
                  {item.label}
                </span>
              </div>

              {!isDone && !isLoading && !item.isAutoDetect && (
                <button
                  onClick={() => markDone(item.id)}
                  className="text-xs px-2 py-0.5 bg-bg-secondary border border-border-default rounded hover:border-orange-500/50 hover:text-orange-400 transition-colors text-text-muted"
                >
                  Mark done
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
