'use client';

import React from 'react';
import { useFlightRecorder } from '@/lib/hooks/useFlightRecorder';

/**
 * RecordingIndicator - Status bar component for Flight Recorder state.
 *
 * Shows a pulsing red dot when recording, orange when paused, red warning on error.
 * Click toggles pause/resume. Hidden when feature is disabled or not recording.
 */
export default function RecordingIndicator() {
  const {
    isEnabled,
    isRecording,
    isPaused,
    hasError,
    eventCount,
    pauseRecording,
    resumeRecording,
  } = useFlightRecorder();

  if (!isEnabled || !isRecording) return null;

  const handleClick = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  // Error state
  if (hasError) {
    return (
      <div
        className="flex items-center gap-1.5 text-red-400 cursor-pointer select-none transition-colors hover:text-red-300"
        title={`Flight Recorder error — ${eventCount} events captured before failure`}
        aria-label="Flight Recorder error"
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <span className="text-xs font-bold leading-none">!</span>
        <span className="font-mono text-xs font-medium">REC ERR</span>
      </div>
    );
  }

  // Paused state
  if (isPaused) {
    return (
      <div
        className="flex items-center gap-1.5 text-orange-400/80 cursor-pointer select-none transition-colors hover:text-orange-300"
        title={`Flight Recorder paused — ${eventCount} events captured. Click to resume.`}
        aria-label="Flight Recorder paused. Click to resume."
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <span className="w-2 h-2 rounded-full bg-orange-400" />
        <span className="font-mono text-xs font-medium">PAUSED</span>
      </div>
    );
  }

  // Active recording state
  return (
    <div
      className="flex items-center gap-1.5 cursor-pointer select-none transition-colors hover:opacity-80"
      title={`Flight Recorder — ${eventCount} events captured. Click to pause.`}
      aria-label={`Flight Recorder active. ${eventCount} events captured. Click to pause.`}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span className="font-mono text-xs font-medium text-text-muted">REC</span>
    </div>
  );
}
