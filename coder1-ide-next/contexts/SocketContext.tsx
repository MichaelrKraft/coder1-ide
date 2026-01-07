'use client';

/**
 * Socket Context for Coder1 IDE
 *
 * Provides typed access to Socket.IO connection and terminal session ID.
 * Replaces the previous pattern of storing these on the window object.
 *
 * Previous pattern (window globals - DO NOT USE):
 *   (window as any).terminalSocket = socket;
 *   (window as any).terminalSessionId = sessionId;
 *
 * New pattern:
 *   const { socket, sessionId, emit, isConnected } = useSocket();
 *
 * Usage in TerminalContainer (provider):
 *   <SocketProvider socket={socket} sessionId={sessionId}>
 *     <Terminal />
 *   </SocketProvider>
 *
 * Usage in any child component (consumer):
 *   const { emit, isConnected } = useSocket();
 *   emit('terminal:input', { data: 'ls -la' });
 */

import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import type { Socket } from 'socket.io-client';

// ============================================================================
// Types
// ============================================================================

export interface SocketContextValue {
  /** The Socket.IO instance (null if not connected) */
  socket: Socket | null;

  /** Current terminal session ID (null if no session) */
  sessionId: string | null;

  /** Whether the socket is currently connected */
  isConnected: boolean;

  /** Connection error message if any */
  connectionError: string | null;

  /**
   * Emit an event through the socket
   * Safe to call even when disconnected (will queue or ignore)
   */
  emit: <T = unknown>(event: string, data?: T) => void;

  /**
   * Emit terminal input specifically
   * Convenience method for the most common operation
   */
  emitTerminalInput: (data: string) => void;

  /**
   * Subscribe to a socket event with automatic cleanup
   * Returns unsubscribe function
   */
  on: <T = unknown>(event: string, handler: (data: T) => void) => () => void;

  /**
   * Subscribe to a socket event once
   */
  once: <T = unknown>(event: string, handler: (data: T) => void) => () => void;
}

// ============================================================================
// Context
// ============================================================================

const SocketContext = createContext<SocketContextValue | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

export interface SocketProviderProps {
  children: ReactNode;
  socket: Socket | null;
  sessionId: string | null;
}

// ============================================================================
// Provider Component
// ============================================================================

export function SocketProvider({ children, socket, sessionId }: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Track socket connection state
  useEffect(() => {
    if (!socket) {
      setIsConnected(false);
      return;
    }

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        setConnectionError('Server disconnected');
      } else if (reason === 'ping timeout') {
        setConnectionError('Connection timed out');
      }
    };

    const handleConnectError = (error: Error) => {
      setIsConnected(false);
      setConnectionError(error.message);
    };

    // Set initial state
    setIsConnected(socket.connected);

    // Add listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [socket]);

  // Emit function with safety checks
  const emit = useCallback(<T = unknown>(event: string, data?: T) => {
    if (!socket) {
      console.warn(`[SocketContext] Cannot emit "${event}" - socket not available`);
      return;
    }

    if (!socket.connected) {
      console.warn(`[SocketContext] Cannot emit "${event}" - socket not connected`);
      return;
    }

    socket.emit(event, data);
  }, [socket]);

  // Convenience method for terminal input
  const emitTerminalInput = useCallback((data: string) => {
    if (!sessionId) {
      console.warn('[SocketContext] Cannot emit terminal input - no session ID');
      return;
    }

    emit('terminal:input', { sessionId, data });
  }, [emit, sessionId]);

  // Subscribe to socket events
  const on = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    if (!socket) {
      console.warn(`[SocketContext] Cannot subscribe to "${event}" - socket not available`);
      return () => {};
    }

    socket.on(event, handler as (...args: unknown[]) => void);

    return () => {
      socket.off(event, handler as (...args: unknown[]) => void);
    };
  }, [socket]);

  // Subscribe once
  const once = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    if (!socket) {
      console.warn(`[SocketContext] Cannot subscribe once to "${event}" - socket not available`);
      return () => {};
    }

    socket.once(event, handler as (...args: unknown[]) => void);

    return () => {
      socket.off(event, handler as (...args: unknown[]) => void);
    };
  }, [socket]);

  const value: SocketContextValue = {
    socket,
    sessionId,
    isConnected,
    connectionError,
    emit,
    emitTerminalInput,
    on,
    once,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the socket context
 *
 * @throws Error if used outside of SocketProvider
 */
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }

  return context;
}

/**
 * Hook to access socket context safely (returns null if not in provider)
 * Use this when the component may render outside the provider
 */
export function useSocketSafe(): SocketContextValue | null {
  return useContext(SocketContext);
}

// ============================================================================
// Migration Helper
// ============================================================================

/**
 * During migration, this sets up the window globals for backwards compatibility
 * with components that haven't been migrated yet.
 *
 * Call this in TerminalContainer after setting up the context.
 * Remove once all consumers are migrated to useSocket().
 */
export function setupLegacyWindowGlobals(socket: Socket | null, sessionId: string | null) {
  if (typeof window === 'undefined') return;

  // Set globals for backwards compatibility
  (window as unknown as { terminalSocket: Socket | null }).terminalSocket = socket;
  (window as unknown as { terminalSessionId: string | null }).terminalSessionId = sessionId;

  // Log deprecation warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[SocketContext] Legacy window globals set. ' +
      'Components should migrate to useSocket() hook.'
    );
  }
}

/**
 * Clean up legacy window globals
 * Call when socket is disconnected or component unmounts
 */
export function cleanupLegacyWindowGlobals() {
  if (typeof window === 'undefined') return;

  (window as unknown as { terminalSocket: Socket | null }).terminalSocket = null;
  (window as unknown as { terminalSessionId: string | null }).terminalSessionId = null;
}

// ============================================================================
// Type augmentation for window (used during migration)
// ============================================================================

declare global {
  interface Window {
    terminalSocket?: Socket | null;
    terminalSessionId?: string | null;
  }
}
