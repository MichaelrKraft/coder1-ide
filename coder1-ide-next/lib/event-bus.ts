/**
 * Centralized Event Bus for Coder1 IDE
 *
 * Replaces scattered window.dispatchEvent/addEventListener calls with a
 * type-safe, centralized event system.
 *
 * Usage:
 *   import { eventBus } from '@/lib/event-bus';
 *
 *   // Emit an event
 *   eventBus.emit('showToast', { message: 'Hello', type: 'success' });
 *
 *   // Listen for an event
 *   const unsubscribe = eventBus.on('showToast', (data) => {
 *     console.log(data.message);
 *   });
 *
 *   // Cleanup
 *   unsubscribe();
 */

// ============================================================================
// Event Type Definitions
// ============================================================================

export interface EventMap {
  // Toast notifications
  'showToast': { message: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number };

  // Session events
  'sessionRefreshed': { sessionId: string };
  'sessionChanged': { sessionId: string; reason?: string };
  'sessionEnded': void;
  'startHandoffSession': { mode: string; context?: unknown };
  'openHandoffMode': void;

  // Terminal events
  'terminal:createSandbox': {
    sandboxData?: unknown;
    checkpointId?: string;
    sessionId?: string;
    isFromTimeline?: boolean;
  };
  'terminal:switchToSandbox': { sandboxId: string };
  'terminal:refocus': void;
  'terminal:injectCommand': { command: string; execute?: boolean };
  'terminal:createAgentSession': { agentId: string; agentName?: string };
  'terminal:retry:connection': void;
  'terminal:retry:socket': void;
  'terminal:retry:backend': void;
  'terminal:retry:timeout': void;
  'terminalReady': { sessionId: string };
  'terminalOutput': { output: string; sessionId?: string };
  'terminalSettingsChanged': { settings: Record<string, unknown> };

  // Checkpoint events
  'checkpointCreated': { checkpointId: string; name?: string; timestamp?: string };
  'checkpointRestored': { checkpointId: string; sessionId?: string };

  // IDE state events
  'ideStateChanged': {
    files?: Record<string, string>;
    activeFile?: string;
    terminalHistory?: string;
  };
  'ideSessionsTabClicked': void;

  // Claude/AI events
  'claudeFilesReady': { files: string[]; bridgeId?: string };
  'agent-update': { agentId: string; status: string; data?: unknown };

  // Sandbox events
  'sandbox:created': { sandboxId: string; name?: string };
  'sandbox:close': { sandboxId: string };
  'sandbox:extractCommands': { commands: string[] };
  'sandbox-disconnect': { sandboxId: string; reason?: string };
  'sandbox:requestTransfer': { sandboxId: string; targetSessionId: string };

  // Agent events
  'agent:close': { agentId: string };

  // Teaching session events
  'agent:teaching:started': { agentId: string; sessionId: string };
  'agent:teaching:completed': { agentId: string; sessionId: string };
  'agent:teaching:converted': { agentId: string; sessionId: string; skillName: string };
  'agent:teaching:improved': { agentId: string; skillName: string; version: number };

  // Mission Control events
  'openMissionControl': void;
  'openParaThinkerDashboard': { initialQuery?: string };
  'openDocumentationPanel': void;
  'openBridgeModal': void;

  // Tour events
  'tour:start': void;
  'tour:end': void;
  'tour:addCode': { code: string; language?: string };
  'tour:clearCode': void;
  'tour:completed': { tourId: string };
  'tour:openDiscoverPanel': void;
  'tour:closeDiscoverPanel': void;

  // Memory preferences
  'memoryPreferencesChanged': { preferences: Record<string, unknown> };

  // WebSocket events
  'websocket-reconnect': void;

  // API key events
  'api-keys-updated': void;

  // Activity tracking (for services)
  'monaco-file-change': { filePath: string; content?: string };
  'terminal-command': { command: string; timestamp: number };
  'app-navigation': { path: string; timestamp: number };

  // Orchestrator events (for public JS modules)
  'orchestrator:timerUpdate': { elapsed: number; remaining?: number };
  'orchestrator:messageAdded': { message: unknown };
  'orchestrator:loadingStateChanged': { isLoading: boolean };
  'orchestrator:phaseChanged': { phase: string };
  'orchestrator:fileUploaded': { file: unknown };
  'orchestrator:agentJoined': { agent: unknown };
  'orchestrator:streamingUpdated': { isStreaming: boolean };
  'orchestrator:typingStarted': void;
  'orchestrator:typingEnded': void;
  'orchestrator:stateReset': void;
  'orchestratorModeChange': { mode: string };
}

// ============================================================================
// Event Bus Implementation
// ============================================================================

