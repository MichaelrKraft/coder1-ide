'use client';

import React, { useState, useCallback } from 'react';
import {
  Zap,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  ChevronRight,
  X,
  Terminal,
} from 'lucide-react';

interface ZapierMCPSetupCardProps {
  onConnected?: (url: string) => void;
  onSkip?: () => void;
  initialUrl?: string;
  className?: string;
}

type ConnectionStatus = 'idle' | 'validating' | 'connected' | 'error';

/**
 * ZapierMCPSetupCard Component
 *
 * Setup card for connecting to Zapier MCP integration.
 * Guides users through connecting to 8000+ apps via Zapier's free MCP server.
 */
export default function ZapierMCPSetupCard({
  onConnected,
  onSkip,
  initialUrl = '',
  className,
}: ZapierMCPSetupCardProps) {
  const [mcpUrl, setMcpUrl] = useState(initialUrl);
  const [status, setStatus] = useState<ConnectionStatus>(initialUrl ? 'connected' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showSteps, setShowSteps] = useState(true);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // Copy command to clipboard
  const copyCommand = useCallback(async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(command);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch {
      // Clipboard access denied
    }
  }, []);

  // Handle URL save (validation is optional for Alpha)
  const saveUrl = useCallback(async () => {
    const trimmedUrl = mcpUrl.trim();

    if (!trimmedUrl) {
      // Empty URL is OK - user may just want to skip
      setStatus('connected');
      onConnected?.('');
      return;
    }

    // Basic URL format validation
    const urlRegex = /^https:\/\/actions\.zapier\.com\/mcp\//;
    if (!urlRegex.test(trimmedUrl)) {
      setErrorMessage('URL should start with https://actions.zapier.com/mcp/');
      setStatus('error');
      return;
    }

    setStatus('validating');
    setErrorMessage('');

    // For Alpha, we just save the URL without backend validation
    // The actual connection is done via mcporter command
    setTimeout(() => {
      setStatus('connected');
      onConnected?.(trimmedUrl);
    }, 500);
  }, [mcpUrl, onConnected]);

  // Handle paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMcpUrl(text);
    } catch {
      // Clipboard access denied - user can still type manually
    }
  }, []);

  const setupSteps = [
    {
      number: 1,
      text: 'Install MC Porter (one-time)',
      command: 'brew install steipete/tap/mcporter',
      note: 'Or: npm install -g mcporter',
      link: 'https://github.com/steipete/mcporter',
      linkText: 'Learn more',
    },
    {
      number: 2,
      text: 'Go to Zapier MCP',
      link: 'https://zapier.com/mcp',
      linkText: 'Open Zapier',
    },
    {
      number: 3,
      text: 'Create an MCP server and add your desired tools',
    },
    {
      number: 4,
      text: 'Copy your MCP URL (looks like https://actions.zapier.com/mcp/sk-ak-...)',
    },
    {
      number: 5,
      text: 'Run this command in your terminal:',
      command: 'mcporter list --http-url <YOUR_URL> --name zapier --persist',
      isDynamic: true,
    },
  ];

  return (
    <div
      className={`
        rounded-xl border transition-all overflow-hidden
        ${status === 'connected'
          ? 'bg-green-500/5 border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
          : 'bg-bg-secondary border-border-default hover:border-coder1-cyan/30'
        }
        ${className || ''}
      `}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
              ${status === 'connected'
                ? 'bg-green-500/20'
                : 'bg-coder1-cyan/10'
              }
            `}
          >
            <Zap
              className={`w-6 h-6 ${
                status === 'connected' ? 'text-green-400' : 'text-coder1-cyan'
              }`}
            />
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text-primary">
                Zapier MCP
              </h3>
              {status === 'connected' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-medium">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
              )}
            </div>
            <p className="text-sm text-text-muted mt-0.5">
              Connect to 8000+ apps via Zapier&apos;s free MCP
            </p>
          </div>

          {/* Skip Button */}
          {status !== 'connected' && onSkip && (
            <button
              onClick={onSkip}
              className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-all"
              title="Skip this integration"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Steps Section */}
      {status !== 'connected' && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="flex items-center gap-1 text-xs text-coder1-cyan hover:underline mb-2"
          >
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform ${showSteps ? 'rotate-90' : ''}`}
            />
            {showSteps ? 'Hide steps' : 'Show steps'}
          </button>

          {showSteps && (
            <div className="space-y-3 pl-1">
              {setupSteps.map((step) => (
                <div key={step.number} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-bg-tertiary text-[10px] font-bold text-text-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    {step.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-text-secondary flex-wrap">
                      <span>{step.text}</span>
                      {step.link && (
                        <a
                          href={step.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-coder1-cyan/20 hover:bg-coder1-cyan/30 text-coder1-cyan text-xs font-medium transition-all"
                        >
                          {step.linkText}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {step.command && (
                      <div className="mt-1.5">
                        <div className="flex items-center gap-2 bg-bg-tertiary rounded-lg border border-border-default overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 flex-1 min-w-0">
                            <Terminal className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                            <code className="text-xs text-coder1-cyan font-mono truncate">
                              {step.isDynamic && mcpUrl
                                ? step.command.replace('<YOUR_URL>', mcpUrl)
                                : step.command}
                            </code>
                          </div>
                          <button
                            onClick={() => copyCommand(
                              step.isDynamic && mcpUrl
                                ? step.command.replace('<YOUR_URL>', mcpUrl)
                                : step.command
                            )}
                            className="px-3 py-2 bg-bg-secondary hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-all border-l border-border-default"
                            title="Copy command"
                          >
                            {copiedCommand === (step.isDynamic && mcpUrl ? step.command.replace('<YOUR_URL>', mcpUrl) : step.command) ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {step.note && (
                          <p className="text-[10px] text-text-muted mt-1">{step.note}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* URL Input Section */}
      <div className="px-4 pb-4">
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          MCP URL <span className="text-text-muted/50">(optional - for your records)</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={mcpUrl}
              onChange={(e) => {
                setMcpUrl(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              placeholder="https://actions.zapier.com/mcp/sk-ak-..."
              disabled={status === 'connected'}
              className={`
                w-full px-3 py-2.5 rounded-lg text-sm
                bg-bg-tertiary border transition-all
                placeholder:text-text-muted/50
                focus:outline-none focus:ring-2 focus:ring-coder1-cyan/50
                disabled:opacity-60 disabled:cursor-not-allowed
                ${status === 'error'
                  ? 'border-red-500/50 text-text-primary'
                  : status === 'connected'
                  ? 'border-green-500/50 text-green-400'
                  : 'border-border-default text-text-primary'
                }
              `}
            />
            {status !== 'connected' && (
              <button
                onClick={handlePaste}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-all"
                title="Paste from clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Save Button */}
          {status !== 'connected' && (
            <button
              onClick={saveUrl}
              disabled={status === 'validating'}
              className={`
                px-4 py-2.5 rounded-lg font-medium text-sm transition-all
                flex items-center gap-2
                ${status === 'validating'
                  ? 'bg-coder1-cyan/50 text-black cursor-wait'
                  : 'bg-coder1-cyan hover:bg-coder1-cyan/90 text-black'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {status === 'validating' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          )}
        </div>

        {/* Error Message */}
        {status === 'error' && errorMessage && (
          <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Message */}
        {status === 'connected' && (
          <div className="flex items-center gap-2 mt-2 text-xs text-green-400">
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {mcpUrl
                ? 'URL saved! Run the mcporter command above to complete the connection.'
                : 'Skipped Zapier setup. You can configure this later in settings.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
