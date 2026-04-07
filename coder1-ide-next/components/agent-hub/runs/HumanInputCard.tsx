'use client';

import React, { useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';

interface Props {
  runId: string;
  request: string;
  agentName?: string;
  taskTitle?: string;
  onResponded: () => void;
}

export function HumanInputCard({ runId, request, agentName, taskTitle, onResponded }: Props): React.ReactElement {
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!response.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/agent-hub/runs/${runId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: response.trim() }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      onResponded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-amber-500/40 rounded-lg bg-amber-500/5 p-4 mx-4 my-3">
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-400">Agent Needs Your Input</p>
          {(agentName || taskTitle) && (
            <p className="text-xs text-text-muted mt-0.5">
              {agentName && <span className="font-medium">{agentName}</span>}
              {agentName && taskTitle && <span> · </span>}
              {taskTitle && <span>{taskTitle}</span>}
            </p>
          )}
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">{request}</p>

          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your response here..."
              rows={3}
              aria-label="Your response"
              aria-describedby={error ? 'human-input-error' : undefined}
              className="w-full px-3 py-2 text-sm bg-bg-tertiary border border-border-default rounded-md text-text-secondary placeholder-text-muted resize-none focus:outline-none focus:border-amber-500/60"
            />
            {error && <p id="human-input-error" className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !response.trim()}
              className="self-end flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-medium border border-amber-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={12} />
              {submitting ? 'Submitting...' : 'Submit Response'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
