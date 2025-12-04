/**
 * Test Input Area Component
 * Provides input interface for browser automation tests with dual-mode support
 */

'use client';

import { useState } from 'react';
import { Play, Circle, Code2, MessageSquare } from 'lucide-react';

interface TestInputAreaProps {
  onRunTest: (input: string, mode: 'natural' | 'playwright') => void;
  onRecord: () => void;
  isRunning?: boolean;
  disabled?: boolean;
}

export default function TestInputArea({
  onRunTest,
  onRecord,
  isRunning = false,
  disabled = false
}: TestInputAreaProps) {
  const [mode, setMode] = useState<'natural' | 'playwright'>('natural');
  const [input, setInput] = useState('');

  const handleRunTest = () => {
    if (input.trim() && !isRunning && !disabled) {
      onRunTest(input, mode);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to run test
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunTest();
    }
  };

  const placeholderText = mode === 'natural'
    ? 'Enter natural language command (e.g., "Click the login button and fill the username field")'
    : 'Enter Playwright code (e.g., await page.click("#login-button")';

  return (
    <div className="flex flex-col gap-3">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">Input Mode:</span>
        <div
          className="flex items-center gap-1 bg-bg-tertiary border border-border-subtle rounded-lg p-1"
          data-testid="test-input-mode-toggle"
        >
          <button
            onClick={() => setMode('natural')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all
              ${mode === 'natural'
                ? 'bg-coder1-cyan text-bg-primary shadow-glow-cyan'
                : 'text-text-secondary hover:text-text-primary'
              }
            `}
            data-testid="mode-natural-btn"
          >
            <MessageSquare className="w-4 h-4" />
            Natural Language
          </button>
          <button
            onClick={() => setMode('playwright')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all
              ${mode === 'playwright'
                ? 'bg-coder1-purple text-white shadow-glow-purple'
                : 'text-text-secondary hover:text-text-primary'
              }
            `}
            data-testid="mode-playwright-btn"
          >
            <Code2 className="w-4 h-4" />
            Playwright Code
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          disabled={isRunning || disabled}
          className={`
            w-full h-32 px-4 py-3 bg-bg-secondary border rounded-lg
            text-text-primary placeholder-text-muted
            resize-none focus:outline-none focus:ring-2 transition-all
            font-mono text-sm
            ${mode === 'natural'
              ? 'border-coder1-cyan/30 focus:ring-coder1-cyan/50 focus:border-coder1-cyan'
              : 'border-coder1-purple/30 focus:ring-coder1-purple/50 focus:border-coder1-purple'
            }
            ${(isRunning || disabled) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          data-testid="test-input-area"
        />

        {/* Character Count */}
        <div className="absolute bottom-2 right-2 text-xs text-text-muted">
          {input.length} chars
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleRunTest}
          disabled={!input.trim() || isRunning || disabled}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${mode === 'natural'
              ? 'bg-coder1-cyan text-bg-primary hover:shadow-glow-cyan-intense'
              : 'bg-coder1-purple text-white hover:shadow-glow-purple'
            }
            disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
          `}
          data-testid="run-test-btn"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Test
            </>
          )}
        </button>

        <button
          onClick={onRecord}
          disabled={isRunning || disabled}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium
            bg-bg-tertiary border border-border-subtle text-text-primary
            hover:bg-bg-secondary hover:border-coder1-cyan/50
            transition-all disabled:opacity-50 disabled:cursor-not-allowed
          "
          data-testid="record-btn"
        >
          <Circle className="w-4 h-4 fill-red-500 text-red-500" />
          Record
        </button>

        {/* Keyboard Hint */}
        <div className="ml-auto text-xs text-text-muted">
          ⌘/Ctrl + Enter to run
        </div>
      </div>

      {/* Mode Description */}
      <div className="text-xs text-text-muted bg-bg-tertiary border border-border-subtle rounded p-2">
        {mode === 'natural' ? (
          <p>
            <strong className="text-coder1-cyan">Natural Language:</strong> Describe what you want to test in plain English.
            AI will convert it to browser automation steps.
          </p>
        ) : (
          <p>
            <strong className="text-coder1-purple">Playwright Code:</strong> Write direct Playwright commands for precise control.
            Use standard Playwright API syntax.
          </p>
        )}
      </div>
    </div>
  );
}
