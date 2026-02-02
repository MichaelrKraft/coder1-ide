'use client';

import React, { useState, useCallback } from 'react';
import {
  MessageCircle,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  ChevronRight,
  X,
  Bot,
} from 'lucide-react';

interface TelegramSetupCardProps {
  onConnected?: (token: string, botUsername: string) => void;
  onSkip?: () => void;
  initialToken?: string;
  className?: string;
}

type ConnectionStatus = 'idle' | 'validating' | 'connected' | 'error';

/**
 * TelegramSetupCard Component
 *
 * Setup card for connecting a Telegram bot to Johnny5.
 * Guides users through creating a bot via @BotFather and connecting it.
 */
export default function TelegramSetupCard({
  onConnected,
  onSkip,
  initialToken = '',
  className,
}: TelegramSetupCardProps) {
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState<ConnectionStatus>(initialToken ? 'connected' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [botUsername, setBotUsername] = useState<string>('');
  const [showSteps, setShowSteps] = useState(true);

  // Validate token against Telegram API
  const validateToken = useCallback(async () => {
    if (!token.trim()) {
      setErrorMessage('Please enter a bot token');
      setStatus('error');
      return;
    }

    // Basic token format validation (number:alphanumeric)
    const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
    if (!tokenRegex.test(token.trim())) {
      setErrorMessage('Invalid token format. Should look like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz');
      setStatus('error');
      return;
    }

    setStatus('validating');
    setErrorMessage('');

    try {
      // Call Telegram's getMe API to validate the token and get bot info
      const response = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`);
      const data = await response.json();

      if (data.ok && data.result) {
        const username = data.result.username;
        setBotUsername(username);
        setStatus('connected');
        onConnected?.(token.trim(), username);
      } else {
        setErrorMessage(data.description || 'Invalid bot token. Please check and try again.');
        setStatus('error');
      }
    } catch {
      setErrorMessage('Failed to validate token. Please check your internet connection.');
      setStatus('error');
    }
  }, [token, onConnected]);

  // Handle paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setToken(text);
    } catch {
      // Clipboard access denied - user can still type manually
    }
  }, []);

  const setupSteps = [
    {
      number: 1,
      text: 'Open @BotFather in Telegram',
      link: 'https://t.me/BotFather',
      linkText: 'Open',
    },
    {
      number: 2,
      text: 'Send /newbot and follow the prompts',
    },
    {
      number: 3,
      text: 'Copy the bot token and paste below',
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
                : 'bg-blue-500/10'
              }
            `}
          >
            <MessageCircle
              className={`w-6 h-6 ${
                status === 'connected' ? 'text-green-400' : 'text-blue-400'
              }`}
            />
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text-primary">
                Telegram Bot
              </h3>
              {status === 'connected' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-medium">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
              )}
            </div>
            <p className="text-sm text-text-muted mt-0.5">
              Chat with Johnny5 from anywhere
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
            <div className="space-y-2 pl-1">
              {setupSteps.map((step) => (
                <div key={step.number} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-bg-tertiary text-[10px] font-bold text-text-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    {step.number}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <span>{step.text}</span>
                    {step.link && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-medium transition-all"
                      >
                        {step.linkText}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Token Input Section */}
      <div className="px-4 pb-4">
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          Bot Token
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              disabled={status === 'connected'}
              className={`
                w-full px-3 py-2.5 rounded-lg text-sm font-mono
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

          {/* Connect Button */}
          {status !== 'connected' && (
            <button
              onClick={validateToken}
              disabled={status === 'validating' || !token.trim()}
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
                  Validating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Connect
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
        {status === 'connected' && botUsername && (
          <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30">
            <Bot className="w-4 h-4 text-green-400 flex-shrink-0" />
            <div className="text-xs">
              <span className="text-green-400 font-medium">@{botUsername}</span>
              <span className="text-text-muted"> connected. </span>
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-coder1-cyan hover:underline"
              >
                Open in Telegram
                <ExternalLink className="w-3 h-3 inline ml-1" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
