/**
 * useBridgeSessionData Hook
 * Listens for real-time session token data from the bridge via WebSocket
 *
 * Part of Phase 1: Bridge Session Data Streaming
 * This hook receives token usage data streamed from the user's local
 * Claude Code sessions through the bridge CLI.
 */

import { useState, useEffect, useCallback } from 'react';
import { getSocket } from './socket';

export interface BridgeTokenUsage {
  input: number;
  output: number;
  total: number;
  cacheCreation?: number;
  cacheRead?: number;
}

export interface BridgeSessionData {
  bridgeId: string;
  tokens: BridgeTokenUsage;
  hasActiveSession: boolean;
  timestamp: number;
}

interface UseBridgeSessionDataResult {
  /** Current token usage from bridge */
  tokens: BridgeTokenUsage | null;
  /** Whether there's an active Claude Code session */
  hasActiveSession: boolean;
  /** Whether we're connected and receiving data from bridge */
  isConnected: boolean;
  /** Last update timestamp */
  lastUpdate: number | null;
  /** Bridge ID if connected */
  bridgeId: string | null;
}

/**
 * Hook to subscribe to real-time session token data from the bridge
 * Updates automatically every 30 seconds (heartbeat interval)
 */
export function useBridgeSessionData(): UseBridgeSessionDataResult {
  const [tokens, setTokens] = useState<BridgeTokenUsage | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [bridgeId, setBridgeId] = useState<string | null>(null);

  const handleSessionTokens = useCallback((data: BridgeSessionData) => {
    console.log('📊 Received bridge session tokens:', data);

    if (data.tokens) {
      setTokens(data.tokens);
      setHasActiveSession(data.hasActiveSession);
      setLastUpdate(data.timestamp);
      setBridgeId(data.bridgeId);
      setIsConnected(true);
    }
  }, []);

  useEffect(() => {
    let socket: any = null;
    let mounted = true;

    const setupListener = async () => {
      try {
        socket = await getSocket();

        if (!mounted) return;

        // Listen for session token updates from the server
        socket.on('bridge:session:tokens', handleSessionTokens);

        // Track connection state
        socket.on('connect', () => {
          if (mounted) {
            console.log('🔌 Socket connected, listening for bridge session data');
          }
        });

        socket.on('disconnect', () => {
          if (mounted) {
            console.log('🔌 Socket disconnected');
            setIsConnected(false);
          }
        });

        // If socket is already connected, we're good
        if (socket.connected) {
          console.log('📡 Already connected, listening for bridge:session:tokens');
        }
      } catch (error) {
        console.error('Failed to setup bridge session data listener:', error);
      }
    };

    setupListener();

    return () => {
      mounted = false;
      if (socket) {
        socket.off('bridge:session:tokens', handleSessionTokens);
      }
    };
  }, [handleSessionTokens]);

  return {
    tokens,
    hasActiveSession,
    isConnected,
    lastUpdate,
    bridgeId
  };
}

/**
 * Format token count for display
 * @param count - Token count
 * @returns Formatted string (e.g., "12.5K" for 12500)
 */
export function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Calculate estimated cost based on token usage
 * Uses Claude's approximate pricing (as of 2024)
 * @param tokens - Token usage object
 * @returns Estimated cost in USD
 */
export function estimateCost(tokens: BridgeTokenUsage): number {
  // Claude 3.5 Sonnet pricing (approximate):
  // Input: $3 per million tokens
  // Output: $15 per million tokens
  // Cache read: $0.30 per million tokens
  // Cache write: $3.75 per million tokens

  const inputCost = (tokens.input / 1000000) * 3;
  const outputCost = (tokens.output / 1000000) * 15;
  const cacheReadCost = ((tokens.cacheRead || 0) / 1000000) * 0.30;
  const cacheWriteCost = ((tokens.cacheCreation || 0) / 1000000) * 3.75;

  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}
