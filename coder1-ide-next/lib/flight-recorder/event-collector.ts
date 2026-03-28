/**
 * EventCollector — Client-side ring buffer that batches Flight Recorder events
 * and flushes them to the server via fetch / sendBeacon.
 */

import type { FlightEvent, FlightEventType, FlightEventBatch } from './types';
import { secretScrubber } from './scrubber';
import { gitDetector } from './git-detector';

const DEFAULT_MAX_BUFFER = 500;
const DEFAULT_FLUSH_THRESHOLD = 200;
const DEFAULT_FLUSH_INTERVAL_MS = 3000;
const TERMINAL_COALESCE_MS = 100;
const MAX_OFFLINE_QUEUE_BYTES = 5 * 1024 * 1024; // 5MB

interface CollectorStats {
  bufferedEvents: number;
  totalRecorded: number;
  isPaused: boolean;
  isRecording: boolean;
  hasError: boolean;
}

class EventCollector {
  private buffer: FlightEvent[] = [];
  private sessionId: string | null = null;
  private isActive = false;
  private paused = false;
  private error = false;
  private totalRecorded = 0;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private pendingTerminalOutput = '';
  private terminalCoalesceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTerminalOutputHash = '';
  private terminalRepeatCount = 0;
  private offlineQueueBytes = 0;
  private maxBuffer: number;
  private flushThreshold: number;
  private flushIntervalMs: number;
  private inPasswordMode = false;

  constructor(
    maxBuffer = DEFAULT_MAX_BUFFER,
    flushThreshold = DEFAULT_FLUSH_THRESHOLD,
    flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS,
  ) {
    this.maxBuffer = maxBuffer;
    this.flushThreshold = flushThreshold;
    this.flushIntervalMs = flushIntervalMs;
  }

