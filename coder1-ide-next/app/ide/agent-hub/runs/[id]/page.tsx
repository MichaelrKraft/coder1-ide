'use client';

import React, { useEffect, useState } from 'react';
import { RunViewer } from '@/components/agent-hub/runs/RunViewer';
import { RunApproval } from '@/components/agent-hub/runs/RunApproval';
import type { Run } from '@/lib/agent-hub/runs';

interface Props {
  params: { id: string };
}

export default function RunDetailPage({ params }: Props): React.ReactElement {
  const { id } = params;
  const [run, setRun] = useState<Run | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchRun = async () => {
      try {
        const res = await fetch(`/api/agent-hub/runs/${id}`);
        if (res.ok) {
          const data = (await res.json()) as { run: Run };
          setRun(data.run);
        }
      } catch {
        setRun(null);
      }
    };
    void fetchRun();
  }, [id, refreshKey]);

  const handleApprovedOrRejected = () => {
    setRun(null);
    setRefreshKey((k) => k + 1);
  };

  if (run?.status === 'awaiting_approval') {
    return (
      <div className="h-full">
        <RunApproval
          run={run}
          onApproved={handleApprovedOrRejected}
          onRejected={handleApprovedOrRejected}
        />
      </div>
    );
  }

  return (
    <div className="h-full">
      <RunViewer runId={id} />
    </div>
  );
}
