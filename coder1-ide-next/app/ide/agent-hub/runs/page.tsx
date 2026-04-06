'use client';

import React, { useState } from 'react';
import { RunList } from '@/components/agent-hub/runs/RunList';
import { RunViewer } from '@/components/agent-hub/runs/RunViewer';
import { RunApproval } from '@/components/agent-hub/runs/RunApproval';
import type { Run } from '@/lib/agent-hub/runs';

export default function RunsPage(): React.ReactElement {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectRun = async (runId: string) => {
    setSelectedRunId(runId);
    try {
      const res = await fetch(`/api/agent-hub/runs/${runId}`);
      if (res.ok) {
        const data = (await res.json()) as { run: Run };
        setSelectedRun(data.run);
      }
    } catch {
      setSelectedRun(null);
    }
  };

  const handleApprovedOrRejected = () => {
    setSelectedRun(null);
    setSelectedRunId(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex h-full">
      {/* Left panel — Run list (35%) */}
      <div className="w-[35%] border-r border-border flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Runs</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <RunList
            key={refreshKey}
            selectedRunId={selectedRunId}
            onSelectRun={(id) => { void handleSelectRun(id); }}
          />
        </div>
      </div>

      {/* Right panel — Viewer / Approval (65%) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!selectedRunId ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            Select a run to view details
          </div>
        ) : selectedRun?.status === 'awaiting_approval' ? (
          <RunApproval
            run={selectedRun}
            onApproved={handleApprovedOrRejected}
            onRejected={handleApprovedOrRejected}
          />
        ) : (
          <RunViewer runId={selectedRunId} />
        )}
      </div>
    </div>
  );
}
