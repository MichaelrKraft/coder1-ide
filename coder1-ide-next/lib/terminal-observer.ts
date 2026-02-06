'use client';

import { getSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

// ============================================================================
// Types
// ============================================================================

export interface TerminalEvent {
  type: 'error' | 'file_change' | 'command' | 'completion' | 'session_start' | 'session_end';
  summary: string;
  details?: string;
  timestamp: number;
  sessionId: string;
}

export type TerminalEventCallback = (event: TerminalEvent) => void;

interface RingBufferEntry {
  line: string;
  sessionId: string;
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RING_BUFFER = 200;
const PROCESS_INTERVAL_MS = 1000;

// ============================================================================
// ANSI Stripping
// ============================================================================

/**
 * Strip all ANSI escape codes and control characters from terminal data.
 * Matches patterns used server-side in server.js.
 */
function stripAnsi(text: string): string {
  return text
    // ANSI escape sequences: \x1b[<params><letter>
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    // CSI sequences with tilde: \x1b[<params>~
    .replace(/\x1b\[[0-9;]*~/g, '')
    // Bracketed paste markers
    .replace(/\x1b\[200~/g, '')
    .replace(/\x1b\[201~/g, '')
    // OSC sequences (terminal title, etc.)
    .replace(/\x1b\]0;[^\x07]*\x07/g, '')
    // Cursor show/hide
    .replace(/\x1b\[\?[0-9]+[hl]/g, '')
    // Carriage returns (not followed by newline)
    .replace(/\r(?!\n)/g, '')
    // Normalize \r\n to \n
    .replace(/\r\n/g, '\n');
}

// ============================================================================
// Sensitive Data Filtering
// ============================================================================

/** Pattern that matches lines containing secrets (case-insensitive). */
const SENSITIVE_PATTERN = /(?:key|token|password|secret|api_key)\s*=/i;

/** Returns true if a line contains control characters other than \n, \r, \t. */
function hasBinaryContent(line: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(line);
}

// ============================================================================
// Event Detection (Pattern Matching)
// ============================================================================

function detectEvents(lines: string[], sessionId: string): TerminalEvent[] {
  const events: TerminalEvent[] = [];
  const now = Date.now();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // --- Error detection ---
    if (
      /^(Error|ERROR|error):/.test(trimmed) ||
      /^(SyntaxError|TypeError|ReferenceError|RangeError):/.test(trimmed) ||
      /^npm ERR!/.test(trimmed) ||
      /^(Build failed|Compilation failed)/i.test(trimmed) ||
      /exit(ed with)? code [1-9]/i.test(trimmed)
    ) {
      events.push({
        type: 'error',
        summary: trimmed.substring(0, 120),
        details: trimmed,
        timestamp: now,
        sessionId,
      });
      continue;
    }

    // Stack trace lines
    if (/^ {4}at /.test(line)) {
      events.push({
        type: 'error',
        summary: 'Stack trace detected',
        details: trimmed,
        timestamp: now,
        sessionId,
      });
      continue;
    }

    // FAIL (but not "FAILED to" which is informational)
    if (/\bFAIL\b/.test(trimmed) && !/FAILED to/i.test(trimmed)) {
      events.push({
        type: 'error',
        summary: trimmed.substring(0, 120),
        details: trimmed,
        timestamp: now,
        sessionId,
      });
      continue;
    }

    // --- File change detection ---
    if (
      /^(Created|Modified|Deleted) file/i.test(trimmed) ||
      /^(created|modified|deleted):/i.test(trimmed)
    ) {
      events.push({
        type: 'file_change',
        summary: trimmed.substring(0, 120),
        details: trimmed,
        timestamp: now,
        sessionId,
      });
      continue;
    }

    // Common file path patterns from Claude Code output
    if (/^(src|components|lib|app|pages)\/\S+/.test(trimmed)) {
      events.push({
        type: 'file_change',
        summary: `File referenced: ${trimmed.substring(0, 80)}`,
        details: trimmed,
        timestamp: now,
        sessionId,
      });
      continue;
    }

    // --- Command detection ---
    if (/^\$ /.test(trimmed)) {
      events.push({
        type: 'command',
        summary: trimmed.substring(0, 120),
        details: trimmed,
        timestamp: now,
        sessionId,
      });
      continue;
    }

    if (/^(Running|Executing):/i.test(trimmed)) {
      events.push({
        type: 'command',
        summary: trimmed.substring(0, 120),
        details: trimmed,
        timestamp: now,
        sessionId,
      });
      continue;
    }

    if (/^(npm|yarn|pnpm|npx|git)\s/.test(trimmed)) {
      events.push({
        type: 'command',
        summary: trimmed.substring(0, 120),
        details: trimmed,
        timestamp: now,
        sessionId,
      });
      continue;
    }

    // --- Completion detection ---
    if (
      /^Done in /i.test(trimmed) ||
      /^Task complete/i.test(trimmed) ||
      /^(completed|finished)/i.test(trimmed) ||
      /[✓✔]/.test(trimmed)
    ) {
      events.push({
        type: 'completion',
        summary: trimmed.substring(0, 120),
        details: trimmed,
        timestamp: now,
        sessionId,
      });
      continue;
    }

    // --- Claude Code session detection ---
    if (/^╭─/.test(trimmed) || /Welcome to Claude/i.test(trimmed)) {
      events.push({
        type: 'session_start',
        summary: 'Claude Code session started',
        details: trimmed,
        timestamp: now,
        sessionId,
      });
      continue;
    }

    if (/^Goodbye/i.test(trimmed) || /session ended/i.test(trimmed)) {
      events.push({
        type: 'session_end',
        summary: 'Claude Code session ended',
        details: trimmed,
        timestamp: now,
        sessionId,
      });
      continue;
    }
  }

  return events;
}

// ============================================================================
// Main Observer Class
// ============================================================================

class TerminalObserver {
  private ringBuffer: RingBufferEntry[] = [];
  private subscribers: Set<TerminalEventCallback> = new Set();
  private connected = false;
  private claudeMode: Map<string, 'interactive' | 'normal'> = new Map();
  private lastProcessTime = 0;
  private pendingData = '';
  private socket: Socket | null = null;

  // Bound handlers for proper cleanup
  private boundHandleTerminalData: ((payload: { id: string; data: string }) => void) | null = null;
  private boundHandleClaudeMode: ((payload: { sessionId: string; mode: 'interactive' | 'normal' }) => void) | null = null;

  /**
   * Connect to Socket.IO and begin observing terminal events.
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      this.socket = await getSocket();

      this.boundHandleTerminalData = (payload) => this.handleTerminalData(payload);
      this.boundHandleClaudeMode = (payload) => {
        this.claudeMode.set(payload.sessionId, payload.mode);
      };

      this.socket.on('terminal:data', this.boundHandleTerminalData);
      this.socket.on('claude:mode:changed', this.boundHandleClaudeMode);

      this.connected = true;
      console.log('[TerminalObserver] Connected and listening for terminal events');
    } catch (err) {
      console.error('[TerminalObserver] Failed to connect:', err);
    }
  }

  /**
   * Disconnect from Socket.IO and remove all listeners.
   */
  disconnect(): void {
    if (this.socket) {
      if (this.boundHandleTerminalData) {
        this.socket.off('terminal:data', this.boundHandleTerminalData);
      }
      if (this.boundHandleClaudeMode) {
        this.socket.off('claude:mode:changed', this.boundHandleClaudeMode);
      }
    }

    this.boundHandleTerminalData = null;
    this.boundHandleClaudeMode = null;
    this.connected = false;
    this.pendingData = '';
    this.socket = null;
    console.log('[TerminalObserver] Disconnected');
  }

  /**
   * Subscribe to terminal events. Returns an unsubscribe function.
   */
  subscribe(cb: TerminalEventCallback): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  /**
   * Return the last N lines from the ring buffer (default 20).
   */
  getRecentLines(n = 20): string[] {
    const start = Math.max(0, this.ringBuffer.length - n);
    return this.ringBuffer.slice(start).map((entry) => entry.line);
  }

  /**
   * Return recent lines as a single string, capped at maxChars (default 2000).
   */
  getRecentContext(maxChars = 2000): string {
    const lines = this.getRecentLines(40); // grab more and trim by chars
    let result = '';
    // Build from most recent backward to prioritize latest output
    for (let i = lines.length - 1; i >= 0; i--) {
      const candidate = lines[i] + '\n' + result;
      if (candidate.length > maxChars) break;
      result = candidate;
    }
    return result.trim();
  }

  /**
   * Check if Claude Code is in interactive mode for a given session.
   */
  isClaudeActive(sessionId: string): boolean {
    return this.claudeMode.get(sessionId) === 'interactive';
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private handleTerminalData(payload: { id: string; data: string }): void {
    const { id: sessionId, data } = payload;
    if (!data) return;

    // Strip ANSI codes
    const clean = stripAnsi(data);

    // Append to pending buffer (handle incomplete lines)
    this.pendingData += clean;

    // Rate-limit processing to once per second
    const now = Date.now();
    if (now - this.lastProcessTime >= PROCESS_INTERVAL_MS) {
      this.lastProcessTime = now;
      this.processBuffer(sessionId);
    } else {
      // Schedule a deferred processing if we haven't processed yet
      // This ensures the last chunk of data always gets processed
      setTimeout(() => {
        if (this.pendingData.length > 0) {
          this.processBuffer(sessionId);
        }
      }, PROCESS_INTERVAL_MS);
    }
  }

  private processBuffer(sessionId: string): void {
    if (this.pendingData.length === 0) return;

    // Split into lines; keep incomplete last line in pendingData
    const parts = this.pendingData.split('\n');
    let completeLines: string[];

    if (this.pendingData.endsWith('\n')) {
      completeLines = parts.filter((l) => l.length > 0);
      this.pendingData = '';
    } else {
      // Last element is an incomplete line — keep it pending
      this.pendingData = parts[parts.length - 1];
      completeLines = parts.slice(0, -1).filter((l) => l.length > 0);
    }

    if (completeLines.length === 0) return;

    const now = Date.now();
    const filteredLines: string[] = [];

    for (const line of completeLines) {
      // Skip binary content
      if (hasBinaryContent(line)) continue;
      // Redact sensitive data
      if (SENSITIVE_PATTERN.test(line)) continue;

      filteredLines.push(line);

      // Add to ring buffer
      this.ringBuffer.push({ line, sessionId, timestamp: now });
    }

    // Evict oldest entries if buffer exceeded
    while (this.ringBuffer.length > MAX_RING_BUFFER) {
      this.ringBuffer.shift();
    }

    // Detect events and notify subscribers
    if (filteredLines.length > 0) {
      const events = detectEvents(filteredLines, sessionId);
      if (events.length > 0) {
        this.notifySubscribers(events);
      }
    }
  }

  private notifySubscribers(events: TerminalEvent[]): void {
    for (const event of events) {
      for (const cb of this.subscribers) {
        try {
          cb(event);
        } catch (err) {
          console.error('[TerminalObserver] Subscriber error:', err);
        }
      }
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const terminalObserver = new TerminalObserver();
