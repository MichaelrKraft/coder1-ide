'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConflictBannerProps {
  onReload: () => void;
  onKeepMine: () => void;
  onShowDiff: () => void;
}

export default function ConflictBanner({ onReload, onKeepMine, onShowDiff }: ConflictBannerProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-yellow-900/40 border-b border-yellow-600/50 text-yellow-200 text-xs">
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-yellow-400" />
      <span className="flex-1">File modified externally.</span>
      <button
        onClick={onReload}
        className="px-2 py-0.5 rounded bg-yellow-700/50 hover:bg-yellow-700 transition-colors text-yellow-100"
      >
        Reload
      </button>
      <button
        onClick={onKeepMine}
        className="px-2 py-0.5 rounded bg-yellow-700/50 hover:bg-yellow-700 transition-colors text-yellow-100"
      >
        Keep Mine
      </button>
      <button
        onClick={onShowDiff}
        className="px-2 py-0.5 rounded bg-yellow-700/50 hover:bg-yellow-700 transition-colors text-yellow-100"
      >
        Show Diff
      </button>
    </div>
  );
}
