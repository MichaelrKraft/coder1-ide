'use client';

import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import dynamic from 'next/dynamic';
import GoalList from '@/components/agent-hub/goals/GoalList';
import GoalDetail from '@/components/agent-hub/goals/GoalDetail';
import PaywallGate from '@/components/agent-hub/goals/PaywallGate';
import EmptyState from '@/components/agent-hub/shared/EmptyState';
import type { Goal } from '@/lib/agent-hub/goals';

const RunsPage = dynamic(() => import('@/app/ide/agent-hub/runs/page'), { ssr: false });

export default function GoalsPage() {
  const [isPaid, setIsPaid] = useState<boolean | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Determine paywall status by probing the goals endpoint
  useEffect(() => {
    fetch('/api/agent-hub/goals')
      .then((res) => {
        if (res.status === 402) {
          setIsPaid(false);
        } else {
          setIsPaid(true);
        }
      })
      .catch(() => setIsPaid(false)); // Fail closed — deny access on error
  }, []);

  function handleGoalUpdated(goal: Goal) {
    // If the list needs updating from an external source, reload by key change.
    // For now, GoalDetail is self-contained — this prop is a hook for future list sync.
    void goal;
  }

  if (isPaid === null) {
    return <div className="p-6 text-text-muted text-sm">Loading…</div>;
  }

  return (
    <PaywallGate featureName="Goals" isPaid={isPaid}>
      <div className="h-full overflow-y-auto">
        {/* Top: Goals */}
        <div className="flex min-h-[50%] overflow-hidden">
          {/* Left panel — goal list, fixed width */}
          <div className="w-72 shrink-0 border-r border-border-default flex flex-col">
            <GoalList
              onGoalSelect={setSelectedGoalId}
              selectedGoalId={selectedGoalId}
            />
          </div>

          {/* Right panel — goal detail or placeholder */}
          <div className="flex-1 overflow-hidden">
            {selectedGoalId ? (
              <GoalDetail
                key={selectedGoalId}
                goalId={selectedGoalId}
                onDeleted={() => setSelectedGoalId(null)}
                onUpdated={handleGoalUpdated}
              />
            ) : (
              <EmptyState
                icon={<Target size={32} />}
                title="Select a goal"
                description="Select a goal from the list to view its details, track progress, and manage linked tasks."
              />
            )}
          </div>
        </div>

        {/* Bottom: Runs */}
        <div className="border-t border-border-default">
          <RunsPage />
        </div>
      </div>
    </PaywallGate>
  );
}
