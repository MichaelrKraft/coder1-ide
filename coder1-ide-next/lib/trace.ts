/**
 * Distributed Tracing Utility for Coder1 Multi-Agent System
 *
 * Provides correlation IDs that flow through all agent operations,
 * enabling request tracing from user action to completion.
 *
 * Usage:
 *   const trace = startTrace('team:spawn', { requirement: 'Build a dashboard' });
 *   // ... operations ...
 *   endTrace(trace, 'completed');
 *
 * All logs can then be filtered by traceId for debugging.
 */

// ================================================================================
// Trace Context Interfaces
// ================================================================================

export interface TraceContext {
  traceId: string;           // Unique ID for entire workflow (e.g., "trace_1733123456789_a1b2c3")
  spanId: string;            // Unique ID for this operation (e.g., "span_1733123456789_x1y2z3")
  parentSpanId?: string;     // Links child operations to parent
  operation: string;         // Name of the operation being traced
  startTime: number;         // Unix timestamp when operation started
  metadata?: Record<string, unknown>; // Additional context data
}

export interface TraceEntry {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  status: 'started' | 'completed' | 'error';
  timestamp: number;
  duration?: number;         // Duration in milliseconds (set when completed)
  agentId?: string;          // Which agent performed this operation
  sessionId?: string;        // Session this trace belongs to
  metadata?: Record<string, unknown>;
  error?: string;            // Error message if status is 'error'
}

// ================================================================================
// Trace ID Generation
// ================================================================================

/**
 * Generate a unique trace ID for a new workflow
 * Format: trace_{timestamp}_{random}
 */
export function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique span ID for an operation within a trace
 * Format: span_{timestamp}_{random}
 */
