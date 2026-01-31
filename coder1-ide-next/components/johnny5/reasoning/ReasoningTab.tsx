'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Brain,
  History,
  ChevronDown,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useJohnny5Store } from '@/stores/useJohnny5Store';
import TimelineScrubber from './TimelineScrubber';
import StepDetail from './StepDetail';
import ThinkingBubble from './ThinkingBubble';
import type { Johnny5SessionSummary, Johnny5ReplayStep, Johnny5ReplaySession } from '@/types';

/**
 * ReasoningTab - Main view for the Reasoning Replay feature
 *
 * Features:
 * - Session selector dropdown to pick which session to replay
 * - Timeline scrubber with playback controls
 * - Step-by-step visualization of AI reasoning
 * - Visual differentiation between thinking, tool calls, and responses
 * - Animated background gradient orbs matching Johnny5 design
 */
export default function ReasoningTab() {
  const {
    sessions,
    selectedSessionId,
    replaySession,
    setReplaySession,
    setReplayPosition,
    setReplayPlaying,
    setPlaybackSpeed,
    selectSession,
    setActiveTab,
  } = useJohnny5Store();

  // Ensure sessions is always an array (Zustand persist can hydrate with unexpected types)
  const sessionsArray = Array.isArray(sessions) ? sessions : [];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);

  // Get completed sessions for replay
  const completedSessions = useMemo(() => {
    return sessionsArray.filter((s) => s.status === 'completed');
  }, [sessionsArray]);

  // Current session info
  const currentSession = useMemo(() => {
    return sessionsArray.find((s) => s.id === replaySession?.sessionId);
  }, [sessionsArray, replaySession]);

  // Load replay data for a session
  const loadReplaySession = useCallback(
    async (sessionId: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/johnny5/sessions/${sessionId}/replay`);
        if (response.ok) {
          const data = await response.json();
          setReplaySession(data.data);
        } else {
          // Use mock data for development
          setReplaySession(getMockReplaySession(sessionId));
        }
      } catch {
        // Use mock data for development
        setReplaySession(getMockReplaySession(sessionId));
      } finally {
        setLoading(false);
      }
    },
    [setReplaySession]
  );

  // Handle session selection
  const handleSelectSession = useCallback(
    (sessionId: string) => {
      selectSession(sessionId);
      loadReplaySession(sessionId);
      setShowSessionDropdown(false);
    },
    [selectSession, loadReplaySession]
  );

  // Load replay when coming from sessions tab with selected session
  useEffect(() => {
    if (selectedSessionId && !replaySession) {
      loadReplaySession(selectedSessionId);
    }
  }, [selectedSessionId, replaySession, loadReplaySession]);

  // Handle close/back
  const handleClose = useCallback(() => {
    setReplaySession(null);
    selectSession(null);
    setActiveTab('sessions');
  }, [setReplaySession, selectSession, setActiveTab]);

  // Playback timer
  useEffect(() => {
    if (!replaySession?.isPlaying) return;

    const interval = setInterval(() => {
      const newPosition = replaySession.currentPosition + 100 * replaySession.playbackSpeed;
      if (newPosition >= replaySession.totalDuration) {
        setReplayPlaying(false);
        setReplayPosition(replaySession.totalDuration);
      } else {
        setReplayPosition(newPosition);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [replaySession, setReplayPlaying, setReplayPosition]);

  // Get current step based on position
  const getCurrentStepIndex = useCallback(() => {
    if (!replaySession) return -1;
    let cumulative = 0;
    for (let i = 0; i < replaySession.steps.length; i++) {
      cumulative += replaySession.steps[i].duration;
      if (replaySession.currentPosition < cumulative) {
        return i;
      }
    }
    return replaySession.steps.length - 1;
  }, [replaySession]);

  const currentStepIndex = getCurrentStepIndex();

  // Handle prev/next step
  const handlePrevStep = useCallback(() => {
    if (!replaySession || currentStepIndex <= 0) return;
    let newPosition = 0;
    for (let i = 0; i < currentStepIndex - 1; i++) {
      newPosition += replaySession.steps[i].duration;
    }
    setReplayPosition(newPosition);
  }, [replaySession, currentStepIndex, setReplayPosition]);

  const handleNextStep = useCallback(() => {
    if (!replaySession || currentStepIndex >= replaySession.steps.length - 1) return;
    let newPosition = 0;
    for (let i = 0; i <= currentStepIndex; i++) {
      newPosition += replaySession.steps[i].duration;
    }
    setReplayPosition(newPosition);
  }, [replaySession, currentStepIndex, setReplayPosition]);

  const handleReset = useCallback(() => {
    setReplayPosition(0);
    setReplayPlaying(false);
  }, [setReplayPosition, setReplayPlaying]);

  // If no session selected, show session selector
  if (!replaySession && !loading) {
    return (
      <div className="h-full flex flex-col relative overflow-hidden">
        {/* Animated Background Gradient Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute w-48 h-48 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4), transparent)',
              top: '-60px',
              right: '-60px',
              filter: 'blur(50px)',
              animation: 'reasoningFloat 18s ease-in-out infinite',
            }}
          />
          <div
            className="absolute w-40 h-40 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, rgba(0, 217, 255, 0.3), transparent)',
              bottom: '80px',
              left: '-40px',
              filter: 'blur(35px)',
              animation: 'reasoningFloat 14s ease-in-out infinite reverse',
            }}
          />
        </div>

        <style jsx>{`
          @keyframes reasoningFloat {
            0%,
            100% {
              transform: translateY(0) translateX(0);
            }
            25% {
              transform: translateY(-12px) translateX(6px);
            }
            50% {
              transform: translateY(6px) translateX(-6px);
            }
            75% {
              transform: translateY(-6px) translateX(3px);
            }
          }
        `}</style>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">Reasoning Replay</h3>
          <p className="text-sm text-text-secondary mb-6 max-w-xs">
            Understand how Johnny5 thinks by replaying AI sessions step-by-step.
          </p>

          {completedSessions.length > 0 ? (
            <div className="relative">
              <button
                onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400
                  border border-purple-500/50 rounded-lg hover:bg-purple-500/30 transition-all"
              >
                <History className="w-4 h-4" />
                <span>Select a session to replay</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showSessionDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              {showSessionDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSessionDropdown(false)} />
                  <div className="absolute top-full mt-2 left-0 right-0 bg-bg-secondary border border-border-default rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                    {completedSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className="w-full text-left px-3 py-2 hover:bg-bg-tertiary transition-colors border-b border-border-default/50 last:border-b-0"
                      >
                        <p className="text-sm font-medium text-text-primary truncate">
                          {session.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span>{session.toolCalls} tools</span>
                          <span>•</span>
                          <span>{session.tokensUsed.toLocaleString()} tokens</span>
                          <span>•</span>
                          <span>{session.duration}m</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              No completed sessions available for replay yet.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
        <p className="text-sm text-text-muted">Loading session replay...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
        <p className="text-sm text-red-400 mb-4">{error}</p>
        <button
          onClick={handleClose}
          className="px-4 py-2 text-xs bg-bg-tertiary border border-border-default rounded-md
            hover:border-coder1-cyan/50 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Animated Background Gradient Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-48 h-48 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4), transparent)',
            top: '-60px',
            right: '-60px',
            filter: 'blur(50px)',
            animation: 'reasoningFloat 18s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-40 h-40 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(0, 217, 255, 0.3), transparent)',
            bottom: '120px',
            left: '-40px',
            filter: 'blur(35px)',
            animation: 'reasoningFloat 14s ease-in-out infinite reverse',
          }}
        />
        {replaySession?.isPlaying && (
          <div
            className="absolute w-32 h-32 rounded-full opacity-15"
            style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.5), transparent)',
              top: '40%',
              left: '50%',
              transform: 'translateX(-50%)',
              filter: 'blur(25px)',
              animation: 'reasoningPulse 2s ease-in-out infinite',
            }}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes reasoningFloat {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-12px) translateX(6px);
          }
          50% {
            transform: translateY(6px) translateX(-6px);
          }
          75% {
            transform: translateY(-6px) translateX(3px);
          }
        }
        @keyframes reasoningPulse {
          0%,
          100% {
            transform: translateX(-50%) scale(1);
            opacity: 0.15;
          }
          50% {
            transform: translateX(-50%) scale(1.1);
            opacity: 0.25;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border-default bg-bg-secondary/80 backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-sm font-semibold text-text-primary truncate max-w-[180px]">
              {currentSession?.name || 'Session Replay'}
            </h3>
            <p className="text-xs text-text-muted">
              Step {currentStepIndex + 1} of {replaySession?.steps.length || 0}
            </p>
          </div>
        </div>

        {/* Session switcher */}
        <div className="relative">
          <button
            onClick={() => setShowSessionDropdown(!showSessionDropdown)}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            title="Switch session"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {showSessionDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSessionDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 w-64 bg-bg-secondary border border-border-default rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                <p className="px-3 py-2 text-xs text-text-muted border-b border-border-default">
                  Switch session
                </p>
                {completedSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={`
                      w-full text-left px-3 py-2 hover:bg-bg-tertiary transition-colors
                      ${session.id === replaySession?.sessionId ? 'bg-purple-500/10' : ''}
                    `}
                  >
                    <p className="text-xs font-medium text-text-primary truncate">{session.name}</p>
                    <p className="text-[10px] text-text-muted">
                      {session.toolCalls} tools • {session.duration}m
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-auto p-3 space-y-3 relative z-10">
        {replaySession?.steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {step.type === 'thinking' && step.thinking ? (
              <ThinkingBubble
                thinking={step.thinking}
                timestamp={step.timestamp}
                isActive={currentStepIndex === index}
                isPlaying={replaySession.isPlaying}
              />
            ) : (
              <StepDetail
                step={step}
                isActive={currentStepIndex === index}
                isPlaying={replaySession.isPlaying}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Timeline Scrubber */}
      {replaySession && (
        <TimelineScrubber
          steps={replaySession.steps}
          currentPosition={replaySession.currentPosition}
          isPlaying={replaySession.isPlaying}
          playbackSpeed={replaySession.playbackSpeed}
          totalDuration={replaySession.totalDuration}
          onPositionChange={(pos) => setReplayPosition(pos)}
          onPlayPause={() => setReplayPlaying(!replaySession.isPlaying)}
          onSpeedChange={(speed) => setPlaybackSpeed(speed)}
          onPrevStep={handlePrevStep}
          onNextStep={handleNextStep}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

// Mock data generator for development
function getMockReplaySession(sessionId: string): Johnny5ReplaySession {
  const now = Date.now();
  const steps: Johnny5ReplayStep[] = [
    {
      id: 'step-1',
      timestamp: new Date(now - 45 * 60 * 1000),
      type: 'thinking',
      thinking: `Analyzing the task requirements. The user wants to implement a reasoning replay feature for the Johnny5 dashboard. I need to:

1. Create a timeline scrubber component
2. Build step visualization components
3. Add playback controls with speed adjustment
4. Ensure smooth animations and transitions

Let me start by examining the existing codebase patterns...`,
      duration: 3500,
      outcome: 'success',
    },
    {
      id: 'step-2',
      timestamp: new Date(now - 44 * 60 * 1000),
      type: 'tool_call',
      toolName: 'Read',
      toolInput: { file_path: '/components/johnny5/sessions/SessionsTab.tsx' },
      toolOutput: {
        success: true,
        content: 'File content retrieved successfully (498 lines)',
        file_size: '14.2kb',
      },
      duration: 150,
      outcome: 'success',
    },
    {
      id: 'step-3',
      timestamp: new Date(now - 43 * 60 * 1000),
      type: 'decision',
      thinking: 'Based on the existing patterns, I will use the same styling approach with animated gradient orbs and Coder1 cyan/purple color scheme.',
      duration: 800,
      outcome: 'success',
    },
    {
      id: 'step-4',
      timestamp: new Date(now - 42 * 60 * 1000),
      type: 'tool_call',
      toolName: 'Write',
      toolInput: {
        file_path: '/components/johnny5/reasoning/TimelineScrubber.tsx',
        content: '// Timeline scrubber component...'
      },
      toolOutput: {
        success: true,
        message: 'File written successfully',
        lines_written: 285,
      },
      duration: 200,
      outcome: 'success',
    },
    {
      id: 'step-5',
      timestamp: new Date(now - 40 * 60 * 1000),
      type: 'thinking',
      thinking: `Now I need to create the step detail component. This will show:
- Tool name and type icon
- Input/output JSON with syntax highlighting
- Duration badge
- Outcome status (success/error/skipped)

Using collapsible sections for the JSON data to keep the UI clean.`,
      duration: 2200,
      outcome: 'success',
    },
    {
      id: 'step-6',
      timestamp: new Date(now - 38 * 60 * 1000),
      type: 'tool_call',
      toolName: 'Write',
      toolInput: {
        file_path: '/components/johnny5/reasoning/StepDetail.tsx',
        content: '// Step detail component...'
      },
      toolOutput: {
        success: true,
        message: 'File written successfully',
        lines_written: 245,
      },
      duration: 180,
      outcome: 'success',
    },
    {
      id: 'step-7',
      timestamp: new Date(now - 35 * 60 * 1000),
      type: 'tool_call',
      toolName: 'Write',
      toolInput: {
        file_path: '/components/johnny5/reasoning/ThinkingBubble.tsx',
        content: '// Thinking bubble component...'
      },
      toolOutput: {
        success: true,
        message: 'File written successfully',
        lines_written: 165,
      },
      duration: 160,
      outcome: 'success',
    },
    {
      id: 'step-8',
      timestamp: new Date(now - 32 * 60 * 1000),
      type: 'response',
      thinking: 'All reasoning replay components have been created. The feature is now ready for testing.',
      duration: 500,
      outcome: 'success',
    },
  ];

  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

  return {
    sessionId,
    steps,
    totalDuration,
    currentPosition: 0,
    isPlaying: false,
    playbackSpeed: 1,
  };
}
