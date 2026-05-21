'use client';

import { useState, useEffect, useRef } from 'react';

interface TranscriptEntry {
  id: string;
  meetingId: string;
  agentId: string;
  messageText: string;
  role: string;
  createdAt: string;
}

export default function WarRoomContainer() {
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const since = entries.length > 0 ? entries[entries.length - 1].createdAt : undefined;
        const params = new URLSearchParams({ meetingId: id });
        if (since) params.set('since', since);
        const resp = await fetch(`/api/agent-hub/warroom/transcript?${params}`);
        if (!resp.ok) return;
        const data = await resp.json() as { entries: TranscriptEntry[]; isActive: boolean };
        if (data.entries.length > 0) {
          setEntries(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const newEntries = data.entries.filter(e => !existingIds.has(e.id));
            return newEntries.length > 0 ? [...prev, ...newEntries] : prev;
          });
        }
        setIsActive(data.isActive);
        if (!data.isActive) stopPolling();
      } catch {
        // polling — ignore transient errors
      }
    }, 1000);
  };

  useEffect(() => () => stopPolling(), []);

  const handleStartStandup = async () => {
    setIsStarting(true);
    setError(null);
    setEntries([]);
    setMeetingId(null);
    try {
      const resp = await fetch('/api/agent-hub/warroom/standup', { method: 'POST' });
      const data = await resp.json() as { meetingId?: string; error?: string };
      if (!resp.ok) {
        setError(data.error ?? 'Failed to start standup');
        return;
      }
      if (data.meetingId) {
        setMeetingId(data.meetingId);
        setIsActive(true);
        startPolling(data.meetingId);
      }
    } catch {
      setError('Network error — could not start standup');
    } finally {
      setIsStarting(false);
    }
  };

  const standupComplete = !isActive && entries.length > 0;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">War Room</h1>
          <p className="text-sm text-gray-400 mt-1">Sequential standup updates from all agents</p>
        </div>
        <button
          onClick={handleStartStandup}
          disabled={isStarting || isActive}
          className="px-4 py-2 rounded-lg font-semibold text-sm transition-all
            bg-[#00D9FF] text-black hover:bg-[#00b8d9] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStarting ? 'Starting...' : isActive ? 'Standup in progress...' : 'Run Standup'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {meetingId && (
        <div className="text-xs text-gray-500 font-mono">
          Meeting: {meetingId}
          {isActive && <span className="ml-3 text-[#00D9FF] animate-pulse">Live</span>}
        </div>
      )}

      {standupComplete && (
        <div className="rounded-lg border border-[#00D9FF]/30 bg-[#00D9FF]/5 px-4 py-3 text-sm text-[#00D9FF]">
          Standup complete — {entries.length} agent update{entries.length !== 1 ? 's' : ''} received
        </div>
      )}

      {entries.length === 0 && !isActive && !meetingId && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-6 py-12 text-center text-gray-400 text-sm">
          No standup running. Click "Run Standup" to gather updates from all agents.
        </div>
      )}

      {entries.length === 0 && isActive && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-6 py-12 text-center text-gray-400 text-sm">
          Waiting for agents to respond...
        </div>
      )}

      <div className="flex flex-col gap-4">
        {entries.map(entry => (
          <div
            key={entry.id}
            className="rounded-lg border border-white/10 bg-[#111] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-[#00D9FF]">Agent {entry.agentId.slice(0, 8)}</span>
              <span className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleTimeString()}</span>
            </div>
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{entry.messageText}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
