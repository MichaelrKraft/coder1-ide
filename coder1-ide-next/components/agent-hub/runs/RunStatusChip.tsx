import React from 'react';
import type { Run } from '@/lib/agent-hub/runs';

interface Props {
  status: Run['status'];
}

const STATUS_CONFIG: Record<Run['status'], { label: string; classes: string }> = {
  running: {
    label: 'Running',
    classes: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 animate-pulse',
  },
  awaiting_approval: {
    label: 'Awaiting Approval',
    classes: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  },
  approved: {
    label: 'Approved',
    classes: 'bg-green-500/20 text-green-400 border-green-500/40',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
  },
  failed: {
    label: 'Failed',
    classes: 'bg-red-500/20 text-red-400 border-red-500/40',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
  },
};

export function RunStatusChip({ status }: Props): React.ReactElement {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.failed;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
