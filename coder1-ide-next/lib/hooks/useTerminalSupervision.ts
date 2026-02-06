/**
 * Terminal Supervision Hook
 *
 * Bridges terminal events (from terminal-observer.ts) to the supervision system.
 * Subscribes to terminal events, evaluates them against destructive operation
 * patterns, fires callbacks for supervision-relevant events, and saves
 * significant events as supervision facts via API.
 */
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { terminalObserver, type TerminalEvent } from '@/lib/terminal-observer';

// ============================================================================
// Types
// ============================================================================

export interface SupervisionAlert {
  id: string;
  type: 'destructive' | 'security' | 'error_pattern' | 'info';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details?: string;
  timestamp: number;
  dismissed: boolean;
}

interface UseTerminalSupervisionOptions {
  enabled: boolean;  // Whether supervision is active
  alertThreshold: 'minimal' | 'moderate' | 'comprehensive' | 'maximum';
  onAlert?: (alert: SupervisionAlert) => void;
}

// ============================================================================
// Destructive Operation Patterns
// ============================================================================

// These patterns detect potentially dangerous operations in terminal output
const DESTRUCTIVE_PATTERNS = [
  { pattern: /rm\s+-rf\s+[\/~]/, message: 'Recursive delete on root or home directory', severity: 'critical' as const },
  { pattern: /git\s+push\s+.*--force/, message: 'Git force push detected', severity: 'critical' as const },
  { pattern: /git\s+push\s+-f\b/, message: 'Git force push detected', severity: 'critical' as const },
  { pattern: /git\s+reset\s+--hard/, message: 'Git hard reset detected', severity: 'warning' as const },
  { pattern: /drop\s+table|drop\s+database/i, message: 'Database drop command detected', severity: 'critical' as const },
  { pattern: /chmod\s+777/, message: 'Insecure permissions (777) detected', severity: 'warning' as const },
  { pattern: /rm\s+-rf\s+node_modules/, message: 'Removing node_modules', severity: 'info' as const },
  { pattern: /git\s+branch\s+-D/, message: 'Force deleting git branch', severity: 'warning' as const },
];

// Security patterns (from WalkAwaySupervisionService conventions)
const SECURITY_PATTERNS = [
  { pattern: /eval\s*\(/, message: 'eval() usage detected - potential security risk', severity: 'warning' as const },
  { pattern: /innerHTML\s*=/, message: 'innerHTML assignment - potential XSS risk', severity: 'warning' as const },
  { pattern: /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]+['"]/i, message: 'Possible hardcoded credential detected', severity: 'critical' as const },
];

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTerminalSupervision(options: UseTerminalSupervisionOptions) {
  const { enabled, alertThreshold, onAlert } = options;
  const [alerts, setAlerts] = useState<SupervisionAlert[]>([]);
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  // Evaluate a terminal event against supervision patterns
  const evaluateEvent = useCallback((event: TerminalEvent) => {
    if (!enabled) return;

    const newAlerts: SupervisionAlert[] = [];
    const text = event.details || event.summary;

    // Check destructive patterns
    for (const { pattern, message, severity } of DESTRUCTIVE_PATTERNS) {
      if (pattern.test(text)) {
        // Filter by threshold
        if (alertThreshold === 'minimal' && severity !== 'critical') continue;
        if (alertThreshold === 'moderate' && severity === 'info') continue;

        newAlerts.push({
          id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'destructive',
          severity,
          message,
          details: text.slice(0, 200),
          timestamp: Date.now(),
          dismissed: false,
        });
      }
    }

    // Check security patterns (only for moderate+ thresholds)
    if (alertThreshold !== 'minimal') {
      for (const { pattern, message, severity } of SECURITY_PATTERNS) {
        if (pattern.test(text)) {
          newAlerts.push({
            id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'security',
            severity,
            message,
            details: text.slice(0, 200),
            timestamp: Date.now(),
            dismissed: false,
          });
        }
      }
    }

    // For error events, create info/warning alerts
    if (event.type === 'error' && alertThreshold !== 'minimal') {
      newAlerts.push({
        id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'error_pattern',
        severity: 'warning',
        message: event.summary,
        details: event.details?.slice(0, 200),
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev.slice(-20), ...newAlerts]); // Keep last 20

      // Notify callback
      for (const alert of newAlerts) {
        onAlertRef.current?.(alert);
      }

      // Save critical/warning alerts as supervision facts (async, non-blocking)
      for (const alert of newAlerts) {
        if (alert.severity !== 'info') {
          saveSupervisionFact(alert).catch(err => {
            console.warn('[Supervision] Failed to save fact:', err);
          });
        }
      }
    }
  }, [enabled, alertThreshold]);

  // Subscribe to terminal events
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = terminalObserver.subscribe(evaluateEvent);
    return unsubscribe;
  }, [enabled, evaluateEvent]);

  // Dismiss an alert
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, dismissed: true } : a));
  }, []);

  // Dismiss all alerts
  const dismissAll = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, dismissed: true })));
  }, []);

  return {
    alerts: alerts.filter(a => !a.dismissed),
    allAlerts: alerts,
    dismissAlert,
    dismissAll,
  };
}

// ============================================================================
// Save supervision fact to DB
// ============================================================================

async function saveSupervisionFact(alert: SupervisionAlert): Promise<void> {
  try {
    await fetch('/api/johnny5/supervision-facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'goal', // 'supervision' not in ExtractedFact type union; 'goal' is closest match
        key: `supervision_${alert.type}_${Date.now()}`,
        value: `[${alert.severity}] ${alert.message}${alert.details ? ': ' + alert.details.slice(0, 100) : ''}`,
        confidence: alert.severity === 'critical' ? 0.95 : 0.8,
      }),
    });
  } catch {
    // Non-blocking, just log
  }
}
