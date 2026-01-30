'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Brain,
  Wrench,
  Terminal,
  CheckCircle,
} from 'lucide-react';
import type { Johnny5ReplayStep } from '@/types';

type PlaybackSpeed = 0.5 | 1 | 2 | 4;

interface TimelineScrubberProps {
  steps: Johnny5ReplayStep[];
  currentPosition: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  totalDuration: number;
  onPositionChange: (position: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onReset: () => void;
}

/**
 * TimelineScrubber - Horizontal timeline with markers and playback controls
 *
 * Features:
 * - Clickable timeline with step markers
 * - Draggable position indicator
 * - Play/pause button
 * - Speed selector (0.5x, 1x, 2x, 4x)
 * - Previous/next step buttons
 * - Reset button
 * - Step type indicators (thinking, tool_call, response, decision)
 * - Time display (current / total)
 */
export default function TimelineScrubber({
  steps,
  currentPosition,
  isPlaying,
  playbackSpeed,
  totalDuration,
  onPositionChange,
  onPlayPause,
  onSpeedChange,
  onPrevStep,
  onNextStep,
  onReset,
}: TimelineScrubberProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Calculate position percentage
  const positionPercent = totalDuration > 0 ? (currentPosition / totalDuration) * 100 : 0;

  // Handle timeline click
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const newPosition = percent * totalDuration;
      onPositionChange(newPosition);
    },
    [totalDuration, onPositionChange]
  );

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // Handle drag move
  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const newPosition = percent * totalDuration;
      onPositionChange(newPosition);
    },
    [isDragging, totalDuration, onPositionChange]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove drag listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Get step icon
  const getStepIcon = (type: Johnny5ReplayStep['type']) => {
    switch (type) {
      case 'thinking':
        return <Brain className="w-2.5 h-2.5" />;
      case 'tool_call':
        return <Wrench className="w-2.5 h-2.5" />;
      case 'response':
        return <Terminal className="w-2.5 h-2.5" />;
      case 'decision':
        return <CheckCircle className="w-2.5 h-2.5" />;
      default:
        return <Wrench className="w-2.5 h-2.5" />;
    }
  };

  // Get step color
  const getStepColor = (type: Johnny5ReplayStep['type'], isActive: boolean) => {
    const baseColors = {
      thinking: isActive ? 'bg-purple-400' : 'bg-purple-500/60',
      tool_call: isActive ? 'bg-coder1-cyan' : 'bg-coder1-cyan/60',
      response: isActive ? 'bg-green-400' : 'bg-green-500/60',
      decision: isActive ? 'bg-orange-400' : 'bg-orange-500/60',
    };
    return baseColors[type] || baseColors.tool_call;
  };

  // Format time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate step positions on timeline
  const getStepPosition = (step: Johnny5ReplayStep) => {
    // Calculate cumulative time up to this step
    let cumulative = 0;
    for (const s of steps) {
      if (s.id === step.id) break;
      cumulative += s.duration;
    }
    return totalDuration > 0 ? (cumulative / totalDuration) * 100 : 0;
  };

  // Check if step is currently active
  const isStepActive = (step: Johnny5ReplayStep) => {
    const stepPos = getStepPosition(step);
    const stepEndPos = stepPos + (step.duration / totalDuration) * 100;
    return positionPercent >= stepPos && positionPercent < stepEndPos;
  };

  const speedOptions: PlaybackSpeed[] = [0.5, 1, 2, 4];

  return (
    <div className="p-3 bg-bg-secondary border-t border-border-default">
      {/* Timeline */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="relative h-8 bg-bg-tertiary rounded-lg cursor-pointer mb-3 group"
      >
        {/* Progress bar */}
        <div
          className="absolute top-0 left-0 h-full bg-coder1-cyan/20 rounded-lg transition-all"
          style={{ width: `${positionPercent}%` }}
        />

        {/* Step markers */}
        {steps.map((step) => {
          const pos = getStepPosition(step);
          const active = isStepActive(step);
          return (
            <div
              key={step.id}
              className={`
                absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full
                flex items-center justify-center
                ${getStepColor(step.type, active)}
                ${active ? 'ring-2 ring-white/30 scale-110' : 'opacity-70 hover:opacity-100'}
                transition-all duration-200 cursor-pointer z-10
              `}
              style={{ left: `calc(${pos}% - 8px)` }}
              title={`${step.toolName || step.type} (${step.duration}ms)`}
            >
              <span className={active ? 'text-bg-primary' : 'text-white/80'}>
                {getStepIcon(step.type)}
              </span>
            </div>
          );
        })}

        {/* Position indicator (scrubber handle) */}
        <div
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          className={`
            absolute top-1/2 -translate-y-1/2 w-3 h-6 -ml-1.5
            bg-coder1-cyan rounded-sm cursor-grab z-20
            ${isDragging ? 'cursor-grabbing scale-110' : 'hover:scale-105'}
            transition-transform shadow-lg shadow-coder1-cyan/30
          `}
          style={{ left: `${positionPercent}%` }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-0.5 h-3 bg-white/50 rounded-full" />
          </div>
        </div>

        {/* Time tooltip on hover/drag */}
        {isDragging && (
          <div
            className="absolute -top-8 px-2 py-1 bg-bg-primary border border-border-default rounded text-xs text-text-primary transform -translate-x-1/2 z-30"
            style={{ left: `${positionPercent}%` }}
          >
            {formatTime(currentPosition)}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Left: Time display */}
        <div className="text-xs text-text-muted font-mono">
          <span className="text-coder1-cyan">{formatTime(currentPosition)}</span>
          <span className="mx-1">/</span>
          <span>{formatTime(totalDuration)}</span>
        </div>

        {/* Center: Playback controls */}
        <div className="flex items-center gap-1">
          {/* Reset button */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Previous step */}
          <button
            onClick={onPrevStep}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            title="Previous step"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={onPlayPause}
            className={`
              p-2 rounded-lg transition-all
              ${
                isPlaying
                  ? 'bg-coder1-cyan text-bg-primary hover:bg-coder1-cyan/90'
                  : 'bg-coder1-cyan/20 text-coder1-cyan border border-coder1-cyan/40 hover:bg-coder1-cyan/30'
              }
            `}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Next step */}
          <button
            onClick={onNextStep}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            title="Next step"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Speed selector */}
        <div className="relative">
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className={`
              px-2 py-1 rounded-md text-xs font-medium transition-colors
              ${showSpeedMenu ? 'bg-coder1-cyan/20 text-coder1-cyan' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}
            `}
          >
            {playbackSpeed}x
          </button>

          {/* Speed dropdown */}
          {showSpeedMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSpeedMenu(false)} />
              <div className="absolute right-0 bottom-full mb-1 bg-bg-secondary border border-border-default rounded-lg shadow-lg z-20 overflow-hidden">
                {speedOptions.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      onSpeedChange(speed);
                      setShowSpeedMenu(false);
                    }}
                    className={`
                      w-full px-3 py-1.5 text-xs text-left transition-colors
                      ${playbackSpeed === speed ? 'bg-coder1-cyan/20 text-coder1-cyan' : 'text-text-secondary hover:bg-bg-tertiary'}
                    `}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Step legend */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-border-default/50">
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500/60" />
          <span>Thinking</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <div className="w-2.5 h-2.5 rounded-full bg-coder1-cyan/60" />
          <span>Tool Call</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <span>Response</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500/60" />
          <span>Decision</span>
        </div>
      </div>
    </div>
  );
}
