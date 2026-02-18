/**
 * Johnny5 Security Tracker Service
 *
 * Tracks security events, audit logs, and prompt injection detection.
 * This is a KEY DIFFERENTIATOR for Coder1 - visibility into AI actions.
 *
 * Now uses SQLite database instead of file-based storage.
 */

import {
  initializeDb,
  logAudit as dbLogAudit,
  getAuditLog as dbGetAuditLog,
  saveSecurityWarning as dbSaveSecurityWarning,
  getSecurityWarnings as dbGetSecurityWarnings,
  getInjectionAlerts as dbGetInjectionAlerts,  // ADD THIS LINE
} from '@/lib/johnny5-db';
import type {
  Johnny5AuditEntry,
  Johnny5SecurityWarning,
  Johnny5PromptInjectionAlert,
  Johnny5Permission,
} from '@/types/johnny5';

// In-memory caches for data not stored in DB
let warningsCache: Johnny5SecurityWarning[] = [];
let alertsCache: Johnny5PromptInjectionAlert[] = [];

// Prompt injection patterns to detect
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+instructions/i,
  /disregard\s+(previous|all|above)/i,
  /you\s+are\s+now\s+in\s+\w+\s+mode/i,
  /new\s+instructions:/i,
  /forget\s+everything/i,
  /system\s*:\s*you\s+are/i,
  /\[SYSTEM\]/i,
  /override\s+safety/i,
  /jailbreak/i,
  /DAN\s+mode/i,
];

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Log an audit entry
 */
export async function logAuditEntry(params: {
  action: Johnny5AuditEntry['action'];
  target: string;
  source: Johnny5AuditEntry['source'];
  reasoning?: string;
  risk?: Johnny5AuditEntry['risk'];
  blocked?: boolean;
  blockReason?: string;
  sessionId?: string;
}): Promise<Johnny5AuditEntry> {
  await initializeDb();

  const entry: Johnny5AuditEntry = {
    id: generateId('audit'),
    timestamp: new Date(),
    action: params.action,
    target: params.target,
    source: params.source,
    reasoning: params.reasoning,
    risk: params.risk || 'low',
    blocked: params.blocked || false,
    blockReason: params.blockReason,
    sessionId: params.sessionId,
  };

  // Log to DB
  await dbLogAudit(params.action, {
    target: params.target,
    source: params.source,
    reasoning: params.reasoning,
    risk: params.risk || 'low',
    blocked: params.blocked || false,
    blockReason: params.blockReason,
    sessionId: params.sessionId,
  });

  console.log('[SecurityTracker] Audit entry:', {
    action: entry.action,
    target: entry.target,
    risk: entry.risk,
    blocked: entry.blocked,
  });

  return entry;
}

/**
 * Add a security warning
 */
export async function addSecurityWarning(params: {
  type: Johnny5SecurityWarning['type'];
  message: string;
  severity: Johnny5SecurityWarning['severity'];
  source?: string;
}): Promise<Johnny5SecurityWarning> {
  await initializeDb();
  await initializeCaches();

  const warning: Johnny5SecurityWarning = {
    id: generateId('warning'),
    type: params.type,
    message: params.message,
    severity: params.severity,
    timestamp: new Date(),
    dismissed: false,
    source: params.source,
  };

  warningsCache.push(warning);

  // Persist to DB
  await dbSaveSecurityWarning(warning);

  // Also log to audit
  await dbLogAudit('security_warning', {
    type: params.type,
    message: params.message,
    severity: params.severity,
    source: params.source,
  });

  console.log('[SecurityTracker] Warning added:', {
    type: warning.type,
    severity: warning.severity,
    message: warning.message,
  });

  return warning;
}

/**
 * Check text for prompt injection patterns
 */
