'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, FileWarning, GitBranch, Clock, RefreshCw, CheckCircle } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import type { FileConflict, VCSConflictDetectedPayload, VCSFileEditingPayload, VCSFileStoppedPayload, VCSConflictResolvedPayload } from '@/types/vcs';

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

interface ActiveEditor {
  userId: string;
  username: string;
  filePath: string;
  branch: string;
  since: string;
}

interface ConflictsTabProps {
  syncTeam: { id: string; name: string };
}

export default function ConflictsTab({ syncTeam }: ConflictsTabProps) {
  const isEnabled = process.env.NEXT_PUBLIC_CONFLICT_DETECTION_ENABLED === 'true';
  const teamId = syncTeam.id;

  const [conflicts, setConflicts] = useState<FileConflict[]>([]);
  const [activeEditors, setActiveEditors] = useState<ActiveEditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request initial state and set up socket listeners
  useEffect(() => {
    if (!isEnabled) return;
    let mounted = true;
    let cleanup: (() => void) | undefined;

    const setupSocket = async () => {
      try {
        const socket = await getSocket();

        // Request current conflict state
        socket.emit('vcs:conflicts:request', { teamId });

        // Handle initial state response
        const handleState = (data: { teamId: string; conflicts: FileConflict[]; activeEditors: ActiveEditor[] }) => {
          if (!mounted || data.teamId !== teamId) return;
          setConflicts(data.conflicts);
          setActiveEditors(data.activeEditors);
          setLoading(false);
        };

        // Handle new conflict detected
        const handleConflictDetected = (data: VCSConflictDetectedPayload) => {
          if (!mounted || data.teamId !== teamId) return;
          setConflicts(prev => {
            const idx = prev.findIndex(c => c.filePath === data.conflict.filePath);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = data.conflict;
              return updated;
            }
            return [...prev, data.conflict];
          });
        };

        // Handle conflict resolved
        const handleConflictResolved = (data: VCSConflictResolvedPayload) => {
          if (!mounted || data.teamId !== teamId) return;
          setConflicts(prev => prev.filter(c => c.filePath !== data.filePath));
        };

        // Handle file editing updates
        const handleFileEditing = (data: VCSFileEditingPayload) => {
          if (!mounted) return;
          setActiveEditors(prev => {
            const filtered = prev.filter(
              e => !(e.userId === data.userId && e.filePath === data.filePath)
            );
            return [...filtered, {
              userId: data.userId,
              username: data.username,
              filePath: data.filePath,
              branch: data.branch,
              since: data.since,
            }];
          });
        };

        // Handle file stopped
        const handleFileStopped = (data: VCSFileStoppedPayload) => {
          if (!mounted) return;
          setActiveEditors(prev =>
            prev.filter(e => !(e.userId === data.userId && e.filePath === data.filePath))
          );
        };

        socket.on('vcs:conflicts:state', handleState);
        socket.on('vcs:conflict:detected', handleConflictDetected);
        socket.on('vcs:conflict:resolved', handleConflictResolved);
        socket.on('vcs:file:editing', handleFileEditing);
        socket.on('vcs:file:stopped', handleFileStopped);

        // Set loading to false after a timeout if no response
        const timeout = setTimeout(() => {
          if (mounted && loading) {
            setLoading(false);
          }
        }, 3000);

        cleanup = () => {
          mounted = false;
          clearTimeout(timeout);
          socket.off('vcs:conflicts:state', handleState);
          socket.off('vcs:conflict:detected', handleConflictDetected);
          socket.off('vcs:conflict:resolved', handleConflictResolved);
          socket.off('vcs:file:editing', handleFileEditing);
          socket.off('vcs:file:stopped', handleFileStopped);
        };
      } catch {
        if (mounted) {
          setError('Failed to connect to conflict detection');
          setLoading(false);
        }
      }
    };

    setupSocket();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, [teamId]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const socket = await getSocket();
      socket.emit('vcs:conflicts:request', { teamId });
      setTimeout(() => setLoading(false), 2000);
    } catch {
      setError('Failed to refresh');
      setLoading(false);
    }
  }, [teamId]);

  // Feature flag check (after all hooks)
  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-text-muted/60">
        <AlertTriangle className="w-8 h-8 mb-3 opacity-40" />
        <p className="text-xs text-center">Conflict Detection is not enabled.<br />Set NEXT_PUBLIC_CONFLICT_DETECTION_ENABLED=true</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-text-muted">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        <span className="text-xs">Checking for conflicts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 text-xs text-red-400 bg-red-400/10 rounded-md">
        <span>{error}</span>
        <button
          onClick={handleRefresh}
          className="ml-2 text-red-300 underline hover:text-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
  const warningConflicts = conflicts.filter(c => c.severity === 'warning');

  // No conflicts and no active editors
  if (conflicts.length === 0 && activeEditors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-text-muted/60">
        <CheckCircle className="w-10 h-10 mb-3 text-green-500/40" />
        <p className="text-xs text-center">All clear! No file conflicts detected.</p>
        <p className="text-[10px] mt-2 text-text-muted/40">
          We&apos;ll warn you if teammates edit the same files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide">
          Conflict Detection
        </h4>
        <button
          onClick={handleRefresh}
          className="p-1 text-text-muted hover:text-text-primary rounded transition-colors"
          title="Refresh conflicts"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Critical conflicts (same file) */}
      {criticalConflicts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-red-400">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs font-medium">
              File Conflicts ({criticalConflicts.length})
            </span>
          </div>
          {criticalConflicts.map(conflict => (
            <ConflictCard key={conflict.filePath} conflict={conflict} />
          ))}
        </div>
      )}

      {/* Warning conflicts (same directory) */}
      {warningConflicts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-yellow-400">
            <FileWarning className="w-3 h-3" />
            <span className="text-xs font-medium">
              Directory Warnings ({warningConflicts.length})
            </span>
          </div>
          {warningConflicts.map(conflict => (
            <ConflictCard key={conflict.filePath} conflict={conflict} />
          ))}
        </div>
      )}

      {/* Active editors (no conflicts, but shows who is working on what) */}
      {activeEditors.length > 0 && conflicts.length === 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-text-muted">Active Editors</span>
          {activeEditors.map(editor => (
            <div
              key={`${editor.userId}-${editor.filePath}`}
              className="flex items-center gap-2 p-2 bg-bg-secondary rounded-md text-xs"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-text-primary">{editor.username}</span>
                <span className="text-text-muted ml-1">editing</span>
                <div className="text-text-muted truncate">{editor.filePath}</div>
              </div>
              <div className="flex items-center gap-1 text-text-muted flex-shrink-0">
                <GitBranch className="w-3 h-3" />
                <span className="truncate max-w-[80px]">{editor.branch}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConflictCard({ conflict }: { conflict: FileConflict }) {
  const isCritical = conflict.severity === 'critical';

  return (
    <div
      className={`p-2 rounded-md border text-xs ${
        isCritical
          ? 'bg-red-400/5 border-red-400/20'
          : 'bg-yellow-400/5 border-yellow-400/20'
      }`}
    >
      {/* File path */}
      <div className="flex items-center gap-1 mb-1.5">
        {isCritical ? (
          <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
        ) : (
          <FileWarning className="w-3 h-3 text-yellow-400 flex-shrink-0" />
        )}
        <span className="font-mono text-text-primary truncate">{conflict.filePath}</span>
      </div>

      {/* Editors */}
      <div className="space-y-1 ml-4">
        {conflict.editors.map(editor => (
          <div key={editor.userId} className="flex items-center gap-2 text-text-muted">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
            <span className="font-medium text-text-primary">{editor.username}</span>
            <div className="flex items-center gap-0.5">
              <GitBranch className="w-2.5 h-2.5" />
              <span className="truncate max-w-[100px]">{editor.branch}</span>
            </div>
            <div className="flex items-center gap-0.5 ml-auto">
              <Clock className="w-2.5 h-2.5" />
              <span>{timeAgo(editor.since)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
