/**
 * Flight Recorder Type Definitions
 * Core types for session recording, replay, and search.
 */

export type FlightEventType =
  | 'terminal:input'
  | 'terminal:output'
  | 'file:save'
  | 'file:open'
  | 'ai:prompt'
  | 'ai:response'
  | 'ai:tool_use'
  | 'error:terminal'
  | 'error:runtime'
  | 'checkpoint:auto'
  | 'checkpoint:manual'
  | 'git:commit'
  | 'git:branch'
  | 'session:start'
  | 'session:end'
  | 'session:idle'
  | 'session:active'
  | 'recording:paused'
  | 'recording:resumed'
  | 'annotation';

export interface FlightEvent {
  id: string;
  type: FlightEventType;
  clientTimestamp: number;
  sessionId: string;
  data: Record<string, unknown>;
  searchableText?: string;
}

export type FlightSessionStatus = 'recording' | 'paused' | 'completed' | 'crashed';

export interface FlightSessionMetadata {
  sessionType?: string;
  technologies?: string[];
  gitBranch?: string;
  primaryFile?: string;
  errorCount?: number;
  aiInteractionCount?: number;
}

export interface FlightSession {
  id: string;
  sessionId: string;
  status: FlightSessionStatus;
  startedAt: number;
  endedAt?: number;
  totalEvents: number;
  totalSizeBytes: number;
  metadata?: FlightSessionMetadata;
  starred: boolean;
}

export interface FlightAnnotation {
  id: string;
  flightSessionId: string;
  timestamp: number;
  annotationType: 'note' | 'breakthrough' | 'bug' | 'decision' | 'wtf';
  text: string;
  createdAt: number;
}

export interface FlightTerminalSnapshot {
  id: number;
  flightSessionId: string;
  timestamp: number;
  terminalBuffer: string;
}

export interface FlightRecorderFlags {
  enabled: boolean;
  captureTerminal: boolean;
  captureFiles: boolean;
  captureAI: boolean;
  captureErrors: boolean;
  replayEnabled: boolean;
  searchEnabled: boolean;
  sharingEnabled: boolean;
  flushIntervalMs: number;
  maxBufferSize: number;
  terminalChunkThreshold: number;
  retentionDays: number;
  maxStorageMB: number;
}

export interface FlightEventQuery {
  sessionId: string;
  startTimestamp?: number;
  endTimestamp?: number;
  eventTypes?: FlightEventType[];
  searchText?: string;
  limit?: number;
  offset?: number;
}

export interface FlightEventBatch {
  sessionId: string;
  events: FlightEvent[];
  flushReason: 'interval' | 'buffer_full' | 'session_end' | 'beforeunload';
}

export interface FlightRecorderStats {
  totalSessions: number;
  totalEvents: number;
  totalSizeBytes: number;
  oldestSession?: number;
  newestSession?: number;
}

export interface FlightEventIndexRow {
  id: number;
  flight_session_id: string;
  event_type: string;
  client_timestamp: number;
  server_timestamp: number;
  searchable_text: string | null;
  metadata: string | null;
  data_offset: number;
  data_length: number;
}

export interface FlightSessionRow {
  id: string;
  session_id: string;
  status: string;
  started_at: number;
  ended_at: number | null;
  total_events: number;
  total_size_bytes: number;
  metadata: string | null;
  starred: number;
  created_at: number;
}
