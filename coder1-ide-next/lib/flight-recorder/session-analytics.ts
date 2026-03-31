/**
 * Session Analytics — Computes statistics for a recorded session.
 */

import type { FlightEvent } from './types';

export interface SessionAnalytics {
  totalDuration: number;
  activeDuration: number;
  idleDuration: number;
  eventBreakdown: Record<string, number>;
  errorCount: number;
  aiInteractionCount: number;
  filesModified: string[];
  terminalCommandCount: number;
  gitCommits: number;
  idlePeriods: Array<{ start: number; end: number; duration: number }>;
}

const IDLE_THRESHOLD_MS = 120_000;

export function computeSessionAnalytics(events: FlightEvent[]): SessionAnalytics {
  const empty: SessionAnalytics = {
    totalDuration: 0, activeDuration: 0, idleDuration: 0,
    eventBreakdown: {}, errorCount: 0, aiInteractionCount: 0,
    filesModified: [], terminalCommandCount: 0, gitCommits: 0, idlePeriods: [],
  };

  if (events.length === 0) return empty;

  const sorted = [...events].sort((a, b) => a.clientTimestamp - b.clientTimestamp);
  const totalDuration = sorted[sorted.length - 1].clientTimestamp - sorted[0].clientTimestamp;

  const idlePeriods: SessionAnalytics['idlePeriods'] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].clientTimestamp - sorted[i - 1].clientTimestamp;
    if (gap > IDLE_THRESHOLD_MS) {
      idlePeriods.push({
        start: sorted[i - 1].clientTimestamp,
        end: sorted[i].clientTimestamp,
        duration: gap,
      });
    }
  }

  const idleDuration = idlePeriods.reduce((sum, p) => sum + p.duration, 0);
  const activeDuration = totalDuration - idleDuration;

  const eventBreakdown: Record<string, number> = {};
  let errorCount = 0;
  let aiInteractionCount = 0;
  let terminalCommandCount = 0;
  let gitCommits = 0;
  const filesSet = new Set<string>();

  for (const event of sorted) {
    eventBreakdown[event.type] = (eventBreakdown[event.type] || 0) + 1;
    if (event.type.startsWith('error:')) errorCount++;
    if (event.type.startsWith('ai:')) aiInteractionCount++;
    if (event.type === 'terminal:input') terminalCommandCount++;
    if (event.type === 'git:commit') gitCommits++;
    if (event.type === 'file:save' && typeof event.data.fileName === 'string') {
      filesSet.add(event.data.fileName);
    }
  }

  return {
    totalDuration, activeDuration, idleDuration,
    eventBreakdown, errorCount, aiInteractionCount,
    filesModified: Array.from(filesSet), terminalCommandCount, gitCommits, idlePeriods,
  };
}
