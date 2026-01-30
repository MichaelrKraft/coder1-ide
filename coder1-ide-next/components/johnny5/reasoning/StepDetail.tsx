'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Wrench,
  Terminal,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { Johnny5ReplayStep } from '@/types';

interface StepDetailProps {
  step: Johnny5ReplayStep;
  isActive?: boolean;
  isPlaying?: boolean;
  onSelect?: () => void;
}

/**
 * StepDetail - Visualizes a single step in the reasoning replay
 *
 * Features:
 * - Tool call name and duration badge
 * - Collapsible input/output sections
 * - Syntax highlighting for JSON
 * - Outcome status indicator (success/error/skipped)
 * - Copy functionality for inputs and outputs
 * - Active state glow during playback
 */
export default function StepDetail({
  step,
  isActive = false,
  isPlaying = false,
  onSelect,
}: StepDetailProps) {
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll into view when active during playback
  useEffect(() => {
    if (isActive && isPlaying && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive, isPlaying]);

  // Auto-expand when active
  useEffect(() => {
    if (isActive) {
      setShowInput(true);
      setShowOutput(true);
    }
  }, [isActive]);

  const handleCopy = async (data: Record<string, unknown>, type: 'input' | 'output') => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    if (type === 'input') {
      setCopiedInput(true);
      setTimeout(() => setCopiedInput(false), 2000);
    } else {
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    }
  };

  // Get icon based on step type
  const getIcon = () => {
    switch (step.type) {
      case 'tool_call':
        return <Wrench className="w-4 h-4" />;
      case 'response':
        return <Terminal className="w-4 h-4" />;
      case 'decision':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Wrench className="w-4 h-4" />;
    }
  };

  // Get outcome icon and styling
  const getOutcomeStyles = () => {
    switch (step.outcome) {
      case 'success':
        return {
          icon: <CheckCircle className="w-3.5 h-3.5" />,
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          border: 'border-green-500/40',
        };
      case 'error':
        return {
          icon: <XCircle className="w-3.5 h-3.5" />,
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          border: 'border-red-500/40',
        };
      case 'skipped':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          bg: 'bg-gray-500/20',
          text: 'text-gray-400',
          border: 'border-gray-500/40',
        };
      default:
        return {
          icon: <CheckCircle className="w-3.5 h-3.5" />,
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          border: 'border-green-500/40',
        };
    }
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // JSON syntax highlighting
  const highlightJson = (obj: Record<string, unknown>) => {
    const json = JSON.stringify(obj, null, 2);
    // Simple syntax highlighting
    return json
      .replace(/"([^"]+)":/g, '<span class="text-coder1-cyan">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="text-green-400">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="text-orange-400">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="text-purple-400">$1</span>');
  };

  const outcome = getOutcomeStyles();

  return (
    <div
      ref={containerRef}
      onClick={onSelect}
      className={`
        relative rounded-lg border overflow-hidden transition-all duration-300
        ${onSelect ? 'cursor-pointer' : ''}
        ${
          isActive
            ? 'border-coder1-cyan/60 bg-coder1-cyan/10 shadow-lg shadow-coder1-cyan/20'
            : 'border-border-default bg-bg-tertiary hover:border-border-default/80'
        }
      `}
    >
      {/* Active glow animation */}
      {isActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(0, 217, 255, 0.1), transparent 70%)',
            animation: 'stepGlow 2s ease-in-out infinite',
          }}
        />
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes stepGlow {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-secondary/50 border-b border-border-default">
        <div className="flex items-center gap-2">
          <span className={isActive ? 'text-coder1-cyan' : 'text-text-muted'}>{getIcon()}</span>
          <span
            className={`text-xs font-semibold ${isActive ? 'text-coder1-cyan' : 'text-text-primary'}`}
          >
            {step.toolName || step.type.replace('_', ' ')}
          </span>
          <span className={`text-[10px] ${outcome.text} ${outcome.bg} px-1.5 py-0.5 rounded`}>
            {step.outcome}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Duration badge */}
          <div
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
              ${isActive ? 'bg-coder1-cyan/20 text-coder1-cyan' : 'bg-bg-primary text-text-muted'}
            `}
          >
            <Clock className="w-3 h-3" />
            {formatDuration(step.duration)}
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div className="px-3 py-1.5 text-[10px] text-text-muted border-b border-border-default/50">
        {new Date(step.timestamp).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })}
      </div>

      {/* Input Section */}
      {step.toolInput && Object.keys(step.toolInput).length > 0 && (
        <div className="border-b border-border-default/50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInput(!showInput);
            }}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-tertiary/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {showInput ? (
                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              )}
              <span className="text-xs font-medium text-text-secondary">Input</span>
              <ArrowRight className="w-3 h-3 text-text-muted" />
            </div>
            {step.toolInput && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(step.toolInput!, 'input');
                }}
                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                title="Copy input"
              >
                {copiedInput ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </button>

          {showInput && (
            <div className="px-3 pb-3">
              <pre
                className="p-2 bg-bg-primary rounded text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: highlightJson(step.toolInput) }}
              />
            </div>
          )}
        </div>
      )}

      {/* Output Section */}
      {step.toolOutput && Object.keys(step.toolOutput).length > 0 && (
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOutput(!showOutput);
            }}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-tertiary/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {showOutput ? (
                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              )}
              <span className="text-xs font-medium text-text-secondary">Output</span>
              <ArrowRight className="w-3 h-3 text-text-muted transform rotate-180" />
            </div>
            {step.toolOutput && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(step.toolOutput!, 'output');
                }}
                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                title="Copy output"
              >
                {copiedOutput ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </button>

          {showOutput && (
            <div className="px-3 pb-3">
              <pre
                className="p-2 bg-bg-primary rounded text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: highlightJson(step.toolOutput) }}
              />
            </div>
          )}
        </div>
      )}

      {/* Thinking (if present) */}
      {step.thinking && !step.toolInput && !step.toolOutput && (
        <div className="px-3 py-2 text-xs text-text-secondary">{step.thinking}</div>
      )}
    </div>
  );
}
