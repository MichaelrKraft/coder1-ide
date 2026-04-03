'use client';

interface Props {
  status: 'idle' | 'running' | 'error' | 'archived';
}

const STATUS_CONFIG = {
  idle: {
    label: 'Idle',
    className: 'bg-bg-tertiary text-text-muted border-border-default',
    pulse: false,
  },
  running: {
    label: 'Running',
    className: 'bg-coder1-cyan/10 text-coder1-cyan border-coder1-cyan/40',
    pulse: true,
  },
  error: {
    label: 'Error',
    className: 'bg-red-500/10 text-red-400 border-red-500/40',
    pulse: false,
  },
  archived: {
    label: 'Archived',
    className: 'bg-bg-tertiary text-text-muted border-border-default opacity-50',
    pulse: false,
    strikethrough: true,
  },
} as const;

export default function AgentStatusChip({ status }: Props) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coder1-cyan opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-coder1-cyan" />
        </span>
      )}
      <span className={'strikethrough' in config && config.strikethrough ? 'line-through' : ''}>
        {config.label}
      </span>
    </span>
  );
}