type EventHandler<T> = (data: T) => void;
type UnsubscribeFn = () => void;

class EventBus {
  private handlers: Map<keyof EventMap, Set<EventHandler<unknown>>> = new Map();
  private debugMode: boolean = false;

  /**
   * Enable debug logging for all events
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Emit an event with typed data
   */
  emit<K extends keyof EventMap>(
    event: K,
    ...[data]: EventMap[K] extends void ? [] : [EventMap[K]]
  ): void {
    if (this.debugMode) {
      console.log(`[EventBus] Emit: ${String(event)}`, data);
    }

    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler(data as unknown);
        } catch (error) {
          console.error(`[EventBus] Error in handler for ${String(event)}:`, error);
        }
      });
    }

    // Also dispatch to window for backwards compatibility during migration
    // This can be removed once all consumers are migrated
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(event as string, { detail: data }));
    }
  }

  /**
   * Subscribe to an event with typed handler
   * Returns an unsubscribe function
   */
  on<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): UnsubscribeFn {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const eventHandlers = this.handlers.get(event)!;
    eventHandlers.add(handler as EventHandler<unknown>);

    if (this.debugMode) {
      console.log(`[EventBus] Subscribed to: ${String(event)} (${eventHandlers.size} listeners)`);
    }

    // Return unsubscribe function
    return () => {
      eventHandlers.delete(handler as EventHandler<unknown>);
      if (this.debugMode) {
        console.log(`[EventBus] Unsubscribed from: ${String(event)} (${eventHandlers.size} listeners)`);
      }
    };
  }

  /**
   * Subscribe to an event once (auto-unsubscribes after first call)
   */
  once<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): UnsubscribeFn {
    const unsubscribe = this.on(event, (data) => {
      unsubscribe();
      handler(data);
    });
    return unsubscribe;
  }

  /**
   * Remove all handlers for a specific event
   */
  off<K extends keyof EventMap>(event: K): void {
    this.handlers.delete(event);
    if (this.debugMode) {
      console.log(`[EventBus] Cleared all handlers for: ${String(event)}`);
    }
  }

  /**
   * Remove all handlers for all events
   */
  clear(): void {
    this.handlers.clear();
    if (this.debugMode) {
      console.log('[EventBus] Cleared all handlers');
    }
  }

  /**
   * Get the number of handlers for a specific event
   */
  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  /**
   * Check if an event has any handlers
   */
  hasListeners<K extends keyof EventMap>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const eventBus = new EventBus();

// Enable debug mode in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Uncomment the next line to enable debug logging
  // eventBus.setDebugMode(true);

  // Expose eventBus on window for debugging
  (window as unknown as { __eventBus: EventBus }).__eventBus = eventBus;
}

// ============================================================================
// React Hook for Event Bus
// ============================================================================

import { useEffect, useCallback } from 'react';

/**
 * React hook to subscribe to event bus events with automatic cleanup
 *
 * @example
 * useEventBus('showToast', (data) => {
 *   console.log('Toast:', data.message);
 * });
 */
export function useEventBus<K extends keyof EventMap>(
  event: K,
  handler: EventHandler<EventMap[K]>,
  deps: React.DependencyList = []
): void {
  const memoizedHandler = useCallback(handler, deps);

  useEffect(() => {
    const unsubscribe = eventBus.on(event, memoizedHandler);
    return unsubscribe;
  }, [event, memoizedHandler]);
}

/**
 * React hook to get an event emitter function with stable reference
 *
 * @example
 * const emitToast = useEventEmitter('showToast');
 * emitToast({ message: 'Hello!', type: 'success' });
 */
export function useEventEmitter<K extends keyof EventMap>(event: K) {
  return useCallback(
    (...args: EventMap[K] extends void ? [] : [EventMap[K]]) => {
      eventBus.emit(event, ...args);
    },
    [event]
  );
}

// ============================================================================
// Migration Helper - Bridge old window events to new event bus
// ============================================================================

/**
 * Helper to bridge old window.addEventListener to new event bus
 * Use this during migration period to support both systems
 *
 * @example
 * // In a component, instead of:
 * window.addEventListener('showToast', handler);
 *
 * // Use:
 * bridgeWindowEvent('showToast', (e) => handler(e.detail));
 */
export function bridgeWindowEvent<K extends keyof EventMap>(
  event: K,
  handler: (detail: EventMap[K]) => void
): UnsubscribeFn {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const windowHandler = (e: Event) => {
    const customEvent = e as CustomEvent<EventMap[K]>;
    handler(customEvent.detail);
  };

  window.addEventListener(event as string, windowHandler);

  return () => {
    window.removeEventListener(event as string, windowHandler);
  };
}