export function generateSpanId(): string {
  return `span_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// ================================================================================
// In-Memory Trace Storage
// ================================================================================

const traceStore = new Map<string, TraceEntry[]>();
const MAX_TRACES_PER_SESSION = 100;
const MAX_TOTAL_TRACES = 1000;

/**
 * Record a trace entry to storage
 * Automatically maintains size limits to prevent memory issues
 */
export function recordTrace(sessionId: string, entry: TraceEntry): void {
  if (!traceStore.has(sessionId)) {
    traceStore.set(sessionId, []);
  }

  const traces = traceStore.get(sessionId)!;
  traces.push(entry);

  // Keep only last MAX_TRACES_PER_SESSION traces per session
  if (traces.length > MAX_TRACES_PER_SESSION) {
    traces.splice(0, traces.length - MAX_TRACES_PER_SESSION);
  }

  // Global cleanup if total traces exceed limit
  let totalTraces = 0;
  traceStore.forEach(t => totalTraces += t.length);
  if (totalTraces > MAX_TOTAL_TRACES) {
    // Remove oldest entries from largest sessions
    const sortedSessions = [...traceStore.entries()]
      .sort((a, b) => b[1].length - a[1].length);

    for (const [sid, traces] of sortedSessions) {
      if (totalTraces <= MAX_TOTAL_TRACES) break;
      const toRemove = Math.min(traces.length - 10, totalTraces - MAX_TOTAL_TRACES);
      if (toRemove > 0) {
        traces.splice(0, toRemove);
        totalTraces -= toRemove;
      }
    }
  }
}

/**
 * Get all traces for a session, optionally filtered by traceId
 */
export function getTraces(sessionId: string, traceId?: string): TraceEntry[] {
  const traces = traceStore.get(sessionId) || [];
  if (traceId) {
    return traces.filter(t => t.traceId === traceId);
  }
  return [...traces]; // Return copy to prevent mutation
}

/**
 * Get all traces across all sessions for a specific traceId
 * Useful for cross-session debugging
 */
export function getTraceById(traceId: string): TraceEntry[] {
  const allTraces: TraceEntry[] = [];
  traceStore.forEach(traces => {
    allTraces.push(...traces.filter(t => t.traceId === traceId));
  });
  return allTraces.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Clear all traces for a session
 */
export function clearTraces(sessionId: string): void {
  traceStore.delete(sessionId);
}

/**
 * Clear all traces (useful for testing)
 */
export function clearAllTraces(): void {
  traceStore.clear();
}

/**
 * Get trace statistics for monitoring
 */
export function getTraceStats(): {
  totalSessions: number;
  totalTraces: number;
  tracesPerSession: Record<string, number>;
} {
  const tracesPerSession: Record<string, number> = {};
  let totalTraces = 0;

  traceStore.forEach((traces, sessionId) => {
    tracesPerSession[sessionId] = traces.length;
    totalTraces += traces.length;
  });

  return {
    totalSessions: traceStore.size,
    totalTraces,
    tracesPerSession
  };
}

// ================================================================================
// Trace Context Creation
// ================================================================================

/**
 * Start a new trace for a top-level operation
 * Use this when beginning a new user-initiated workflow
 */
export function startTrace(
  operation: string,
  metadata?: Record<string, unknown>
): TraceContext {
  const context: TraceContext = {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    operation,
    startTime: Date.now(),
    metadata
  };

  // Log trace start
  console.log(`[${context.traceId}] TRACE START: ${operation}`, metadata || '');

  return context;
}

/**
 * Create a child span within an existing trace
 * Use this when starting a sub-operation within a larger workflow
 */
export function createSpan(
  parentContext: TraceContext,
  operation: string,
  metadata?: Record<string, unknown>
): TraceContext {
  const context: TraceContext = {
    traceId: parentContext.traceId,
    parentSpanId: parentContext.spanId,
    spanId: generateSpanId(),
    operation,
    startTime: Date.now(),
    metadata
  };

  // Log span start
  console.log(`[${context.traceId}] SPAN START: ${operation} (parent: ${parentContext.spanId})`);

  return context;
}

/**
 * End a trace/span and record it to storage
 */
export function endTrace(
  context: TraceContext,
  status: 'completed' | 'error',
  sessionId?: string,
  agentId?: string,
  error?: string
): TraceEntry {
  const endTime = Date.now();
  const duration = endTime - context.startTime;

  const entry: TraceEntry = {
    traceId: context.traceId,
    spanId: context.spanId,
    parentSpanId: context.parentSpanId,
    operation: context.operation,
    status,
    timestamp: context.startTime,
    duration,
    agentId,
    sessionId,
    metadata: context.metadata,
    error
  };

  // Log trace end
  const statusIcon = status === 'completed' ? '✓' : '✗';
  console.log(
    `[${context.traceId}] TRACE ${statusIcon} ${context.operation}: ${status} (${duration}ms)`,
    error ? `Error: ${error}` : ''
  );

  // Record to storage if sessionId provided
  if (sessionId) {
    recordTrace(sessionId, entry);
  }

  return entry;
}

// ================================================================================
// Trace Visualization
// ================================================================================

/**
 * Format a trace for console visualization
 * Produces a tree-like view of the trace timeline
 */
export function visualizeTrace(traceId: string): string {
  const entries = getTraceById(traceId);

  if (entries.length === 0) {
    return `No trace found for ${traceId}`;
  }

  const lines: string[] = [];
  lines.push(`\n=== Trace: ${traceId} ===\n`);

  const firstStart = entries[0].timestamp;

  for (const entry of entries) {
    const relativeStart = entry.timestamp - firstStart;
    const indent = entry.parentSpanId ? '  ' : '';
    const statusIcon = entry.status === 'completed' ? '✓' : entry.status === 'error' ? '✗' : '○';
    const agentInfo = entry.agentId ? ` [${entry.agentId}]` : '';

    lines.push(
      `${indent}[+${relativeStart}ms] ${statusIcon} ${entry.operation}${agentInfo} ` +
      `(${entry.duration || '?'}ms) - ${entry.status}`
    );

    if (entry.error) {
      lines.push(`${indent}  Error: ${entry.error}`);
    }
  }

  const totalDuration = entries.length > 0
    ? (entries[entries.length - 1].timestamp + (entries[entries.length - 1].duration || 0)) - firstStart
    : 0;

  lines.push(`\nTotal duration: ${totalDuration}ms`);
  lines.push(`Spans: ${entries.length}\n`);

  return lines.join('\n');
}

/**
 * Get trace summary for a session (useful for UI display)
 */
export function getTraceSummary(sessionId: string): {
  totalTraces: number;
  completedCount: number;
  errorCount: number;
  avgDuration: number;
  recentTraces: Array<{
    traceId: string;
    operation: string;
    status: TraceEntry['status'];
    duration?: number;
    timestamp: number;
  }>;
} {
  const traces = getTraces(sessionId);

  // Group by traceId to get unique traces
  const traceMap = new Map<string, TraceEntry[]>();
  traces.forEach(t => {
    if (!traceMap.has(t.traceId)) {
      traceMap.set(t.traceId, []);
    }
    traceMap.get(t.traceId)!.push(t);
  });

  let completedCount = 0;
  let errorCount = 0;
  let totalDuration = 0;
  let durationCount = 0;

  traces.forEach(t => {
    if (t.status === 'completed') completedCount++;
    if (t.status === 'error') errorCount++;
    if (t.duration) {
      totalDuration += t.duration;
      durationCount++;
    }
  });

  // Get recent root traces (no parentSpanId)
  const rootTraces = traces
    .filter(t => !t.parentSpanId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)
    .map(t => ({
      traceId: t.traceId,
      operation: t.operation,
      status: t.status,
      duration: t.duration,
      timestamp: t.timestamp
    }));

  return {
    totalTraces: traceMap.size,
    completedCount,
    errorCount,
    avgDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    recentTraces: rootTraces
  };
}

// ================================================================================
// Socket.IO Trace Helper
// ================================================================================

/**
 * Extract trace context from a Socket.IO payload
 * Returns undefined if no trace context present
 */
export function extractTraceFromPayload(payload: Record<string, unknown>): TraceContext | undefined {
  const trace = payload._trace as Record<string, unknown> | undefined;
  if (!trace || !trace.traceId) {
    return undefined;
  }

  return {
    traceId: trace.traceId as string,
    spanId: trace.spanId as string || generateSpanId(),
    parentSpanId: trace.parentSpanId as string | undefined,
    operation: trace.operation as string || 'unknown',
    startTime: trace.startTime as number || Date.now(),
    metadata: trace.metadata as Record<string, unknown> | undefined
  };
}

/**
 * Create trace payload for Socket.IO emission
 */
export function createTracePayload(context: TraceContext): Record<string, unknown> {
  return {
    traceId: context.traceId,
    spanId: context.spanId,
    parentSpanId: context.parentSpanId,
    operation: context.operation,
    startTime: context.startTime
  };
}

// ================================================================================
// Exports for backwards compatibility and convenience
// ================================================================================

export const trace = {
  start: startTrace,
  span: createSpan,
  end: endTrace,
  record: recordTrace,
  get: getTraces,
  getById: getTraceById,
  clear: clearTraces,
  clearAll: clearAllTraces,
  stats: getTraceStats,
  visualize: visualizeTrace,
  summary: getTraceSummary,
  extractFromPayload: extractTraceFromPayload,
  createPayload: createTracePayload,
  generateTraceId,
  generateSpanId
};

export default trace;
