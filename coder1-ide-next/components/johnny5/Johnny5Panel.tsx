'use client';

import React, { useEffect, useRef } from 'react';
import { Zap, ExternalLink, X } from 'lucide-react';
import { ChatTab } from './chat';
import { getSocket } from '@/lib/socket';
import { useJohnny5Store } from '@/stores/useJohnny5Store';
import { getPatternDetector } from '@/services/johnny5/pattern-detector';
import { getRuleSuggester } from '@/services/johnny5/rule-suggester';
import { getModelAdvisor } from '@/services/johnny5/model-advisor';
import { getSessionMemory } from '@/services/johnny5/session-memory';
import { getHandoffGenerator } from '@/services/johnny5/handoff-generator';
import { getErrorPatternLibrary } from '@/services/johnny5/error-pattern-library';
import { getSessionCoach } from '@/services/johnny5/session-coach';
import { getTipEngine } from '@/services/johnny5/tip-engine';
import type { J5Tip } from '@/services/johnny5/tip-engine';

interface Johnny5PanelProps {
  className?: string;
}

export default function Johnny5Panel({ className }: Johnny5PanelProps) {
  const { status, activeTips, setActiveTips, dismissTip } = useJohnny5Store();

  // Start intelligence services + tip engine on mount
  const servicesStarted = useRef(false);
  useEffect(() => {
    if (servicesStarted.current || typeof window === 'undefined') return;
    servicesStarted.current = true;
    getPatternDetector().start();
    getRuleSuggester().start();
    getModelAdvisor().start();
    getSessionMemory().start();
    getHandoffGenerator().start();
    getErrorPatternLibrary().start();
    getSessionCoach().start();
    getTipEngine().start();
    return () => {
      getPatternDetector().stop();
      getRuleSuggester().stop();
      getModelAdvisor().stop();
      getSessionMemory().stop();
      getHandoffGenerator().stop();
      getErrorPatternLibrary().stop();
      getSessionCoach().stop();
      getTipEngine().stop();
    };
  }, []);

  // Poll tip engine for active tips every 10 seconds
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      const tips = getTipEngine().getActiveTips();
      setActiveTips(tips);
    };
    update();
    const interval = setInterval(update, 10_000);
    return () => clearInterval(interval);
  }, [setActiveTips]);

  // Socket listener for proactive chat pushes
  useEffect(() => {
    let cancelled = false;
    let socketRef: Awaited<ReturnType<typeof getSocket>> | null = null;

    getSocket().then((sock) => {
      if (cancelled) return;
      socketRef = sock;
      sock.on('johnny5:chat-push', () => {});
      sock.on('johnny5:morning-brief', () => {});
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (socketRef) {
        socketRef.off('johnny5:chat-push');
        socketRef.off('johnny5:morning-brief');
      }
    };
  }, []);

  const handleTipAction = (tip: J5Tip) => {
    if (tip.action && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(tip.action.eventName, { detail: tip.action.eventDetail })
      );
    }
    dismissTip(tip.id);
  };

  const handleDismissTip = (tipId: string) => {
    dismissTip(tipId);
    getTipEngine().dismissTip(tipId);
  };

  const visibleTips = activeTips.slice(0, 3);

  return (
    <div
      data-tour="johnny5-panel"
      className={`h-full flex flex-col bg-bg-secondary ${className || ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default bg-bg-secondary/80">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Zap
              className={`w-4 h-4 ${
                status === 'working' ? 'text-coder1-cyan animate-pulse' :
                status === 'error' ? 'text-red-400' :
                'text-text-muted'
              }`}
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-bg-secondary ${
                status === 'working' ? 'bg-green-400' :
                status === 'error' ? 'bg-red-400' :
                'bg-gray-400'
              }`}
            />
          </div>
          <span className="text-sm font-medium text-text-primary">Johnny5</span>
          <span className="text-xs text-text-muted">
            {status === 'working' ? 'Working...' :
             status === 'error' ? 'Error' :
             'Ready to help'}
          </span>
        </div>
      </div>

      {/* Tip Cards */}
      {visibleTips.length > 0 && (
        <div className="px-3 py-2 space-y-2 border-b border-border-default">
          {visibleTips.map((tip) => (
            <TipCard
              key={tip.id}
              tip={tip}
              onAction={() => handleTipAction(tip)}
              onDismiss={() => handleDismissTip(tip.id)}
            />
          ))}
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ChatTab />
      </div>

      {/* Open Full Platform Button */}
      <a
        href="/johnny5"
        className="flex items-center justify-center gap-2 px-4 py-2.5 border-t border-border-default text-sm text-coder1-cyan hover:bg-coder1-cyan/10 transition-colors"
      >
        Open Full Johnny5 Platform
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TipCard Sub-Component
// ---------------------------------------------------------------------------

function TipCard({
  tip,
  onAction,
  onDismiss,
}: {
  tip: J5Tip;
  onAction: () => void;
  onDismiss: () => void;
}) {
  const borderColor =
    tip.priority === 1 ? 'border-l-orange-400' :
    tip.priority === 2 ? 'border-l-coder1-cyan' :
    'border-l-purple-400';

  const icon =
    tip.type === 'context' ? '\u26A1' :
    tip.type === 'loop' ? '\uD83D\uDD04' :
    tip.type === 'model' ? '\uD83E\uDDE0' :
    tip.type === 'memory' ? '\uD83D\uDCBE' :
    '\uD83D\uDCA1';

  return (
    <div className={`relative pl-3 pr-2 py-2 rounded-md bg-bg-tertiary border-l-2 ${borderColor}`}>
      <button
        onClick={onDismiss}
        className="absolute top-1 right-1 p-0.5 rounded text-text-muted hover:text-text-primary"
        aria-label="Dismiss tip"
      >
        <X className="w-3 h-3" />
      </button>
      <div className="text-xs font-medium text-text-primary mb-0.5">
        {icon} {tip.title}
      </div>
      <div className="text-xs text-text-muted leading-relaxed pr-4">{tip.message}</div>
      {tip.action && (
        <button
          onClick={onAction}
          className="mt-1.5 text-xs font-medium text-coder1-cyan hover:text-coder1-cyan/80 transition-colors"
        >
          {tip.action.label}
        </button>
      )}
    </div>
  );
}