  startSession(sessionId: string): void {
    this.sessionId = sessionId;
    this.isActive = true;
    this.paused = false;
    this.error = false;
    this.totalRecorded = 0;
    this.buffer = [];

    this.record('session:start', { sessionId });
    this.flushTimer = setInterval(() => this.flush('interval'), this.flushIntervalMs);

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  endSession(): void {
    if (!this.isActive) return;
    this.flushPendingTerminalOutput();
    this.record('session:end', { sessionId: this.sessionId });
    this.flush('session_end');

    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
    this.isActive = false;
    this.sessionId = null;

    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  pause(): void {
    if (!this.isActive || this.paused) return;
    this.paused = true;
    this.record('recording:paused', {});
  }

  resume(): void {
    if (!this.isActive || !this.paused) return;
    this.paused = false;
    this.record('recording:resumed', {});
  }

  record(type: FlightEventType, data: Record<string, unknown>, searchableText?: string): void {
    if (!this.isActive || (this.paused && type !== 'recording:paused' && type !== 'recording:resumed' && type !== 'session:end')) return;

    // Handle terminal output coalescing + password detection
    if (type === 'terminal:output') {
      if (typeof data.output === 'string') {
        this.inPasswordMode = secretScrubber.isPasswordPrompt(data.output);
      }
      this.coalesceTerminalOutput(data, searchableText);
      return;
    }

    // Suppress terminal input during password prompts
    if (type === 'terminal:input' && this.inPasswordMode) return;

    // Flush any pending terminal output before non-terminal events
    if (!type.startsWith('terminal:')) {
      this.flushPendingTerminalOutput();
    }

    // Scrub searchable text
    const scrubbedSearch = searchableText ? secretScrubber.scrub(searchableText).text : undefined;

    const event: FlightEvent = {
      id: crypto.randomUUID(),
      type,
      clientTimestamp: Date.now(),
      sessionId: this.sessionId || '',
      data,
      searchableText: scrubbedSearch,
    };

    this.pushToBuffer(event);
  }

  getStats(): CollectorStats {
    return {
      bufferedEvents: this.buffer.length,
      totalRecorded: this.totalRecorded,
      isPaused: this.paused,
      isRecording: this.isActive,
      hasError: this.error,
    };
  }

  // --- Private methods ---

  private coalesceTerminalOutput(data: Record<string, unknown>, searchableText?: string): void {
    const output = typeof data.output === 'string' ? data.output : '';

    // Deduplicate repeated identical lines
    const outputHash = output.trim();
    if (outputHash === this.lastTerminalOutputHash && outputHash.length > 0) {
      this.terminalRepeatCount++;
      return; // Skip duplicate
    }

    // Flush any repeated line with count
    if (this.terminalRepeatCount > 0) {
      this.pendingTerminalOutput += `\n[repeated ${this.terminalRepeatCount + 1} times]`;
      this.terminalRepeatCount = 0;
    }
    this.lastTerminalOutputHash = outputHash;

    this.pendingTerminalOutput += output;

    // Reset coalesce timer
    if (this.terminalCoalesceTimer) clearTimeout(this.terminalCoalesceTimer);
    this.terminalCoalesceTimer = setTimeout(() => {
      this.flushPendingTerminalOutput();
    }, TERMINAL_COALESCE_MS);
  }

  private flushPendingTerminalOutput(): void {
    if (!this.pendingTerminalOutput) return;
    if (this.terminalCoalesceTimer) {
      clearTimeout(this.terminalCoalesceTimer);
      this.terminalCoalesceTimer = null;
    }

    const output = this.pendingTerminalOutput;
    this.pendingTerminalOutput = '';

    const searchable = output.substring(0, 500);
    const scrubbedSearch = secretScrubber.scrub(searchable).text;

    const event: FlightEvent = {
      id: crypto.randomUUID(),
      type: 'terminal:output',
      clientTimestamp: Date.now(),
      sessionId: this.sessionId || '',
      data: { output },
      searchableText: scrubbedSearch,
    };

    this.pushToBuffer(event);

    // Auto-detect git events from terminal output
    const commitInfo = gitDetector.detectCommit(output);
    if (commitInfo) {
      this.pushToBuffer({
        id: crypto.randomUUID(),
        type: 'git:commit',
        clientTimestamp: Date.now(),
        sessionId: this.sessionId || '',
        data: { hash: commitInfo.hash, message: commitInfo.message, branch: commitInfo.branch },
        searchableText: commitInfo.message,
      });
    }

    const branchInfo = gitDetector.detectBranchSwitch(output);
    if (branchInfo) {
      this.pushToBuffer({
        id: crypto.randomUUID(),
        type: 'git:branch',
        clientTimestamp: Date.now(),
        sessionId: this.sessionId || '',
        data: { branch: branchInfo.branch },
        searchableText: branchInfo.branch,
      });
    }
  }

  private pushToBuffer(event: FlightEvent): void {
    // Ring buffer: drop oldest if at capacity
    if (this.buffer.length >= this.maxBuffer) {
      this.buffer.shift();
    }
    this.buffer.push(event);
    this.totalRecorded++;

    // Auto-flush when threshold hit
    if (this.buffer.length >= this.flushThreshold) {
      this.flush('buffer_full');
    }
  }

  private async flush(reason: FlightEventBatch['flushReason']): Promise<void> {
    if (this.buffer.length === 0 || !this.sessionId) return;

    const events = [...this.buffer];
    this.buffer = [];

    const batch: FlightEventBatch = {
      sessionId: this.sessionId,
      events,
      flushReason: reason,
    };

    try {
      const response = await fetch('/api/flight-recorder/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        this.error = true;
        // Re-queue events if offline (up to limit)
        this.requeue(events);
      } else {
        this.error = false;
        this.offlineQueueBytes = 0;
      }
    } catch {
      this.error = true;
      this.requeue(events);
    }
  }

  private requeue(events: FlightEvent[]): void {
    const serialized = JSON.stringify(events);
    if (this.offlineQueueBytes + serialized.length > MAX_OFFLINE_QUEUE_BYTES) return;
    this.offlineQueueBytes += serialized.length;

    for (const event of events) {
      if (this.buffer.length < this.maxBuffer) {
        this.buffer.push(event);
      }
    }
  }

  private handleBeforeUnload = (): void => {
    if (this.buffer.length === 0 || !this.sessionId) return;

    const batch: FlightEventBatch = {
      sessionId: this.sessionId,
      events: this.buffer,
      flushReason: 'beforeunload',
    };

    // sendBeacon is fire-and-forget, survives page unload
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/flight-recorder/events',
        JSON.stringify(batch),
      );
    }
  };
}

export const eventCollector = new EventCollector();