export async function checkForPromptInjection(
  text: string,
  source: Johnny5PromptInjectionAlert['source']
): Promise<Johnny5PromptInjectionAlert | null> {
  await initializeDb();
  await initializeCaches();

  for (const pattern of INJECTION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const alert: Johnny5PromptInjectionAlert = {
        id: generateId('injection'),
        timestamp: new Date(),
        pattern: pattern.toString(),
        text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        source,
        severity: 'high',
        blocked: true,
        actionTaken: 'Input blocked and logged',
      };

      alertsCache.push(alert);

      // Log to DB
      await dbLogAudit('prompt_injection_detected', {
        pattern: pattern.toString(),
        source,
        severity: 'high',
        blocked: true,
        textPreview: alert.text,
      });

      // Also add a security warning
      await addSecurityWarning({
        type: 'suspicious_activity',
        message: `Potential prompt injection detected from ${source}`,
        severity: 'high',
        source,
      });

      console.log('[SecurityTracker] Prompt injection detected:', {
        pattern: pattern.toString(),
        source,
      });

      return alert;
    }
  }

  return null;
}

/**
 * Get audit log entries
 */
export async function getAuditLog(params: {
  limit?: number;
  action?: Johnny5AuditEntry['action'];
  risk?: Johnny5AuditEntry['risk'];
  blocked?: boolean;
}): Promise<Johnny5AuditEntry[]> {
  await initializeDb();

  const limit = params.limit || 100;
  const dbEntries = await dbGetAuditLog(limit);

  // Convert DB entries to Johnny5AuditEntry format
  let entries: Johnny5AuditEntry[] = dbEntries.map(e => {
    const details = e.details as {
      target?: string;
      source?: string;
      reasoning?: string;
      risk?: string;
      blocked?: boolean;
      blockReason?: string;
      sessionId?: string;
    } | null;

    return {
      id: e.id,
      timestamp: new Date(e.timestamp),
      action: e.action as Johnny5AuditEntry['action'],
      target: details?.target || 'unknown',
      source: (details?.source || 'system') as Johnny5AuditEntry['source'],
      reasoning: details?.reasoning,
      risk: (details?.risk || 'low') as Johnny5AuditEntry['risk'],
      blocked: details?.blocked || false,
      blockReason: details?.blockReason,
      sessionId: details?.sessionId,
    };
  });

  // Apply filters
  if (params.action) {
    entries = entries.filter(e => e.action === params.action);
  }

  if (params.risk) {
    entries = entries.filter(e => e.risk === params.risk);
  }

  if (params.blocked !== undefined) {
    entries = entries.filter(e => e.blocked === params.blocked);
  }

  // Sort by timestamp descending
  entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return entries;
}

/**
 * Get security warnings
 */
export function getSecurityWarnings(includeDismissed: boolean = false): Johnny5SecurityWarning[] {
  let warnings = [...warningsCache];

  if (!includeDismissed) {
    warnings = warnings.filter(w => !w.dismissed);
  }

  // Sort by timestamp descending
  warnings.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return warnings;
}

/**
 * Dismiss a security warning
 */
export function dismissWarning(warningId: string): boolean {
  const warning = warningsCache.find(w => w.id === warningId);
  if (warning) {
    warning.dismissed = true;
    return true;
  }
  return false;
}

/**
 * Get prompt injection alerts
 */
export function getPromptInjectionAlerts(limit: number = 20): Johnny5PromptInjectionAlert[] {
  const sorted = [...alertsCache].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return sorted.slice(0, limit);
}

/**
 * Calculate security score (0-100)
 */
