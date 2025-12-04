/**
 * Test Results Panel Component
 * Displays current test execution status and detailed results
 */

'use client';

import { CheckCircle2, XCircle, Clock, Image as ImageIcon, AlertCircle, Code2 } from 'lucide-react';
import { CommandResult } from '@/types';

interface TestResultsPanelProps {
  status: 'idle' | 'running' | 'passed' | 'failed';
  result?: CommandResult | null;
  executionTime?: number;
  currentStep?: string;
}

export default function TestResultsPanel({
  status,
  result,
  executionTime,
  currentStep
}: TestResultsPanelProps) {
  // Render idle state
  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Ready to Test
        </h3>
        <p className="text-sm text-text-secondary max-w-md">
          Enter a test command above and click "Run Test" to begin browser automation.
        </p>
      </div>
    );
  }

  // Render running state
  if (status === 'running') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-coder1-cyan/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-coder1-cyan rounded-full animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Test Running...
        </h3>
        {currentStep && (
          <p className="text-sm text-text-secondary max-w-md">
            {currentStep}
          </p>
        )}
        {executionTime !== undefined && (
          <p className="text-xs text-text-muted mt-2">
            {(executionTime / 1000).toFixed(1)}s elapsed
          </p>
        )}
      </div>
    );
  }

  // Render pass/fail state
  const isPassed = status === 'passed';
  const StatusIcon = isPassed ? CheckCircle2 : XCircle;
  const statusColor = isPassed ? 'text-green-500' : 'text-red-500';
  const statusBg = isPassed ? 'bg-green-500/10' : 'bg-red-500/10';
  const statusBorder = isPassed ? 'border-green-500/30' : 'border-red-500/30';

  return (
    <div className="space-y-4" data-testid="test-results-panel">
      {/* Status Header */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${statusBg} ${statusBorder}`}>
        <StatusIcon className={`w-6 h-6 ${statusColor}`} />
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${statusColor}`}>
            {isPassed ? 'Test Passed' : 'Test Failed'}
          </h3>
          {executionTime !== undefined && (
            <p className="text-xs text-text-muted">
              Completed in {(executionTime / 1000).toFixed(2)}s
            </p>
          )}
        </div>
      </div>

      {/* Error Message (if failed) */}
      {!isPassed && result?.error && (
        <div className="bg-red-500/5 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-1">Error Details</h4>
              <p className="text-sm text-text-secondary whitespace-pre-wrap font-mono">
                {result.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot (if available) */}
      {result?.screenshot && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <ImageIcon className="w-4 h-4" />
            <span>Screenshot Captured</span>
          </div>
          <div className="relative bg-bg-tertiary border border-border-subtle rounded-lg overflow-hidden">
            <img
              src={result.screenshot}
              alt="Test screenshot"
              className="w-full h-auto"
              data-testid="test-screenshot"
            />
            <a
              href={result.screenshot}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 px-3 py-1 bg-bg-primary/80 backdrop-blur-sm
                       border border-border-subtle rounded text-xs text-text-primary
                       hover:bg-bg-primary transition-colors"
            >
              Open Full Size
            </a>
          </div>
        </div>
      )}

      {/* Playwright Code (if generated) */}
      {result?.playwrightCode && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Code2 className="w-4 h-4" />
            <span>Generated Playwright Code</span>
          </div>
          <div className="bg-bg-tertiary border border-border-subtle rounded-lg p-4">
            <pre className="text-xs text-text-primary font-mono whitespace-pre-wrap">
              {result.playwrightCode}
            </pre>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(result.playwrightCode || '');
            }}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg
                     text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            Copy Code to Clipboard
          </button>
        </div>
      )}

      {/* Success Message (if passed with no additional details) */}
      {isPassed && !result?.screenshot && !result?.playwrightCode && (
        <div className="bg-green-500/5 border border-green-500/30 rounded-lg p-4">
          <p className="text-sm text-text-secondary">
            Test completed successfully with no errors.
          </p>
        </div>
      )}
    </div>
  );
}
