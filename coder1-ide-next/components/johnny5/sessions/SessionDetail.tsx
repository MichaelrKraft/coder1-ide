'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Wrench,
  FileText,
  Coins,
  Brain,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  FileCode,
  FilePlus,
  FileX,
  ChevronDown,
  ChevronRight,
  Terminal,
  AlertTriangle,
} from 'lucide-react';
import type { Johnny5SessionDetail, Johnny5FileChange, Johnny5ReplayStep, Johnny5Error } from '@/types';

interface SessionDetailProps {
  sessionId: string;
  onClose: () => void;
  onStartReplay?: (sessionId: string) => void;
}

/**
 * SessionDetail - Expanded view for a Johnny5 session
 *
 * Shows detailed information including:
 * - Full session stats
 * - File changes list with diff stats
 * - Tool calls timeline
 * - Errors (if any)
 * - Reasoning summary
 */
export default function SessionDetail({ sessionId, onClose, onStartReplay }: SessionDetailProps) {
  const [session, setSession] = useState<Johnny5SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    files: true,
    tools: false,
    errors: false,
    reasoning: false,
  });

  // Fetch session details
  useEffect(() => {
    const fetchSessionDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/johnny5/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to load session details');
        }
        const data = await response.json();
        setSession(data.data);
      } catch (err) {
        // For now, use mock data since API may not exist yet
        setSession(getMockSessionDetail(sessionId));
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetail();
  }, [sessionId]);

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Format time
  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // Format duration
  const formatDuration = (minutes?: number): string => {
    if (!minutes) return '--';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
  };

  // Get file change icon
  const getFileChangeIcon = (type: Johnny5FileChange['type']) => {
    switch (type) {
      case 'created':
        return <FilePlus className="w-4 h-4 text-green-400" />;
      case 'modified':
        return <FileCode className="w-4 h-4 text-coder1-cyan" />;
      case 'deleted':
        return <FileX className="w-4 h-4 text-red-400" />;
      default:
        return <FileText className="w-4 h-4 text-text-muted" />;
    }
  };

  // Get step type icon
  const getStepIcon = (type: Johnny5ReplayStep['type']) => {
    switch (type) {
      case 'thinking':
        return <Brain className="w-4 h-4 text-purple-400" />;
      case 'tool_call':
        return <Wrench className="w-4 h-4 text-coder1-cyan" />;
      case 'response':
        return <Terminal className="w-4 h-4 text-green-400" />;
      case 'decision':
        return <CheckCircle className="w-4 h-4 text-orange-400" />;
      default:
        return <Clock className="w-4 h-4 text-text-muted" />;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-coder1-cyan animate-spin mb-3" />
        <p className="text-sm text-text-muted">Loading session details...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
        <p className="text-sm text-red-400">{error || 'Session not found'}</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 text-xs bg-bg-tertiary border border-border-default rounded-md
            hover:border-coder1-cyan/50 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Get status styling
  const getStatusStyles = () => {
    switch (session.status) {
      case 'active':
        return { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-coder1-cyan' };
      case 'completed':
        return { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400' };
      case 'error':
        return { icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-400' };
      default:
        return { icon: null, color: 'text-text-muted' };
    }
  };

  const status = getStatusStyles();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-secondary/80">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{session.name}</h3>
            <div className={`flex items-center gap-1 text-xs ${status.color}`}>
              {status.icon}
              <span className="capitalize">{session.status}</span>
            </div>
          </div>
        </div>

        {/* Replay Button */}
        {onStartReplay && session.status === 'completed' && (
          <button
            onClick={() => onStartReplay(session.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
              bg-coder1-cyan/20 text-coder1-cyan border border-coder1-cyan/40 rounded-md
              hover:bg-coder1-cyan/30 hover:border-coder1-cyan transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Replay</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Clock} label="Duration" value={formatDuration(session.duration)} />
          <StatCard icon={Wrench} label="Tool Calls" value={(session.toolCalls ?? 0).toString()} />
          <StatCard icon={FileText} label="Files Changed" value={(session.filesModified?.length ?? 0).toString()} />
          <StatCard icon={Coins} label="Tokens Used" value={(session.tokensUsed ?? 0).toLocaleString()} />
        </div>

        {/* File Changes Section */}
        <CollapsibleSection
          title="File Changes"
          count={session.fileChanges?.length ?? 0}
          isExpanded={expandedSections.files}
          onToggle={() => toggleSection('files')}
        >
          <div className="space-y-2">
            {!session.fileChanges || session.fileChanges.length === 0 ? (
              <p className="text-xs text-text-muted italic">No files were modified</p>
            ) : (
              session.fileChanges.map((change, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-bg-tertiary rounded-md"
                >
                  {getFileChangeIcon(change.type)}
                  <span className="flex-1 text-xs text-text-secondary font-mono truncate">
                    {change.path}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    {change.linesAdded > 0 && (
                      <span className="text-green-400">+{change.linesAdded}</span>
                    )}
                    {change.linesRemoved > 0 && (
                      <span className="text-red-400">-{change.linesRemoved}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CollapsibleSection>

        {/* Tool Calls Section */}
        <CollapsibleSection
          title="Tool Calls Timeline"
          count={session.steps?.filter((s) => s.type === 'tool_call').length ?? 0}
          isExpanded={expandedSections.tools}
          onToggle={() => toggleSection('tools')}
        >
          <div className="space-y-2">
            {!session.steps || session.steps.length === 0 ? (
              <p className="text-xs text-text-muted italic">No tool calls recorded</p>
            ) : (
              session.steps.slice(0, 10).map((step) => (
                <div
                  key={step.id}
                  className="flex items-start gap-2 p-2 bg-bg-tertiary rounded-md"
                >
                  {getStepIcon(step.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-primary capitalize">
                        {step.toolName || step.type.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          step.outcome === 'success'
                            ? 'bg-green-500/20 text-green-400'
                            : step.outcome === 'error'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {step.outcome}
                      </span>
                    </div>
                    {step.thinking && (
                      <p className="text-xs text-text-muted mt-1 truncate">{step.thinking}</p>
                    )}
                  </div>
                  <span className="text-xs text-text-muted">{step.duration}ms</span>
                </div>
              ))
            )}
            {(session.steps?.length ?? 0) > 10 && (
              <p className="text-xs text-text-muted text-center py-2">
                + {(session.steps?.length ?? 0) - 10} more steps
              </p>
            )}
          </div>
        </CollapsibleSection>

        {/* Errors Section (if any) */}
        {(session.errors?.length ?? 0) > 0 && (
          <CollapsibleSection
            title="Errors"
            count={session.errors?.length ?? 0}
            isExpanded={expandedSections.errors}
            onToggle={() => toggleSection('errors')}
            variant="error"
          >
            <div className="space-y-2">
              {session.errors?.map((error) => (
                <div
                  key={error.id}
                  className="p-2 bg-red-500/10 border border-red-500/30 rounded-md"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-red-400">{error.message}</p>
                      {error.stack && (
                        <pre className="text-xs text-red-300/70 mt-1 font-mono overflow-x-auto">
                          {error.stack.split('\n').slice(0, 3).join('\n')}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Reasoning Section */}
        {session.reasoning && (
          <CollapsibleSection
            title="AI Reasoning"
            isExpanded={expandedSections.reasoning}
            onToggle={() => toggleSection('reasoning')}
          >
            <p className="text-xs text-text-secondary leading-relaxed">{session.reasoning}</p>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}

// Helper Components

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="p-3 bg-bg-tertiary rounded-lg border border-border-default">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-coder1-cyan" />
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <p className="text-lg font-bold text-text-primary">{value}</p>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  isExpanded: boolean;
  onToggle: () => void;
  variant?: 'default' | 'error';
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  count,
  isExpanded,
  onToggle,
  variant = 'default',
  children,
}: CollapsibleSectionProps) {
  return (
    <div
      className={`
        border rounded-lg overflow-hidden
        ${variant === 'error' ? 'border-red-500/30' : 'border-border-default'}
      `}
    >
      <button
        onClick={onToggle}
        className={`
          w-full flex items-center justify-between px-3 py-2
          hover:bg-bg-tertiary transition-colors
          ${variant === 'error' ? 'bg-red-500/10' : 'bg-bg-secondary'}
        `}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted" />
          )}
          <span
            className={`text-xs font-semibold ${variant === 'error' ? 'text-red-400' : 'text-text-secondary'}`}
          >
            {title}
          </span>
          {count !== undefined && (
            <span
              className={`
                px-1.5 py-0.5 rounded-full text-xs
                ${variant === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-coder1-cyan/20 text-coder1-cyan'}
              `}
            >
              {count}
            </span>
          )}
        </div>
      </button>
      {isExpanded && <div className="p-3 border-t border-border-default">{children}</div>}
    </div>
  );
}

// Mock data generator for development
function getMockSessionDetail(sessionId: string): Johnny5SessionDetail {
  return {
    id: sessionId,
    name: 'Implementing Johnny5 Sessions Tab',
    startTime: new Date(Date.now() - 45 * 60 * 1000),
    endTime: new Date(),
    status: 'completed',
    toolCalls: 12,
    filesModified: ['SessionsTab.tsx', 'SessionCard.tsx', 'SessionDetail.tsx', 'index.ts'],
    tokensUsed: 24567,
    thinkingLevel: 'high',
    duration: 45,
    steps: [
      {
        id: 'step-1',
        timestamp: new Date(Date.now() - 44 * 60 * 1000),
        type: 'thinking',
        thinking: 'Analyzing the existing codebase patterns...',
        duration: 2300,
        outcome: 'success',
      },
      {
        id: 'step-2',
        timestamp: new Date(Date.now() - 43 * 60 * 1000),
        type: 'tool_call',
        toolName: 'Read',
        toolInput: { file_path: '/components/LeftPanel.tsx' },
        duration: 150,
        outcome: 'success',
      },
      {
        id: 'step-3',
        timestamp: new Date(Date.now() - 42 * 60 * 1000),
        type: 'tool_call',
        toolName: 'Write',
        toolInput: { file_path: '/components/johnny5/sessions/SessionCard.tsx' },
        duration: 200,
        outcome: 'success',
      },
      {
        id: 'step-4',
        timestamp: new Date(Date.now() - 40 * 60 * 1000),
        type: 'decision',
        thinking: 'Deciding to use Tailwind for styling consistency',
        duration: 500,
        outcome: 'success',
      },
    ],
    fileChanges: [
      {
        path: 'components/johnny5/sessions/SessionCard.tsx',
        type: 'created',
        linesAdded: 180,
        linesRemoved: 0,
        timestamp: new Date(Date.now() - 42 * 60 * 1000),
      },
      {
        path: 'components/johnny5/sessions/SessionsTab.tsx',
        type: 'created',
        linesAdded: 250,
        linesRemoved: 0,
        timestamp: new Date(Date.now() - 35 * 60 * 1000),
      },
      {
        path: 'components/johnny5/Johnny5Panel.tsx',
        type: 'modified',
        linesAdded: 5,
        linesRemoved: 12,
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
      },
    ],
    errors: [],
    reasoning:
      'I analyzed the existing LeftPanel.tsx and Johnny5Panel.tsx patterns to ensure consistency. Created reusable SessionCard component with status indicators, metrics display, and thinking level visualization. The SessionDetail component provides an expanded view with collapsible sections for file changes, tool calls timeline, and AI reasoning.',
  };
}
