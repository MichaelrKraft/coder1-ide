'use client';

import React from 'react';
import { timeAgo } from './types';

interface BriefingTabProps {
  briefing: string | null;
  briefingLoading: boolean;
  briefingError: string | null;
  briefingGeneratedAt: string | null;
  generateBriefing: () => void;
}

export default function BriefingTab({
  briefing,
  briefingLoading,
  briefingError,
  briefingGeneratedAt,
  generateBriefing,
}: BriefingTabProps) {
  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-text-primary">Morning Briefing</h3>
          {briefingGeneratedAt && (
            <p className="text-[10px] text-text-muted mt-0.5">
              Generated {timeAgo(briefingGeneratedAt)}
            </p>
          )}
        </div>
        <button
          onClick={generateBriefing}
          disabled={briefingLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 text-[11px] font-medium hover:bg-violet-500/30 disabled:opacity-50 transition-colors"
        >
          {briefingLoading
            ? <><span className="inline-block animate-spin">\u27F3</span> Generating...</>
            : <>\u2728 {briefing ? 'Regenerate' : 'Generate Briefing'}</>
          }
        </button>
      </div>

      {briefingError && (
        <div className="text-[11px] text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
          {briefingError}
        </div>
      )}

      {briefing && !briefingError ? (
        <pre className="text-[11px] leading-relaxed text-text-muted whitespace-pre-wrap font-sans bg-bg-secondary rounded-xl p-4 border border-border-default">
          {briefing}
        </pre>
      ) : !briefingError ? (
        <div className="text-center py-10 text-text-muted/40 text-[11px]">
          <div className="text-2xl mb-2">\u2600\uFE0F</div>
          <p>Generate a daily briefing to see what your<br />team accomplished in the last 24 hours.</p>
        </div>
      ) : null}
    </div>
  );
}
