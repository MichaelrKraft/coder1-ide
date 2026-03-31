'use client';

import React, { useRef, useCallback, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { FlightEvent } from '@/lib/flight-recorder/types';
import type { PlaybackSpeed } from '@/lib/flight-recorder/playback-engine';

interface FlightTimelineScrubberProps {
  events: FlightEvent[];
  currentTime: number;
  startTime: number;
  endTime: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  onSeek: (timestamp: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
}

const SPEEDS: PlaybackSpeed[] = [1, 2, 5, 10, 50];

const EVENT_COLORS: Record<string, string> = {
  'terminal:input': '#00D9FF',
  'terminal:output': '#3b82f6',
  'file:save': '#a6e3a1',
  'file:open': '#6ee7b7',
  'ai:prompt': '#c084fc',
  'ai:response': '#a78bfa',
  'error:terminal': '#ef4444',
  'error:runtime': '#ef4444',
  'git:commit': '#facc15',
  'annotation': '#fb923c',
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function FlightTimelineScrubber({
  events,
  currentTime,
  startTime,
  endTime,
  isPlaying,
  speed,
  onSeek,
  onPlay,
  onPause,
  onSpeedChange,
  onStepForward,
  onStepBackward,
}: FlightTimelineScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const totalDuration = endTime - startTime;
  const progress = totalDuration > 0 ? ((currentTime - startTime) / totalDuration) * 100 : 0;

  // Build activity heatmap: divide timeline into buckets
  const heatmapBuckets = useMemo(() => {
    const BUCKET_COUNT = 200;
    const buckets = new Array(BUCKET_COUNT).fill(0);
    const colors = new Array(BUCKET_COUNT).fill('#1e293b');
    if (totalDuration === 0) return { buckets, colors };

    for (const event of events) {
      const bucket = Math.floor(((event.clientTimestamp - startTime) / totalDuration) * (BUCKET_COUNT - 1));
      if (bucket >= 0 && bucket < BUCKET_COUNT) {
        buckets[bucket]++;
        // Use the most significant event type's color
        const color = EVENT_COLORS[event.type] || '#3b82f6';
        if (event.type.startsWith('error:')) colors[bucket] = '#ef4444';
        else if (colors[bucket] === '#1e293b') colors[bucket] = color;
      }
    }

    const maxCount = Math.max(...buckets, 1);
    return { buckets: buckets.map((b) => b / maxCount), colors };
  }, [events, startTime, totalDuration]);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current || totalDuration === 0) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const timestamp = startTime + x * totalDuration;
      onSeek(Math.max(startTime, Math.min(endTime, timestamp)));
    },
    [startTime, endTime, totalDuration, onSeek],
  );

  return (
    <div className="w-full select-none">
      {/* Timeline track with heatmap */}
      <div className="px-2 mb-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{formatTime(currentTime - startTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
        <div
          ref={trackRef}
          className="relative h-8 bg-gray-900 rounded cursor-pointer overflow-hidden border border-gray-700"
          onClick={handleTrackClick}
        >
          {/* Heatmap bars */}
          <div className="absolute inset-0 flex">
            {heatmapBuckets.buckets.map((intensity, i) => (
              <div
                key={i}
                className="flex-1"
                style={{
                  backgroundColor: heatmapBuckets.colors[i],
                  opacity: 0.15 + intensity * 0.7,
                }}
              />
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10"
            style={{ left: `${progress}%` }}
          >
            <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-cyan-400 rounded-full border-2 border-gray-900" />
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-1">
          <button
            onClick={onStepBackward}
            className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
            title="Step backward"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            onClick={onStepBackward}
            className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
            title="Previous event"
          >
            <SkipBack size={16} />
          </button>
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="p-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-full transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            onClick={onStepForward}
            className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
            title="Next event"
          >
            <SkipForward size={16} />
          </button>
          <button
            onClick={onStepForward}
            className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
            title="Step forward"
          >
            <ChevronsRight size={16} />
          </button>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                speed === s
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
