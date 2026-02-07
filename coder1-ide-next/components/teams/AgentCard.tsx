'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileText, Loader2 } from '@/lib/icons';

type AgentStatus = 'initializing' | 'thinking' | 'working' | 'waiting' | 'completed' | 'error';

interface AgentCardProps {
  agentId: string;
  agentName: string;
  status: AgentStatus;
  progress: number;
  currentTask: string;
  output: string[];
  filesCount: number;
  files?: { path: string }[];
  color: string;
  onMessage?: (agentId: string, message: string) => void;
  onOpenFile?: (path: string) => void;
}

const STATUS_CONFIG: Record<AgentStatus, { color: string; pulse: boolean; label: string }> = {
  initializing: { color: 'bg-gray-400', pulse: false, label: 'Initializing' },
  thinking:     { color: 'bg-yellow-400', pulse: true, label: 'Thinking' },
  working:      { color: 'bg-coder1-cyan', pulse: true, label: 'Working' },
  waiting:      { color: 'bg-gray-500', pulse: false, label: 'Waiting' },
  completed:    { color: 'bg-green-400', pulse: false, label: 'Done' },
  error:        { color: 'bg-red-400', pulse: false, label: 'Error' },
};

export default function AgentCard({
  agentId,
  agentName,
  status,
  progress,
  currentTask,
  output,
  filesCount,
  files = [],
  color,
  onMessage,
  onOpenFile,
}: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.initializing;

  // Auto-scroll output log
  useEffect(() => {
    if (expanded && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, expanded]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || sending || !onMessage) return;
    setSending(true);
    try {
      await onMessage(agentId, trimmed);
      setMessage('');
    } catch {
      // Keep message in input on failure
    } finally {
      setSending(false);
    }
  }, [message, sending, onMessage, agentId]);

  return (
    <div className="rounded-lg border border-border-default bg-bg-tertiary overflow-hidden transition-colors hover:border-coder1-cyan/40">
      {/* Collapsed Header */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status dot */}
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.color} ${cfg.pulse ? 'animate-pulse' : ''}`} />

        {/* Agent name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary truncate" style={{ color }}>
              {agentName}
            </span>
            <span className="text-xs text-text-secondary">{cfg.label}</span>
          </div>
          <p className="text-xs text-text-muted truncate mt-0.5">
            {currentTask || 'Waiting for task...'}
          </p>
        </div>

        {/* Progress + chevron */}
        <span className="text-xs font-mono text-text-secondary shrink-0">{progress}%</span>
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
        }
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-bg-primary mx-3 mb-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            status === 'completed' ? 'bg-green-400'
            : status === 'error' ? 'bg-red-400'
            : 'bg-gradient-to-r from-coder1-purple to-coder1-cyan'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border-default pt-2"
             style={{ animation: 'fadeIn 200ms ease-out' }}>
          {/* Output log */}
          <div ref={outputRef} className="max-h-[200px] overflow-y-auto text-xs font-mono text-text-secondary space-y-0.5 bg-bg-primary rounded p-2">
            {output.length > 0 ? (
              output.map((line, i) => (
                <div key={i} className="break-words">
                  <span className="text-text-muted select-none">&gt; </span>{line}
                </div>
              ))
            ) : (
              <span className="text-text-muted italic">Waiting for output...</span>
            )}
          </div>

          {/* Generated files */}
          {files.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-text-muted">Files ({files.length}):</span>
              <div className="flex flex-wrap gap-1.5">
                {files.map((f) => (
                  <button
                    key={f.path}
                    onClick={(e) => { e.stopPropagation(); onOpenFile?.(f.path); }}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-bg-primary rounded hover:bg-coder1-cyan/10 hover:text-coder1-cyan transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    {f.path.split('/').pop()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message input */}
          {onMessage && status !== 'completed' && status !== 'error' && (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                placeholder={`Message ${agentName}...`}
                className="flex-1 px-2 py-1 text-xs rounded bg-bg-primary border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:border-coder1-cyan"
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || sending}
                className="px-2 py-1 text-xs rounded bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Send'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
