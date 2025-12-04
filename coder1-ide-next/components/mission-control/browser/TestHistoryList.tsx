/**
 * Test History List Component
 * Displays list of past test executions with click-to-view details
 */

'use client';

import { CheckCircle2, XCircle, Clock, Trash2, ChevronRight } from 'lucide-react';
import { BrowserCommand } from '@/types';

interface TestHistoryListProps {
  history: BrowserCommand[];
  onSelectTest: (command: BrowserCommand) => void;
  onClearHistory?: () => void;
  selectedTestId?: string | null;
}

export default function TestHistoryList({
  history,
  onSelectTest,
  onClearHistory,
  selectedTestId
}: TestHistoryListProps) {
  // Format timestamp to readable string
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Get status icon and color
  const getStatusDisplay = (command: BrowserCommand) => {
    if (!command.result) {
      return {
        Icon: Clock,
        color: 'text-text-muted',
        bg: 'bg-text-muted/10',
        label: 'Pending'
      };
    }

    if (command.result.success) {
      return {
        Icon: CheckCircle2,
        color: 'text-green-500',
        bg: 'bg-green-500/10',
        label: 'Passed'
      };
    }

    return {
      Icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      label: 'Failed'
    };
  };

  // Truncate long input text
  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          No Test History
        </h3>
        <p className="text-sm text-text-secondary max-w-md">
          Your test execution history will appear here. Run your first test to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="test-history-list">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Test History</h3>
          <span className="px-2 py-0.5 bg-bg-tertiary border border-border-subtle rounded-full text-xs text-text-secondary">
            {history.length}
          </span>
        </div>
        {onClearHistory && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-secondary
                     hover:text-red-400 transition-colors"
            data-testid="clear-history-btn"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {history.map((command) => {
          const { Icon, color, bg, label } = getStatusDisplay(command);
          const isSelected = selectedTestId === command.id;

          return (
            <button
              key={command.id}
              onClick={() => onSelectTest(command)}
              className={`
                w-full p-3 rounded-lg border transition-all text-left
                ${isSelected
                  ? 'bg-coder1-cyan/10 border-coder1-cyan/50 shadow-glow-cyan'
                  : 'bg-bg-secondary border-border-subtle hover:bg-bg-tertiary hover:border-coder1-cyan/30'
                }
              `}
              data-testid={`history-item-${command.id}`}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className={`p-1.5 rounded ${bg} flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>

                {/* Command Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {truncateText(command.input)}
                    </p>
                    <ChevronRight className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className={color}>{label}</span>
                    <span>•</span>
                    <span>{formatTimestamp(command.timestamp)}</span>
                    <span>•</span>
                    <span className="capitalize">{command.type}</span>
                  </div>

                  {/* Error Preview (if failed) */}
                  {command.result && !command.result.success && command.result.error && (
                    <p className="mt-1.5 text-xs text-red-400 truncate">
                      {truncateText(command.result.error, 80)}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-3 border-t border-border-subtle">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-text-secondary">
                {history.filter(c => c.result?.success).length} passed
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-text-secondary">
                {history.filter(c => c.result && !c.result.success).length} failed
              </span>
            </div>
          </div>
          <div className="text-text-muted">
            Total: {history.length}
          </div>
        </div>
      </div>
    </div>
  );
}
