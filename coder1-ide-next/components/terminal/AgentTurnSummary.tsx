'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface TurnRecord {
  turnNumber: number;
  durationMs: number;
  fileCount: number;
  additions: number;
  deletions: number;
  cancelled: boolean;
  startedAt: number;
}

interface AgentTurnSummaryProps {
  turns: TurnRecord[]; // max 3, newest first
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '< 1s';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function TurnRow({ turn, index }: { turn: TurnRecord; index: number }) {
  const isNewest = index === 0;
  const opacity = isNewest ? 1 : 0.55;
  const textSize = isNewest ? 'text-[11px]' : 'text-[10px]';

  if (turn.cancelled) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1 ${textSize} text-text-muted`}
        style={{ opacity }}
      >
        <span>Turn {turn.turnNumber}</span>
        <span className="text-text-muted">—</span>
        <span className="text-text-muted italic">Cancelled</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 ${textSize} text-text-secondary`}
      style={{ opacity }}
    >
      <span className="text-text-muted">Turn {turn.turnNumber}</span>
      <span className="text-text-muted">—</span>
      <span>{formatDuration(turn.durationMs)}</span>
      {turn.fileCount > 0 && (
        <>
          <span className="text-text-muted">•</span>
          <span>{turn.fileCount} file{turn.fileCount !== 1 ? 's' : ''}</span>
          <span className="text-text-muted">•</span>
          {turn.additions > 0 && (
            <span className="text-green-400 font-mono">+{turn.additions}</span>
          )}
          {turn.deletions > 0 && (
            <span className="text-red-400 font-mono">-{turn.deletions}</span>
          )}
        </>
      )}
    </div>
  );
}

export default function AgentTurnSummary({ turns }: AgentTurnSummaryProps) {
  if (turns.length === 0) return null;

  return (
    <div
      className="border-t border-border-default bg-bg-primary/90"
      style={{ flexShrink: 0 }}
    >
      <AnimatePresence initial={false}>
        {turns.map((turn, index) => (
          <motion.div
            key={`${turn.turnNumber}-${turn.startedAt}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <TurnRow turn={turn} index={index} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
