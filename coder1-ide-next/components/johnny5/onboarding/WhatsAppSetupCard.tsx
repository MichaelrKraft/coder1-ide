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
  Phone,
} from 'lucide-react';

interface WhatsAppSetupCardProps {
  onConnected?: (phoneNumber: string) => void;
  onSkip?: () => void;
  initialPhoneNumber?: string;
  className?: string;
}

type ConnectionStatus = 'idle' | 'validating' | 'connected' | 'error';

/**
 * WhatsAppSetupCard Component
 *
 * Setup card for connecting WhatsApp Business to Johnny5.
 * Guides users through getting WhatsApp Business and entering their number.
 * Note: No live API validation - just phone format validation.
 */
export default function WhatsAppSetupCard({
  onConnected,
  onSkip,
  initialPhoneNumber = '',
  className,
}: WhatsAppSetupCardProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [status, setStatus] = useState<ConnectionStatus>(initialPhoneNumber ? 'connected' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showSteps, setShowSteps] = useState(true);

  // Validate phone number format (E.164)
  const validatePhoneNumber = useCallback(() => {
    const trimmedNumber = phoneNumber.trim();

    if (!trimmedNumber) {
      setErrorMessage('Please enter your WhatsApp Business number');
      setStatus('error');
      return;
    }

    // E.164 format: + followed by country code and number (7-15 digits total)
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(trimmedNumber)) {
      setErrorMessage('Enter phone with country code: +1234567890');
      setStatus('error');
      return;
    }

    setStatus('validating');
    setErrorMessage('');

    // Simulate brief validation delay for UX
    setTimeout(() => {
      setStatus('connected');
      onConnected?.(trimmedNumber);
    }, 500);
  }, [phoneNumber, onConnected]);

  // Handle paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPhoneNumber(text);
    } catch {
      // Clipboard access denied - user can still type manually
    }
  }, []);

  const setupSteps = [
    {
      number: 1,
      text: 'Get WhatsApp Business app',
      link: 'https://business.whatsapp.com/',
      linkText: 'Download',
    },
    {
      number: 2,
      text: 'Set up your business profile',
    },
    {
      number: 3,
      text: 'Enter your WhatsApp Business number below',
    },
  ];

  return (
    <div
      className={`
        rounded-xl border transition-all overflow-hidden
        ${status === 'connected'
          ? 'bg-green-500/5 border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
          : 'bg-bg-secondary border-border-default hover:border-green-500/30'
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
                : 'bg-green-500/10'
              }
            `}
          >
            <MessageCircle
              className={`w-6 h-6 ${
                status === 'connected' ? 'text-green-400' : 'text-green-500'
              }`}
            />
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text-primary">
                WhatsApp Business
              </h3>
              {status === 'connected' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-medium">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
              )}
            </div>
            <p className="text-sm text-text-muted mt-0.5">
              Get messages on WhatsApp
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
            className="flex items-center gap-1 text-xs text-green-500 hover:underline mb-2"
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
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium transition-all"
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

      {/* Phone Input Section */}
      <div className="px-4 pb-4">
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          WhatsApp Business Number
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              placeholder="+1 234 567 8900"
              disabled={status === 'connected'}
              className={`
                w-full px-3 py-2.5 rounded-lg text-sm
                bg-bg-tertiary border transition-all
                placeholder:text-text-muted/50
                focus:outline-none focus:ring-2 focus:ring-green-500/50
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
              onClick={validatePhoneNumber}
              disabled={status === 'validating' || !phoneNumber.trim()}
              className={`
                px-4 py-2.5 rounded-lg font-medium text-sm transition-all
                flex items-center gap-2
                ${status === 'validating'
                  ? 'bg-green-500/50 text-white cursor-wait'
                  : 'bg-green-500 hover:bg-green-600 text-white'
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
        {status === 'connected' && phoneNumber && (
          <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30">
            <Phone className="w-4 h-4 text-green-400 flex-shrink-0" />
            <div className="text-xs">
              <span className="text-green-400 font-medium">{phoneNumber}</span>
              <span className="text-text-muted"> saved. Johnny5 will message you here.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