export async function calculateSecurityScore(): Promise<{
  score: number;
  status: 'good' | 'warning' | 'critical';
}> {
  await initializeDb();

  let score = 100;

  // Get recent audit entries from DB
  const auditEntries = await dbGetAuditLog(100);
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  // Deduct for recent high-risk actions
  const recentHighRisk = auditEntries.filter(e => {
    const details = e.details as { risk?: string } | null;
    const entryTime = new Date(e.timestamp).getTime();
    return details?.risk === 'high' && entryTime > oneDayAgo;
  });
  score -= recentHighRisk.length * 5;

  // Deduct for blocked actions
  const recentBlocked = auditEntries.filter(e => {
    const details = e.details as { blocked?: boolean } | null;
    const entryTime = new Date(e.timestamp).getTime();
    return details?.blocked && entryTime > oneDayAgo;
  });
  score -= recentBlocked.length * 10;

  // Deduct for active warnings (from in-memory cache)
  const activeWarnings = warningsCache.filter(w => !w.dismissed);
  score -= activeWarnings.length * 8;

  // Deduct for prompt injection alerts (from in-memory cache)
  const recentAlerts = alertsCache.filter(a =>
    a.timestamp.getTime() > oneDayAgo
  );
  score -= recentAlerts.length * 15;

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  let status: 'good' | 'warning' | 'critical' = 'good';
  if (score < 50) {
    status = 'critical';
  } else if (score < 75) {
    status = 'warning';
  }

  return { score, status };
}

/**
 * Get default permissions list
 */
export function getDefaultPermissions(): Johnny5Permission[] {
  return [
    {
      id: 'perm_file_read',
      name: 'File Read',
      type: 'file_read',
      scope: '~/projects/*',
      status: 'allowed',
      grantedAt: new Date(),
    },
    {
      id: 'perm_file_write',
      name: 'File Write',
      type: 'file_write',
      scope: '~/projects/*',
      status: 'allowed',
      grantedAt: new Date(),
    },
    {
      id: 'perm_terminal',
      name: 'Terminal Execution',
      type: 'terminal_exec',
      scope: 'npm, git, node',
      status: 'allowed',
      grantedAt: new Date(),
    },
    {
      id: 'perm_network',
      name: 'Network Access',
      type: 'network',
      scope: 'api.anthropic.com',
      status: 'allowed',
      grantedAt: new Date(),
    },
    {
      id: 'perm_system',
      name: 'System Commands',
      type: 'system',
      scope: 'shutdown, rm -rf /',
      status: 'blocked',
      grantedAt: new Date(),
    },
  ];
}

/**
 * Clear all security data (for testing)
 */
export function clearSecurityData(): void {
  warningsCache = [];
  alertsCache = [];
  console.log('[SecurityTracker] Caches cleared');
}

/**
 * Load caches from SQLite on startup (called lazily on first use)
 */
let cachesInitialized = false;

async function initializeCaches(): Promise<void> {
  if (cachesInitialized) return;
  cachesInitialized = true;

  try {
    // Restore warningsCache
    const storedWarnings = await dbGetSecurityWarnings(500);
    warningsCache = storedWarnings.map(w => ({
      id: w.id,
      type: w.type as Johnny5SecurityWarning['type'],
      message: w.message,
      severity: w.severity as Johnny5SecurityWarning['severity'],
      timestamp: new Date(w.timestamp),
      dismissed: w.dismissed,
      source: w.source,
    }));

    // Restore alertsCache
    const storedAlerts = await dbGetInjectionAlerts(200);
    alertsCache = storedAlerts.map(a => ({
      id: a.id,
      timestamp: new Date(a.timestamp),
      pattern: a.pattern,
      text: a.text,
      source: a.source as Johnny5PromptInjectionAlert['source'],
      severity: a.severity as Johnny5PromptInjectionAlert['severity'],
      blocked: a.blocked,
      actionTaken: a.actionTaken,
    }));

    console.log(`[SecurityTracker] Restored ${warningsCache.length} warnings, ${alertsCache.length} alerts from DB`);
  } catch (err) {
    cachesInitialized = false; // Allow retry on next call
    console.warn('[SecurityTracker] Failed to restore caches from DB:', err);
  }
}

// Export singleton-style functions
export const SecurityTracker = {
  logAuditEntry,
  addSecurityWarning,
  checkForPromptInjection,
  getAuditLog,
  getSecurityWarnings,
  dismissWarning,
  getPromptInjectionAlerts,
  calculateSecurityScore,
  getDefaultPermissions,
  clearSecurityData,
};

export default SecurityTracker;
