'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Star, Trash2, Play, Clock, Loader2, Film, Hash, Download } from 'lucide-react';

interface RecordingSession {
  id: string;
  sessionId: string;
  status: string;
  startedAt: number;
  endedAt?: number;
  totalEvents: number;
  totalSizeBytes: number;
  metadata?: { sessionType?: string; gitBranch?: string };
  starred: boolean;
}

interface RecordingsDashboardProps {
  onOpenReplay: (sessionId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-500',
  recording: 'bg-blue-500 animate-pulse',
  paused: 'bg-orange-400',
  crashed: 'bg-red-500',
};

function formatDuration(startedAt: number, endedAt?: number): string {
  const ms = (endedAt || Date.now()) - startedAt;
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return '<1m';
}

function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function RecordingsDashboard({ onOpenReplay }: RecordingsDashboardProps) {
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [starredOnly, setStarredOnly] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (starredOnly) params.set('starred', 'true');
      params.set('limit', '50');

      const res = await fetch(`/api/flight-recorder/sessions?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      // Silently fail — Flight Recorder may not be enabled
    } finally {
      setLoading(false);
    }
  }, [starredOnly]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleStar = async (sessionId: string, starred: boolean) => {
    await fetch(`/api/flight-recorder/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred }),
    });
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, starred } : s));
  };

  const handleDelete = async (sessionId: string) => {
    await fetch(`/api/flight-recorder/sessions/${sessionId}`, { method: 'DELETE' });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const filtered = searchQuery
    ? sessions.filter((s) =>
        s.metadata?.sessionType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.metadata?.gitBranch?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.includes(searchQuery)
      )
    : sessions;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button
          onClick={() => setStarredOnly(!starredOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
            starredOnly
              ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
              : 'border-gray-700 text-gray-500 hover:text-gray-300'
          }`}
        >
          <Star size={14} fill={starredOnly ? 'currentColor' : 'none'} />
          Starred
        </button>
      </div>

      {/* Sessions list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Film size={32} className="mb-3 opacity-40" />
          <p className="text-sm">
            {sessions.length === 0
              ? 'No recordings yet. Enable Flight Recorder in Settings to start capturing sessions.'
              : 'No recordings match your search.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-3 px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors group"
            >
              {/* Status dot */}
              <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[session.status] || 'bg-gray-500'}`} />

              {/* Session info */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenReplay(session.id)}>
                <div className="text-sm text-white truncate">
                  {session.metadata?.sessionType || 'Coding Session'}
                  {session.metadata?.gitBranch && (
                    <span className="text-xs text-gray-500 ml-2">({session.metadata.gitBranch})</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  <span>{formatRelativeDate(session.startedAt)}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {formatDuration(session.startedAt, session.endedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash size={10} />
                    {session.totalEvents.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onOpenReplay(session.id)}
                  className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded"
                  title="Replay"
                >
                  <Play size={14} />
                </button>
                <button
                  onClick={() => window.open(`/api/flight-recorder/sessions/${session.id}/export`)}
                  className="p-1.5 text-gray-500 hover:text-green-400 rounded"
                  title="Export"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => handleStar(session.id, !session.starred)}
                  className={`p-1.5 rounded ${session.starred ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}
                  title={session.starred ? 'Unstar' : 'Star'}
                >
                  <Star size={14} fill={session.starred ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => handleDelete(session.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 rounded"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete All — GDPR compliance */}
      {sessions.length > 0 && (
        <div className="pt-4 border-t border-gray-800 mt-4">
          {confirmDeleteAll ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-400">Delete all {sessions.length} recordings? This cannot be undone.</span>
              <button
                onClick={async () => {
                  await fetch('/api/flight-recorder/delete-all', { method: 'DELETE' });
                  setSessions([]);
                  setConfirmDeleteAll(false);
                }}
                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded"
              >
                Yes, delete all
              </button>
              <button
                onClick={() => setConfirmDeleteAll(false)}
                className="px-3 py-1 text-xs text-gray-400 hover:text-white rounded border border-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Delete all recordings
            </button>
          )}
        </div>
      )}
    </div>
  );
}
