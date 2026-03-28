'use client';

import { useState, useEffect, useCallback } from 'react';
import { eventCollector } from '../flight-recorder/event-collector';
import { featureFlags } from '@/config/feature-flags';

export interface FlightRecorderState {
  isEnabled: boolean;
  isRecording: boolean;
  isPaused: boolean;
  hasError: boolean;
  eventCount: number;
  sessionId: string | null;
}

export function useFlightRecorder() {
  const [state, setState] = useState<FlightRecorderState>({
    isEnabled: false,
    isRecording: false,
    isPaused: false,
    hasError: false,
    eventCount: 0,
    sessionId: null,
  });

  useEffect(() => {
    const isEnabled = featureFlags.isEnabled('FLIGHT_RECORDER');
    const stats = eventCollector.getStats();
    setState((prev) => ({ ...prev, isEnabled, ...stats }));

    const interval = setInterval(() => {
      const latest = eventCollector.getStats();
      setState((prev) => ({
        ...prev,
        isEnabled: featureFlags.isEnabled('FLIGHT_RECORDER'),
        isRecording: latest.isRecording,
        isPaused: latest.isPaused,
        hasError: latest.hasError,
        eventCount: latest.totalRecorded,
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const startRecording = useCallback((sessionId: string) => {
    eventCollector.startSession(sessionId);
    setState((prev) => ({ ...prev, isRecording: true, sessionId }));
  }, []);

  const stopRecording = useCallback(() => {
    eventCollector.endSession();
    setState((prev) => ({ ...prev, isRecording: false, sessionId: null }));
  }, []);

  const pauseRecording = useCallback(() => {
    eventCollector.pause();
    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const resumeRecording = useCallback(() => {
    eventCollector.resume();
    setState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}
