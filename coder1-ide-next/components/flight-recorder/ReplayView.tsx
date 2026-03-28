'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Film, Clock, Hash } from 'lucide-react';
import type { FlightEvent } from '@/lib/flight-recorder/types';
import type { FlightSession } from '@/lib/flight-recorder/types';
import { PlaybackEngine } from '@/lib/flight-recorder/playback-engine';
import type { PlaybackSpeed, PlaybackState } from '@/lib/flight-recorder/playback-engine';
import FlightTimelineScrubber from './FlightTimelineScrubber';
import EventDetailPanel from './EventDetailPanel';
import TerminalReplay from './TerminalReplay';
import AIConversationPanel from './AIConversationPanel';

interface ReplayViewProps {
  sessionId: string;
  onBack: () => void;
}

function formatDuration(startedAt: number, endedAt?: number): string {
  const ms = (endedAt || Date.now()) - startedAt;
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export default function ReplayView({ sessionId, onBack }: ReplayViewProps) {
  const [session, setSession] = useState<FlightSession | null>(null);
  const [events, setEvents] = useState<FlightEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [currentEvent, setCurrentEvent] = useState<FlightEvent | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [resetSignal, setResetSignal] = useState(0);

  const engineRef = useRef<PlaybackEngine | null>(null);

  // Filter events by type for sub-panels
  const aiEvents = events.filter((e) => e.type.startsWith('ai:'));

  // Initialize playback engine
  useEffect(() => {
    const engine = new PlaybackEngine({
      onEvent: (event) => setCurrentEvent(event),
      onTimeUpdate: (time) => setCurrentTime(time),
      onStateChange: (state) => setPlaybackState(state),
      onComplete: () => {},
    });
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  // Fetch session data + events
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sessionRes, eventsRes] = await Promise.all([
          fetch(`/api/flight-recorder/sessions/${sessionId}`),
          fetch(`/api/flight-recorder/sessions/${sessionId}/events?limit=5000`),
        ]);

        if (!sessionRes.ok || !eventsRes.ok) {
          setError('Failed to load session');
          return;
        }

        const sessionData = await sessionRes.json();
        const eventsData = await eventsRes.json();

        setSession(sessionData.session);
        setEvents(eventsData.events || []);

        // Load events into playback engine
        if (engineRef.current && eventsData.events?.length > 0) {
          engineRef.current.loadEvents(eventsData.events);
          setCurrentTime(eventsData.events[0].clientTimestamp);
        }
      } catch {
        setError('Failed to load session data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  // Playback controls
  const handlePlay = useCallback(() => engineRef.current?.play(), []);
  const handlePause = useCallback(() => engineRef.current?.pause(), []);
  const handleSeek = useCallback((ts: number) => {
    engineRef.current?.seekTo(ts);
    setResetSignal((prev) => prev + 1);
  }, []);
  const handleSpeedChange = useCallback((s: PlaybackSpeed) => {
    setSpeed(s);
    engineRef.current?.setSpeed(s);
  }, []);
  const handleStepForward = useCallback(() => engineRef.current?.stepForward(), []);
  const handleStepBackward = useCallback(() => engineRef.current?.stepBackward(), []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <Film className="animate-pulse" size={20} />
          <span>Loading recording...</span>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <p className="text-red-400">{error || 'Session not found'}</p>
        <button onClick={onBack} className="text-cyan-400 hover:underline text-sm">
          Back to recordings
        </button>
      </div>
    );
  }

  const startTime = events[0]?.clientTimestamp || session.startedAt;
  const endTime = events[events.length - 1]?.clientTimestamp || session.endedAt || Date.now();

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 bg-gray-900/50 shrink-0">
        <button
          onClick={onBack}
          className="p-1 text-gray-400 hover:text-white rounded transition-colors"
          title="Back to recordings"
        >
          <ArrowLeft size={18} />
        </button>
        <Film size={16} className="text-cyan-400" />
        <span className="text-sm font-medium text-white truncate">
          {session.metadata?.sessionType || 'Recording'} — {new Date(session.startedAt).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-3 ml-auto text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDuration(session.startedAt, session.endedAt)}
          </span>
          <span className="flex items-center gap-1">
            <Hash size={12} />
            {session.totalEvents.toLocaleString()} events
          </span>
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/30 shrink-0">
        <FlightTimelineScrubber
          events={events}
          currentTime={currentTime}
          startTime={startTime}
          endTime={endTime}
          isPlaying={playbackState === 'playing'}
          speed={speed}
          onSeek={handleSeek}
          onPlay={handlePlay}
          onPause={handlePause}
          onSpeedChange={handleSpeedChange}
          onStepForward={handleStepForward}
          onStepBackward={handleStepBackward}
        />
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Terminal Replay — left */}
        <div className="flex-1 min-w-0 border-r border-gray-800">
          <TerminalReplay
            currentEvent={currentEvent?.type.startsWith('terminal:') ? currentEvent : null}
            resetSignal={resetSignal}
          />
        </div>

        {/* Event Details — center */}
        <div className="w-80 border-r border-gray-800 bg-gray-900/30">
          <EventDetailPanel event={currentEvent} />
        </div>

        {/* AI Conversation — right */}
        <div className="w-80 bg-gray-900/30">
          <AIConversationPanel events={aiEvents} currentEventId={currentEvent?.id || null} />
        </div>
      </div>
    </div>
  );
}
