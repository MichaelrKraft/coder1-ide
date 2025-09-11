/**
 * useTerminal Hook
 * 
 * Provides terminal integration for components that need to execute commands
 * or interact with the terminal session
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getBackendUrl } from '@/lib/api-config';
import io, { Socket } from 'socket.io-client';
import { logger } from '../logger';

interface UseTerminalOptions {
  autoConnect?: boolean;
  sessionId?: string;
}

interface TerminalConnection {
  isConnected: boolean;
  sessionId: string | null;
  executeCommand: (command: string) => void;
  writeToTerminal: (data: string) => void;
}

// Singleton socket instance to share across components
let sharedSocket: Socket | null = null;
let sharedSessionId: string | null = null;
let connectionListeners: Set<(connected: boolean) => void> = new Set();

export function useTerminal(options: UseTerminalOptions = {}): TerminalConnection {
  const { autoConnect = true, sessionId: providedSessionId } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(providedSessionId || sharedSessionId);
  const socketRef = useRef<Socket | null>(null);

  // Initialize or reuse socket connection
  useEffect(() => {
    if (!autoConnect) return;

    // Use shared socket if available
    if (sharedSocket && sharedSocket.connected) {
      socketRef.current = sharedSocket;
      setIsConnected(true);
      if (sharedSessionId) {
        setSessionId(sharedSessionId);
      }
      return;
    }

    // Create new socket connection
    const backendUrl = getBackendUrl();
    const socket = io(backendUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;
    sharedSocket = socket;

    // Handle connection events
    socket.on('connect', () => {
      logger.debug('[useTerminal] Socket connected');
      setIsConnected(true);
      connectionListeners.forEach(listener => listener(true));
    });

    socket.on('disconnect', () => {
      logger.debug('[useTerminal] Socket disconnected');
      setIsConnected(false);
      connectionListeners.forEach(listener => listener(false));
    });

    socket.on('terminal:created', (data: { id: string }) => {
      logger.debug('[useTerminal] Terminal session created:', data.id);
      setSessionId(data.id);
      sharedSessionId = data.id;
    });

    // Add connection listener
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };
    connectionListeners.add(handleConnectionChange);

    return () => {
      connectionListeners.delete(handleConnectionChange);
      
      // Don't disconnect if other components are using it
      if (connectionListeners.size === 0 && socketRef.current) {
        socketRef.current.disconnect();
        sharedSocket = null;
        sharedSessionId = null;
      }
    };
  }, [autoConnect]);

  // Execute a complete command (adds newline automatically)
  const executeCommand = useCallback((command: string) => {
    if (!socketRef.current?.connected || !sessionId) {
      logger.warn('[useTerminal] Cannot execute command: not connected or no session');
      return;
    }

    // Send command with newline to execute it
    const dataToSend = command + '\r';
    socketRef.current.emit('terminal:input', {
      id: sessionId,
      data: dataToSend
    });
    
    logger.debug('[useTerminal] Executed command:', command);
  }, [sessionId]);

  // Write raw data to terminal (no automatic newline)
  const writeToTerminal = useCallback((data: string) => {
    if (!socketRef.current?.connected || !sessionId) {
      logger.warn('[useTerminal] Cannot write to terminal: not connected or no session');
      return;
    }

    socketRef.current.emit('terminal:input', {
      id: sessionId,
      data: data
    });
    
    logger.debug('[useTerminal] Wrote to terminal:', data);
  }, [sessionId]);

  return {
    isConnected,
    sessionId,
    executeCommand,
    writeToTerminal
  };
}

// Helper function to get current terminal session from shared state
export function getCurrentTerminalSession(): string | null {
  return sharedSessionId;
}

// Helper function to check if terminal is connected
export function isTerminalConnected(): boolean {
  return sharedSocket?.connected || false;
}