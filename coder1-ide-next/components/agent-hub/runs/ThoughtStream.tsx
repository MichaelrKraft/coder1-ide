'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Wrench, CheckCircle2, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import type { RunThought } from '@/lib/agent-hub/runs';
import { getSocket } from '@/lib/socket';

interface LiveThought {
  id: string;
  eventType: 'tool_call' | 'tool_result' | 'thinking';
  label: string;
  tool?: string;
  timestamp: string;
}

interface Props {
  runId: string;
  initialThoughts: RunThought[];
  isLive: boolean;
}

const EVENT_CONFIG: Record<LiveThought['eventType'], {
  icon: React.ElementType;
  color: string;
}> = {
  tool_call: { icon: Wrench, color: 'text-coder1-cyan' },
  tool_result: { icon: CheckCircle2, color: 'text-green-400' },
  thinking: { icon: Brain, color: 'text-text-muted' },
};

export function ThoughtStream({ runId, initialThoughts, isLive }: Props): React.ReactElement {
  const [thoughts, setThoughts] = useState<LiveThought[]>(
    initialThoughts.map((t) => ({
      id: t.id,
      eventType: t.eventType as LiveThought['eventType'],
      label: t.label,
      tool: t.tool ?? undefined,
      timestamp: t.createdAt,
    }))
  );
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new thoughts arrive (only if not collapsed)
  useEffect(() => {
    if (!collapsed) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thoughts, collapsed]);

  // Subscribe to live thought events via Socket.IO
  useEffect(() => {
    if (!isLive) return;

    let socketInstance: Awaited<ReturnType<typeof getSocket>> | null = null;

    const setup = async () => {
      socketInstance = await getSocket();
      socketInstance.on(
        'run:thought',
        (event: {
          runId: string;
          eventType: string;
          label: string;
          tool?: string;
          timestamp: string;
        }) => {
          if (event.runId !== runId) return;
          setThoughts((prev) => [
            ...prev,
            {
              id: `live-${Date.now()}-${Math.random()}`,
              eventType: event.eventType as LiveThought['eventType'],
              label: event.label,
              tool: event.tool,
              timestamp: event.timestamp,
            },
          ]);
        }
      );
    };

    void setup();

    return () => {
      socketInstance?.off('run:thought');
    };
  }, [runId, isLive]);

  const thoughtCount = thoughts.length;

  return (
    <div
      className="border-b border-border flex flex-col overflow-hidden"
      style={{ maxHeight: collapsed ? '36px' : '200px', minHeight: '36px' }}
    >
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors shrink-0 w-full"
      >
        <span className="flex items-center gap-1.5">
          <Brain
            size={12}
            className={isLive && thoughtCount > 0 ? 'text-coder1-cyan animate-pulse' : ''}
          />
          neural stream
          {thoughtCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted text-xs">
              {thoughtCount}
            </span>
          )}
        </span>
        {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>

      {/* Thought timeline — hidden when collapsed */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1 min-h-0">
          {thoughts.length === 0 ? (
            <p className="text-xs text-text-muted italic py-2">
              {isLive ? 'Waiting for agent activity...' : 'No thought events recorded.'}
            </p>
          ) : (
            thoughts.map((thought) => {
              const config = EVENT_CONFIG[thought.eventType] ?? EVENT_CONFIG.thinking;
              const Icon = config.icon;
              return (
                <div key={thought.id} className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    <Icon size={11} className={config.color} />
                  </div>
                  <span
                    className={`text-xs leading-tight break-words ${config.color} ${
                      thought.eventType === 'thinking' ? 'italic opacity-70' : ''
                    }`}
                  >
                    {thought.label}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
