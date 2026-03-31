/**
 * FlightRecorderWriter — Server-side event processor.
 * Receives event batches, scrubs secrets, extracts searchable text,
 * and persists via FlightRecorderStorage.
 */

import type { FlightEvent, FlightEventBatch } from './types';
import { secretScrubber } from './scrubber';
import crypto from 'crypto';

const TERMINAL_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface ProcessResult {
  processed: number;
  secretsDetected: boolean;
}

function getStorage() {
  const { FlightRecorderStorage } = require('./storage');
  return FlightRecorderStorage.getInstance();
}

class FlightRecorderWriter {
  private lastSnapshotTime: Map<string, number> = new Map();
  // Maps IDE sessionId → flight session UUID
  private sessionMap: Map<string, string> = new Map();
  private static instance: FlightRecorderWriter | null = null;

  static getInstance(): FlightRecorderWriter {
    if (!FlightRecorderWriter.instance) {
      FlightRecorderWriter.instance = new FlightRecorderWriter();
    }
    return FlightRecorderWriter.instance;
  }

  async processBatch(batch: FlightEventBatch): Promise<ProcessResult> {
    const storage = getStorage();
    let secretsDetected = false;

    // Map IDE session ID to a unique flight session ID
    let flightSessionId = this.sessionMap.get(batch.sessionId);
    if (!flightSessionId) {
      flightSessionId = crypto.randomUUID();
      this.sessionMap.set(batch.sessionId, flightSessionId);
      storage.initSession(flightSessionId, batch.sessionId);
    }

    // Scrub and enrich each event
    const scrubbedEvents: FlightEvent[] = [];

    for (const event of batch.events) {
      const scrubbed = this.scrubEvent(event);
      if (scrubbed.hadSecrets) secretsDetected = true;

      // Extract searchable text if not already set
      if (!scrubbed.event.searchableText) {
        scrubbed.event.searchableText = this.extractSearchableText(scrubbed.event);
      }

      scrubbedEvents.push(scrubbed.event);
    }

    // Persist using the unique flight session ID
    storage.appendEvents(flightSessionId, scrubbedEvents);

    // Check if terminal snapshot is needed
    this.checkTerminalSnapshot(flightSessionId, batch.events);

    // Handle session end
    if (batch.flushReason === 'session_end') {
      storage.endSession(flightSessionId, 'completed');
      this.sessionMap.delete(batch.sessionId);
    }

    return { processed: scrubbedEvents.length, secretsDetected };
  }

  async createTerminalSnapshot(sessionId: string, terminalBuffer: string): Promise<void> {
    const storage = getStorage();
    storage.saveTerminalSnapshot(sessionId, Date.now(), terminalBuffer);
    this.lastSnapshotTime.set(sessionId, Date.now());
  }

  private scrubEvent(event: FlightEvent): { event: FlightEvent; hadSecrets: boolean } {
    let hadSecrets = false;
    const data = { ...event.data };

    // Scrub terminal output
    if (event.type === 'terminal:output' && typeof data.output === 'string') {
      const result = secretScrubber.scrub(data.output);
      data.output = result.text;
      if (result.wasRedacted) hadSecrets = true;
    }

    // Scrub terminal input
    if (event.type === 'terminal:input' && typeof data.input === 'string') {
      const result = secretScrubber.scrub(data.input);
      data.input = result.text;
      if (result.wasRedacted) hadSecrets = true;
    }

    // Scrub AI response content
    if (event.type === 'ai:response' && typeof data.content === 'string') {
      const result = secretScrubber.scrub(data.content);
      data.content = result.text;
      if (result.wasRedacted) hadSecrets = true;
    }

    // Scrub searchable text
    let searchableText = event.searchableText;
    if (searchableText) {
      const result = secretScrubber.scrub(searchableText);
      searchableText = result.text;
      if (result.wasRedacted) hadSecrets = true;
    }

    return {
      event: { ...event, data, searchableText },
      hadSecrets,
    };
  }

  private extractSearchableText(event: FlightEvent): string | undefined {
    switch (event.type) {
      case 'terminal:input':
        return typeof event.data.input === 'string'
          ? event.data.input.substring(0, 500) : undefined;
      case 'terminal:output':
        return typeof event.data.output === 'string'
          ? event.data.output.substring(0, 500) : undefined;
      case 'file:save':
      case 'file:open':
        return typeof event.data.fileName === 'string'
          ? event.data.fileName : undefined;
      case 'ai:prompt':
        return typeof event.data.prompt === 'string'
          ? event.data.prompt.substring(0, 200) : undefined;
      case 'ai:response':
        return typeof event.data.content === 'string'
          ? event.data.content.substring(0, 200) : undefined;
      case 'error:terminal':
      case 'error:runtime':
        return typeof event.data.message === 'string'
          ? event.data.message.substring(0, 500) : undefined;
      case 'git:commit':
        return typeof event.data.message === 'string'
          ? event.data.message : undefined;
      case 'annotation':
        return typeof event.data.text === 'string'
          ? event.data.text : undefined;
      default:
        return undefined;
    }
  }

  private checkTerminalSnapshot(sessionId: string, events: FlightEvent[]): void {
    const hasTerminalEvents = events.some((e) => e.type === 'terminal:output');
    if (!hasTerminalEvents) return;

    const lastSnapshot = this.lastSnapshotTime.get(sessionId) || 0;
    if (Date.now() - lastSnapshot < TERMINAL_SNAPSHOT_INTERVAL_MS) return;

    // Mark that a snapshot is due — the client will provide the buffer
    // via a separate API call when it detects the flag
    this.lastSnapshotTime.set(sessionId, Date.now());
  }
}

export { FlightRecorderWriter };
