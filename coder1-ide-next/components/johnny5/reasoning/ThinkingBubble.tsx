'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Brain, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface ThinkingBubbleProps {
  thinking: string;
  timestamp?: Date;
  isActive?: boolean;
  isPlaying?: boolean;
}

/**
 * ThinkingBubble - Displays AI reasoning/thinking content
 *
 * Features:
 * - Purple-tinted styling to distinguish from tool calls
 * - Collapsible for long content
 * - Copy functionality
 * - Syntax highlighting for code blocks
 * - Animated glow when active during playback
 */
export default function ThinkingBubble({
  thinking,
  timestamp,
  isActive = false,
  isPlaying = false,
}: ThinkingBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isLongContent = thinking.length > 300;

  // Auto-scroll into view when active during playback
  useEffect(() => {
    if (isActive && isPlaying && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive, isPlaying]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(thinking);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting for code blocks
  const formatThinking = (text: string) => {
    // Split by code blocks
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        // Extract language and code
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
        const language = match?.[1] || '';
        const code = match?.[2] || part.slice(3, -3);
        return (
          <pre
            key={index}
            className="my-2 p-3 bg-bg-primary/50 rounded-md border border-purple-500/20 overflow-x-auto"
          >
            {language && (
              <span className="text-[10px] text-purple-400 uppercase tracking-wider">
                {language}
              </span>
            )}
            <code className="text-xs text-purple-200 font-mono">{code}</code>
          </pre>
        );
      }
      // Regular text with inline code highlighting
      const inlineParts = part.split(/(`[^`]+`)/g);
      return (
        <span key={index}>
          {inlineParts.map((inline, i) => {
            if (inline.startsWith('`') && inline.endsWith('`')) {
              return (
                <code
                  key={i}
                  className="px-1 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-mono"
                >
                  {inline.slice(1, -1)}
                </code>
              );
            }
            return inline;
          })}
        </span>
      );
    });
  };

  return (
    <div
      ref={contentRef}
      className={`
        relative rounded-lg border overflow-hidden transition-all duration-300
        ${
          isActive
            ? 'border-purple-500/60 bg-purple-500/10 shadow-lg shadow-purple-500/20'
            : 'border-purple-500/30 bg-purple-500/5'
        }
      `}
    >
      {/* Active glow animation */}
      {isActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15), transparent 70%)',
            animation: 'thinkingPulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes thinkingPulse {
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
      <div className="flex items-center justify-between px-3 py-2 bg-purple-500/10 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <Brain
            className={`w-4 h-4 ${isActive ? 'text-purple-400 animate-pulse' : 'text-purple-500'}`}
          />
          <span className="text-xs font-semibold text-purple-300">AI Thinking</span>
          {timestamp && (
            <span className="text-[10px] text-purple-400/70">
              {new Date(timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1 rounded text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors"
            title="Copy thinking"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Expand/collapse for long content */}
          {isLongContent && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className={`
          px-3 py-2 text-xs text-purple-100 leading-relaxed transition-all duration-300
          ${!isExpanded && isLongContent ? 'max-h-24 overflow-hidden' : ''}
        `}
      >
        {formatThinking(thinking)}

        {/* Gradient fade for collapsed long content */}
        {!isExpanded && isLongContent && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-purple-500/10 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Expand button at bottom for collapsed content */}
      {!isExpanded && isLongContent && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full py-1.5 text-[10px] text-purple-400 hover:text-purple-300
            bg-purple-500/10 border-t border-purple-500/20 transition-colors"
        >
          Show more ({Math.ceil(thinking.length / 100)} lines)
        </button>
      )}
    </div>
  );
}
