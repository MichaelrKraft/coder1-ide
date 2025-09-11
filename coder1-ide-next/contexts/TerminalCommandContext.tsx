'use client';

import React, { createContext, useContext, useRef, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

interface TerminalCommandContextType {
  executeCommand: (command: string, options?: ExecuteOptions) => boolean;
  injectCommand: (command: string, options?: InjectOptions) => boolean;
  isTerminalReady: () => boolean;
}

interface ExecuteOptions {
  autoExecute?: boolean;
  focusTerminal?: boolean;
  thinkingMode?: string;
}

interface InjectOptions {
  replace?: boolean;
  focusTerminal?: boolean;
  addNewline?: boolean;
}

const TerminalCommandContext = createContext<TerminalCommandContextType | null>(null);

interface TerminalCommandProviderProps {
  children: React.ReactNode;
  sessionId: string | null;
  terminalReady: boolean;
}

export function TerminalCommandProvider({ 
  children, 
  sessionId, 
  terminalReady 
}: TerminalCommandProviderProps) {
  // Use refs to avoid stale closures and ensure immediate access to current values
  const sessionIdRef = useRef<string | null>(sessionId);
  const terminalReadyRef = useRef<boolean>(terminalReady);
  const isMountedRef = useRef<boolean>(true);

  // Update refs when props change - no intervals, immediate sync
  React.useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  React.useEffect(() => {
    terminalReadyRef.current = terminalReady;
  }, [terminalReady]);

  // Component mount tracking with proper cleanup
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isTerminalReady = useCallback((): boolean => {
    return !!(
      isMountedRef.current && 
      terminalReadyRef.current && 
      sessionIdRef.current && 
      !sessionIdRef.current.startsWith('simulated-')
    );
  }, []);

  const executeCommand = useCallback((
    command: string, 
    options: ExecuteOptions = {}
  ): boolean => {
    // Defensive check - component must be mounted
    if (!isMountedRef.current) {
      logger?.warn('[TerminalCommand] Component unmounted, ignoring execute request');
      return false;
    }

    const { autoExecute = false, focusTerminal = true, thinkingMode = 'normal' } = options;
    
    // Validate inputs
    if (!command || typeof command !== 'string') {
      logger?.warn('[TerminalCommand] Invalid command provided:', command);
      return false;
    }

    // Check terminal readiness
    if (!isTerminalReady()) {
      logger?.warn('[TerminalCommand] Terminal not ready:', {
        mounted: isMountedRef.current,
        terminalReady: terminalReadyRef.current,
        sessionId: sessionIdRef.current
      });
      return false;
    }

    try {
      const socket = getSocket();
      
      if (!socket || !socket.connected) {
        logger?.warn('[TerminalCommand] Socket not connected');
        return false;
      }

      const currentSessionId = sessionIdRef.current;
      
      // REMOVED: // REMOVED: console.log('[TerminalCommand] Executing command:', { 
    //         command: command.substring(0, 50) + (command.length > 50 ? '...' : ''),
    //         sessionId: currentSessionId?.slice(-8),
    //         autoExecute,
    //         thinkingMode
    //       });

      // Send command to terminal - single emit, no loops
      socket.emit('terminal:input', {
        id: currentSessionId,
        data: command,
        thinkingMode
      });

      // Auto-execute if requested (single additional emit)
      if (autoExecute) {
        socket.emit('terminal:input', {
          id: currentSessionId,
          data: '\r',
          thinkingMode
        });
      }

      // Focus terminal if requested - no async operations
      if (focusTerminal && typeof document !== 'undefined') {
        // Use setTimeout to defer DOM operation, but with immediate cleanup tracking
        const timeoutId = setTimeout(() => {
          if (!isMountedRef.current) return; // Guard against unmounted component
          
          try {
            const terminalElement = document.querySelector('.xterm-screen, [class*="xterm"]') as HTMLElement;
            if (terminalElement && terminalElement.focus) {
              terminalElement.focus();
            }
          } catch (error) {
            // Silent failure for focus operations
            // REMOVED: console.debug('[TerminalCommand] Focus operation failed:', error);
          }
        }, 50);

        // Immediate cleanup registration - no memory leaks
        if (isMountedRef.current) {
          setTimeout(() => clearTimeout(timeoutId), 100);
        }
      }

      return true;

    } catch (error) {
      logger?.error('[TerminalCommand] Execute failed:', error);
      return false;
    }
  }, [isTerminalReady]);

  const injectCommand = useCallback((
    command: string, 
    options: InjectOptions = {}
  ): boolean => {
    // Defensive check - component must be mounted  
    if (!isMountedRef.current) {
      logger?.warn('[TerminalCommand] Component unmounted, ignoring inject request');
      return false;
    }

    const { replace = false, focusTerminal = true, addNewline = false } = options;

    // For command injection, we use the execute function with appropriate formatting
    let formattedCommand = command;
    
    if (addNewline && !command.endsWith('\n') && !command.endsWith('\r')) {
      formattedCommand += '\r';
    }

    return executeCommand(formattedCommand, { 
      autoExecute: false, 
      focusTerminal,
      thinkingMode: 'normal' 
    });
  }, [executeCommand]);

  // Context value - stable reference, no recreated objects
  const contextValue = React.useMemo(() => ({
    executeCommand,
    injectCommand, 
    isTerminalReady
  }), [executeCommand, injectCommand, isTerminalReady]);

  return (
    <TerminalCommandContext.Provider value={contextValue}>
      {children}
    </TerminalCommandContext.Provider>
  );
}

// Custom hook with proper error handling
export function useTerminalCommand(): TerminalCommandContextType {
  const context = useContext(TerminalCommandContext);
  
  if (!context) {
    logger?.error('[TerminalCommand] useTerminalCommand must be used within TerminalCommandProvider');
    
    // Return safe fallback functions instead of throwing
    return {
      executeCommand: () => {
        logger?.warn('[TerminalCommand] No provider found, command ignored');
        return false;
      },
      injectCommand: () => {
        logger?.warn('[TerminalCommand] No provider found, injection ignored'); 
        return false;
      },
      isTerminalReady: () => false
    };
  }
  
  return context;
}

export type { TerminalCommandContextType, ExecuteOptions, InjectOptions };