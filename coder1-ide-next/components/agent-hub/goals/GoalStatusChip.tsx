'use client';

import type { Goal } from '@/lib/agent-hub/goals';

interface Props {
  status: Goal['status'];
}

const STATUS_STYLES: Record<Goal['status'], string> = {
  active: 'bg-coder1-cyan/10 text-coder1-cyan border-coder1-cyan/30',
  completed: 'bg-green-500/10 text-green-400 border-green-500/30',
  paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  abandoned: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export default function GoalStatusChip({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
