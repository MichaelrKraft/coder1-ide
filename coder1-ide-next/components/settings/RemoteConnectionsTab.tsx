'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Globe,
  Server,
  MoreVertical,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus,
  Info,
  Monitor,
} from 'lucide-react';
import type { SSHConnection, SSHConnectionStatus } from '@/types/ssh';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RemoteConnectionsTabProps {
  connections: SSHConnection[];
  activeConnectionId: string | null;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onConnect: (id: string) => void;
  onDisconnect: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO timestamp as a relative human-readable string. */
function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return 'Never';

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Never';

  const now = Date.now();
  const diffMs = now - then;
  if (diffMs < 0) return 'Just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

interface StatusBadge {
  label: string;
  className: string;
}

function getStatusBadge(status: SSHConnectionStatus): StatusBadge {
  switch (status) {
    case 'connected':
      return { label: 'Connected', className: 'bg-blue-500/20 text-blue-400 animate-pulse' };
    case 'connecting':
    case 'reconnecting':
      return { label: 'Connecting...', className: 'bg-yellow-500/20 text-yellow-400 animate-pulse' };
    case 'disconnected':
      return { label: 'Ready', className: 'bg-green-500/20 text-green-400' };
    case 'error':
      return { label: 'Error', className: 'bg-red-500/20 text-red-400' };
    case 'never-tested':
    default:
      return { label: 'Not tested', className: 'bg-gray-500/20 text-gray-400' };
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Three-dot menu for a connection card. */
function ConnectionMenu({
  connectionId,
  onEdit,
  onDelete,
}: {
  connectionId: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="p-1.5 rounded hover:bg-gray-700 transition-colors"
        aria-label="Connection options"
      >
        <MoreVertical className="w-4 h-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
          <button
            onClick={() => {
              setOpen(false);
              onEdit(connectionId);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete(connectionId);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-b-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/** Confirmation dialog shown before deleting a connection. */
function DeleteConfirmDialog({
  connectionName,
  isActive,
  onCancel,
  onConfirm,
}: {
  connectionName: string;
  isActive: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm w-full shadow-2xl"
        role="alertdialog"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
      >
        <h3 id="delete-dialog-title" className="text-lg font-semibold text-white mb-2">
          Delete Connection
        </h3>
        <p id="delete-dialog-desc" className="text-sm text-gray-400 mb-1">
          Delete &lsquo;{connectionName}&rsquo;? This cannot be undone.
        </p>
        {isActive && (
          <p className="text-sm text-yellow-400 mb-4">
            This connection is currently active. It will be disconnected and deleted.
          </p>
        )}
        {!isActive && <div className="mb-4" />}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RemoteConnectionsTab({
  connections,
  activeConnectionId,
  onAdd,
  onEdit,
  onDelete,
  onConnect,
  onDisconnect,
}: RemoteConnectionsTabProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingConnection = pendingDeleteId
    ? connections.find((c) => c.id === pendingDeleteId) ?? null
    : null;

  const activeConnection = activeConnectionId
    ? connections.find((c) => c.id === activeConnectionId) ?? null
    : null;

  function handleDeleteRequest(id: string) {
    setPendingDeleteId(id);
  }

  function handleDeleteConfirm() {
    if (pendingDeleteId) {
      onDelete(pendingDeleteId);
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">SSH Remote Connections</h3>
        <p className="text-xs text-gray-500 mb-2">
          For remote development (coding on a server). For deployments, use{' '}
          <strong className="text-gray-400">Deployment Integrations</strong> above.
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Current Environment:</span>
          {activeConnection ? (
            <span className="flex items-center gap-1.5 text-green-400 font-medium">
              <Globe className="w-4 h-4" />
              {activeConnection.name}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-gray-300 font-medium">
              <Monitor className="w-4 h-4" />
              Local Machine
            </span>
          )}
        </div>
      </div>

      {/* Connection Cards */}
      {connections.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Server className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-sm text-gray-400 mb-4 max-w-xs">
            No remote connections saved. Add one to connect Claude to your server.
          </p>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Connection
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((conn) => {
            const isActive = conn.id === activeConnectionId;
            const badge = getStatusBadge(isActive ? 'connected' : conn.lastStatus);

            return (
              <div
                key={conn.id}
                className={`p-4 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-gray-800 border-green-500/50 shadow-[0_0_12px_rgba(34,197,94,0.15)]'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: connection info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <Globe className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {conn.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {conn.host}:{conn.port}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Last connected: {formatRelativeTime(conn.lastConnected)}
                      </div>
                    </div>
                  </div>

                  {/* Right: status + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>

                    {/* Connect / Disconnect button */}
                    {isActive ? (
                      <button
                        onClick={onDisconnect}
                        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                        aria-label={`Disconnect from ${conn.name}`}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => onConnect(conn.id)}
                        className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        aria-label={`Connect to ${conn.name}`}
                      >
                        Connect
                      </button>
                    )}

                    {/* Menu */}
                    <ConnectionMenu
                      connectionId={conn.id}
                      onEdit={onEdit}
                      onDelete={handleDeleteRequest}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {connections.length > 0 && (
        <div className="space-y-3 pt-2">
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Connection
          </button>
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            Remote connections let Claude Code work directly on your server.
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {pendingConnection && (
        <DeleteConfirmDialog
          connectionName={pendingConnection.name}
          isActive={pendingConnection.id === activeConnectionId}
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
