'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, X, GitBranch } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import type { FileConflict, VCSConflictDetectedPayload } from '@/types/vcs';

interface ConflictToast {
  id: string;
  conflict: FileConflict;
  dismissedAt?: number;
}

const TOAST_AUTO_DISMISS_MS = 5000;

/**
 * ConflictWarning - Global toast notification for VCS conflicts.
 * Renders slide-in toasts from the right side when conflicts are detected.
 * Should be mounted once at the app layout level.
 */
export default function ConflictWarning() {
  const [toasts, setToasts] = useState<ConflictToast[]>([]);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      try {
        const socket = await getSocket();

        const handleConflict = (data: VCSConflictDetectedPayload) => {
          if (!mounted) return;
          // Only show toasts for critical (same-file) conflicts
          if (data.conflict.severity !== 'critical') return;

          const id = `conflict-${data.conflict.filePath}-${Date.now()}`;

          setToasts(prev => {
            // Don't duplicate toasts for the same file if one is already visible
            const existing = prev.find(
              t => t.conflict.filePath === data.conflict.filePath && !t.dismissedAt
            );
            if (existing) {
              // Update the existing toast with new editor info
              return prev.map(t =>
                t.id === existing.id
                  ? { ...t, conflict: data.conflict }
                  : t
              );
            }
            return [...prev, { id, conflict: data.conflict }];
          });

          // Auto-dismiss after 5 seconds
          setTimeout(() => {
            if (!mounted) return;
            setToasts(prev =>
              prev.map(t => (t.id === id ? { ...t, dismissedAt: Date.now() } : t))
            );
            // Remove from DOM after animation
            setTimeout(() => {
              if (!mounted) return;
              setToasts(prev => prev.filter(t => t.id !== id));
            }, 300);
          }, TOAST_AUTO_DISMISS_MS);
        };

        socket.on('vcs:conflict:detected', handleConflict);

        return () => {
          mounted = false;
          socket.off('vcs:conflict:detected', handleConflict);
        };
      } catch {
        // Socket not available - silently skip
      }
    };

    setup();
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, dismissedAt: Date.now() } : t))
    );
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-2 p-3 rounded-lg border
            bg-bg-primary border-red-400/30 shadow-lg shadow-red-900/10
            transition-all duration-300 ease-out
            ${toast.dismissedAt ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
          `}
          style={{
            animation: toast.dismissedAt ? undefined : 'slideInRight 0.3s ease-out',
          }}
        >
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary">
              File Conflict Detected
            </p>
            <p className="text-xs font-mono text-text-muted mt-0.5 truncate">
              {toast.conflict.filePath}
            </p>
            <div className="mt-1 space-y-0.5">
              {toast.conflict.editors.map(editor => (
                <div
                  key={editor.userId}
                  className="flex items-center gap-1 text-xs text-text-muted"
                >
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  <span>{editor.username}</span>
                  <GitBranch className="w-2.5 h-2.5" />
                  <span className="truncate max-w-[100px]">{editor.branch}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="p-0.5 text-text-muted hover:text-text-primary rounded transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* Slide-in animation keyframes */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
