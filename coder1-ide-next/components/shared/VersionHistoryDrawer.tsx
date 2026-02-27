'use client';

import React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface VersionEntry {
  version: number;
  savedBy: string;
  savedByName: string;
  changeNote?: string;
  createdAt: string;
}

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  versions: VersionEntry[];
  currentVersion: number;
  onRestore?: (version: number) => void;
  isLoading?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ============================================================================
// Component
// ============================================================================

export function VersionHistoryDrawer({
  isOpen,
  onClose,
  versions,
  currentVersion,
  onRestore,
  isLoading = false,
}: VersionHistoryDrawerProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-50 h-full w-80 bg-background border-l border-border flex flex-col shadow-xl"
        aria-label="Version history"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Version History</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close version history"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
              Loading versions…
            </div>
          ) : versions.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
              No versions yet
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {versions.map((entry) => {
                const isCurrent = entry.version === currentVersion;
                return (
                  <li
                    key={entry.version}
                    className={`px-4 py-3 ${isCurrent ? 'bg-muted/50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground">
                            v{entry.version}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {entry.savedByName || entry.savedBy}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                          {formatTimestamp(entry.createdAt)}
                        </p>
                        {entry.changeNote && (
                          <p className="text-xs text-foreground/80 mt-1 line-clamp-2">
                            {entry.changeNote}
                          </p>
                        )}
                      </div>

                      {onRestore && !isCurrent && (
                        <button
                          onClick={() => onRestore(entry.version)}
                          className="shrink-0 text-xs text-primary hover:underline mt-0.5"
                          aria-label={`Restore version ${entry.version}`}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
