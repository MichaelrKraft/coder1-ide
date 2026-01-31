/**
 * Johnny5 Security Tracker Service
 *
 * Tracks security events, audit logs, and prompt injection detection.
 * This is a KEY DIFFERENTIATOR for Coder1 - visibility into AI actions.
 */

import fs from 'fs';
import path from 'path';
import type {
  Johnny5AuditEntry,
  Johnny5SecurityWarning,
  Johnny5PromptInjectionAlert,
  Johnny5Permission,
} from '@/types/johnny5';

// Storage paths
const DATA_DIR = path.join(process.cwd(), 'data', 'johnny5');
const AUDIT_FILE = path.join(DATA_DIR, 'audit-log.json');
const WARNINGS_FILE = path.join(DATA_DIR, 'security-warnings.json');
const ALERTS_FILE = path.join(DATA_DIR, 'prompt-injection-alerts.json');

// In-memory caches
let auditCache: Johnny5AuditEntry[] = [];
let warningsCache: Johnny5SecurityWarning[] = [];
let alertsCache: Johnny5PromptInjectionAlert[] = [];
let cacheLoaded = false;

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
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load all security data from files
 */
function loadSecurityData(): void {
  if (cacheLoaded) return;

  ensureDataDir();

  // Load audit log
  if (fs.existsSync(AUDIT_FILE)) {
    try {
      const data = fs.readFileSync(AUDIT_FILE, 'utf-8');
      auditCache = JSON.parse(data).map((entry: Johnny5AuditEntry) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
    } catch (error) {
      console.error('[SecurityTracker] Failed to load audit log:', error);
      auditCache = [];
    }
  }

  // Load warnings
  if (fs.existsSync(WARNINGS_FILE)) {
    try {
      const data = fs.readFileSync(WARNINGS_FILE, 'utf-8');
      warningsCache = JSON.parse(data).map((warning: Johnny5SecurityWarning) => ({
        ...warning,
        timestamp: new Date(warning.timestamp),
      }));
    } catch (error) {
      console.error('[SecurityTracker] Failed to load warnings:', error);
      warningsCache = [];
    }
  }

  // Load alerts
  if (fs.existsSync(ALERTS_FILE)) {
    try {
      const data = fs.readFileSync(ALERTS_FILE, 'utf-8');
      alertsCache = JSON.parse(data).map((alert: Johnny5PromptInjectionAlert) => ({
        ...alert,
        timestamp: new Date(alert.timestamp),
      }));
    } catch (error) {
      console.error('[SecurityTracker] Failed to load alerts:', error);
      alertsCache = [];
    }
  }

  cacheLoaded = true;
}

/**
 * Save audit log to file
 */
function saveAuditLog(): void {
  ensureDataDir();
  try {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditCache.slice(-1000), null, 2)); // Keep last 1000
  } catch (error) {
    console.error('[SecurityTracker] Failed to save audit log:', error);
  }
}

/**
 * Save warnings to file
 */
function saveWarnings(): void {
  ensureDataDir();
  try {
    fs.writeFileSync(WARNINGS_FILE, JSON.stringify(warningsCache, null, 2));
  } catch (error) {
    console.error('[SecurityTracker] Failed to save warnings:', error);
  }
}

/**
 * Save alerts to file
 */
function saveAlerts(): void {
  ensureDataDir();
  try {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alertsCache.slice(-100), null, 2)); // Keep last 100
  } catch (error) {
    console.error('[SecurityTracker] Failed to save alerts:', error);
  }
}

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Log an audit entry
 */
export function logAuditEntry(params: {
  action: Johnny5AuditEntry['action'];
  target: string;
  source: Johnny5AuditEntry['source'];
  reasoning?: string;
  risk?: Johnny5AuditEntry['risk'];
  blocked?: boolean;
  blockReason?: string;
  sessionId?: string;
}): Johnny5AuditEntry {
  loadSecurityData();

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

  auditCache.push(entry);
  setImmediate(() => saveAuditLog());

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
export function addSecurityWarning(params: {
  type: Johnny5SecurityWarning['type'];
  message: string;
  severity: Johnny5SecurityWarning['severity'];
  source?: string;
}): Johnny5SecurityWarning {
  loadSecurityData();

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
  setImmediate(() => saveWarnings());

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
export function checkForPromptInjection(text: string, source: Johnny5PromptInjectionAlert['source']): Johnny5PromptInjectionAlert | null {
  loadSecurityData();

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
      setImmediate(() => saveAlerts());

      // Also add a security warning
      addSecurityWarning({
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
export function getAuditLog(params: {
  limit?: number;
  action?: Johnny5AuditEntry['action'];
  risk?: Johnny5AuditEntry['risk'];
  blocked?: boolean;
}): Johnny5AuditEntry[] {
  loadSecurityData();

  let filtered = [...auditCache];

  if (params.action) {
    filtered = filtered.filter(e => e.action === params.action);
  }

  if (params.risk) {
    filtered = filtered.filter(e => e.risk === params.risk);
  }

  if (params.blocked !== undefined) {
    filtered = filtered.filter(e => e.blocked === params.blocked);
  }

  // Sort by timestamp descending
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (params.limit) {
    filtered = filtered.slice(0, params.limit);
  }

  return filtered;
}

/**
 * Get security warnings
 */
export function getSecurityWarnings(includeDismissed: boolean = false): Johnny5SecurityWarning[] {
  loadSecurityData();

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
  loadSecurityData();

  const warning = warningsCache.find(w => w.id === warningId);
  if (warning) {
    warning.dismissed = true;
    setImmediate(() => saveWarnings());
    return true;
  }
  return false;
}

/**
 * Get prompt injection alerts
 */
export function getPromptInjectionAlerts(limit: number = 20): Johnny5PromptInjectionAlert[] {
  loadSecurityData();

  const sorted = [...alertsCache].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return sorted.slice(0, limit);
}

/**
 * Calculate security score (0-100)
 */
export function calculateSecurityScore(): {
  score: number;
  status: 'good' | 'warning' | 'critical';
} {
  loadSecurityData();

  let score = 100;

  // Deduct for recent high-risk actions
  const recentHighRisk = auditCache.filter(e =>
    e.risk === 'high' &&
    e.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
  );
  score -= recentHighRisk.length * 5;

  // Deduct for blocked actions
  const recentBlocked = auditCache.filter(e =>
    e.blocked &&
    e.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
  );
  score -= recentBlocked.length * 10;

  // Deduct for active warnings
  const activeWarnings = warningsCache.filter(w => !w.dismissed);
  score -= activeWarnings.length * 8;

  // Deduct for prompt injection alerts
  const recentAlerts = alertsCache.filter(a =>
    a.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
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
  auditCache = [];
  warningsCache = [];
  alertsCache = [];
  cacheLoaded = true;
  saveAuditLog();
  saveWarnings();
  saveAlerts();
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
